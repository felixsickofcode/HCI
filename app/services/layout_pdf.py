"""Reflow PDF text using geometry; preserve tables and images as local PNGs."""

from __future__ import annotations

import base64
import io
import re
import unicodedata
from collections import Counter
from contextlib import closing
from dataclasses import dataclass
from statistics import median

import pdfplumber
import pypdfium2

from app.services.text_blocks import TextBlock

BBox = tuple[float, float, float, float]  # x0, top, x1, bottom in PDF points
_LIST = re.compile(r"^(?:[-•▪]|\d+[.)]|\([a-zA-Z\d]+\))\s*")
_BOLD = re.compile(r"bold|black|heavy|demi|bx", re.I)


@dataclass
class Line:
    text: str
    bbox: BBox
    size: float
    bold: bool


def _inside(box: BBox, region: BBox) -> bool:
    x, y = (box[0] + box[2]) / 2, (box[1] + box[3]) / 2
    return region[0] <= x <= region[2] and region[1] <= y <= region[3]


def _union(boxes: list[BBox]) -> BBox:
    return min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes)


def detect_regions(page) -> list[tuple[BBox, str]]:
    regions = [(tuple(table.bbox), "table") for table in page.find_tables()]
    captions = [line for line in page.extract_text_lines() if re.match(r"^(?:Bảng|Table|Hình|Figure)\s*\d", line["text"], re.I)]
    # Booktabs tables have horizontal rules without vertical borders. Group by
    # actual left/right edges so adjacent tables do not become one huge crop.
    rule_groups: list[list[dict]] = []
    for edge in page.edges:
        if edge.get("orientation") != "h" or edge["x1"] - edge["x0"] < page.width * 0.2:
            continue
        group = next((g for g in rule_groups if abs(g[0]["x0"] - edge["x0"]) < 3 and abs(g[0]["x1"] - edge["x1"]) < 3), None)
        if group is None:
            rule_groups.append([edge])
        else:
            group.append(edge)
    for group in rule_groups:
        ys = sorted({round(edge["top"], 1) for edge in group})
        runs = [[]]
        for y in ys:
            if runs[-1] and y - runs[-1][-1] > 18:
                previous = runs[-1][-1]
                has_caption = any(previous < caption["top"] < y for caption in captions)
                has_text = any(previous + 1 < char["top"] and char["bottom"] < y - 1 and group[0]["x0"] <= char["x0"] <= group[0]["x1"] for char in page.chars)
                if has_caption or not has_text:
                    runs.append([])
            runs[-1].append(y)
        for run in runs:
            if len(run) >= 3:
                box = (group[0]["x0"], run[0], group[0]["x1"], run[-1])
                if not any(_inside(box, existing) for existing, _ in regions):
                    regions.append((box, "table"))
    for image in page.images:
        box = (image["x0"], image["top"], image["x1"], image["bottom"])
        if box[2] - box[0] >= 12 and box[3] - box[1] >= 12 and not any(_inside(box, r) for r, _ in regions):
            regions.append((box, "image"))
    # Include nearby captions completely; padding alone can otherwise cut a
    # caption in half when it almost touches the first horizontal rule.
    for index, (box, kind) in enumerate(regions):
        caption = next((line for line in captions if 0 <= box[1] - line["bottom"] < 18 and line["x1"] > box[0] and line["x0"] < box[2]), None)
        if caption:
            regions[index] = (_union([box, (caption["x0"], caption["top"], caption["x1"], caption["bottom"])]), kind)
    merged: list[tuple[BBox, str]] = []
    for box, kind in regions:
        overlaps = [i for i, (other, _) in enumerate(merged) if min(box[2], other[2]) > max(box[0], other[0]) and min(box[3], other[3]) > max(box[1], other[1])]
        for index in reversed(overlaps):
            other, other_kind = merged.pop(index)
            box = _union([box, other])
            kind = "table" if "table" in {kind, other_kind} else "image"
        merged.append((box, kind))
    clipped = [((max(0, b[0]), max(0, b[1]), min(page.width, b[2]), min(page.height, b[3])), kind) for b, kind in merged]
    return [(box, kind) for box, kind in clipped if box[2] - box[0] > 1 and box[3] - box[1] > 1]


def _lines(page, regions: list[tuple[BBox, str]]) -> list[Line]:
    words = page.extract_words(extra_attrs=["fontname", "size"], x_tolerance=1.5, y_tolerance=2)
    rows: list[list[dict]] = []
    for word in sorted(words, key=lambda w: (w["bottom"], w["x0"])):
        box = (word["x0"], word["top"], word["x1"], word["bottom"])
        if any(_inside(box, region) for region, _ in regions):
            continue
        row = next((r for r in reversed(rows[-3:]) if abs(r[0]["bottom"] - word["bottom"]) <= max(2, word["size"] * 0.22)), None)
        if row is None:
            rows.append([word])
        else:
            row.append(word)
    result: list[Line] = []
    for row in rows:
        chunks: list[list[dict]] = [[]]
        for word in sorted(row, key=lambda w: w["x0"]):
            current = chunks[-1]
            if current and word["x0"] - current[-1]["x1"] > max(page.width * 0.045, word["size"] * 2.8):
                chunks.append([])
            chunks[-1].append(word)
        for chunk in chunks:
            text = ""
            for i, word in enumerate(chunk):
                gap = word["x0"] - chunk[i - 1]["x1"] if i else 0
                text += (" " if i and gap > word["size"] * 0.08 else "") + word["text"]
            count = sum(len(w["text"]) for w in chunk) or 1
            result.append(Line(
                unicodedata.normalize("NFC", text).strip(),
                _union([(w["x0"], w["top"], w["x1"], w["bottom"]) for w in chunk]),
                median(w["size"] for w in chunk),
                sum(len(w["text"]) for w in chunk if _BOLD.search(w["fontname"])) / count > 0.85,
            ))
    return result


def _margin_key(line: Line) -> str:
    return re.sub(r"\d+", "#", line.text.casefold())


def reading_order(items: list, body_size: float) -> list:
    """Whitespace cuts keep columns together below spanning headings."""
    if len(items) < 2:
        return items
    for start, end, minimum in [(1, 3, body_size * 0.9), (0, 2, body_size * 1.5)]:
        ordered = sorted(items, key=lambda item: item.bbox[start])
        right = ordered[0].bbox[end]
        gaps = []
        for index, item in enumerate(ordered[1:], 1):
            gap = item.bbox[start] - right
            if gap > minimum:
                gaps.append((gap, index))
            right = max(right, item.bbox[end])
        if gaps:
            _, index = max(gaps)
            return reading_order(ordered[:index], body_size) + reading_order(ordered[index:], body_size)
    return sorted(items, key=lambda item: (round(item.bbox[1] / 3), item.bbox[0]))


def _join(previous: str, following: str) -> str:
    if previous.endswith("\u00ad"):
        return previous[:-1] + following
    if re.search(r"[A-Za-z]{3,}-$", previous) and re.match(r"^[a-z]{2,}", following):
        return previous[:-1] + following
    return previous + " " + following


def reconstruct(lines: list[Line], body_size: float, page_number: int) -> list[TextBlock]:
    blocks: list[TextBlock] = []
    previous: Line | None = None
    for line in lines:
        heading = line.size > body_size * 1.12 or (line.bold and len(line.text) < 110 and line.text[-1:] not in ".!?;:")
        marker = _LIST.match(line.text) if not heading else None
        kind = "heading" if heading else "listItem" if marker else "paragraph"
        new_paragraph = (
            previous is None or not blocks or blocks[-1].type == "heading" or kind != "paragraph"
            or line.bbox[1] - previous.bbox[3] > body_size * 0.65
            or line.bbox[1] < previous.bbox[1] - body_size
            or abs(line.bbox[0] - previous.bbox[0]) > body_size * 3
        )
        if not new_paragraph:
            blocks[-1].text = _join(blocks[-1].text, line.text)
            blocks[-1].source_bbox = _union([blocks[-1].source_bbox, line.bbox])
        else:
            blocks.append(TextBlock(
                id="", type=kind, text=line.text, page_number=page_number,
                heading_level=(2 if line.size > body_size * 1.32 else 3) if heading else None,
                list_kind=("unordered" if marker.group().strip() in {"-", "•", "▪"} else "ordered") if marker else None,
                source_bbox=line.bbox,
            ))
        previous = line
    return blocks


def _snapshot(pdf_page, page, box: BBox) -> tuple[str, int, int]:
    x0, top, x1, bottom = max(0, box[0] - 5), max(0, box[1] - 5), min(page.width, box[2] + 5), min(page.height, box[3] + 5)
    scale = min(200 / 72, (8_000_000 / ((x1 - x0) * (bottom - top))) ** 0.5)
    bitmap = pdf_page.render(scale=scale, crop=(x0, page.height - bottom, page.width - x1, top))
    image = bitmap.to_pil()
    try:
        stream = io.BytesIO()
        image.save(stream, format="PNG")
        return "data:image/png;base64," + base64.b64encode(stream.getvalue()).decode("ascii"), image.width, image.height
    finally:
        image.close()
        bitmap.close()


def parse_layout_pdf(data: bytes, skip_pages: set[int] | None = None) -> list[TextBlock]:
    skip_pages = skip_pages or set()
    with pdfplumber.open(io.BytesIO(data)) as source, closing(pypdfium2.PdfDocument(data)) as rendered:
        pages = []
        sizes: Counter = Counter()
        margins: Counter = Counter()
        for number, page in enumerate(source.pages, 1):
            if number in skip_pages:
                continue
            regions = detect_regions(page)
            lines = _lines(page, regions)
            pages.append((number, page, regions, lines))
            for line in lines:
                sizes[round(line.size, 1)] += len(line.text)
            margins.update({_margin_key(line) for line in lines if line.bbox[1] < page.height * 0.06 or line.bbox[3] > page.height * 0.94})
        body_size = sizes.most_common(1)[0][0] if sizes else 12
        blocks: list[TextBlock] = []
        for number, page, regions, lines in pages:
            lines = [line for line in lines if not (
                (line.bbox[1] < page.height * 0.06 or line.bbox[3] > page.height * 0.94)
                and (re.fullmatch(r"[\d\s–—-]+", line.text) or margins[_margin_key(line)] >= max(2, len(pages) * 0.5))
            )]
            text_blocks = reconstruct(reading_order(lines, body_size), body_size, number)
            items = [Line("", block.source_bbox, 0, False) for block in text_blocks]
            lookup = {id(item): block for item, block in zip(items, text_blocks)}
            for box, kind in regions:
                image_src, width, height = _snapshot(rendered[number - 1], page, box)
                region_text = page.crop(box).extract_text(x_tolerance=2) or ""
                block = TextBlock(
                    id="", type="snapshot", text=region_text, page_number=number,
                    image_src=image_src, image_width=width, image_height=height,
                    snapshot_kind=kind, source_bbox=box,
                )
                item = Line("", box, 0, False)
                items.append(item)
                lookup[id(item)] = block
            blocks.extend(lookup[id(item)] for item in reading_order(items, body_size))
        for index, block in enumerate(blocks, 1):
            block.id = f"block-{index}"
        return blocks
