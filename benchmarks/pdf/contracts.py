"""Small, dependency-free contracts for local benchmark artifacts."""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

CASE_ID = re.compile(r"^[a-z0-9][a-z0-9-]{0,79}$")
STATUSES = {"success", "partial", "unsupported", "timeout", "error", "not_run"}


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_manifest(path: Path, workspace: Path) -> list[dict]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    if raw.get("schemaVersion") != 1 or not isinstance(raw.get("cases"), list):
        raise ValueError("manifest must have schemaVersion=1 and cases array")
    cases = raw["cases"]
    ids: set[str] = set()
    for case in cases:
        case_id = case.get("caseId")
        if not isinstance(case_id, str) or not CASE_ID.fullmatch(case_id) or case_id in ids:
            raise ValueError(f"invalid or repeated caseId: {case_id!r}")
        ids.add(case_id)
        relative = case.get("path")
        if not isinstance(relative, str) or Path(relative).is_absolute():
            raise ValueError(f"invalid relative path for {case_id}")
        source = (path.parent / relative).resolve()
        if not source.is_relative_to(workspace.resolve()) or source.suffix.lower() != ".pdf":
            raise ValueError(f"PDF must stay inside workspace: {case_id}")
        if not source.is_file():
            raise FileNotFoundError(f"missing PDF for {case_id}: {source}")
        case["sha256"] = sha256_file(source)
        case["byteCount"] = source.stat().st_size
        case["_source"] = str(source)
    return cases


def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
