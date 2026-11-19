"""Marker 2.2.0 CPU/fast worker. Never enables its optional LLM stage."""

from __future__ import annotations

import argparse
import importlib.metadata
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

from benchmarks.pdf.contracts import write_json


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--model-cache", type=Path, required=True)
    parser.add_argument("--mode", choices=("fast", "no_ocr"), required=True)
    args = parser.parse_args()
    cache = args.model_cache.resolve()
    cache.mkdir(parents=True, exist_ok=True)
    local_temp = cache.parent / "local" / "tmp"
    local_temp.mkdir(parents=True, exist_ok=True)
    env = os.environ.copy()
    env.update({
        "HF_HOME": str(cache),
        "XDG_CACHE_HOME": str(cache),
        "TEMP": str(local_temp),
        "TMP": str(local_temp),
        "PYTHONUTF8": "1",
        "HF_HUB_OFFLINE": "1",
    })
    executable = Path(sys.prefix) / ("Scripts/marker_single.exe" if os.name == "nt" else "bin/marker_single")
    native_dir = args.output / "native"
    started = time.perf_counter()
    completed = subprocess.run(
        [str(executable), str(args.input), "--mode", args.mode,
         "--output_format", "json", "--disable_multiprocessing",
         "--output_dir", str(native_dir)],
        env=env,
        cwd=Path(__file__).resolve().parents[3],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
    )
    if completed.returncode:
        raise RuntimeError(f"marker_single failed with exit code {completed.returncode}")
    source_dir = native_dir / args.input.stem
    source_json = source_dir / f"{args.input.stem}.json"
    source_meta = source_dir / f"{args.input.stem}_meta.json"
    if not source_json.is_file():
        raise RuntimeError("marker_single did not produce JSON")
    shutil.move(str(source_json), str(native_dir / "marker.json"))
    if source_meta.is_file():
        shutil.move(str(source_meta), str(native_dir / "marker_meta.json"))
    revision_file = cache / "hub" / "models--datalab-to--indra-ocr" / "refs" / "main"
    revision = revision_file.read_text(encoding="utf-8").strip() if revision_file.is_file() else None
    write_json(args.output / "worker.json", {
        "status": "success",
        "parseSeconds": time.perf_counter() - started,
        "python": sys.version,
        "packageFreeze": sorted(
            f"{distribution.metadata['Name']}=={distribution.version}"
            for distribution in importlib.metadata.distributions()
            if distribution.metadata.get("Name")
        ),
        "packageVersions": {
            "marker-pdf": importlib.metadata.version("marker-pdf"),
            "indra-ocr": importlib.metadata.version("indra-ocr"),
            "surya-ocr": importlib.metadata.version("surya-ocr"),
        },
        "mode": args.mode,
        "optionalLlm": False,
        "modelRevision": revision,
        "inferenceBackend": "CPU Indra ONNX" if args.mode == "fast" else "CPU PDF text + Indra layout",
    })
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
