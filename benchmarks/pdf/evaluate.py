"""Score reviewed page text and block order; keep unreviewed cases visible."""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
from pathlib import Path

from benchmarks.pdf.contracts import write_json

GROUND_TRUTH = Path(__file__).parent / "ground_truth"


def normalize_for_cer(text: str) -> str:
    return re.sub(r"\s+", " ", unicodedata.normalize("NFC", text)).strip()


def edit_distance(a: str, b: str) -> int:
    if len(a) < len(b):
        a, b = b, a
    row = list(range(len(b) + 1))
    for i, left in enumerate(a, 1):
        next_row = [i]
        for j, right in enumerate(b, 1):
            next_row.append(min(
                next_row[j - 1] + 1,
                row[j] + 1,
                row[j - 1] + (left != right),
            ))
        row = next_row
    return row[-1]


def score_page(reference: dict, blocks: list[dict]) -> dict:
    main_blocks = [block for block in blocks if block.get("type") != "snapshot"]
    actual_raw = "\n".join(block.get("text", "") for block in main_blocks)
    reference_raw = reference.get("text")
    actual = normalize_for_cer(actual_raw)
    expected = normalize_for_cer(reference_raw) if isinstance(reference_raw, str) else None
    if expected is not None and len(actual) * len(expected) > 50_000_000:
        raise ValueError("page text too long for built-in CER; score smaller reviewed regions")
    edits = edit_distance(expected, actual) if expected is not None else None
    target_blocks = reference.get("blocks") or []
    matched: dict[str, int] = {}
    for target in target_blocks:
        candidates = [i for i, block in enumerate(main_blocks) if block.get("text") == target.get("text")]
        if len(candidates) == 1:
            matched[target["id"]] = candidates[0]
    pairs = reference.get("before") or []
    comparable = [pair for pair in pairs if pair[0] in matched and pair[1] in matched]
    order_correct = sum(matched[left] < matched[right] for left, right in comparable)
    type_correct = sum(
        main_blocks[matched[target["id"]]].get("type") == target.get("type")
        for target in target_blocks if target["id"] in matched
    )
    checks = []
    for check in reference.get("checks") or []:
        if check.get("kind") == "contains":
            scope = check.get("scope", "all")
            selected = blocks if scope == "all" else [
                block for block in blocks if block.get("type") == scope
            ]
            observed = "\n".join(block.get("text", "") for block in selected)
            passed = normalize_for_cer(check["text"]) in normalize_for_cer(observed)
            checks.append({**check, "passed": passed})
        elif check.get("kind") == "blockCount":
            count = sum(block.get("type") == check.get("type") for block in blocks)
            passed = check.get("min", 0) <= count <= check.get("max", float("inf"))
            checks.append({**check, "observed": count, "passed": passed})
        else:
            raise ValueError(f"unknown ground truth check: {check.get('kind')}")
    return {
        "pageNumber": reference["pageNumber"],
        "referenceRaw": reference_raw,
        "actualRaw": actual_raw,
        "referenceNormalized": expected,
        "actualNormalized": actual,
        "referenceCharacters": len(expected) if expected is not None else None,
        "editDistance": edits,
        "cer": edits / len(expected) if expected else None,
        "matchedBlocks": len(matched),
        "referenceBlocks": len(target_blocks),
        "correctTypesAmongMatched": type_correct,
        "correctOrderPairs": order_correct,
        "comparableOrderPairs": len(comparable),
        "referenceOrderPairs": len(pairs),
        "checks": checks,
    }


def evaluate_run(run_dir: Path, ground_truth_dir: Path = GROUND_TRUTH, include_draft: bool = False) -> dict:
    summary = json.loads((run_dir / "summary.json").read_text(encoding="utf-8"))
    manifest = json.loads((run_dir / "manifest.snapshot.json").read_text(encoding="utf-8"))
    engine = summary["engine"]
    cases = {}
    report = [f"# PDF evaluation: {summary['runId']}", "", "Scores below apply only to cases with reviewed ground truth.", ""]
    for case in manifest["cases"]:
        case_id = case["caseId"]
        case_dir = run_dir / engine / case_id
        status = json.loads((case_dir / "status.json").read_text(encoding="utf-8"))
        truth_path = ground_truth_dir / f"{case_id}.json"
        if not truth_path.is_file() or status["status"] not in {"success", "partial"}:
            reason = "no ground truth" if not truth_path.is_file() else f"worker {status['status']}"
            cases[case_id] = {"scoreStatus": "not_scored", "reason": reason}
            report.append(f"- `{case_id}`: not scored ({reason}).")
            continue
        truth = json.loads(truth_path.read_text(encoding="utf-8"))
        if truth.get("caseId") != case_id:
            raise ValueError(f"ground truth caseId mismatch: {case_id}")
        if truth.get("inputSha256") and truth["inputSha256"] != case["sha256"]:
            raise ValueError(f"ground truth input hash mismatch: {case_id}")
        is_draft = truth.get("reviewStatus") not in {"reviewed", "synthetic-known-source"}
        if is_draft and not include_draft:
            cases[case_id] = {"scoreStatus": "not_scored", "reason": "ground truth not reviewed"}
            report.append(f"- `{case_id}`: not scored (ground truth not reviewed).")
            continue
        document = json.loads((case_dir / "normalized.json").read_text(encoding="utf-8"))
        page_scores = [
            score_page(page, [block for block in document["blocks"] if block.get("pageNumber") == page["pageNumber"]])
            for page in truth["pages"]
        ]
        scored = {"scoreStatus": "exploratory" if is_draft else "scored", "reviewStatus": truth.get("reviewStatus"), "pages": page_scores}
        cases[case_id] = scored
        write_json(case_dir / "metrics.json", scored)
        total_chars = sum(page["referenceCharacters"] or 0 for page in page_scores)
        total_edits = sum(page["editDistance"] or 0 for page in page_scores)
        cer = total_edits / total_chars if total_chars else None
        passed = sum(check["passed"] for page in page_scores for check in page["checks"])
        checks = sum(len(page["checks"]) for page in page_scores)
        label = "synthetic smoke only" if "synthetic" in case.get("labels", []) else truth.get("reviewStatus", "unreviewed")
        cer_text = f"{cer:.3f} ({total_edits}/{total_chars} edits)" if cer is not None else "N/A"
        report.append(f"- `{case_id}` ({label}): CER {cer_text}; source checks {passed}/{checks}.")
    write_json(run_dir / "evaluation.json", {"runId": summary["runId"], "engine": engine, "cases": cases})
    (run_dir / "report.md").write_text("\n".join(report) + "\n", encoding="utf-8")
    return cases


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run", type=Path, required=True)
    parser.add_argument("--ground-truth-dir", type=Path, default=GROUND_TRUTH)
    parser.add_argument("--include-draft", action="store_true", help="emit exploratory metrics for unconfirmed local drafts")
    args = parser.parse_args()
    results = evaluate_run(args.run.resolve(), args.ground_truth_dir.resolve(), args.include_draft)
    print(f"Scored {sum(value['scoreStatus'] == 'scored' for value in results.values())}/{len(results)} cases; exploratory {sum(value['scoreStatus'] == 'exploratory' for value in results.values())}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
