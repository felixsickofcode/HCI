import base64
import io

import pytest
from PIL import Image
from pypdf import PdfWriter
from pypdf.generic import DictionaryObject, NameObject, NumberObject, DecodedStreamObject

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
