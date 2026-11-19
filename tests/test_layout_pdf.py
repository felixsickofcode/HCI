import base64
import io

import pytest
from PIL import Image
from pypdf import PdfReader, PdfWriter
from pypdf.generic import DictionaryObject, NameObject, NumberObject, DecodedStreamObject, RectangleObject

from app.services.layout_pdf import Line, parse_layout_pdf, reading_order, reconstruct

pytestmark = pytest.mark.no_db


def sample_pdf(two_tables=False):
    writer = PdfWriter()
    page = writer.add_blank_page(600, 800)
    font = DictionaryObject({NameObject('/Type'): NameObject('/Font'), NameObject('/Subtype'): NameObject('/Type1'), NameObject('/BaseFont'): NameObject('/Helvetica')})
    image = DecodedStreamObject()
    image.set_data(bytes([50, 100, 200]))
    image.update({NameObject('/Type'): NameObject('/XObject'), NameObject('/Subtype'): NameObject('/Image'), NameObject('/Width'): NumberObject(1), NameObject('/Height'): NumberObject(1), NameObject('/ColorSpace'): NameObject('/DeviceRGB'), NameObject('/BitsPerComponent'): NumberObject(8)})
    page[NameObject('/Resources')] = DictionaryObject({NameObject('/Font'): DictionaryObject({NameObject('/F1'): writer._add_object(font)}), NameObject('/XObject'): DictionaryObject({NameObject('/Im0'): writer._add_object(image)})})
    commands = [
        'BT /F1 18 Tf 50 740 Td (1 Introduction) Tj ET',
        'BT /F1 12 Tf 50 700 Td (A paragraph wraps at the page edge) Tj ET',
        'BT /F1 12 Tf 50 684 Td (and must reflow as one paragraph.) Tj ET',
        '50 620 m 550 620 l S', '50 600 m 550 600 l S', '50 560 m 550 560 l S',
        'BT /F1 12 Tf 55 606 Td (Name) Tj 180 0 Td (Value) Tj ET',
        'BT /F1 12 Tf 55 580 Td (TABLE_ONLY) Tj 180 0 Td (42) Tj ET',
        'BT /F1 12 Tf 50 520 Td (The paragraph after the table.) Tj ET',
        'q 120 0 0 60 50 300 cm /Im0 Do Q',
        'BT /F1 12 Tf 295 25 Td (1) Tj ET',
    ]
    if two_tables:
        commands.extend([
            'BT /F1 12 Tf 180 470 Td (Table 2: Another table) Tj ET',
            '50 450 m 550 450 l S', '50 430 m 550 430 l S', '50 390 m 550 390 l S',
            'BT /F1 12 Tf 55 436 Td (Second header) Tj ET',
            'BT /F1 12 Tf 55 410 Td (SECOND_TABLE) Tj ET',
        ])
    content = DecodedStreamObject()
    content.set_data('\n'.join(commands).encode())
    page[NameObject('/Contents')] = writer._add_object(content)
    buffer = io.BytesIO()
    writer.write(buffer)
    return buffer.getvalue()


def test_geometry_reflows_text_and_preserves_table_image_without_duplicates():
    blocks = parse_layout_pdf(sample_pdf())
    assert [block.type for block in blocks] == ['heading', 'paragraph', 'snapshot', 'paragraph', 'snapshot']
    assert blocks[1].text == 'A paragraph wraps at the page edge and must reflow as one paragraph.'
    assert 'TABLE_ONLY' in blocks[2].text
    assert all('TABLE_ONLY' not in block.text for block in blocks if block.type != 'snapshot')
    assert blocks[2].snapshot_kind == 'table'
    assert blocks[4].snapshot_kind == 'image'
    assert len({block.id for block in blocks}) == len(blocks)
    for block in [blocks[2], blocks[4]]:
        png = Image.open(io.BytesIO(base64.b64decode(block.image_src.split(',')[1])))
        assert png.size == (block.image_width, block.image_height)
        assert png.width > 100 and png.height > 100


def test_reading_order_reads_left_column_before_right_column():
    left1 = Line('Left first', (50, 100, 250, 112), 12, False)
    right1 = Line('Right first', (330, 100, 550, 112), 12, False)
    left2 = Line('Left second', (50, 116, 250, 128), 12, False)
    right2 = Line('Right second', (330, 116, 550, 128), 12, False)
    assert [line.text for line in reading_order([left1, right1, left2, right2], 12)] == ['Left first', 'Left second', 'Right first', 'Right second']


def test_same_width_tables_do_not_capture_paragraph_between_them():
    blocks = parse_layout_pdf(sample_pdf(two_tables=True))
    tables = [block for block in blocks if block.snapshot_kind == 'table']
    assert len(tables) == 2
    assert 'TABLE_ONLY' in tables[0].text
    assert 'SECOND_TABLE' in tables[1].text
    assert all('The paragraph after' not in block.text for block in tables)


def test_reconstruction_respects_paragraph_gap_and_dehyphenates():
    blocks = reconstruct([
        Line('Improve accessi-', (50, 100, 250, 112), 12, False),
        Line('bility with reflow.', (50, 116, 250, 128), 12, False),
        Line('A separate paragraph.', (50, 145, 250, 157), 12, False),
    ], 12, 1)
    assert [block.text for block in blocks] == ['Improve accessibility with reflow.', 'A separate paragraph.']


def make_pdf(pages):
    """Small, deterministic fixtures; never depend on private sample PDFs."""
    writer = PdfWriter()
    fonts = {}
    for index, name in enumerate(['Helvetica', 'Helvetica-Bold', 'Courier', 'Symbol'], 1):
        font = DictionaryObject({NameObject('/Type'): NameObject('/Font'),
                                 NameObject('/Subtype'): NameObject('/Type1'),
                                 NameObject('/BaseFont'): NameObject('/' + name)})
        fonts[NameObject(f'/F{index}')] = writer._add_object(font)
    for commands in pages:
        page = writer.add_blank_page(600, 800)
        page[NameObject('/Resources')] = DictionaryObject({NameObject('/Font'): DictionaryObject(fonts)})
        content = DecodedStreamObject()
        content.set_data('\n'.join(commands).encode('ascii'))
        page[NameObject('/Contents')] = writer._add_object(content)
    buffer = io.BytesIO()
    writer.write(buffer)
    return buffer.getvalue()


def test_mixed_fonts_and_scripts_stay_in_their_visual_line():
    blocks = parse_layout_pdf(make_pdf([[
        'BT /F1 12 Tf 50 700 Td (Normal text with ) Tj /F2 12 Tf (bold) Tj /F1 12 Tf ( and ) Tj /F3 12 Tf (NaN) Tj /F1 12 Tf ( plus R) Tj /F1 8 Tf 4 Ts (2) Tj /F1 12 Tf 0 Ts ( continues.) Tj ET',
        'BT /F1 12 Tf 50 684 Td (The second line stays in the same paragraph.) Tj ET',
    ]]))
    assert len(blocks) == 1
    assert blocks[0].type == 'paragraph'
    assert blocks[0].text == 'Normal text with bold and NaN plus R2 continues. The second line stays in the same paragraph.'


def test_columns_stay_together_despite_large_vertical_paragraph_gaps():
    lines = [
        Line('Left first', (50, 100, 250, 112), 12, False),
        Line('Right first', (330, 100, 550, 112), 12, False),
        Line('Left second', (50, 160, 250, 172), 12, False),
        Line('Right second', (330, 160, 550, 172), 12, False),
    ]
    assert [line.text for line in reading_order(lines, 12)] == ['Left first', 'Left second', 'Right first', 'Right second']


def test_spanning_heading_and_footer_do_not_interleave_columns():
    lines = [
        Line('Heading', (50, 50, 550, 70), 18, True),
        Line('Left first', (50, 100, 250, 112), 12, False),
        Line('Right first', (330, 100, 550, 112), 12, False),
        Line('Left second', (50, 160, 250, 172), 12, False),
        Line('Right second', (330, 160, 550, 172), 12, False),
        Line('Footer', (50, 200, 550, 212), 12, False),
    ]
    assert [line.text for line in reading_order(lines, 12)] == [
        'Heading', 'Left first', 'Left second', 'Right first', 'Right second', 'Footer',
    ]


def test_display_equation_is_preserved_and_inline_equation_reflows():
    blocks = parse_layout_pdf(make_pdf([[
        'BT /F1 12 Tf 50 720 Td (This paragraph introduces a displayed equation.) Tj ET',
        'BT /F1 12 Tf 180 680 Td (y = ) Tj /F4 12 Tf (abc) Tj ET',
        'BT /F1 12 Tf 50 640 Td (Ordinary prose with x = ) Tj /F4 12 Tf (abc) Tj /F1 12 Tf ( remains readable as text.) Tj ET',
    ]]))
    assert [block.type for block in blocks] == ['paragraph', 'snapshot', 'paragraph']
    assert blocks[1].snapshot_kind == 'image'
    assert 'y =' in blocks[1].text
    assert 'y =' not in blocks[0].text + blocks[2].text
    assert 'Ordinary prose with x =' in blocks[2].text


def test_figure_prevents_joining_text_on_either_side():
    # Very thin table, with text close enough that paragraph reconstruction
    # alone would join the two lines across it.
    blocks = parse_layout_pdf(make_pdf([[
        'BT /F1 12 Tf 50 710 Td (The paragraph before the figure extends across the page.) Tj ET',
        '50 705 m 550 705 l S', '50 703 m 550 703 l S', '50 701 m 550 701 l S',
        'BT /F1 12 Tf 50 688 Td (The paragraph after the figure extends across the page.) Tj ET',
    ]]))
    assert [block.type for block in blocks] == ['paragraph', 'snapshot', 'paragraph']
    assert 'before' in blocks[0].text and 'after' not in blocks[0].text
    assert 'after' in blocks[2].text


def test_caption_below_table_is_in_snapshot_once():
    blocks = parse_layout_pdf(make_pdf([[
        '50 650 m 550 650 l S', '50 630 m 550 630 l S', '50 610 m 550 610 l S',
        'BT /F1 12 Tf 60 635 Td (Header) Tj ET',
        'BT /F1 12 Tf 60 615 Td (Value) Tj ET',
        'BT /F1 12 Tf 170 590 Td (Table 1: A caption below.) Tj ET',
        'BT /F1 12 Tf 50 550 Td (The paragraph after the caption.) Tj ET',
    ]]))
    assert blocks[0].type == 'snapshot'
    assert 'Table 1: A caption below.' in blocks[0].text
    assert all('Table 1:' not in block.text for block in blocks[1:])


def test_wrapped_heading_and_list_continuation_keep_structure():
    blocks = reconstruct([
        Line('A long heading', (50, 100, 250, 118), 18, True),
        Line('continues here', (50, 121, 240, 139), 18, True),
        Line('1. First item', (50, 160, 250, 172), 12, False),
        Line('continues here.', (65, 176, 250, 188), 12, False),
        Line('An ordinary paragraph.', (50, 192, 250, 204), 12, False),
    ], 12, 1)
    assert [(block.type, block.text) for block in blocks] == [
        ('heading', 'A long heading continues here'),
        ('listItem', '1. First item continues here.'),
        ('paragraph', 'An ordinary paragraph.'),
    ]


@pytest.mark.parametrize('text', ['3.14 is a decimal.', '-5 is negative.', '(t-1) is an expression.'])
def test_numeric_and_math_prefixes_are_not_list_markers(text):
    assert reconstruct([Line(text, (50, 100, 300, 112), 12, False)], 12, 1)[0].type == 'paragraph'


def test_snapshot_respects_cropbox_and_nonzero_page_origin():
    reader = PdfReader(io.BytesIO(sample_pdf()))
    page = reader.pages[0]
    page.cropbox = RectangleObject([20, 200, 580, 780])
    writer = PdfWriter()
    writer.add_page(page)
    data = io.BytesIO()
    writer.write(data)
    blocks = parse_layout_pdf(data.getvalue())
    assert len([block for block in blocks if block.type == 'snapshot']) == 2
    assert all(block.text != '1' for block in blocks)
    table = next(block for block in blocks if block.snapshot_kind == 'table')
    assert 'TABLE_ONLY' in table.text
    with Image.open(io.BytesIO(base64.b64decode(table.image_src.split(',')[1]))) as image:
        # Table crop contains its black rules, not a white/misaligned area.
        assert min(image.convert('L').getdata()) < 30
        assert image.width > image.height * 3


def test_overprinted_glyphs_are_not_read_twice():
    blocks = parse_layout_pdf(make_pdf([[
        'BT /F1 12 Tf 50 700 Td (Overprinted text.) Tj ET',
        'BT /F1 12 Tf 50 700 Td (Overprinted text.) Tj ET',
    ]]))
    assert [block.text for block in blocks] == ['Overprinted text.']


def test_wrapped_caption_is_included_without_consuming_next_paragraph():
    blocks = parse_layout_pdf(make_pdf([[
        '50 650 m 550 650 l S', '50 630 m 550 630 l S', '50 610 m 550 610 l S',
        'BT /F1 12 Tf 60 635 Td (Header) Tj ET',
        'BT /F1 12 Tf 60 615 Td (Value) Tj ET',
        'BT /F1 12 Tf 170 590 Td (Table 1: A caption that wraps) Tj ET',
        'BT /F1 12 Tf 170 575 Td (onto its second line.) Tj ET',
        'BT /F1 12 Tf 50 535 Td (The next paragraph is still reflowable.) Tj ET',
    ]]))
    assert [block.type for block in blocks] == ['snapshot', 'paragraph']
    assert 'onto its second line.' in blocks[0].text
    assert blocks[1].text == 'The next paragraph is still reflowable.'


@pytest.mark.parametrize('rotation', [0, 90, 180, 270])
def test_raster_snapshot_is_aligned_on_rotated_and_shifted_pages(rotation):
    from pypdf import Transformation

    reader = PdfReader(io.BytesIO(sample_pdf()))
    page = reader.pages[0]
    page.add_transformation(Transformation().translate(100, 200))
    page.mediabox = RectangleObject([100, 200, 700, 1000])
    page.cropbox = RectangleObject([130, 410, 650, 970])
    page.rotate(rotation)
    writer = PdfWriter()
    writer.add_page(page)
    output = io.BytesIO()
    writer.write(output)
    blocks = parse_layout_pdf(output.getvalue())
    figure = next(block for block in blocks if block.snapshot_kind == 'image')
    with Image.open(io.BytesIO(base64.b64decode(figure.image_src.split(',')[1]))) as image:
        assert image.convert('RGB').getpixel((image.width // 2, image.height // 2)) == (50, 100, 200)


def test_parallel_parses_produce_complete_independent_results():
    from concurrent.futures import ThreadPoolExecutor

    data = sample_pdf()
    with ThreadPoolExecutor(max_workers=4) as executor:
        results = list(executor.map(parse_layout_pdf, [data] * 8))
    expected = [(block.type, block.text, block.image_src) for block in results[0]]
    assert all([(block.type, block.text, block.image_src) for block in result] == expected for result in results)
