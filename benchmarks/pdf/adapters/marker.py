"""Normalize observed Marker 2.2 JSON without executing upstream HTML."""

from __future__ import annotations

import json
import re
from contextlib import closing
from dataclasses import asdict
from html.parser import HTMLParser
from pathlib import Path
from types import SimpleNamespace

import pypdfium2

from app.schemas.text_extraction import ExtractedTextRead, ReadingBlockRead
from app.services.layout_pdf import _snapshot
from app.services.text_blocks import TextBlock, blocks_to_text
from benchmarks.pdf.contracts import write_json

_REF = re.compile(r"<content-ref\s+src=['\"]([^'\"]+)['\"]\s*>(?:</content-ref>)?", re.I)
_HEADING = re.compile(r"<h([1-6])(?:\s|>)", re.I)
_SNAPSHOT = {"Table": "table", "Figure": "image", "Picture": "image", "Equation": "image", "Handwriting": "image"}
_SKIP = {"PageHeader", "PageFooter"}


class _PlainHTML(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self.ignored_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in {"script", "style"}:
            self.ignored_depth += 1
            return
        if self.ignored_depth:
            return
        if tag in {"br", "p", "li", "tr", "div", "h1", "h2", "h3", "h4", "h5", "h6"}:
            self.parts.append("\n")
        elif tag in {"td", "th"}:
            self.parts.append("\t")

    def handle_endtag(self, tag: str) -> None:
        if tag in {"script", "style"} and self.ignored_depth:
            self.ignored_depth -= 1
            return
        if self.ignored_depth:
            return
        if tag in {"p", "li", "tr", "div", "h1", "h2", "h3", "h4", "h5", "h6"}:
            self.parts.append("\n")

    def handle_data(self, data: str) -> None:
        if not self.ignored_depth:
            self.parts.append(data)

    def text(self) -> str:
        return "\n".join(line.strip(" \t") for line in "".join(self.parts).splitlines() if line.strip()).strip()


def _inert_text(html: str, children: list[dict] | None = None, depth: int = 0) -> str:
    if depth > 8:
        raise ValueError("Marker content-ref depth exceeded")
    by_id = {child.get("id"): child for child in children or []}

    def replace(match: re.Match) -> str:
        target = by_id.get(match.group(1))
        if target is None:
            raise ValueError("unresolved Marker content-ref")
        return _inert_text(target.get("html") or "", target.get("children"), depth + 1)

    parser = _PlainHTML()
    parser.feed(_REF.sub(replace, html))
    parser.close()
    return parser.text()


def _bbox(node: dict, width: float, height: float) -> tuple[float, float, float, float] | None:
    box = node.get("bbox")
    if box is None and node.get("polygon"):
        points = node["polygon"]
        box = [min(point[0] for point in points), min(point[1] for point in points),
               max(point[0] for point in points), max(point[1] for point in points)]
    if box is None:
        return None
    if not isinstance(box, list) or len(box) != 4:
        raise ValueError("invalid Marker bbox")
    x0, y0, x1, y1 = (float(value) for value in box)
    if not (0 <= x0 < x1 <= width + 0.5 and 0 <= y0 < y1 <= height + 0.5):
        raise ValueError("Marker bbox outside PDF page")
    return x0, y0, min(x1, width), min(y1, height)


def _ordered_children(page: dict) -> list[dict]:
    children = page.get("children") or []
    by_id = {child.get("id"): child for child in children}
    refs = _REF.findall(page.get("html") or "")
    if not refs:
        return children
    if len(refs) != len(set(refs)) or set(refs) != set(by_id):
        raise ValueError("Marker page content-ref/children mismatch")
    return [by_id[ref] for ref in refs]


def normalize(native: dict, pdf_path: Path, output_dir: Path, metadata: dict | None = None) -> dict:
    if native.get("block_type") != "Document" or not isinstance(native.get("children"), list):
        raise ValueError("unexpected Marker document schema")
    pages = native["children"]
    blocks: list[TextBlock] = []
    mapping: dict[str, str] = {}
    original_classes: dict[str, str] = {}
    skipped: list[dict] = []
    with closing(pypdfium2.PdfDocument(str(pdf_path))) as rendered:
        if len(rendered) != len(pages):
            raise ValueError("Marker and PDFium page count mismatch")
        for page_number, page in enumerate(pages, 1):
            if page.get("block_type") != "Page":
                raise ValueError("unexpected Marker page schema")
            page_box = page.get("bbox")
            if not isinstance(page_box, list) or len(page_box) != 4:
                raise ValueError("Marker page missing bbox")
            if abs(float(page_box[0])) > 0.5 or abs(float(page_box[1])) > 0.5:
                raise ValueError("Marker page origin differs; crop transform unsupported")
            width, height = float(page_box[2]) - float(page_box[0]), float(page_box[3]) - float(page_box[1])
            pdfium_page = rendered[page_number - 1]
            if abs(pdfium_page.get_width() - width) > 1 or abs(pdfium_page.get_height() - height) > 1:
                raise ValueError("Marker/PDFium page geometry differs; rotation transform unsupported")
            for node in _ordered_children(page):
                native_id = node.get("id")
                block_type = node.get("block_type")
                if not isinstance(native_id, str) or not isinstance(block_type, str):
                    raise ValueError("Marker block missing id/type")
                if block_type in _SKIP:
                    skipped.append({"nativeBlockId": native_id, "reason": block_type})
                    continue
                body = _inert_text(node.get("html") or "", node.get("children"))
                bbox = _bbox(node, width, height)
                if block_type in _SNAPSHOT:
                    if bbox is None:
                        raise ValueError(f"snapshot without bbox: {native_id}")
                    image_src, image_width, image_height = _snapshot(
                        pdfium_page, SimpleNamespace(width=width, height=height), bbox
                    )
                    block = TextBlock(
                        id="", type="snapshot", text=body, page_number=page_number,
                        image_src=image_src, image_width=image_width, image_height=image_height,
                        snapshot_kind=_SNAPSHOT[block_type], source_bbox=bbox,
                    )
                else:
                    if not body:
                        skipped.append({"nativeBlockId": native_id, "reason": f"empty {block_type}"})
                        continue
                    if block_type == "SectionHeader":
                        heading = _HEADING.search(node.get("html") or "")
                        level = int(heading.group(1)) if heading else 2
                        kind = "heading"
                    elif block_type == "ListItem" or (block_type == "ListGroup" and "<li" in (node.get("html") or "").lower()):
                        kind = "listItem"
                    else:
                        kind = "paragraph"
                    block = TextBlock(
                        id="", type=kind, text=body, page_number=page_number,
                        heading_level=(2 if level <= 2 else 3) if kind == "heading" else None,
                        list_kind="unordered" if kind == "listItem" else None,
                        source_bbox=bbox,
                    )
                block.id = f"block-{len(blocks) + 1}"
                blocks.append(block)
                mapping[native_id] = block.id
                original_classes[block.id] = block_type

    text = blocks_to_text(blocks)
    page_stats = (metadata or {}).get("page_stats") or []
    ocr_used = any(item.get("text_extraction_method") not in {None, "pdftext"} for item in page_stats)
    normalized = ExtractedTextRead(
        text=text, source="pdf", page_count=len(pages), char_count=len(text),
        ocr_used=ocr_used, source_text=text,
        blocks=[ReadingBlockRead.model_validate(asdict(block)) for block in blocks],
        warnings=[], skipped_ocr_pages=[],
    )
    write_json(output_dir / "normalized.json", normalized.model_dump(by_alias=True))
    write_json(output_dir / "provenance.json", {
        "nativeToNormalized": mapping,
        "originalClasses": original_classes,
        "skippedNativeBlocks": skipped,
        "blocksWithBbox": sum(block.source_bbox is not None for block in blocks),
        "blockCount": len(blocks),
        "missingAlternativeText": [block.id for block in blocks if block.type == "snapshot" and not block.text],
        "ocrUsageNote": "Page method only; table/region OCR is not exposed in Marker JSON metadata.",
    })
    return {"blockCount": len(blocks), "skippedCount": len(skipped)}


def normalize_file(native_path: Path, pdf_path: Path, output_dir: Path) -> dict:
    meta_path = native_path.with_name("marker_meta.json")
    metadata = json.loads(meta_path.read_text(encoding="utf-8")) if meta_path.is_file() else None
    return normalize(json.loads(native_path.read_text(encoding="utf-8")), pdf_path, output_dir, metadata)
