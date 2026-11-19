from __future__ import annotations

import io
import logging
from contextlib import closing
from dataclasses import dataclass
from typing import TYPE_CHECKING

import pypdf
import pytesseract
from PIL import Image, ImageOps, UnidentifiedImageError
from pypdf.errors import PyPdfError

from app.core.exceptions import (
    OcrUnavailableError,
    TextExtractionError,
    UnsupportedFileTypeError,
)
from app.services.text_blocks import (
    TextBlock,
    blocks_to_text,
    normalize_source_text,
    parse_blocks,
)
from app.services.pdf_rendering import open_pdf, render_page

if TYPE_CHECKING:
    from app.core.config import Settings

# limit pixels
MAX_IMAGE_PIXELS = 50_000_000
#scale
PDF_OCR_SCALE = 3.0
OCR_TIMEOUT_SECONDS = 60

Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS

_available_languages: set[str] | None = None
logger = logging.getLogger(__name__)

@dataclass
class ExtractionResult:
    text: str
    source: str  # pdf or image
    page_count: int | None
    ocr_used: bool
    source_text: str
    blocks: list[TextBlock]
    warnings: list[str]
    skipped_ocr_pages: list[int]

def detect_file_kind(data: bytes) -> str | None:
    if data.startswith(b"%PDF-"):
        return "pdf"
    if (
        data.startswith(b"\x89PNG\r\n\x1a\n")
        or data.startswith(b"\xff\xd8\xff")
        or (data[:4] == b"RIFF" and data[8:12] == b"WEBP")
    ):
        return "image"
    return None


def _format_page_ranges(pages: list[int]) -> str:
    ranges: list[str] = []
    start = previous = pages[0]
    for page in pages[1:]:
        if page == previous + 1:
            previous = page
            continue
        ranges.append(str(start) if start == previous else f"{start}–{previous}")
        start = previous = page
    ranges.append(str(start) if start == previous else f"{start}–{previous}")
    return ", ".join(ranges)


class TextExtractionService:
    def __init__(self, settings: Settings):
        self.settings = settings
        if settings.TESSERACT_CMD:
            pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD

    def extract(self, data: bytes) -> ExtractionResult:
        kind = detect_file_kind(data)
        if kind == "pdf":
            return self._extract_pdf(data)
        if kind == "image":
            return self._extract_image(data)
        raise UnsupportedFileTypeError()

    def _extract_pdf(self, data: bytes) -> ExtractionResult:
        try:
            reader = pypdf.PdfReader(io.BytesIO(data))
            if reader.is_encrypted and not reader.decrypt(""):
                raise TextExtractionError("PDF is password protected")
            page_count = len(reader.pages)
            if page_count > self.settings.MAX_PDF_PAGES:
                raise TextExtractionError(
                    f"PDF has too many pages (max {self.settings.MAX_PDF_PAGES})"
                )
            page_texts = [page.extract_text() or "" for page in reader.pages]
        except TextExtractionError:
            raise
        except (PyPdfError, ValueError, KeyError, OSError, TypeError, IndexError):
            raise TextExtractionError("Could not read the PDF file") from None

        try:
            from app.services.layout_pdf import parse_layout_pdf, pdf_ocr_page_indices

            pages_needing_ocr = pdf_ocr_page_indices(data, page_texts)
        except Exception:
            logger.exception("PDF page inspection failed")
            raise TextExtractionError("Could not read the PDF file") from None
        warnings: list[str] = []
        skipped_ocr_pages: list[int] = []
        ocr_used = False
        ocr_pages: set[int] = set()

        if pages_needing_ocr:
            limit = max(0, self.settings.MAX_OCR_PAGES)
            allowed = pages_needing_ocr[:limit]
            skipped_ocr_pages = [
                index + 1 for index in pages_needing_ocr[limit:]
            ]
            for index in pages_needing_ocr:
                page_texts[index] = ""
            if allowed:
                for index, text in self._ocr_pdf_pages(data, allowed).items():
                    if text.strip():
                        page_texts[index] = text
                        ocr_pages.add(index)
                    else:
                        warnings.append(
                            f"Không nhận diện được chữ ở trang {index + 1}; giữ hình ảnh gốc để đối chiếu."
                        )
                ocr_used = True
            if skipped_ocr_pages:
                warnings.append(
                    f"Không OCR được {len(skipped_ocr_pages)} trang vì vượt giới hạn "
                    f"{self.settings.MAX_OCR_PAGES} trang: "
                    f"{_format_page_ranges(skipped_ocr_pages)}."
                )

        try:
            blocks = parse_layout_pdf(data, skip_pages={index + 1 for index in ocr_pages})
        except Exception:
            logger.exception("PDF geometry parsing failed")
            raise TextExtractionError("Không xử lý được bố cục PDF. Vui lòng thử lại hoặc chọn tệp khác.") from None
        for index in sorted(ocr_pages):
            # OCR has no reliable layout coordinates; reflow its paragraph lines.
            for block in parse_blocks(page_texts[index], page_number=index + 1):
                if block.type == "paragraph":
                    block.text = " ".join(block.text.splitlines())
                blocks.append(block)
        blocks.sort(key=lambda block: block.page_number or 0)
        for index, block in enumerate(blocks, 1):
            block.id = f"block-{index}"
        text = blocks_to_text(blocks)
        if not text and not any(block.image_src for block in blocks):
            raise TextExtractionError("No readable text was found in the file")
        return ExtractionResult(
            text=text, source="pdf", page_count=page_count, ocr_used=ocr_used,
            source_text="\n\n".join(normalize_source_text(value) for value in page_texts if value.strip()),
            blocks=blocks, warnings=warnings, skipped_ocr_pages=skipped_ocr_pages,
        )

    def _ocr_pdf_pages(self, data: bytes, page_indices: list[int]) -> dict[int, str]:
        texts: dict[int, str] = {}
        for index in page_indices:
            try:
                # Release PDFium and its lock before invoking the OCR process.
                with open_pdf(data) as pdf, closing(pdf[index]) as page:
                    image = render_page(page, scale=PDF_OCR_SCALE, max_pixels=MAX_IMAGE_PIXELS)
            except Exception:
                raise TextExtractionError(f"Could not render page {index + 1} for OCR") from None
            with closing(image):
                texts[index] = self._ocr(image)
        return texts

    def _extract_image(self, data: bytes) -> ExtractionResult:
        try:
            with Image.open(io.BytesIO(data)) as original:
                if original.width * original.height > MAX_IMAGE_PIXELS:
                    raise TextExtractionError("Image dimensions are too large")
                original.load()
                image = ImageOps.exif_transpose(original)
        except (UnidentifiedImageError, Image.DecompressionBombError, OSError):
            raise TextExtractionError("Could not read the image file") from None
        with closing(image):
            return self._result(
                [(self._ocr(image), None)], "image", None, True, [], []
            )

    def _ensure_languages(self) -> None:
        global _available_languages
        wanted = {lang for lang in self.settings.OCR_LANGUAGES.split("+") if lang}
        if _available_languages is None:
            try:
                _available_languages = set(pytesseract.get_languages())
            except pytesseract.TesseractNotFoundError:
                raise OcrUnavailableError("Tesseract is not installed on the server") from None
            except pytesseract.TesseractError:
                raise OcrUnavailableError("Could not query Tesseract languages") from None
        missing = wanted - _available_languages
        if missing:
            _available_languages = None  
            raise OcrUnavailableError(
                f"Tesseract language data is missing: {', '.join(sorted(missing))}"
            )

    def _ocr(self, image: Image.Image) -> str:
        self._ensure_languages()
        try:
            with ImageOps.grayscale(image) as grayscale:
                return pytesseract.image_to_string(grayscale, lang=self.settings.OCR_LANGUAGES, timeout=OCR_TIMEOUT_SECONDS)
        except pytesseract.TesseractNotFoundError:
            raise OcrUnavailableError("Tesseract is not installed on the server") from None
        except pytesseract.TesseractError:
            raise TextExtractionError("OCR failed on this file") from None
        except RuntimeError:
            raise TextExtractionError("OCR timed out on this file") from None

    @staticmethod
    def _result(
        pages: list[tuple[str, int | None]],
        source: str,
        page_count: int | None,
        ocr_used: bool,
        warnings: list[str],
        skipped_ocr_pages: list[int],
    ) -> ExtractionResult:
        blocks: list[TextBlock] = []
        for page_text, page_number in pages:
            blocks.extend(parse_blocks(page_text, page_number=page_number))
        text = blocks_to_text(blocks)
        if not text:
            raise TextExtractionError("No readable text was found in the file")
        source_text = "\n\n".join(
            normalized
            for page_text, _ in pages
            if (normalized := normalize_source_text(page_text))
        )
        return ExtractionResult(
            text,
            source,
            page_count,
            ocr_used,
            source_text,
            blocks,
            warnings,
            skipped_ocr_pages,
        )
