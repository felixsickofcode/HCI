import hashlib
import json

from fastapi.concurrency import run_in_threadpool

from app.core.config import Settings
from app.core.exceptions import (
    InvalidRequestError,
    LLMUnavailableError,
    PayloadTooLargeError,
    SummaryUnavailableError,
)
from app.schemas.summary import SegmentIn, SummarizeRequest, SummarizeResponse, SummaryItem
from app.services.extractive_summary import extractive_summarize


def utf16_len(text: str) -> int:
    return len(text.encode("utf-16-le", errors="surrogatepass")) // 2


def content_hash(segments: list[SegmentIn]) -> str:
    payload = json.dumps(
        [[s.id, s.text] for s in segments], ensure_ascii=False, separators=(",", ":")
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def validate_sources(items: list[SummaryItem], valid_ids: set[str]) -> list[SummaryItem]:
    result: list[SummaryItem] = []
    for item in items:
        ids = [s for s in dict.fromkeys(item.sources) if s in valid_ids]
        text = item.text.strip()
        if not text or not ids:
            continue
        result.append(SummaryItem(id=f"summary-{len(result) + 1}", text=text, sources=ids))
    return result


class SummaryService:
    def __init__(self, cfg: Settings):
        self._cfg = cfg

    async def summarize(self, data: SummarizeRequest) -> SummarizeResponse:
        self._validate(data)
        if self._cfg.SUMMARY_USE_LLM:
            items = await self._summarize_llm(data.segments)
            method = "llm"
        else:
            segments = [(s.id, s.text) for s in data.segments]
            extracted = await run_in_threadpool(extractive_summarize, segments)
            items = [SummaryItem(id="", text=e.text, sources=[e.segment_id]) for e in extracted]
            method = "extractive"

        items = validate_sources(items, {s.id for s in data.segments})
        if not items:
            raise SummaryUnavailableError("Văn bản không đủ nội dung để rút ý chính")
        return SummarizeResponse(
            document_id=data.document_id,
            content_version=content_hash(data.segments),
            method=method,
            items=items,
        )

    def _validate(self, data: SummarizeRequest) -> int:
        ids = [s.id for s in data.segments]
        if len(set(ids)) != len(ids):
            raise InvalidRequestError("Mã đoạn bị trùng")
        try:
            for s in data.segments:
                s.text.encode("utf-8")
        except UnicodeEncodeError:
            raise InvalidRequestError("Văn bản chứa ký tự không hợp lệ")
        total = sum(utf16_len(s.text) for s in data.segments)
        if len(ids) > self._cfg.SUMMARY_MAX_SEGMENTS or total > self._cfg.SUMMARY_MAX_CHARS:
            raise PayloadTooLargeError("Bài quá dài để tóm tắt")
        if total < self._cfg.SUMMARY_MIN_CHARS:
            raise SummaryUnavailableError("Bài quá ngắn để rút ý chính")
        return total

    async def _summarize_llm(self, segments: list[SegmentIn]) -> list[SummaryItem]:
        raise LLMUnavailableError("Tóm tắt bằng AI chưa được cài đặt trên máy chủ")