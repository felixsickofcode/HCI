from typing import Annotated

from fastapi import APIRouter, File, UploadFile

from app.api.deps import TextExtractionServiceDep
from app.core.config import settings
from app.core.exceptions import FileTooLargeError
from app.schemas.text_extraction import ExtractedTextRead

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
    )