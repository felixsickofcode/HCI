"""Run the current extraction service without importing the API or using a DB."""

from __future__ import annotations

import argparse
import os
import time
from dataclasses import asdict
from pathlib import Path

from benchmarks.pdf.contracts import write_json


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--max-upload-mb", type=int, default=10)
    parser.add_argument("--max-pdf-pages", type=int, default=100)
    parser.add_argument("--max-ocr-pages", type=int, default=10)
    parser.add_argument("--ocr-languages", default="vie+eng")
    parser.add_argument("--tesseract-cmd")
    args = parser.parse_args()

    # Importing app.core.config constructs Settings at module scope. Give it an
    # inert URL so this offline worker never depends on or connects to a DB.
    os.environ["DATABASE_URL"] = "postgresql+psycopg://bench:bench@127.0.0.1/bench_unused"
    from app.core.config import Settings
    from app.schemas.text_extraction import ExtractedTextRead, ReadingBlockRead
    from app.services.text_extraction_service import TextExtractionService

    data = args.input.read_bytes()
    if len(data) > args.max_upload_mb * 1024 * 1024:
        raise ValueError("input exceeds baseline upload limit")
    settings = Settings(
        DATABASE_URL=os.environ["DATABASE_URL"],
        MAX_UPLOAD_MB=args.max_upload_mb,
        MAX_PDF_PAGES=args.max_pdf_pages,
        MAX_OCR_PAGES=args.max_ocr_pages,
        OCR_LANGUAGES=args.ocr_languages,
        TESSERACT_CMD=args.tesseract_cmd,
        _env_file=None,
    )
    started = time.perf_counter()
    result = TextExtractionService(settings).extract(data)
    parse_seconds = time.perf_counter() - started
    native = asdict(result)
    args.output.mkdir(parents=True, exist_ok=True)
    write_json(args.output / "native" / "result.json", native)

    blocks = [ReadingBlockRead.model_validate(asdict(block)) for block in result.blocks]
    normalized = ExtractedTextRead(
        text=result.text,
        source=result.source,
        page_count=result.page_count,
        char_count=len(result.text),
        ocr_used=result.ocr_used,
        source_text=result.source_text,
        blocks=blocks,
        warnings=result.warnings,
        skipped_ocr_pages=result.skipped_ocr_pages,
    )
    write_json(args.output / "normalized.json", normalized.model_dump(by_alias=True))
    write_json(
        args.output / "provenance.json",
        {
            "nativeToNormalized": {block.id: block.id for block in result.blocks},
            "blocksWithBbox": sum(block.source_bbox is not None for block in result.blocks),
            "blockCount": len(result.blocks),
        },
    )
    write_json(
        args.output / "worker.json",
        {
            "parseSeconds": parse_seconds,
            "status": "partial" if result.skipped_ocr_pages else "success",
            "warnings": result.warnings,
            "skippedOcrPages": result.skipped_ocr_pages,
        },
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
