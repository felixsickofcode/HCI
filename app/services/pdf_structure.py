"""Lấy cấu trúc trang từ PyMuPDF4LLM, giữ pdfplumber làm nguồn chữ.

PyMuPDF4LLM phân loại sẵn vùng trang (tiêu đề mục, bảng, hình, chú thích, đầu/chân
trang) và trả toạ độ theo point. Nó đọc chữ tiếng Việt bị dính từ ("Ví dụcụthể"),
nên chữ vẫn lấy từ pdfplumber; ở đây chỉ dùng phần cấu trúc.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

try:  # Thư viện là tùy chọn: thiếu thì parser chạy như trước, không lỗi.
    import pymupdf
    import pymupdf4llm
except ImportError:  # pragma: no cover - phụ thuộc môi trường cài đặt
    pymupdf = None
    pymupdf4llm = None

BoxKind = Literal[
    "section-header", "text", "list-item", "table", "picture",
    "caption", "formula", "page-header", "page-footer",
]

BBox = tuple[float, float, float, float]


@dataclass(frozen=True, slots=True)
class StructureBox:
    page: int          # đánh số từ 1
    kind: str
    bbox: BBox         # PDF point, gốc trên trái
    level: int | None = None   # chỉ có nghĩa với section-header


def available() -> bool:
    return pymupdf is not None and pymupdf4llm is not None


def _level_of(markdown: str, position: list[int] | None, fallback: int | None) -> int | None:
    """Cấp tiêu đề lấy từ số dấu # mà PyMuPDF4LLM đã ghi cho vùng này."""
    if not position or len(position) != 2:
        return fallback
    snippet = markdown[position[0]:position[1]].lstrip()
    hashes = len(snippet) - len(snippet.lstrip("#"))
    if not 1 <= hashes <= 6:
        return fallback
    return hashes


def extract_structure(data: bytes) -> list[StructureBox]:
    """Trả danh sách vùng có toạ độ cho toàn tài liệu.

    Trả list rỗng khi thiếu thư viện hoặc đọc lỗi; parser gọi hàm này phải còn
    chạy được với dữ liệu rỗng như trước khi tích hợp.
    """
    if not available():
        return []
    document = None
    try:
        document = pymupdf.open(stream=data, filetype="pdf")
        chunks = pymupdf4llm.to_markdown(
            document,
            page_chunks=True,
            write_images=False,
            embed_images=False,
            use_ocr=False,
        )
    except Exception:
        return []
    finally:
        if document is not None:
            document.close()

    boxes: list[StructureBox] = []
    for page_number, chunk in enumerate(chunks, 1):
        markdown = chunk.get("text") or ""
        for raw in chunk.get("page_boxes") or []:
            bbox = raw.get("bbox")
            kind = raw.get("class")
            if not bbox or not kind or len(bbox) != 4:
                continue
            level = _level_of(markdown, raw.get("pos"), None) if kind == "section-header" else None
            boxes.append(StructureBox(
                page=page_number,
                kind=kind,
                bbox=(float(bbox[0]), float(bbox[1]), float(bbox[2]), float(bbox[3])),
                level=level,
            ))
    return boxes


def box_for(bbox: BBox, boxes: list[StructureBox]) -> StructureBox | None:
    """Vùng cấu trúc chứa tâm của bbox truyền vào, chọn vùng nhỏ nhất."""
    x = (bbox[0] + bbox[2]) / 2
    y = (bbox[1] + bbox[3]) / 2
    candidates = [
        box for box in boxes
        if box.bbox[0] <= x <= box.bbox[2] and box.bbox[1] <= y <= box.bbox[3]
    ]
    if not candidates:
        return None
    return min(candidates, key=lambda box: (box.bbox[2] - box.bbox[0]) * (box.bbox[3] - box.bbox[1]))
