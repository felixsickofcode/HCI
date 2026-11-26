import hashlib
import json

from fastapi.concurrency import run_in_threadpool
from typing import Protocol

from app.core.config import Settings
from app.core.exceptions import (
    InvalidRequestError,
    LLMUnavailableError,
    PayloadTooLargeError,
    SummaryUnavailableError,
)
from app.schemas.summary import SegmentIn, SummarizeRequest, SummarizeResponse, SummaryItem, SummaryVariant
from app.services.extractive_summary import extractive_summarize_variants


def utf16_len(text: str) -> int:
    return len(text.encode("utf-16-le", errors="surrogatepass")) // 2


def content_hash(segments: list[SegmentIn]) -> str:
    payload = json.dumps(
        [[s.id, s.text] for s in segments], ensure_ascii=False, separators=(",", ":")
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


class SummaryProvider(Protocol):
    def summarize(self, segments: list[SegmentIn]) -> list[SummaryItem]: ...


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
    def __init__(self, cfg: Settings, llm_provider: SummaryProvider | None = None):
        self._cfg = cfg
        self._llm_provider = llm_provider

    async def summarize(self, data: SummarizeRequest) -> SummarizeResponse:
        self._validate(data)
        method = data.method
        variants: list[SummaryVariant] = []

        if method == "llm":
            items = await self._summarize_llm(data.segments)
        else:
            segments = [(s.id, s.text) for s in data.segments]
            extracted_variants = await run_in_threadpool(extractive_summarize_variants, segments)
            for length, extracted in extracted_variants.items():
                normalized = validate_sources(
                    [SummaryItem(id="", text=e.text, sources=[e.segment_id]) for e in extracted],
                    {s.id for s in data.segments},
                )
                variants.append(SummaryVariant(length=length, items=normalized))
            items = next(v.items for v in variants if v.length == data.length)

        items = validate_sources(items, {s.id for s in data.segments})
        if not items:
            raise SummaryUnavailableError("Văn bản không đủ nội dung để rút ý chính")
        return SummarizeResponse(
            document_id=data.document_id,
            content_version=content_hash(data.segments),
            method=method,
            items=items,
            variants=variants,
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
        if self._llm_provider is None:
            raise LLMUnavailableError("Tóm tắt bằng AI chưa được cấu hình trên máy chủ")
        return await run_in_threadpool(self._llm_provider.summarize, segments)
