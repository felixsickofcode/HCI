"""Run one PDF parser configuration over a fixed manifest, offline.

Runs are append-only directories. Worker dependencies may live in another
Python environment; file paths are passed as arguments, never via a shell.
"""

from __future__ import annotations

import argparse
import base64
import importlib.metadata
import json
import os
import platform
import subprocess
import sys
import threading
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

from benchmarks.pdf.contracts import read_manifest, sha256_file, write_json

ROOT = Path(__file__).resolve().parents[2]
BASELINE_FILES = (
    "app/services/text_extraction_service.py",
    "app/services/layout_pdf.py",
    "app/services/pdf_rendering.py",
    "app/services/text_blocks.py",
    "app/schemas/text_extraction.py",
    "app/core/config.py",
)
WORKERS = {
    "baseline": "benchmarks.pdf.workers.baseline",
    "pymupdf": "benchmarks.pdf.workers.pymupdf",
    "marker": "benchmarks.pdf.workers.marker",
}


def _git(*args: str) -> str | None:
    try:
        return subprocess.check_output(
            ["git", *args], cwd=ROOT, text=True, encoding="utf-8", stderr=subprocess.DEVNULL
        ).strip()
    except (OSError, subprocess.CalledProcessError):
        return None


def _environment() -> dict:
    freeze = sorted(
        f"{distribution.metadata['Name']}=={distribution.version}"
        for distribution in importlib.metadata.distributions()
        if distribution.metadata.get("Name")
    )
    packages = {}
    for package in ("pypdf", "pdfplumber", "pypdfium2", "pytesseract", "pydantic", "Pillow"):
        try:
            packages[package] = importlib.metadata.version(package)
        except importlib.metadata.PackageNotFoundError:
            packages[package] = None
    return {
        "harnessPython": sys.version,
        "harnessExecutable": sys.executable,
        "os": platform.platform(),
        "cpu": platform.processor(),
        "logicalCpus": os.cpu_count(),
        "packages": packages,
        "packageFreeze": freeze,
        "gitHead": _git("rev-parse", "HEAD"),
        "gitStatus": _git("status", "--short"),
        "baselineSha256": {name: sha256_file(ROOT / name) for name in BASELINE_FILES},
    }


def _kill_tree(process: subprocess.Popen) -> None:
    if os.name == "nt":
        subprocess.run(
            ["taskkill", "/PID", str(process.pid), "/T", "/F"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False,
        )
    else:
        import signal

        os.killpg(process.pid, signal.SIGKILL)
    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait()


def _measure_memory(pid: int, stop: threading.Event, samples: list[int]) -> None:
    try:
        import psutil

        parent = psutil.Process(pid)
        while not stop.is_set():
            processes = [parent, *parent.children(recursive=True)]
            rss = 0
            for process in processes:
                try:
                    rss += process.memory_info().rss
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
            samples.append(rss)
            stop.wait(0.05)
    except Exception:
        return


def _run_worker(command: list[str], timeout: int, case_dir: Path) -> dict:
    started = time.perf_counter()
    creationflags = subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0
    try:
        process = subprocess.Popen(
            command,
            cwd=ROOT,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="replace",
            creationflags=creationflags,
            start_new_session=os.name != "nt",
        )
    except OSError:
        return {
            "status": "error", "exitCode": None,
            "elapsedSeconds": time.perf_counter() - started,
            "peakRssBytesObserved": None, "parseSeconds": None,
            "errorType": "WorkerLaunchError",
            "diagnostic": "Could not start worker interpreter.",
        }
    stop = threading.Event()
    samples: list[int] = []
    monitor = threading.Thread(target=_measure_memory, args=(process.pid, stop, samples), daemon=True)
    monitor.start()
    try:
        _, stderr = process.communicate(timeout=timeout)
        timed_out = False
    except subprocess.TimeoutExpired:
        _kill_tree(process)
        _, stderr = process.communicate()
        timed_out = True
    finally:
        stop.set()
        monitor.join(timeout=1)
    elapsed = time.perf_counter() - started
    worker_path = case_dir / "worker.json"
    worker = json.loads(worker_path.read_text(encoding="utf-8")) if worker_path.exists() else {}
    status = "timeout" if timed_out else worker.get("status", "error") if process.returncode == 0 else "error"
    return {
        "status": status,
        "exitCode": process.returncode,
        "elapsedSeconds": elapsed,
        "peakRssBytesObserved": max(samples) if samples else None,
        "parseSeconds": worker.get("parseSeconds"),
        "errorType": None if status in {"success", "partial"} else (
            "TimeoutExpired" if timed_out else "WorkerError"
        ),
        # Worker traceback may include private paths or extracted content.
        "diagnostic": None if status in {"success", "partial"} else (
            "Worker exited without output; inspect local stderr during a manual retry."
            if not stderr else "Worker exited with an error; rerun locally for traceback."
        ),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=ROOT / "benchmarks/pdf/manifest.json")
    parser.add_argument("--engine", choices=sorted(WORKERS), default="baseline")
    parser.add_argument("--config", type=Path, help="local JSON; baseline keys documented in README")
    parser.add_argument("--output-root", type=Path, default=ROOT / "output/pdf-evaluation")
    args = parser.parse_args()
    config = json.loads(args.config.read_text(encoding="utf-8")) if args.config else {}
    allowed = {"workerPython", "timeoutSeconds", "maxUploadMb", "maxPdfPages", "maxOcrPages", "ocrLanguages", "tesseractCmd", "modelCache", "mode"}
    unknown = set(config) - allowed
    if unknown:
        parser.error(f"unknown config keys: {', '.join(sorted(unknown))}")
    timeout = int(config.get("timeoutSeconds", 300))
    if timeout < 1:
        parser.error("timeoutSeconds must be positive")
    worker_python = str(config.get("workerPython", sys.executable))
    if args.engine != "baseline" and "workerPython" not in config:
        parser.error("candidate engines require workerPython in a local config")
    if args.engine == "marker" and ("modelCache" not in config or config.get("mode") not in {"fast", "no_ocr"}):
        parser.error("Marker requires modelCache and explicit mode=fast|no_ocr")
    cases = read_manifest(args.manifest.resolve(), ROOT)
    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "-" + args.engine + "-" + uuid.uuid4().hex[:8]
    run_dir = args.output_root.resolve() / run_id
    run_dir.mkdir(parents=True, exist_ok=False)
    snapshot = [{key: value for key, value in case.items() if key != "_source"} for case in cases]
    write_json(run_dir / "manifest.snapshot.json", {"schemaVersion": 1, "cases": snapshot})
    environment = _environment()
    benchmark_files = [
        "benchmarks/pdf/run.py", "benchmarks/pdf/contracts.py",
        f"benchmarks/pdf/workers/{args.engine}.py",
    ]
    if args.engine != "baseline":
        benchmark_files.append(f"benchmarks/pdf/adapters/{args.engine}.py")
    environment["benchmarkSha256"] = {
        name: sha256_file(ROOT / name) for name in benchmark_files
    }
    environment["workerPython"] = worker_python
    environment["config"] = {key: value for key, value in config.items() if key not in {"workerPython", "tesseractCmd", "modelCache"}}
    write_json(run_dir / "environment.json", environment)
    statuses = {}
    for case in cases:
        case_id = case["caseId"]
        case_dir = run_dir / args.engine / case_id
        case_dir.mkdir(parents=True)
        command = [
            worker_python, "-m", WORKERS[args.engine],
            "--input", case["_source"], "--output", str(case_dir),
        ]
        if args.engine == "baseline":
            command.extend([
                "--max-upload-mb", str(config.get("maxUploadMb", 10)),
                "--max-pdf-pages", str(config.get("maxPdfPages", 100)),
                "--max-ocr-pages", str(config.get("maxOcrPages", 10)),
                "--ocr-languages", str(config.get("ocrLanguages", "vie+eng")),
            ])
            if config.get("tesseractCmd"):
                command.extend(["--tesseract-cmd", str(config["tesseractCmd"])])
        elif args.engine == "marker":
            command.extend(["--model-cache", str(config["modelCache"]), "--mode", str(config["mode"])])
        status = _run_worker(command, timeout, case_dir)
        if args.engine in {"pymupdf", "marker"} and status["status"] == "success":
            if args.engine == "pymupdf":
                from benchmarks.pdf.adapters.pymupdf import normalize_file

                native_file = case_dir / "native/pymupdf.json"
            else:
                from benchmarks.pdf.adapters.marker import normalize_file

                native_file = case_dir / "native/marker.json"

            started = time.perf_counter()
            try:
                details = normalize_file(native_file, Path(case["_source"]), case_dir)
                status["adapter"] = details
                if args.engine == "pymupdf" and details["pagesWithoutText"]:
                    status["status"] = (
                        "unsupported" if len(details["pagesWithoutText"]) == len(
                            json.loads(native_file.read_text(encoding="utf-8"))["pages"]
                        ) else "partial"
                    )
            except Exception as exc:
                status["status"] = "error"
                status["errorType"] = "AdapterError"
                status["diagnostic"] = type(exc).__name__
            status["normalizationSeconds"] = time.perf_counter() - started
            status["elapsedSeconds"] += status["normalizationSeconds"]
        normalized_path = case_dir / "normalized.json"
        if normalized_path.is_file():
            document = json.loads(normalized_path.read_text(encoding="utf-8"))
            status["pageCount"] = document.get("pageCount")
            status["secondsPerPage"] = status["elapsedSeconds"] / status["pageCount"] if status["pageCount"] else None
            status["normalizedBytes"] = normalized_path.stat().st_size
            status["snapshotPngBytes"] = sum(
                len(base64.b64decode(block["imageSrc"].split(",", 1)[1]))
                for block in document.get("blocks", [])
                if isinstance(block.get("imageSrc"), str) and block["imageSrc"].startswith("data:image/png;base64,")
            )
            native_dir = case_dir / "native"
            status["nativeBytes"] = sum(path.stat().st_size for path in native_dir.rglob("*") if path.is_file())
        status.update({"caseId": case_id, "inputSha256": case["sha256"], "engine": args.engine})
        write_json(case_dir / "status.json", status)
        statuses[case_id] = status["status"]
        print(f"{case_id}: {status['status']} ({status['elapsedSeconds']:.2f}s)")
    write_json(run_dir / "summary.json", {"runId": run_id, "engine": args.engine, "statuses": statuses})
    print(f"Run: {run_dir}")
    return 0 if all(status in {"success", "partial"} for status in statuses.values()) else 1


if __name__ == "__main__":
    raise SystemExit(main())
