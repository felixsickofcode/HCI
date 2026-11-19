import io
from types import SimpleNamespace

import pytest
from PIL import Image
from pypdf import PdfReader, PdfWriter

from app.core.exceptions import OcrUnavailableError, TextExtractionError
from app.services.text_extraction_service import TextExtractionService
from tests.test_layout_pdf import make_pdf

pytestmark = pytest.mark.no_db


@pytest.fixture
def service():
    return TextExtractionService(SimpleNamespace(
        MAX_PDF_PAGES=100, MAX_OCR_PAGES=10, OCR_LANGUAGES='vie+eng', TESSERACT_CMD=None,
    ))


def scanned_pdf(*, digital_footer=False, pages=1):
    # Pillow embeds a full-page raster. The content is deliberately blank;
    # OCR is mocked so the fixture does not need local language data.
    output = io.BytesIO()
    with Image.new('RGB', (600, 800), 'white') as image:
        image.save(output, format='PDF')
    reader = PdfReader(io.BytesIO(output.getvalue()))
    if digital_footer:
        footer = PdfReader(io.BytesIO(make_pdf([[
            'BT /F1 12 Tf 50 25 Td (A digital footer with more than ten characters.) Tj ET',
        ]])))
        reader.pages[0].merge_page(footer.pages[0])
    writer = PdfWriter()
    for _ in range(pages):
        writer.add_page(reader.pages[0])
    output = io.BytesIO()
    writer.write(output)
    return output.getvalue()


def test_sparse_digital_and_blank_pages_do_not_require_ocr(service, monkeypatch):
    def unexpected_ocr(*args):
        pytest.fail('Digital/blank pages must not invoke Tesseract')

    monkeypatch.setattr(service, '_ocr', unexpected_ocr)
    result = service.extract(make_pdf([[], ['BT /F1 12 Tf 50 700 Td (Hello.) Tj ET']]))
    assert result.text == 'Hello.'
    assert result.page_count == 2
    assert not result.ocr_used
    assert result.blocks[0].page_number == 2


def test_scan_with_digital_footer_still_gets_ocr(service, monkeypatch):
    monkeypatch.setattr(service, '_ocr', lambda image: 'Scanned content\ncontinues on this line.')
    result = service.extract(scanned_pdf(digital_footer=True))
    assert result.ocr_used
    assert result.text == 'Scanned content continues on this line.'
    assert 'digital footer' not in result.source_text


def test_mixed_pdf_preserves_page_order_and_reports_ocr_limit(service, monkeypatch):
    service.settings.MAX_OCR_PAGES = 1
    monkeypatch.setattr(service, '_ocr', lambda image: 'OCR content.')
    digital = PdfReader(io.BytesIO(make_pdf([['BT /F1 12 Tf 50 700 Td (Digital content.) Tj ET']])))
    scan = PdfReader(io.BytesIO(scanned_pdf(digital_footer=True)))
    writer = PdfWriter()
    writer.add_page(scan.pages[0])
    writer.add_page(digital.pages[0])
    writer.add_page(scan.pages[0])
    output = io.BytesIO()
    writer.write(output)
    result = service.extract(output.getvalue())
    assert [block.text for block in result.blocks[:2]] == ['OCR content.', 'Digital content.']
    assert [block.page_number for block in result.blocks] == [1, 2, 3]
    assert result.blocks[2].type == 'snapshot'
    assert result.blocks[2].image_src
    assert len({block.id for block in result.blocks}) == 3
    assert result.skipped_ocr_pages == [3]
    assert '3' in result.warnings[0]
    assert 'digital footer' not in result.source_text


def test_empty_ocr_preserves_original_picture(service, monkeypatch):
    monkeypatch.setattr(service, '_ocr', lambda image: '')
    result = service.extract(scanned_pdf())
    assert result.ocr_used
    assert len(result.blocks) == 1 and result.blocks[0].image_src
    assert result.warnings and 'trang 1' in result.warnings[0]


def test_zero_ocr_budget_preserves_scan_and_reports_skip(service, monkeypatch):
    service.settings.MAX_OCR_PAGES = 0
    monkeypatch.setattr(service, '_ocr', lambda image: pytest.fail('OCR is disabled'))
    result = service.extract(scanned_pdf())
    assert not result.ocr_used
    assert result.skipped_ocr_pages == [1]
    assert result.blocks[0].type == 'snapshot'
    assert result.blocks[0].image_src


def test_missing_tesseract_keeps_503_error(service, monkeypatch):
    def unavailable(image):
        raise OcrUnavailableError('Tesseract is not installed')

    monkeypatch.setattr(service, '_ocr', unavailable)
    with pytest.raises(OcrUnavailableError):
        service.extract(scanned_pdf())


def test_ocr_timeout_is_a_readable_error(service, monkeypatch):
    monkeypatch.setattr(service, '_ensure_languages', lambda: None)

    def timeout(*args, **kwargs):
        assert kwargs['timeout'] > 0
        raise RuntimeError('Tesseract process timeout')

    monkeypatch.setattr('app.services.text_extraction_service.pytesseract.image_to_string', timeout)
    with Image.new('RGB', (20, 20)) as image, pytest.raises(TextExtractionError, match='timed out'):
        service._ocr(image)


def test_pdf_ocr_pixel_limit_applies_before_render(service, monkeypatch):
    monkeypatch.setattr('app.services.text_extraction_service.MAX_IMAGE_PIXELS', 120_000)
    sizes = []
    monkeypatch.setattr(service, '_ocr', lambda image: sizes.append(image.size) or 'Content.')
    service.extract(scanned_pdf())
    assert sizes and sizes[0][0] * sizes[0][1] <= 120_000


def test_password_and_page_limit_errors(service):
    writer = PdfWriter()
    writer.add_blank_page(600, 800)
    writer.encrypt('private-password')
    output = io.BytesIO()
    writer.write(output)
    with pytest.raises(TextExtractionError, match='password protected'):
        service.extract(output.getvalue())
    service.settings.MAX_PDF_PAGES = 1
    with pytest.raises(TextExtractionError, match='too many pages'):
        service.extract(make_pdf([[], []]))


def test_tiled_scan_is_detected_without_counting_overlaps_twice():
    from pypdf.generic import NameObject, DecodedStreamObject
    from app.services.layout_pdf import pdf_ocr_page_indices

    reader = PdfReader(io.BytesIO(scanned_pdf()))
    page = reader.pages[0]
    resource_name = next(iter(page['/Resources']['/XObject']))
    writer = PdfWriter()
    writer.add_page(page)
    content = DecodedStreamObject()
    content.set_data('\n'.join(
        f'q 300 0 0 400 {x} {y} cm {resource_name} Do Q'
        for x in (0, 300) for y in (0, 400)
    ).encode('ascii'))
    writer.pages[0][NameObject('/Contents')] = writer._add_object(content)
    output = io.BytesIO()
    writer.write(output)
    assert pdf_ocr_page_indices(output.getvalue(), ['']) == [0]

    # Four copies in the same corner cover only 25%, not an entire scan.
    content.set_data(('\n'.join([f'q 300 0 0 400 0 0 cm {resource_name} Do Q'] * 4)).encode('ascii'))
    output = io.BytesIO()
    writer.write(output)
    assert pdf_ocr_page_indices(output.getvalue(), ['']) == []
