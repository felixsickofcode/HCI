import io
import re
import unicodedata
from dataclasses import dataclass

import pypdf
import pypdfium2
import pytesseract
from PIL import Image, ImageOps, UnidentifiedImageError
from pypdf.errors import PyPdfError

from app.core.config import Settings
from app.core.exceptions import (
    OcrUnavailableError,
    TextExtractionError,
    UnsupportedFileTypeError,
)

# min text layer length to consider a PDF page as having text
MIN_TEXT_LAYER_CHARS = 10
# limit pixels
MAX_IMAGE_PIXELS = 50_000_000
#scale
PDF_OCR_SCALE = 3.0

Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS

_available_languages: set[str] | None = None

@dataclass
class ExtractionResult:
    text: str
    source: str  # pdf or image
    page_count: int | None
    ocr_used: bool

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


def normalize_text(text: str) -> str:
    text = unicodedata.normalize("NFC", text)
    text = text.replace("\x00", "").replace("\r\n", "\n").replace("\r", "\n")
    text = text.replace("\u00ad", "")  # soft hyphen
    text = re.sub(r"[ \t\u00a0]+", " ", text)
    text = re.sub(r" ?\n ?", "\n", text)
    text = _reflow(text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _reflow(text: str) -> str:
    out: list[str] = []
    for line in text.split("\n"):
        if (
            out
            and out[-1]
            and line
            and out[-1][-1] not in ".!?:;…\"”’)"
            and line[0].isalpha()
            and line[0].islower()
        ):
            out[-1] = f"{out[-1]} {line}"
        else:
            out.append(line)
    return "\n".join(out)





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
            pages = [page.extract_text() or "" for page in reader.pages]
        except TextExtractionError:
            raise
        except (PyPdfError, ValueError, KeyError, OSError):
            raise TextExtractionError("Could not read the PDF file") from None

        raw = "\n\n".join(pages)
        if len(re.sub(r"\s", "", raw)) >= MIN_TEXT_LAYER_CHARS:
            return self._result(raw, "pdf", page_count, ocr_used=False)


        raw = self._ocr_pdf_pages(data, page_count)
        return self._result(raw, "pdf", page_count, ocr_used=True)

    def _ocr_pdf_pages(self, data: bytes, page_count: int) -> str:
        if page_count > self.settings.MAX_OCR_PAGES:
            raise TextExtractionError(
                f"Scanned PDF has too many pages for OCR (max {self.settings.MAX_OCR_PAGES})"
            )
        try:
            pdf = pypdfium2.PdfDocument(data)
        except Exception: 
            raise TextExtractionError("Could not read the PDF file") from None
        try:
            texts = []
            for index in range(len(pdf)):
                page = pdf[index]
                image = page.render(scale=PDF_OCR_SCALE).to_pil()
                texts.append(self._ocr(image))
            return "\n\n".join(texts)
        finally:
            pdf.close()

    def _extract_image(self, data: bytes) -> ExtractionResult:
        try:
            image = Image.open(io.BytesIO(data))
            image.load()
        except (UnidentifiedImageError, Image.DecompressionBombError, OSError):
            raise TextExtractionError("Could not read the image file") from None
        image = ImageOps.exif_transpose(image)  # ảnh chụp điện thoại hay bị xoay
        return self._result(self._ocr(image), "image", None, ocr_used=True)

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
        image = ImageOps.grayscale(image)
        try:
            return pytesseract.image_to_string(image, lang=self.settings.OCR_LANGUAGES)
        except pytesseract.TesseractNotFoundError:
            raise OcrUnavailableError("Tesseract is not installed on the server") from None
        except pytesseract.TesseractError:
            raise TextExtractionError("OCR failed on this file") from None
    @staticmethod
    def _result(raw: str, source: str, page_count: int | None, ocr_used: bool) -> ExtractionResult:
        text = normalize_text(raw)
        if not text:
            raise TextExtractionError("No readable text was found in the file")
        return ExtractionResult(text, source, page_count, ocr_used)