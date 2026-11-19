# Offline PDF parser evaluation

This directory implements the first reproducible slice of the [evaluation plan](../../docs/pdf-parser-evaluation-plan.md): a public smoke fixture, isolated B0/P0/M0 workers, adapters, an append-only run harness, and initial scoring. It does not change the API parser or the reader UI.

## Current coverage

- `synthetic-simple` is generated with pypdf and a built-in ASCII font. Its ground truth is known from the generator, but it **cannot** establish Vietnamese, OCR, table, or multi-column quality.
- `manifest.json` is deliberately small. Add reviewed, shareable PDFs and ground truth before making parser quality claims. Put private manifests and PDFs under `benchmarks/pdf/local/`, which is ignored by Git.
- Runnable engines: `baseline` (B0), `pymupdf` (P0, PyMuPDF 2.1 `Document.to_json`, no OCR), and `marker` (M0, Marker 2.2.0 `fast` CPU, no optional LLM). Package versions are pinned in `requirements-pymupdf.txt` and `requirements-marker.txt`; transitive package freeze is stored in each run.
- M1 requires an agreed provider/model, permission for each input, and a cost limit. Do not pass local/private PDFs to a provider by default.

## Run B0

From the repository root, with backend requirements installed:

```powershell
python -m benchmarks.pdf.fixtures
python -m benchmarks.pdf.run --manifest benchmarks/pdf/manifest.json --engine baseline
python -m benchmarks.pdf.evaluate --run output/pdf-evaluation/<run-id>
python -m pytest tests/test_pdf_benchmark.py tests/test_pdf_benchmark_adapters.py tests/test_pdf_benchmark_evaluate.py tests/test_text_blocks.py tests/test_layout_pdf.py
```

Runs go to ignored `output/pdf-evaluation/<UTC-run-id>/`. Every run stores a snapshot of the manifest with input SHA-256, `environment.json` with baseline source hashes and Git state, `native/result.json`, `normalized.json`, `provenance.json`, `worker.json`, `status.json`, and `summary.json`. The worker imports the extraction service directly with an inert database URL. It does not import the API server or connect to a database.

Optional `--config benchmarks/pdf/local/config.json` accepts `workerPython`, `timeoutSeconds`, `maxUploadMb`, `maxPdfPages`, `maxOcrPages`, `ocrLanguages`, and `tesseractCmd`. Candidate engines require `workerPython`; Marker also requires `modelCache` and explicit `mode` (`fast` or `no_ocr`). The default timeout is 300 seconds per document. The local config path, Tesseract path, and model cache path are not written to metadata. A config for a 900-second long-document run can set `timeoutSeconds` to 900. Runs are sequential; a timeout stops the worker process tree. Peak RSS is sampled for the process tree when `psutil` is installed in the **harness** Python; otherwise it is `null`. The elapsed value includes worker startup, parse, normalization, and artifact writes. `parseSeconds` is measured inside the worker.

Create candidate environments separately; this does not alter backend requirements:

```powershell
uv --cache-dir benchmarks/pdf/local/uv-cache venv --python 3.12 benchmarks/pdf/.venv-pymupdf
uv --cache-dir benchmarks/pdf/local/uv-cache pip install --python benchmarks/pdf/.venv-pymupdf/Scripts/python.exe -r benchmarks/pdf/requirements-pymupdf.txt
uv --cache-dir benchmarks/pdf/local/uv-cache venv --python 3.12 benchmarks/pdf/.venv-marker
uv --cache-dir benchmarks/pdf/local/uv-cache pip install --python benchmarks/pdf/.venv-marker/Scripts/python.exe -r benchmarks/pdf/requirements-marker.txt
```

Create local config files under ignored `benchmarks/pdf/local/` with the correct worker Python. Example P0 config: `{"workerPython":"benchmarks/pdf/.venv-pymupdf/Scripts/python.exe","timeoutSeconds":300}`. Example M0 config: `{"workerPython":"benchmarks/pdf/.venv-marker/Scripts/python.exe","modelCache":"benchmarks/pdf/model-cache","mode":"fast","timeoutSeconds":300}`. Marker needs a one-time model/font setup with network access before the offline harness run; its worker sets cache paths under the workspace, UTF-8 mode, and `HF_HUB_OFFLINE=1`. M0 never passes `--use_llm`.

```powershell
python -m benchmarks.pdf.run --engine pymupdf --config benchmarks/pdf/local/pymupdf-config.json
python -m benchmarks.pdf.run --engine marker --config benchmarks/pdf/local/marker-config.json
```

The output directory contains extracted text and possibly embedded snapshot images. Keep it local. No benchmark command sends a file to an external provider.

## Review in the actual reader component

Chrome visual QA on 2026-11-15 covered both local PDFs, all three engines, and both target viewports. Screenshots and metrics are kept locally in `output/pdf-evaluation/browser-qa/`; findings are in `docs/pdf-parser-evaluation-results.md`.

Run `npm run dev` from `frontend/`, then open `/dev/pdf-review` on that local Vite server. Select any run's `normalized.json` and, optionally, its original PDF. The route uses the product's `ReadingText` and `SnapshotFigure` components with shared font size, column width, and theme controls; the browser reads files locally and does not upload them. Check at 390×844 and 1440×1000. The route is gated by `import.meta.env.DEV` and is absent from the production build.

## Local PDF smoke tests

The two files in `sample_pdf/` have permission for **local use only**. They are not in the public manifest. To smoke-test them, use ignored `benchmarks/pdf/local/manifest.json` with paths relative to that file (for example `../../../sample_pdf/easy.pdf`), unique case IDs, labels, `providerAllowed: false`, and source/share scope. A successful parse alone is only a setup check.

User-confirmed local source checks for pages `easy:2` and `difficult:4,6` are in ignored `benchmarks/pdf/local/ground_truth/`. They were transcribed from rendered originals. They cover selected headings, table terms, snapshot counts, and the near-empty page; they do not cover full-page CER or all 22 pages. Run scoring explicitly:

```powershell
python -m benchmarks.pdf.evaluate --run output/pdf-evaluation/<run-id> --ground-truth-dir benchmarks/pdf/local/ground_truth
```

The evaluator does not score drafts unless `--include-draft` is explicit. It checks the PDF SHA-256 before using any ground truth. `report.py` compares runs only when all case IDs and input hashes match; it preserves unscored cases and labels exploratory results. The local comparison is written to ignored `output/pdf-evaluation/local-comparison.md`.

## Status and next steps

`success` means a worker returned an artifact. `partial` marks skipped OCR pages or P0 pages with no text; a fully textless P0 document is `unsupported`. `timeout` and `error` remain in the run summary. An error may leave incomplete native files for local inspection. The harness records a generic diagnostic in `status.json` to avoid copying private PDF content from a traceback. `evaluate.py` scores only a known synthetic or reviewed ground-truth case; other cases remain `not_scored`. The built-in CER uses NFC and collapsed whitespace, keeps case, signs, punctuation, digits, and units. Order score reports both comparable pairs and match coverage.

Smoke tests completed for the synthetic case and two private local PDFs. On the synthetic case, B0 and P0 have CER 0/90; M0 has 16/90 because its native JSON contained an empty heading. This is one setup finding, not a quality ranking. Next: add a distributable Vietnamese corpus and manually reviewed ground truth, expand scoring for tables/figures/formulas and order, run cold/three warm repetitions, and QA identical reader views. M1 remains unrun until provider/model, sample permission, and budget are agreed. Keep the product pipeline on B0 until the comparison supports a change.
