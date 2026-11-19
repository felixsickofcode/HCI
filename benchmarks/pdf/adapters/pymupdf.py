"""Normalize PyMuPDF 2.1 Document.to_json output.

The schema was inspected on the synthetic fixture and the two local PDFs.
Unknown classes remain visible in provenance, and malformed page/box data
raises instead of silently changing the candidate result.
"""

from __future__ import annotations

import json
import re
from contextlib import closing
from dataclasses import asdict
from pathlib import Path
from types import SimpleNamespace

import pypdfium2

from app.schemas.text_extraction import ExtractedTextRead, ReadingBlockRead
from app.services.layout_pdf import _snapshot
from app.services.text_blocks import TextBlock, blocks_to_text
from benchmarks.pdf.contracts import write_json

_LIST_ORDERED = re.compile(r"^\s*(?:\d+[.)]|\([a-zA-Z\d]+\))\s+")
_SKIP = {"page-header", "page-footer"}
_SNAPSHOT = {"table": "table", "picture": "image", "formula": "image"}


def _box_text(box: dict) -> str:
    if box.get("boxclass") == "table" and isinstance(box.get("table"), dict):
        rows = box["table"].get("extract") or []
        return "\n".join("\t".join(str(cell or "") for cell in row) for row in rows).strip()
    lines = box.get("textlines") or []
    result = []
    for line in lines:
        text = ""
        previous = None
        for span in line.get("spans", []):
            value = str(span.get("text", ""))
            if not value:
                continue
            if previous is not None and text and not text[-1].isspace() and not value[0].isspace():
                current_box = span.get("bbox")
                previous_box = previous.get("bbox")
                if current_box and previous_box:
                    gap = float(current_box[0]) - float(previous_box[2])
                    if gap > max(1.5, float(span.get("size") or 0) * 0.12):
                        text += " "
            text += value
            previous = span
        if text.strip():
            result.append(text.strip())
    return "\n".join(result).strip()


def _bbox(box: dict, width: float, height: float) -> tuple[float, float, float, float] | None:
    keys = ("x0", "y0", "x1", "y1")
    if any(box.get(key) is None for key in keys):
        return None
    x0, y0, x1, y1 = (float(box[key]) for key in keys)
    if not (0 <= x0 < x1 <= width + 0.5 and 0 <= y0 < y1 <= height + 0.5):
        raise ValueError(f"invalid box coordinates: {x0}, {y0}, {x1}, {y1}")
    return x0, y0, min(x1, width), min(y1, height)


def normalize(native: dict, pdf_path: Path, output_dir: Path) -> dict:
    pages = native.get("pages")
    if not isinstance(pages, list) or native.get("page_count") != len(pages):
        raise ValueError("PyMuPDF page count/schema mismatch")
    blocks: list[TextBlock] = []
    mapping: dict[str, str] = {}
    skipped: list[dict] = []
    original_classes: dict[str, str] = {}
    pages_without_text: list[int] = []
    with closing(pypdfium2.PdfDocument(str(pdf_path))) as rendered:
        if len(rendered) != len(pages):
            raise ValueError("PDFium and PyMuPDF page count mismatch")
        for page_index, page in enumerate(pages, 1):
            if page.get("page_number") != page_index or not isinstance(page.get("boxes"), list):
                raise ValueError("unexpected PyMuPDF page/box schema")
            width, height = float(page["width"]), float(page["height"])
            pdfium_page = rendered[page_index - 1]
            if abs(pdfium_page.get_width() - width) > 1 or abs(pdfium_page.get_height() - height) > 1:
                raise ValueError("PyMuPDF/PDFium page geometry differs; crop or rotation transform unsupported")
            if not any(_box_text(box) for box in page["boxes"]):
                pages_without_text.append(page_index)
            for box_index, box in enumerate(page["boxes"]):
                native_id = f"p{page_index}-b{box_index}"
                boxclass = box.get("boxclass")
                if boxclass in _SKIP:
                    skipped.append({"nativeBlockId": native_id, "reason": boxclass})
                    continue
                body = _box_text(box)
                bbox = _bbox(box, width, height)
                if boxclass in _SNAPSHOT:
                    if bbox is None:
                        raise ValueError(f"snapshot box without coordinates: {native_id}")
                    image_src, image_width, image_height = _snapshot(
                        pdfium_page, SimpleNamespace(width=width, height=height), bbox
                    )
                    block = TextBlock(
                        id="", type="snapshot", text=body, page_number=page_index,
                        image_src=image_src, image_width=image_width, image_height=image_height,
                        snapshot_kind=_SNAPSHOT[boxclass], source_bbox=bbox,
                    )
                elif boxclass == "section-header":
                    if not body:
                        skipped.append({"nativeBlockId": native_id, "reason": "empty heading"})
                        continue
                    level = int(box.get("header_level") or 1)
                    block = TextBlock(
                        id="", type="heading", text=body, page_number=page_index,
                        heading_level=2 if level <= 2 else 3, source_bbox=bbox,
                    )
                elif boxclass == "list-item":
                    if not body:
                        skipped.append({"nativeBlockId": native_id, "reason": "empty list item"})
                        continue
                    block = TextBlock(
                        id="", type="listItem", text=body, page_number=page_index,
                        list_kind="ordered" if _LIST_ORDERED.match(body) else "unordered",
                        source_bbox=bbox,
                    )
                else:
                    if not body:
                        skipped.append({"nativeBlockId": native_id, "reason": f"empty {boxclass}"})
                        continue
                    block = TextBlock(
                        id="", type="paragraph", text=body, page_number=page_index,
                        source_bbox=bbox,
                    )
                block.id = f"block-{len(blocks) + 1}"
                blocks.append(block)
                mapping[native_id] = block.id
                original_classes[block.id] = str(boxclass)

    text = blocks_to_text(blocks)
    normalized = ExtractedTextRead(
        text=text, source="pdf", page_count=len(pages), char_count=len(text),
        ocr_used=any(page.get("full_ocred") for page in pages),
        source_text=text,
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
        "pagesWithoutText": pages_without_text,
    })
    return {"blockCount": len(blocks), "skippedCount": len(skipped), "pagesWithoutText": pages_without_text}


def normalize_file(native_path: Path, pdf_path: Path, output_dir: Path) -> dict:
    return normalize(json.loads(native_path.read_text(encoding="utf-8")), pdf_path, output_dir)
