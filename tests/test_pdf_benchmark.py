import json
import sys
import uuid
from pathlib import Path

import pytest

from benchmarks.pdf.contracts import read_manifest, sha256_file
from benchmarks.pdf.fixtures import build_simple_pdf
from benchmarks.pdf.run import _run_worker

pytestmark = pytest.mark.no_db
ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture
def case_dir():
    # The managed Windows workspace cannot use pytest's OS temp directory.
    path = ROOT / "output/pdf-evaluation" / f"test-{uuid.uuid4().hex}"
    path.mkdir(parents=True)
    return path


def test_manifest_tracks_exact_pdf_and_rejects_escape(case_dir):
    pdf = case_dir / "simple.pdf"
    build_simple_pdf(pdf)
    manifest = case_dir / "manifest.json"
    manifest.write_text(json.dumps({
        "schemaVersion": 1,
        "cases": [{"caseId": "simple", "path": "simple.pdf"}],
    }))
    cases = read_manifest(manifest, case_dir)
    assert cases[0]["sha256"] == sha256_file(pdf)
    assert cases[0]["byteCount"] == pdf.stat().st_size

    manifest.write_text(json.dumps({
        "schemaVersion": 1,
        "cases": [{"caseId": "escape", "path": "../outside.pdf"}],
    }))
    with pytest.raises((ValueError, FileNotFoundError)):
        read_manifest(manifest, case_dir)


def test_baseline_worker_writes_native_and_normalized_without_database(case_dir):
    pdf = case_dir / "simple.pdf"
    build_simple_pdf(pdf)
    output = case_dir / "case"
    status = _run_worker([
        sys.executable, "-m", "benchmarks.pdf.workers.baseline",
        "--input", str(pdf), "--output", str(output),
    ], timeout=30, case_dir=output)
    assert status["status"] == "success"
    native = json.loads((output / "native/result.json").read_text(encoding="utf-8"))
    normalized = json.loads((output / "normalized.json").read_text(encoding="utf-8"))
    provenance = json.loads((output / "provenance.json").read_text(encoding="utf-8"))
    assert native["source"] == "pdf"
    assert normalized["pageCount"] == 1
    assert normalized["text"] == "\n\n".join(block["text"] for block in normalized["blocks"])
    assert len(normalized["blocks"]) == len(provenance["nativeToNormalized"])
    assert all(block["pageNumber"] == 1 for block in normalized["blocks"])


def test_worker_timeout_returns_status_without_hanging(case_dir):
    status = _run_worker(
        [sys.executable, "-c", "import time; time.sleep(5)"],
        timeout=1,
        case_dir=case_dir,
    )
    assert status["status"] == "timeout"
    assert status["errorType"] == "TimeoutExpired"
