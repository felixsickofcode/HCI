import pytest

from benchmarks.pdf.evaluate import edit_distance, normalize_for_cer, score_page

pytestmark = pytest.mark.no_db


def test_cer_preserves_vietnamese_diacritics_and_numbers():
    assert normalize_for_cer("Điện\n  áp 220 V") == "Điện áp 220 V"
    assert edit_distance("Điện áp 220 V", "Điện áp 120 V") == 1
    assert edit_distance("không", "khong") == 1


def test_order_score_reports_missing_blocks_in_coverage():
    reference = {
        "pageNumber": 1,
        "text": "Title\nFirst\nSecond",
        "blocks": [
            {"id": "a", "type": "heading", "text": "Title"},
            {"id": "b", "type": "paragraph", "text": "First"},
            {"id": "c", "type": "paragraph", "text": "Second"},
        ],
        "before": [["a", "b"], ["b", "c"]],
    }
    actual = [
        {"type": "paragraph", "text": "First"},
        {"type": "heading", "text": "Title"},
    ]
    score = score_page(reference, actual)
    assert score["matchedBlocks"] == 2
    assert score["referenceBlocks"] == 3
    assert score["correctOrderPairs"] == 0
    assert score["comparableOrderPairs"] == 1
    assert score["referenceOrderPairs"] == 2
    assert score["cer"] > 0
