"""Compare completed runs on the same manifest without hiding unscored cases."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def build_report(runs: list[Path]) -> str:
    records = []
    expected_inputs = None
    for run in runs:
        summary = json.loads((run / "summary.json").read_text(encoding="utf-8"))
        manifest = json.loads((run / "manifest.snapshot.json").read_text(encoding="utf-8"))
        evaluation_path = run / "evaluation.json"
        evaluation = json.loads(evaluation_path.read_text(encoding="utf-8")) if evaluation_path.is_file() else {"cases": {}}
        inputs = {case["caseId"]: case["sha256"] for case in manifest["cases"]}
        if expected_inputs is None:
            expected_inputs = inputs
        elif inputs != expected_inputs:
            raise ValueError("runs do not use the same case IDs and PDF hashes")
        records.append((run, summary, manifest, evaluation))
    engines = [summary["engine"] for _, summary, _, _ in records]
    if len(engines) != len(set(engines)):
        raise ValueError("provide one run per engine")
    lines = ["# PDF parser comparison", "", "Input SHA-256 matches across these runs. Scores apply only to the stated pages and checks; synthetic CER is smoke-only. Any draft score is labeled exploratory.", ""]
    lines.extend(["| Case | " + " | ".join(engines) + " |", "| --- | " + " | ".join("---" for _ in engines) + " |"])
    for case in records[0][2]["cases"]:
        case_id = case["caseId"]
        cells = []
        for _, summary, _, evaluation in records:
            status = summary["statuses"][case_id]
            score = evaluation["cases"].get(case_id, {})
            score_status = score.get("scoreStatus", "not_scored")
            if score_status in {"scored", "exploratory"}:
                checks = [check for page in score["pages"] for check in page.get("checks", [])]
                passed = sum(check["passed"] for check in checks)
                characters = sum(page.get("referenceCharacters") or 0 for page in score["pages"])
                edits = sum(page.get("editDistance") or 0 for page in score["pages"])
                metric = f"checks {passed}/{len(checks)}"
                if characters:
                    metric += f", CER {edits}/{characters}"
                cells.append(f"{status}; {score_status} {metric}")
            else:
                cells.append(f"{status}; not scored")
        lines.append(f"| `{case_id}` | " + " | ".join(cells) + " |")
    lines.extend(["", "## Runs", ""])
    for run, summary, _, _ in records:
        lines.append(f"- {summary['engine']}: `{run.name}`")
    lines.extend(["", "No parser selection is made from these preliminary results. Review source checks and inspect reader output at both target viewports before an integration decision.", ""])
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--runs", type=Path, nargs="+", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    report = build_report([path.resolve() for path in args.runs])
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(report, encoding="utf-8")
    print(args.output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
