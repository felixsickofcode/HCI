"""Tách văn bản trích xuất thành khối có ý nghĩa để hiển thị và đọc.

Chỉ dùng tín hiệu chắc chắn (Markdown cơ bản, dòng trống, dòng ngắn độc lập).
Không ghép dòng theo chữ thường/dấu câu và không suy đoán định dạng từ văn
bản thuần.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from typing import Literal

BlockType = Literal["paragraph", "heading", "listItem", "quote", "table", "snapshot"]
ListKind = Literal["ordered", "unordered"]
EmphasisKind = Literal["bold", "italic", "mono"]
BlockAlign = Literal["left", "center", "right"]

_MAX_BLANK_LINES = 2

_HEADING_RE = re.compile(r"^\s*(#{1,6})\s+(.*?)\s*#*\s*$")
_QUOTE_RE = re.compile(r"^\s*>\s?(.*)$")
_UNORDERED_LIST_RE = re.compile(r"^\s*[-*•]\s+(.*)$")
_ORDERED_LIST_RE = re.compile(r"^\s*\d{1,3}[.)]\s+(.*)$")
_SENTENCE_END = ".!?,;:…"

# Glyph toán trong PDF hay kèm variation selector (∑ U+2211 + U+FE01). NFC
# không bỏ các code point này, nên nếu không lọc riêng thì tìm kiếm, copy và
# offset TTS sẽ thấy hai code point cho một glyph người đọc nhìn thấy.
_MATH_RANGES = (
    (0x02B0, 0x02FF),
    (0x0370, 0x03FF),
    (0x2100, 0x214F),
    (0x2190, 0x21FF),
    (0x2200, 0x22FF),
    (0x2A00, 0x2AFF),
)


@dataclass(slots=True)
class EmphasisRange:
    """Vùng ký tự trong `block.text` mang định dạng gốc của tài liệu."""

    start: int
    end: int
    kind: EmphasisKind


@dataclass(slots=True)
class TextBlock:
    id: str
    type: BlockType
    text: str
    page_number: int | None = None
    heading_level: int | None = None
    list_kind: ListKind | None = None
    rows: list[list[str]] | None = None
    caption: str | None = None
    image_src: str | None = None
    image_width: int | None = None
    image_height: int | None = None
    snapshot_kind: Literal["table", "image"] | None = None
    source_bbox: tuple[float, float, float, float] | None = None
    emphasis: list[EmphasisRange] | None = None
    align: BlockAlign | None = None
    font_size_ratio: float | None = None


def normalize_source_text(text: str) -> str:
    """Chuẩn hóa an toàn, giữ nguyên xuống dòng và dòng trống."""
    text = unicodedata.normalize("NFC", text)
    text = text.replace("\x00", "").replace("\r\n", "\n").replace("\r", "\n")
    text = text.replace("\u00ad", "")
    text = text.replace("\t", " ").replace("\u00a0", " ")
    text = re.sub(r" +", " ", text)
    text = re.sub(r" *\n *", "\n", text)
    text = re.sub(rf"\n{{{_MAX_BLANK_LINES + 1},}}", "\n" * _MAX_BLANK_LINES, text)
    return text.strip()


def _is_math_glyph(char: str) -> bool:
    code = ord(char)
    return any(start <= code <= end for start, end in _MATH_RANGES)


def strip_math_variation_selectors(text: str) -> str:
    """Bỏ variation selector đứng ngay sau glyph toán.

    Chỉ bỏ khi ký tự trước nằm trong dải toán, để variation selector của emoji
    (U+FE0F sau U+2764…) vẫn được giữ nguyên.
    """
    if not any("\ufe00" <= char <= "\ufe0f" for char in text):
        return text
    kept: list[str] = []
    for char in text:
        if "\ufe00" <= char <= "\ufe0f" and kept and _is_math_glyph(kept[-1]):
            continue
        kept.append(char)
    return "".join(kept)


def normalize_math_word(text: str, *, math_font: bool) -> str:
    """Chuẩn hoá glyph của một từ trước khi ghép vào block.

    Trong font toán, U+00B5 là ký tự mu Hy Lạp chứ không phải ký hiệu micro,
    nên đổi sang U+03BC để chữ copy ra và tìm kiếm khớp với thứ người đọc thấy.
    """
    if math_font:
        text = text.replace("\u00b5", "\u03bc")
    return strip_math_variation_selectors(text)


def parse_blocks(
    text: str,
    *,
    page_number: int | None = None,
    id_prefix: str = "block",
) -> list[TextBlock]:
    """Tách văn bản thành block theo thứ tự xuất hiện."""
    normalized = normalize_source_text(text)
    if not normalized:
        return []

    blocks: list[TextBlock] = []
    paragraph_lines: list[str] = []
    quote_lines: list[str] = []

    def add_block(
        block_type: BlockType,
        body: str,
        *,
        heading_level: int | None = None,
        list_kind: ListKind | None = None,
    ) -> None:
        body = body.strip("\n")
        if not body.strip():
            return
        blocks.append(
            TextBlock(
                id=f"{id_prefix}-{len(blocks) + 1}",
                type=block_type,
                text=body,
                page_number=page_number,
                heading_level=heading_level,
                list_kind=list_kind,
            )
        )

    def flush_paragraph() -> None:
        if not paragraph_lines:
            return
        body = "\n".join(line for line in paragraph_lines).strip()
        paragraph_lines.clear()
        if not body:
            return
        if len(body.splitlines()) == 1 and _looks_like_heading(body):
            add_block("heading", body, heading_level=2)
        else:
            add_block("paragraph", body)

    def flush_quote() -> None:
        if not quote_lines:
            return
        body = "\n".join(quote_lines).strip()
        quote_lines.clear()
        add_block("quote", body)

    for raw_line in normalized.split("\n"):
        line = raw_line.strip()

        if not line:
            flush_paragraph()
            flush_quote()
            continue

        heading = _HEADING_RE.match(line)
        if heading:
            flush_paragraph()
            flush_quote()
            level = min(len(heading.group(1)), 6)
            add_block("heading", heading.group(2), heading_level=level)
            continue

        quote = _QUOTE_RE.match(line)
        if quote:
            flush_paragraph()
            quote_lines.append(quote.group(1).strip())
            continue

        flush_quote()
        unordered = _UNORDERED_LIST_RE.match(line)
        ordered = _ORDERED_LIST_RE.match(line)
        if unordered or ordered:
            flush_paragraph()
            if unordered:
                add_block("listItem", unordered.group(1), list_kind="unordered")
            else:
                add_block("listItem", ordered.group(1), list_kind="ordered")
            continue

        paragraph_lines.append(line)

    flush_paragraph()
    flush_quote()
    return blocks


def blocks_to_text(blocks: list[TextBlock]) -> str:
    return "\n\n".join(block.text for block in blocks if block.text.strip())


def _looks_like_heading(text: str) -> bool:
    clean = text.strip()
    if not 3 <= len(clean) <= 80:
        return False
    if len(clean.split()) > 12:
        return False
    if not clean[0].isupper():
        return False
    return clean[-1] not in _SENTENCE_END
