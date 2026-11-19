"""Reflow PDF text using geometry; preserve tables and images as local PNGs."""

from __future__ import annotations

import base64
import io
import re
import unicodedata
from collections import Counter
from contextlib import closing
from dataclasses import dataclass

import pdfplumber

from app.services.pdf_rendering import open_pdf, render_page
from app.services.text_blocks import TextBlock

BBox = tuple[float, float, float, float]  # x0, top, x1, bottom in PDF points
_LIST = re.compile(r"^(?:[-•▪]|\d+[.)]|\([a-zA-Z\d]+\))\s+")
_BOLD = re.compile(r"bold|black|heavy|demi|bx", re.I)
_MATH_FONT = re.compile(r"math|symbol|(?:^|\+)(?:cmmi|cmsy|cmex|msam|msbm)", re.I)
_CAPTION = re.compile(r"^(?:Bảng|Table|Hình|Figure)\s*\d", re.I)


@dataclass
class Line:
    text: str
    bbox: BBox
    size: float
    bold: bool


@dataclass
class PageLayout:
    bbox: BBox
    width: float
    height: float
    lines: list[Line]
    regions: list[tuple[BBox, str, str]]


def _visible_page(page):
    x0, top, x1, bottom = page.cropbox
    # pdfplumber swaps cropbox axes for quarter turns but does not reflect
    # them as PDFMiner does for glyphs. Align the visible box with the glyph
    # coordinate system before passing relative crops to PDFium.
    if page.rotation in (180, 270):
        x0, x1 = page.bbox[0] + page.bbox[2] - x1, page.bbox[0] + page.bbox[2] - x0
    if page.rotation in (90, 180):
        top, bottom = page.bbox[1] + page.bbox[3] - bottom, page.bbox[1] + page.bbox[3] - top
    box = (max(page.bbox[0], x0), max(page.bbox[1], top),
           min(page.bbox[2], x1), min(page.bbox[3], bottom))
    visible = page if box == page.bbox else page.crop(box)
    # Most PDFs have no overprinted glyphs. Avoid the relatively expensive
    # fuzzy deduplication pass unless nearby identical glyphs are present.
    seen = set()
    for char in visible.chars:
        key = (char["fontname"], char["size"], char["text"], round(char["x0"]), round(char["top"]))
        if key in seen:
            return visible.dedupe_chars(tolerance=0.5)
        seen.add(key)
    return visible


def _inside(box: BBox, region: BBox) -> bool:
    x, y = (box[0] + box[2]) / 2, (box[1] + box[3]) / 2
    return region[0] <= x <= region[2] and region[1] <= y <= region[3]


def _union(boxes: list[BBox]) -> BBox:
    return min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes)


def _covered_area(boxes: list[BBox]) -> float:
    """Area of raster tiles, without counting overlapping images twice."""
    xs = sorted({x for box in boxes for x in (box[0], box[2])})
    area = 0.0
    for left, right in zip(xs, xs[1:]):
        intervals = sorted((box[1], box[3]) for box in boxes if box[0] <= left and box[2] >= right)
        bottom = float('-inf')
        height = 0.0
        for top, end in intervals:
            height += max(0, end - max(top, bottom))
            bottom = max(bottom, end)
        area += (right - left) * height
    return area


def _equation_regions(page, regions: list[tuple[BBox, str]]) -> list[tuple[BBox, str]]:
    """Preserve isolated math bands; inline math stays in reflowable prose.

    Math font names and a high proportion of math glyphs are deliberately
    required. An equals sign in ordinary prose is insufficient evidence.
    """
    chars = [char for char in page.chars if char["text"].strip() and not any(
        _inside((char["x0"], char["top"], char["x1"], char["bottom"]), box)
        for box, _ in regions
    )]
    bands: list[list[dict]] = []
    bottom = float("-inf")
    for char in sorted(chars, key=lambda char: char["top"]):
        if char["top"] > bottom + 1.5:
            bands.append([])
        bands[-1].append(char)
        bottom = max(bottom, char["bottom"])
    result = []
    for band in bands:
        math_count = sum(bool(_MATH_FONT.search(char["fontname"])) for char in band)
        if math_count < 3 or math_count / len(band) < 0.25:
            continue
        if not any(char["text"] in "=∑∫∏≈≤≥" for char in band):
            continue
        box = _union([(c["x0"], c["top"], c["x1"], c["bottom"]) for c in band])
        words = page.crop(box).extract_words(extra_attrs=["fontname"])
        prose_words = sum(
            not _MATH_FONT.search(word["fontname"])
            and len(re.sub(r"[\W\d_]", "", word["text"])) >= 4
            for word in words
        )
        if prose_words >= 3:
            continue
        result.append((box, "image"))
    return result


def pdf_ocr_page_indices(data: bytes, page_texts: list[str]) -> list[int]:
    """Find scans, including scans with a short digital header/footer.

    Sparse digital pages and genuinely blank pages do not need Tesseract. A
    substantial raster image is required before treating short text as a scan.
    """
    indices = []
    with pdfplumber.open(io.BytesIO(data)) as source:
        for index, original in enumerate(source.pages):
            text = re.sub(r"\s", "", page_texts[index])
            if text and text.count("\ufffd") / len(text) > 0.2:
                indices.append(index)
                continue
            if len(text) >= 80:
                continue
            page = _visible_page(original)
            area = page.width * page.height
            boxes = [(image["x0"], image["top"], image["x1"], image["bottom"]) for image in page.images]
            if _covered_area(boxes) >= area * 0.35:
                indices.append(index)
            page.close()
            original.close()
    return indices


def detect_regions(page) -> list[tuple[BBox, str]]:
    regions = [(tuple(table.bbox), "table") for table in page.find_tables()]
    text_lines = page.extract_text_lines()
    captions = [line for line in text_lines if _CAPTION.match(line["text"])]
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
        nearby = [line for line in captions if (
            0 <= box[1] - line["bottom"] < 18 or 0 <= line["top"] - box[3] < 18
        ) and line["x1"] > box[0] and line["x0"] < box[2]]
        caption = min(nearby, key=lambda line: min(abs(box[1] - line["bottom"]), abs(line["top"] - box[3])), default=None)
        if caption:
            caption_boxes = [(caption["x0"], caption["top"], caption["x1"], caption["bottom"])]
            previous = caption
            below = caption["top"] >= box[3]
            for following in sorted(text_lines, key=lambda line: line["top"]):
                gap = following["top"] - previous["bottom"]
                height = previous["bottom"] - previous["top"]
                centered = abs((following["x0"] + following["x1"] - previous["x0"] - previous["x1"]) / 2) < 12
                aligned = abs(following["x0"] - previous["x0"]) < 3
                if (len(caption_boxes) < 3 and 0 <= gap <= height * 0.4 and (centered or aligned)
                    and not previous["text"].rstrip().endswith(('.', '!', '?'))
                    and not _CAPTION.match(following["text"])
                    and (below or following["bottom"] < box[1])):
                    caption_boxes.append((following["x0"], following["top"], following["x1"], following["bottom"]))
                    previous = following
            regions[index] = (_union([box, *caption_boxes]), kind)
    regions.extend(_equation_regions(page, regions))
    merged: list[tuple[BBox, str]] = []
    for box, kind in regions:
        # Recheck after every union: a larger box may touch an earlier region.
        index = 0
        while index < len(merged):
            other, other_kind = merged[index]
            if min(box[2], other[2]) <= max(box[0], other[0]) or min(box[3], other[3]) <= max(box[1], other[1]):
                index += 1
                continue
            merged.pop(index)
            box = _union([box, other])
            kind = "table" if "table" in {kind, other_kind} else "image"
            index = 0
        merged.append((box, kind))
    clipped = [((max(page.bbox[0], b[0]), max(page.bbox[1], b[1]), min(page.bbox[2], b[2]), min(page.bbox[3], b[3])), kind) for b, kind in merged]
    return [(box, kind) for box, kind in clipped if box[2] - box[0] > 1 and box[3] - box[1] > 1]


def _lines(page, regions: list[tuple[BBox, str]]) -> list[Line]:
    words = page.extract_words(extra_attrs=["fontname", "size"], x_tolerance=1.5, y_tolerance=2)
    rows: list[list[dict]] = []
    # Seed rows with full-sized text before attaching small superscripts. Font
    # metrics can shift baselines by several points within one visual line.
    for word in sorted(words, key=lambda w: (-round(w["size"], 1), w["top"], w["x0"])):
        box = (word["x0"], word["top"], word["x1"], word["bottom"])
        if any(_inside(box, region) for region, _ in regions):
            continue
        candidates = []
        for candidate in rows:
            anchor = candidate[0]
            overlap = min(anchor["bottom"], word["bottom"]) - max(anchor["top"], word["top"])
            center_gap = abs((anchor["top"] + anchor["bottom"] - word["top"] - word["bottom"]) / 2)
            small = word["size"] < anchor["size"] * 0.82
            if overlap >= word["size"] * 0.5 and center_gap <= anchor["size"] * 0.45:
                candidates.append((center_gap, candidate))
            elif small and overlap > 0 and center_gap <= anchor["size"] * 0.85:
                horizontal_gap = min(max(w["x0"] - word["x1"], word["x0"] - w["x1"], 0) for w in candidate)
                if horizontal_gap < anchor["size"]:
                    candidates.append((center_gap, candidate))
        row = min(candidates, key=lambda item: item[0])[1] if candidates else None
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
            sizes = Counter()
            for word in chunk:
                sizes[word["size"]] += len(word["text"])
            result.append(Line(
                unicodedata.normalize("NFC", text).strip(),
                _union([(w["x0"], w["top"], w["x1"], w["bottom"]) for w in chunk]),
                sizes.most_common(1)[0][0],
                sum(len(w["text"]) for w in chunk if _BOLD.search(w["fontname"])) / count > 0.85,
            ))
    return result


def _margin_key(line: Line) -> str:
    return re.sub(r"\d+", "#", line.text.casefold())


def _axis_gaps(items: list, start: int, end: int, minimum: float) -> tuple[list, list[tuple[float, int]]]:
    ordered = sorted(items, key=lambda item: item.bbox[start])
    right = ordered[0].bbox[end]
    gaps = []
    for index, item in enumerate(ordered[1:], 1):
        gap = item.bbox[start] - right
        if gap > minimum:
            gaps.append((gap, index))
        right = max(right, item.bbox[end])
    return ordered, gaps


def reading_order(items: list, body_size: float) -> list:
    """Whitespace cuts keep columns together below spanning headings."""
    if len(items) < 2:
        return items
    ordered, gaps = _axis_gaps(items, 0, 2, body_size * 1.5)
    if gaps:
        _, index = max(gaps)
        return reading_order(ordered[:index], body_size) + reading_order(ordered[index:], body_size)
    ordered, gaps = _axis_gaps(items, 1, 3, body_size * 0.9)
    if gaps:
        # Prefer a cut which exposes columns below/above a spanning element.
        # Choosing the largest paragraph gap can interleave the two columns.
        def column_coverage(gap):
            index = gap[1]
            return sum(len(part) for part in (ordered[:index], ordered[index:])
                       if _axis_gaps(part, 0, 2, body_size * 1.5)[1])

        _, index = max(gaps, key=lambda gap: (column_coverage(gap), -gap[1]))
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
            or (kind == "paragraph" and blocks[-1].type == "listItem" and line.bbox[0] <= blocks[-1].source_bbox[0] + body_size * 0.4)
            or (kind == "paragraph" and blocks[-1].type == "paragraph" and line.bbox[0] - previous.bbox[0] > body_size * 0.8)
        )
        if (previous is not None and blocks and kind == "heading" and blocks[-1].type == "heading"
            and abs(line.size - previous.size) < 0.5
            and 0 <= line.bbox[1] - previous.bbox[3] <= body_size * 0.5
            and abs(line.bbox[0] - previous.bbox[0]) <= body_size
            and not re.match(r"^\d+(?:\.\d+)*\s", line.text)):
            new_paragraph = False
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
    origin_x, origin_y = getattr(page, "bbox", (0, 0))[:2]
    x0, top = max(0, box[0] - origin_x - 5), max(0, box[1] - origin_y - 5)
    x1, bottom = min(page.width, box[2] - origin_x + 5), min(page.height, box[3] - origin_y + 5)
    image = render_page(pdf_page, scale=200 / 72, max_pixels=8_000_000,
                        crop=(x0, page.height - bottom, page.width - x1, top))
    try:
        stream = io.BytesIO()
        image.save(stream, format="PNG")
        return "data:image/png;base64," + base64.b64encode(stream.getvalue()).decode("ascii"), image.width, image.height
    finally:
        image.close()


def parse_layout_pdf(data: bytes, skip_pages: set[int] | None = None) -> list[TextBlock]:
    skip_pages = skip_pages or set()
    with pdfplumber.open(io.BytesIO(data)) as source:
        pages = []
        sizes: Counter = Counter()
        margins: Counter = Counter()
        for number, original in enumerate(source.pages, 1):
            if number in skip_pages:
                continue
            page = _visible_page(original)
            regions = detect_regions(page)
            lines = _lines(page, regions)
            region_texts = [(box, kind, page.crop(box).extract_text(x_tolerance=2) or "") for box, kind in regions]
            pages.append((number, PageLayout(page.bbox, page.width, page.height, lines, region_texts)))
            for line in lines:
                sizes[round(line.size, 1)] += len(line.text)
            margins.update({_margin_key(line) for line in lines if line.bbox[1] - page.bbox[1] < page.height * 0.06 or line.bbox[3] - page.bbox[1] > page.height * 0.94})
            page.close()
            original.close()
        body_size = sizes.most_common(1)[0][0] if sizes else 12
    blocks: list[TextBlock] = []
    with open_pdf(data) as rendered:
        for number, page in pages:
            lines = page.lines
            lines = [line for line in lines if not (
                (line.bbox[1] - page.bbox[1] < page.height * 0.06 or line.bbox[3] - page.bbox[1] > page.height * 0.94)
                and (re.fullmatch(r"[\d\s–—-]+", line.text) or margins[_margin_key(line)] >= max(2, len(pages) * 0.5))
            )]
            items = list(lines)
            lookup = {}
            for box, kind, region_text in page.regions:
                item = Line(region_text, box, 0, False)
                items.append(item)
                lookup[id(item)] = kind
            pending = []
            # A figure is a reading-order barrier. Reconstructing all text first
            # could join prose above and below it into a single, misplaced block.
            with closing(rendered[number - 1]) as pdf_page:
                for item in reading_order(items, body_size):
                    if id(item) not in lookup:
                        pending.append(item)
                        continue
                    blocks.extend(reconstruct(pending, body_size, number))
                    pending = []
                    image_src, width, height = _snapshot(pdf_page, page, item.bbox)
                    blocks.append(TextBlock(
                        id="", type="snapshot", text=item.text, page_number=number,
                        image_src=image_src, image_width=width, image_height=height,
                        snapshot_kind=lookup[id(item)], source_bbox=item.bbox,
                    ))
                blocks.extend(reconstruct(pending, body_size, number))
        for index, block in enumerate(blocks, 1):
            block.id = f"block-{index}"
        return blocks
