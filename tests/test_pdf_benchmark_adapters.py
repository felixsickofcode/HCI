import json
import uuid
from pathlib import Path

import pytest

from benchmarks.pdf.adapters.marker import _inert_text, normalize as normalize_marker
from benchmarks.pdf.adapters.pymupdf import normalize as normalize_pymupdf
from benchmarks.pdf.fixtures import build_simple_pdf

pytestmark = pytest.mark.no_db
ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture
def case_dir():
    path = ROOT / "output/pdf-evaluation" / f"adapter-test-{uuid.uuid4().hex}"
    path.mkdir(parents=True)
    return path


def test_pymupdf_adapter_maps_heading_and_snapshot_with_provenance(case_dir):
    pdf = case_dir / "simple.pdf"
    build_simple_pdf(pdf)
    native = {
        "page_count": 1,
        "pages": [{"page_number": 1, "width": 600, "height": 800, "boxes": [
            {"boxclass": "section-header", "header_level": 1,
             "x0": 50, "y0": 40, "x1": 200, "y1": 70,
             "textlines": [{"spans": [{"text": "Simple document"}]}]},
            {"boxclass": "table", "x0": 50, "y0": 100, "x1": 300, "y1": 150,
             "table": {"extract": [["A", "B"], ["1", "2"]]}, "textlines": None},
        ]}],
    }
    normalize_pymupdf(native, pdf, case_dir)
    output = json.loads((case_dir / "normalized.json").read_text(encoding="utf-8"))
    assert [block["type"] for block in output["blocks"]] == ["heading", "snapshot"]
    assert output["blocks"][0]["headingLevel"] == 2
    assert output["blocks"][1]["snapshotKind"] == "table"
    assert output["blocks"][1]["text"] == "A\tB\n1\t2"
    assert output["blocks"][1]["sourceBbox"] == [50, 100, 300, 150]
    provenance = json.loads((case_dir / "provenance.json").read_text(encoding="utf-8"))
    assert provenance["nativeToNormalized"] == {"p1-b0": "block-1", "p1-b1": "block-2"}


def test_pymupdf_adapter_restores_spaces_between_word_spans(case_dir):
    pdf = case_dir / "simple.pdf"
    build_simple_pdf(pdf)
    native = {"page_count": 1, "pages": [{
        "page_number": 1, "width": 600, "height": 800,
        "boxes": [{"boxclass": "section-header", "header_level": 1,
                   "x0": 50, "y0": 40, "x1": 180, "y1": 70,
                   "textlines": [{"spans": [
                       {"text": "Simple", "bbox": [50, 40, 95, 60], "size": 18},
                       {"text": "document", "bbox": [100, 40, 180, 60], "size": 18},
                   ]}]}],
    }]}
    normalize_pymupdf(native, pdf, case_dir)
    output = json.loads((case_dir / "normalized.json").read_text(encoding="utf-8"))
    assert output["blocks"][0]["text"] == "Simple document"


def test_marker_adapter_resolves_refs_and_keeps_html_inert(case_dir):
    pdf = case_dir / "simple.pdf"
    build_simple_pdf(pdf)
    native = {"block_type": "Document", "children": [{
        "id": "/page/0/Page/0", "block_type": "Page", "bbox": [0, 0, 600, 800],
        "html": "<content-ref src='/heading'></content-ref><content-ref src='/body'></content-ref>",
        "children": [
            {"id": "/body", "block_type": "Text", "bbox": [50, 100, 300, 130],
             "html": "<p>Safe &amp; sound</p><script>bad()</script>", "children": None},
            {"id": "/heading", "block_type": "SectionHeader", "bbox": [50, 40, 200, 70],
             "html": "<h1>Title</h1>", "children": None},
        ],
    }]}
    normalize_marker(native, pdf, case_dir)
    output = json.loads((case_dir / "normalized.json").read_text(encoding="utf-8"))
    assert [block["text"] for block in output["blocks"]] == ["Title", "Safe & sound"]
    assert output["blocks"][0]["headingLevel"] == 2
    assert "bad()" not in output["text"]
    assert _inert_text("<p>A<br>B</p>") == "A\nB"


def test_marker_adapter_rejects_unresolved_reference(case_dir):
    pdf = case_dir / "simple.pdf"
    build_simple_pdf(pdf)
    native = {"block_type": "Document", "children": [{
        "block_type": "Page", "bbox": [0, 0, 600, 800],
        "html": "<content-ref src='/missing'></content-ref>", "children": [],
    }]}
    with pytest.raises(ValueError, match="content-ref"):
        normalize_marker(native, pdf, case_dir)
