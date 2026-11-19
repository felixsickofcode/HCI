"""PyMuPDF 2.1 native JSON worker; normalization runs in the base environment."""

from __future__ import annotations

import argparse
import importlib.metadata
import json
import sys
import time
from pathlib import Path

from benchmarks.pdf.contracts import write_json


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    import pymupdf

    started = time.perf_counter()
    with pymupdf.open(str(args.input)) as document:
        native = json.loads(document.to_json())
    parse_seconds = time.perf_counter() - started
    write_json(args.output / "native" / "pymupdf.json", native)
    write_json(args.output / "worker.json", {
        "status": "success",
        "parseSeconds": parse_seconds,
        "python": sys.version,
        "packageFreeze": sorted(
            f"{distribution.metadata['Name']}=={distribution.version}"
            for distribution in importlib.metadata.distributions()
            if distribution.metadata.get("Name")
        ),
        "packageVersions": {
            "pymupdf": importlib.metadata.version("pymupdf"),
            "pymupdf-layout": importlib.metadata.version("pymupdf-layout"),
            "pymupdf4llm": importlib.metadata.version("pymupdf4llm"),
        },
        "mode": "Document.to_json; native use_ocr=0",
    })
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
