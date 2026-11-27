import pytest

from app.services.text_blocks import (
    blocks_to_text,
    normalize_math_word,
    normalize_source_text,
    parse_blocks,
    strip_math_variation_selectors,
)

pytestmark = pytest.mark.no_db


def test_normalize_giu_xuong_dong_va_gioi_han_dong_trong():
    normalized = normalize_source_text("  Dòng một\r\n\tDòng  hai \r\n\r\n\r\n\r\nDòng ba  ")

    assert normalized == "Dòng một\nDòng hai\n\nDòng ba"


def test_doan_giu_xuong_dong_mem_va_tach_theo_dong_trong():
    blocks = parse_blocks("Dòng đầu\nvẫn trong đoạn một.\n\nĐoạn thứ hai.")

    assert [block.type for block in blocks] == ["paragraph", "paragraph"]
    assert blocks[0].text == "Dòng đầu\nvẫn trong đoạn một."
    assert blocks[1].text == "Đoạn thứ hai."


def test_tieu_de_danh_sach_va_trich_dan():
    blocks = parse_blocks(
        "# Tiêu đề lớn\n\n### Mục nhỏ\n\n- Ý một\n- Ý hai\n\n1. Bước một\n"
        "2. Bước hai\n\n> Trích dẫn một\n> Trích dẫn hai"
    )

    assert blocks[0].type == "heading"
    assert blocks[0].text == "Tiêu đề lớn"
    assert blocks[0].heading_level == 1
    assert blocks[1].type == "heading"
    assert blocks[1].heading_level == 3
    assert [(block.type, block.list_kind, block.text) for block in blocks[2:4]] == [
        ("listItem", "unordered", "Ý một"),
        ("listItem", "unordered", "Ý hai"),
    ]
    assert [(block.list_kind, block.text) for block in blocks[4:6]] == [
        ("ordered", "Bước một"),
        ("ordered", "Bước hai"),
    ]
    assert blocks[6].type == "quote"
    assert blocks[6].text == "Trích dẫn một\nTrích dẫn hai"


def test_dong_ngan_doc_lap_duoc_goi_y_lam_tieu_de():
    blocks = parse_blocks("Chương mở đầu\n\nĐây là đoạn văn có câu kết thúc.")

    assert blocks[0].type == "heading"
    assert blocks[0].heading_level == 2
    assert blocks[1].type == "paragraph"


def test_gan_so_trang_va_id_duy_nhat():
    blocks = parse_blocks("Đoạn một.\n\nĐoạn hai.", page_number=4)

    assert len(blocks) == 2
    assert all(block.page_number == 4 for block in blocks)
    assert len({block.id for block in blocks}) == len(blocks)


def test_blocks_to_text_khong_mat_chu():
    source = (
        "# Tiêu đề\n\nĐoạn một\nvới xuống dòng.\n\n"
        "- Mục A\n- Mục B\n\n> Trích dẫn\n\nĐoạn cuối."
    )
    text = blocks_to_text(parse_blocks(source))

    for phrase in (
        "Tiêu đề",
        "Đoạn một\nvới xuống dòng.",
        "Mục A",
        "Mục B",
        "Trích dẫn",
        "Đoạn cuối.",
    ):
        assert phrase in text


def test_khong_tach_tu_khi_khong_co_tin_hieu():
    blocks = parse_blocks("một hai ba\nbốn năm sáu")

    assert len(blocks) == 1
    assert blocks[0].type == "paragraph"
    assert blocks[0].text == "một hai ba\nbốn năm sáu"


def test_bo_variation_selector_sau_glyph_toan():
    assert strip_math_variation_selectors("\u2211\ufe01 x") == "\u2211 x"
    assert strip_math_variation_selectors("\u02c6\ufe01") == "\u02c6"


def test_giu_variation_selector_cua_emoji():
    assert strip_math_variation_selectors("\u2764\ufe0f") == "\u2764\ufe0f"


def test_doi_micro_thanh_mu_hy_lap_chi_trong_font_toan():
    assert normalize_math_word("\u00b5", math_font=True) == "\u03bc"
    assert normalize_math_word("\u00b5g", math_font=False) == "\u00b5g"
