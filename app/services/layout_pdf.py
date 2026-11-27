"""Reflow PDF text using geometry; preserve tables and images as local PNGs."""

from __future__ import annotations

import base64
import io
import re
import unicodedata
from collections import Counter
from contextlib import closing
from dataclasses import dataclass, field
from typing import Callable

import pdfplumber

from app.services.pdf_rendering import open_pdf, render_page
from app.services.pdf_structure import StructureBox, box_for, extract_structure
from app.services.text_blocks import (
    EmphasisRange,
    TextBlock,
    normalize_math_word,
    strip_math_variation_selectors,
)

BBox = tuple[float, float, float, float]  # x0, top, x1, bottom in PDF points
_LIST = re.compile(r"^(?:[-•▪]|\d+[.)]|\([a-zA-Z\d]+\))\s+")
_BOLD = re.compile(r"bold|black|heavy|demi|bx", re.I)
_ITALIC = re.compile(r"italic|oblique", re.I)
_MONO = re.compile(r"courier|mono|consol", re.I)
_MATH_FONT = re.compile(r"math|symbol|(?:^|\+)(?:cmmi|cmsy|cmex|msam|msbm)", re.I)
_CAPTION = re.compile(r"^(?:Bảng|Table|Hình|Figure)\s*\d", re.I)


@dataclass
class Line:
    text: str
    bbox: BBox
    size: float
    bold: bool
    emphasis: list[EmphasisRange] | None = None


@dataclass
class Region:
    """Một vùng bảng/ảnh/công thức được giữ nguyên hình thức qua snapshot."""

    bbox: BBox
    kind: str  # "table" | "image"
    rows: list[list[str]] | None = None
    text: str = ""
    caption: str | None = None


@dataclass
class PageLayout:
    bbox: BBox
    width: float
    height: float
    lines: list[Line]
    regions: list[Region]
    captions: list[tuple[BBox, str]] = field(default_factory=list)


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


def _clean_rows(rows: list | None) -> list[list[str]] | None:
    """Chuẩn hoá rows trích từ bảng; trả None khi không đủ tin cậy để hiển thị."""
    if not rows:
        return None
    cleaned = [[" ".join(str(cell or "").split()) for cell in row] for row in rows]
    cleaned = [row for row in cleaned if any(cell.strip() for cell in row)]
    if len(cleaned) < 2:
        return None
    widths = {len(row) for row in cleaned}
    if len(widths) != 1 or next(iter(widths)) < 2:
        return None
    cells = [cell for row in cleaned for cell in row]
    if sum(1 for cell in cells if cell.strip()) < len(cells) * 0.4:
        return None
    return [[unicodedata.normalize("NFC", cell) for cell in row] for row in cleaned]


def _table_rows(table) -> list[list[str]] | None:
    try:
        return _clean_rows(table.extract())
    except Exception:
        return None


def _cropped_rows(page, box: BBox) -> list[list[str]] | None:
    try:
        return _clean_rows(page.crop(box).extract_table())
    except Exception:
        return None


def _equation_regions(page, regions: list[Region]) -> list[Region]:
    """Preserve isolated math bands; inline math stays in reflowable prose.

    Math font names and a high proportion of math glyphs are deliberately
    required. An equals sign in ordinary prose is insufficient evidence.
    """
    chars = [char for char in page.chars if char["text"].strip() and not any(
        _inside((char["x0"], char["top"], char["x1"], char["bottom"]), region.bbox)
        for region in regions
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
        result.append(Region(box, "image"))
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


def detect_regions(page) -> list[Region]:
    regions = [
        Region(tuple(table.bbox), "table", rows=_table_rows(table))
        for table in page.find_tables()
    ]
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
                if not any(_inside(box, existing.bbox) for existing in regions):
                    regions.append(Region(box, "table", rows=_cropped_rows(page, box)))
    for image in page.images:
        box = (image["x0"], image["top"], image["x1"], image["bottom"])
        if box[2] - box[0] >= 12 and box[3] - box[1] >= 12 and not any(_inside(box, region.bbox) for region in regions):
            regions.append(Region(box, "image"))
    # Include nearby captions completely; padding alone can otherwise cut a
    # caption in half when it almost touches the first horizontal rule.
    for index, region in enumerate(regions):
        box = region.bbox
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
            regions[index] = Region(_union([box, *caption_boxes]), region.kind, rows=region.rows)
    regions.extend(_equation_regions(page, regions))
    merged: list[Region] = []
    for region in regions:
        box, kind, rows = region.bbox, region.kind, region.rows
        # Recheck after every union: a larger box may touch an earlier region.
        index = 0
        while index < len(merged):
            other = merged[index]
            if min(box[2], other.bbox[2]) <= max(box[0], other.bbox[0]) or min(box[3], other.bbox[3]) <= max(box[1], other.bbox[1]):
                index += 1
                continue
            merged.pop(index)
            box = _union([box, other.bbox])
            kind = "table" if "table" in {kind, other.kind} else "image"
            rows = rows or other.rows
            index = 0
        merged.append(Region(box, kind, rows=rows))
    clipped = [
        Region((max(page.bbox[0], r.bbox[0]), max(page.bbox[1], r.bbox[1]),
                min(page.bbox[2], r.bbox[2]), min(page.bbox[3], r.bbox[3])),
               r.kind, rows=r.rows)
        for r in merged
    ]
    return [region for region in clipped if region.bbox[2] - region.bbox[0] > 1 and region.bbox[3] - region.bbox[1] > 1]


def _lines(page, regions: list[Region]) -> list[Line]:
    words = page.extract_words(extra_attrs=["fontname", "size"], x_tolerance=1.5, y_tolerance=2)
    rows: list[list[dict]] = []
    # Seed rows with full-sized text before attaching small superscripts. Font
    # metrics can shift baselines by several points within one visual line.
    for word in sorted(words, key=lambda w: (-round(w["size"], 1), w["top"], w["x0"])):
        box = (word["x0"], word["top"], word["x1"], word["bottom"])
        if any(_inside(box, region.bbox) for region in regions):
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
            parts: list[str] = []
            spans: list[tuple[int, int, dict]] = []
            cursor = 0
            for i, word in enumerate(chunk):
                gap = word["x0"] - chunk[i - 1]["x1"] if i else 0
                if i and gap > word["size"] * 0.08:
                    parts.append(" ")
                    cursor += 1
                piece = normalize_math_word(
                    unicodedata.normalize("NFC", word["text"]),
                    math_font=bool(_MATH_FONT.search(word["fontname"])),
                )
                start = cursor
                parts.append(piece)
                cursor += len(piece)
                spans.append((start, cursor, word))
            text = unicodedata.normalize("NFC", "".join(parts)).strip()
            count = sum(len(w["text"]) for w in chunk) or 1
            sizes = Counter()
            for word in chunk:
                sizes[word["size"]] += len(word["text"])
            emphasis: list[EmphasisRange] = []
            for start, end, word in spans:
                for kind, pattern in (("bold", _BOLD), ("italic", _ITALIC), ("mono", _MONO)):
                    if pattern.search(word["fontname"]):
                        # Gộp range liền kề (cách nhau tối đa một ký tự trống)
                        # để chữ đậm nhiều từ không tạo hàng chục khoảng nhỏ.
                        target = next((r for r in emphasis if r.kind == kind and r.end + 1 >= start), None)
                        if target is not None:
                            target.end = end
                        else:
                            emphasis.append(EmphasisRange(start, end, kind))
            result.append(Line(
                text,
                _union([(w["x0"], w["top"], w["x1"], w["bottom"]) for w in chunk]),
                sizes.most_common(1)[0][0],
                sum(len(w["text"]) for w in chunk if _BOLD.search(w["fontname"])) / count > 0.85,
                emphasis or None,
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


_SECTION_NUMBER = re.compile(r"^\s*(\d{1,2}(?:\.\d{1,2}){0,4})\.?\s*\S")
_LETTER_ITEM = re.compile(r"^\s*[a-zđ][.)]\s+\S")


def _numbering_level(text: str) -> int | None:
    """Cấp tiêu đề suy từ cách đánh số mục: "1" là cấp 1, "1.1" cấp 2, "1.1.1" cấp 3.

    Đây là tín hiệu đáng tin hơn cỡ chữ và hơn cấp do thư viện gán: tài liệu có
    đánh số mục thì số mục chính là cấu trúc thật của tác giả.
    """
    match = _SECTION_NUMBER.match(text)
    if match is None:
        return None
    return min(match.group(1).count(".") + 1, 6)


def _heading_level(ratio: float) -> int:
    """Cấp tiêu đề suy từ tỉ lệ cỡ chữ so với cỡ chữ thân bài.

    Ngưỡng 2 và 3 giữ đúng như bản cũ để không đổi kết quả trên tài liệu đã QA.
    Cấp 5 và 6 để trống cho bước suy cấp theo cách đánh số mục (1., 1.1, 1.1.1).
    """
    if ratio >= 1.6:
        return 1
    if ratio > 1.32:
        return 2
    if ratio > 1.15:
        return 3
    return 4


def _join(previous: str, following: str) -> str:
    if previous.endswith("\u00ad"):
        return previous[:-1] + following
    if re.search(r"[A-Za-z]{3,}-$", previous) and re.match(r"^[a-z]{2,}", following):
        return previous[:-1] + following
    return previous + " " + following


def _doc_leading(pages: list[list[Line]]) -> float | None:
    """Nhịp dòng thật của cả tài liệu: trung vị khoảng cách đỉnh-đỉnh giữa hai dòng
    cùng cỡ chữ liền nhau.

    Dùng cho mọi tài liệu thay vì một ngưỡng điểm tuyệt đối: tài liệu giãn dòng
    1.5 hoặc 2.0 có khoảng trống trong đoạn lớn hơn nhiều so với giãn dòng đơn,
    nên ngưỡng tuyệt đối sẽ cắt mỗi dòng thành một đoạn.
    """
    deltas: list[float] = []
    for lines in pages:
        ordered = sorted(lines, key=lambda line: line.bbox[1])
        deltas.extend(
            following.bbox[1] - line.bbox[1]
            for line, following in zip(ordered, ordered[1:])
            if abs(line.size - following.size) < 0.5 and following.bbox[1] - line.bbox[1] > 0.5
        )
    if len(deltas) < 3:
        return None
    deltas.sort()
    return deltas[len(deltas) // 2]


def _doc_indent(pages: list[list[Line]]) -> float:
    """Bước thụt lề đầu dòng quan sát được; 0 khi tài liệu dùng đoạn không thụt đầu.

    Chỉ nhận giá trị lặp lại ít nhất ba lần để một dòng lệch ngẫu nhiên không
    biến thành bước thụt của cả tài liệu.
    """
    counts: Counter = Counter()
    for lines in pages:
        ordered = sorted(lines, key=lambda line: line.bbox[1])
        for line, following in zip(ordered, ordered[1:]):
            delta = following.bbox[0] - line.bbox[0]
            if 0.5 < delta < line.size * 3:
                counts[round(delta, 1)] += 1
    if not counts:
        return 0.0
    value, count = counts.most_common(1)[0]
    return value if count >= 3 else 0.0


def _in_margin_kind(line: Line, boxes: list[StructureBox]) -> bool:
    """PyMuPDF4LLM nói dòng này thuộc đầu/chân trang."""
    box = box_for(line.bbox, boxes)
    return box is not None and box.kind in ("page-header", "page-footer")


def _structure_level(line: Line, boxes: list[StructureBox]) -> int | None:
    """Cấp tiêu đề do thư viện cấu trúc gán, `None` khi dòng không thuộc tiêu đề.

    Chỉ lấy cấp, không lấy quyết định "dòng này có phải tiêu đề": thư viện gán
    `section-header` cho cả dòng chữ thường trên văn bản đơn giản, nếu tin hoàn
    toàn thì mỗi dòng thành một block tiêu đề.
    """
    box = box_for(line.bbox, boxes)
    return box.level if box is not None and box.kind == "section-header" else None


def _center_inside(bbox: BBox, box: BBox) -> bool:
    x = (bbox[0] + bbox[2]) / 2
    y = (bbox[1] + bbox[3]) / 2
    return box[0] <= x <= box[2] and box[1] <= y <= box[3]


def _nearest_region(regions: list[Region], box: BBox) -> Region | None:
    """Vùng bảng/hình gần box chú thích nhất; ưu tiên khoảng cách theo chiều dọc."""
    if not regions:
        return None

    def distance(region: Region) -> float:
        area = region.bbox
        vertical = max(0.0, max(area[1], box[1]) - min(area[3], box[3]))
        horizontal = max(0.0, max(area[0], box[0]) - min(area[2], box[2]))
        return vertical * 4 + horizontal

    return min(regions, key=distance)


_TABLE_CAPTION = re.compile(r"^\s*(bảng|table)\b", re.I)
_FIGURE_CAPTION = re.compile(r"^\s*(hình|figure|biểu đồ|chart|sơ đồ)\b", re.I)


def _match_region(regions: list[Region], box: BBox, text: str) -> Region | None:
    """Chọn vùng khớp loại với chữ chú thích trước, rồi mới tới khoảng cách.

    Chỉ dùng khoảng cách thì caption "Hình 2" cạnh một bảng sẽ bị gắn vào bảng.
    """
    if _TABLE_CAPTION.search(text):
        wanted = "table"
    elif _FIGURE_CAPTION.search(text):
        wanted = "image"
    else:
        wanted = None
    matching = [region for region in regions if region.kind == wanted] if wanted else []
    return _nearest_region(matching or regions, box)


def _attach_captions(
    lines: list[Line],
    regions: list[Region],
    boxes: list[StructureBox],
    text_of: "Callable[[BBox], str]",
) -> list[Line]:
    """Gắn chú thích hình/bảng vào vùng của nó và bỏ khỏi dòng chữ.

    Chữ chú thích lấy từ chính box mà thư viện đã đánh dấu, không phụ thuộc việc
    dòng chú thích có lọt ra luồng chữ hay không: nếu chỉ dựa vào dòng lọt ra thì
    trường hợp caption đã nằm trong vùng crop sẽ không có chú thích nào.
    """
    caption_boxes = [box for box in boxes if box.kind == "caption"]
    if not caption_boxes:
        return lines
    consumed: set[int] = set()
    for box in caption_boxes:
        inside = [line for line in lines if _center_inside(line.bbox, box.bbox)]
        text = " ".join(text_of(box.bbox).split()) or " ".join(
            line.text for line in sorted(inside, key=lambda line: line.bbox[1])
        )
        if not text:
            continue
        target = _match_region(regions, box.bbox, text)
        if target is None:
            continue
        target.caption = f"{target.caption} {text}".strip() if target.caption else text
        consumed.update(id(line) for line in inside)
    return [line for line in lines if id(line) not in consumed]


def _body_frame(lines: list[Line]) -> tuple[float, float] | None:
    """Biên trái/phải của vùng chữ thân bài, dùng để loại căn giữa giả."""
    if not lines:
        return None
    left = min(line.bbox[0] for line in lines)
    right = max(line.bbox[2] for line in lines)
    return (left, right) if right > left else None


def _line_align(line: Line, page_bbox: BBox | None, frame: tuple[float, float] | None = None) -> str | None:
    """Căn lề gốc của dòng ngắn khi tín hiệu đủ rõ; `None` là giấu/giữ trái."""
    if page_bbox is None:
        return None
    page_width = page_bbox[2] - page_bbox[0]
    if page_width <= 0:
        return None
    left, right = frame if frame else (page_bbox[0], page_bbox[2])
    measure = right - left
    if measure <= 0:
        return None
    if line.bbox[2] - line.bbox[0] >= measure * 0.85:
        # Dòng phủ gần hết bề ngang vùng chữ nên là căn trái, không phải căn
        # giữa. Mốc là vùng chữ chứ không phải trang: dòng mục lục có dot leader
        # hẹp hơn trang nhưng vẫn phủ hết vùng chữ.
        return None
    if abs(line.bbox[0] - left) <= measure * 0.04:
        # Bắt đầu đúng lề thân bài, kể cả khi tâm dòng trùng tâm trang do lề hai
        # bên đối xứng (trang A4 lề 72pt là ca thường gặp).
        return None
    if abs((line.bbox[0] + line.bbox[2]) / 2 - (page_bbox[0] + page_bbox[2]) / 2) <= page_width * 0.03:
        return "center"
    if abs(line.bbox[2] - right) <= measure * 0.03 and line.bbox[0] - left > measure * 0.35:
        return "right"
    return None


_MIXED = "mixed"


def reconstruct(
    lines: list[Line],
    body_size: float,
    page_number: int,
    page_bbox: BBox | None = None,
    frame: tuple[float, float] | None = None,
    leading: float | None = None,
    indent: float = 0.0,
    structure: list[StructureBox] | None = None,
) -> list[TextBlock]:
    """Ghép dòng thành block, giữ nhấn font, căn lề và tỉ lệ cỡ chữ của bản gốc."""
    blocks: list[TextBlock] = []
    aligns: list[str | None] = []
    # Mọi ngưỡng ở đây là bội số của số đo suy ra từ chính tài liệu (nhịp dòng,
    # bước thụt lề, cỡ chữ thân bài) để cùng một luật chạy đúng cho mọi file.
    # Bước thụt lề chỉ được nâng ngưỡng, không được hạ xuống dưới mức an toàn:
    # giá trị nhỏ bắt được trong tài liệu thường là thụt lề danh sách, không phải
    # thụt đầu dòng, và hạ ngưỡng sẽ cắt vụn đoạn.
    indent_threshold = max(indent * 0.55, body_size * 0.8) if indent else body_size * 1.2
    # Bước nhảy ngang đủ lớn để coi là sang cột khác, đo theo bề rộng vùng chữ
    # nên không phụ thuộc cỡ chữ.
    measure = (frame[1] - frame[0]) if frame else body_size * 8
    last_numbered: int | None = None
    blocks: list[TextBlock] = []
    aligns: list[str | None] = []
    previous: Line | None = None
    for line in lines:
        heading = line.size > body_size * 1.12 or (line.bold and len(line.text) < 110 and line.text[-1:] not in ".!?;:")
        heading_level = None
        if heading:
            # Thứ tự ưu tiên: số mục của tác giả, rồi cấp do thư viện cấu trúc
            # gán, cuối cùng mới tới tỉ lệ cỡ chữ. Mục chữ "a.", "b." nằm ngay
            # dưới mục số gần nhất nên sâu hơn nó một cấp.
            numbered = _numbering_level(line.text)
            if numbered is not None:
                heading_level = numbered
                last_numbered = numbered
            elif _LETTER_ITEM.match(line.text) and last_numbered is not None:
                heading_level = min(last_numbered + 1, 6)
            else:
                heading_level = (
                    (_structure_level(line, structure) if structure else None)
                    or _heading_level(line.size / body_size)
                )
        marker = _LIST.match(line.text) if not heading else None
        kind = "heading" if heading else "listItem" if marker else "paragraph"
        line_align = None if kind == "listItem" else _line_align(line, page_bbox, frame)
        new_paragraph = (
            previous is None or not blocks or blocks[-1].type == "heading" or kind != "paragraph"
            or (line.bbox[1] - previous.bbox[1] > leading * 1.35 if leading else line.bbox[1] - previous.bbox[3] > body_size * 0.65)
            or line.bbox[1] < previous.bbox[1] - body_size
            or line.bbox[0] - previous.bbox[0] > measure * 0.35
            or (kind == "paragraph" and blocks[-1].type == "listItem" and line.bbox[0] <= blocks[-1].source_bbox[0] + body_size * 0.4)
            or (kind == "paragraph" and blocks[-1].type == "paragraph" and line.bbox[0] - previous.bbox[0] > indent_threshold)
        )
        if (previous is not None and blocks and kind == "heading" and blocks[-1].type == "heading"
            and abs(line.size - previous.size) < 0.5
            and 0 <= line.bbox[1] - previous.bbox[3] <= body_size * 0.5
            and abs(line.bbox[0] - previous.bbox[0]) <= body_size
            and not re.match(r"^\d+(?:\.\d+)*\s", line.text)):
            new_paragraph = False
        if not new_paragraph:
            block = blocks[-1]
            block.text = _join(block.text, line.text)
            shift = len(block.text) - len(line.text)
            if line.emphasis:
                existing = block.emphasis or []
                for item in line.emphasis:
                    item = EmphasisRange(item.start + shift, item.end + shift, item.kind)
                    if block.type == "heading" and item.kind == "bold":
                        continue
                    target = next((r for r in existing if r.kind == item.kind and r.end + 1 >= item.start), None)
                    if target is not None:
                        target.end = item.end
                    else:
                        existing.append(item)
                block.emphasis = existing or None
            aligns[-1] = aligns[-1] if aligns[-1] == line_align else _MIXED
            block.source_bbox = _union([block.source_bbox, line.bbox])
        else:
            emphasis = line.emphasis
            if heading and emphasis:
                # Block heading đã đậm theo ngữ nghĩa; chỉ giữ italic/mono thật của gốc.
                emphasis = [item for item in emphasis if item.kind != "bold"] or None
            blocks.append(TextBlock(
                id="", type=kind, text=line.text, page_number=page_number,
                heading_level=heading_level if heading else None,
                list_kind=("unordered" if marker.group().strip() in {"-", "•", "▪"} else "ordered") if marker else None,
                source_bbox=line.bbox,
                emphasis=emphasis,
                align=line_align,
                font_size_ratio=round(line.size / body_size, 3) if heading else None,
            ))
            aligns.append(line_align)
        previous = line
    for block, align in zip(blocks, aligns):
        block.align = align if align in ("center", "right") else None
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


def _normalize_heading_levels(blocks: list[TextBlock]) -> None:
    """Dịch cấp tiêu đề để cấp nông nhất trong tài liệu luôn là 1.

    Tài liệu chỉ đánh số từ "1.1" trở xuống sẽ ra cấp 2 cho mọi mục; mục lục khi
    đó thụt lề sai toàn bộ. Dịch theo cấp nông nhất giữ đúng tương quan giữa các
    mục mà vẫn cho mục lục bắt đầu ở cấp 1.
    """
    current = None
    previous_level = None
    for block in blocks:
        if block.type != "heading":
            continue
        numbered = _numbering_level(block.text)
        if numbered is not None:
            current = numbered
        elif _LETTER_ITEM.match(block.text) and current is not None:
            # Mục chữ "a.", "b." nằm ngay dưới mục số gần nhất.
            block.heading_level = min(current + 1, 6)
        elif current is not None and previous_level is not None:
            # Trong tài liệu có đánh số, tiêu đề không đánh số là dòng nối của
            # tiêu đề ngay trước, không phải một mục cấp cao mới.
            block.heading_level = previous_level
        previous_level = block.heading_level
    levels = [block.heading_level for block in blocks if block.type == "heading" and block.heading_level]
    if not levels:
        return
    shift = min(levels) - 1
    if shift <= 0:
        return
    for block in blocks:
        if block.type == "heading" and block.heading_level:
            block.heading_level = max(1, block.heading_level - shift)


def parse_layout_pdf(data: bytes, skip_pages: set[int] | None = None) -> list[TextBlock]:
    skip_pages = skip_pages or set()
    structure = extract_structure(data)
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
            for region in regions:
                region.text = strip_math_variation_selectors(
                    page.crop(region.bbox).extract_text(x_tolerance=2) or ""
                )
            pages.append((number, PageLayout(
                page.bbox, page.width, page.height, lines, regions,
                captions=[
                    (box.bbox, page.crop(box.bbox).extract_text(x_tolerance=2) or "")
                    for box in structure
                    if box.page == number and box.kind == "caption"
                ],
            )))
            for line in lines:
                sizes[round(line.size, 1)] += len(line.text)
            margins.update({_margin_key(line) for line in lines if line.bbox[1] - page.bbox[1] < page.height * 0.06 or line.bbox[3] - page.bbox[1] > page.height * 0.94})
            page.close()
            original.close()
        body_size = sizes.most_common(1)[0][0] if sizes else 12
        document_lines = [layout.lines for _, layout in pages]
        leading = _doc_leading(document_lines)
        indent = _doc_indent(document_lines)
    blocks: list[TextBlock] = []
    with open_pdf(data) as rendered:
        for number, page in pages:
            structure_boxes = [box for box in structure if box.page == number]
            caption_text = {bbox: text for bbox, text in page.captions}
            lines = page.lines
            if structure_boxes:
                # Cần hai tín hiệu độc lập: thư viện cấu trúc nói dòng thuộc
                # đầu/chân trang, và nội dung đúng kiểu (chỉ là số trang hoặc
                # lặp lại ở nhiều trang). Một mình thư viện có thể gán nhầm trên
                # trang ít chữ.
                lines = [line for line in lines if not (
                    _in_margin_kind(line, structure_boxes)
                    and (re.fullmatch(r"[\d\s–—-]+", line.text)
                         or margins[_margin_key(line)] >= max(2, len(pages) * 0.5))
                )]
            else:
                lines = [line for line in lines if not (
                    (line.bbox[1] - page.bbox[1] < page.height * 0.06 or line.bbox[3] - page.bbox[1] > page.height * 0.94)
                    and (re.fullmatch(r"[\d\s–—-]+", line.text) or margins[_margin_key(line)] >= max(2, len(pages) * 0.5))
                )]
            if structure_boxes:
                lines = _attach_captions(
                    lines, page.regions, structure_boxes,
                    lambda box: caption_text.get(box, ""),
                )
            frame = _body_frame(lines)
            items = list(lines)
            lookup = {}
            for region in page.regions:
                item = Line(region.text, region.bbox, 0, False)
                items.append(item)
                lookup[id(item)] = region
            pending = []
            # A figure is a reading-order barrier. Reconstructing all text first
            # could join prose above and below it into a single, misplaced block.
            with closing(rendered[number - 1]) as pdf_page:
                for item in reading_order(items, body_size):
                    if id(item) not in lookup:
                        pending.append(item)
                        continue
                    region = lookup[id(item)]
                    blocks.extend(reconstruct(pending, body_size, number, page.bbox, frame, leading, indent, structure_boxes))
                    pending = []
                    image_src, width, height = _snapshot(pdf_page, page, region.bbox)
                    blocks.append(TextBlock(
                        id="", type="snapshot", text=region.text, page_number=number,
                        image_src=image_src, image_width=width, image_height=height,
                        snapshot_kind=region.kind, source_bbox=region.bbox,
                        rows=region.rows if region.kind == "table" else None,
                        caption=region.caption,
                    ))
                blocks.extend(reconstruct(pending, body_size, number, page.bbox, frame, leading, indent, structure_boxes))
        for index, block in enumerate(blocks, 1):
            block.id = f"block-{index}"
        _normalize_heading_levels(blocks)
        return blocks
