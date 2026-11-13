from typing import Annotated

from fastapi import APIRouter, File, UploadFile

from app.api.deps import TextExtractionServiceDep
from app.core.config import settings
from app.core.exceptions import FileTooLargeError
from app.schemas.text_extraction import ExtractedTextRead, ReadingBlockRead

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/extract-text", response_model=ExtractedTextRead)
def extract_text(
        service: TextExtractionServiceDep,
        file: Annotated[UploadFile, File(description="PDF, PNG, JPEG hoặc WebP")],
):
    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    data = file.file.read(max_bytes + 1)
    if len(data) > max_bytes:
        raise FileTooLargeError(f"File is too large (max {settings.MAX_UPLOAD_MB} MB)")

    result = service.extract(data)
    return ExtractedTextRead(
        text=result.text,
        source=result.source,
        page_count=result.page_count,
        char_count=len(result.text),
        ocr_used=result.ocr_used,
        source_text=result.source_text,
        blocks=[
            ReadingBlockRead(
                id=block.id,
                type=block.type,
                text=block.text,
                page_number=block.page_number,
                heading_level=block.heading_level,
                list_kind=block.list_kind,
                rows=block.rows,
                caption=block.caption,
                image_src=block.image_src,
                image_width=block.image_width,
                image_height=block.image_height,
                snapshot_kind=block.snapshot_kind,
                source_bbox=block.source_bbox,
            )
            for block in result.blocks
        ],
        warnings=result.warnings,
        skipped_ocr_pages=result.skipped_ocr_pages,
    )
