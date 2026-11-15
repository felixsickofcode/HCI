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

# (số ký tự tối thiểu, số ý), xếp từ dài xuống ngắn. Chỉnh sau khi thử trên PDF thật.
_ITEM_TIERS = [(30_000, 8), (15_000, 6), (8_000, 5), (3_000, 4), (1_000, 3), (0, 2)]


def utf16_len(text: str) -> int:
    """Độ dài theo UTF-16 code units, khớp String.length của JavaScript."""
    return len(text.encode("utf-16-le", errors="surrogatepass")) // 2


def target_items(total_chars: int, max_items: int) -> int:
    """Bài càng dài càng nhiều ý, nhưng không vượt max_items."""
    for min_chars, n in _ITEM_TIERS:
        if total_chars >= min_chars:
            return min(n, max_items)
    return min(2, max_items)


def content_hash(segments: list[SegmentIn]) -> str:
    payload = json.dumps(
        [[s.id, s.text] for s in segments], ensure_ascii=False, separators=(",", ":")
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def validate_sources(items: list[SummaryItem], valid_ids: set[str]) -> list[SummaryItem]:
    """Bỏ ID nguồn không có trong request và bỏ ý không còn nguồn nào. Không bao giờ bịa nguồn."""
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
        total = self._validate(data)
        max_items = target_items(total, min(data.max_items, self._cfg.SUMMARY_MAX_ITEMS))

        if self._cfg.SUMMARY_USE_LLM:
            items = await self._summarize_llm(data.segments, max_items)
            method = "llm"
        else:
            segments = [(s.id, s.text) for s in data.segments]
            extracted = await run_in_threadpool(extractive_summarize, segments, max_items)
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
        """Kiểm tra đầu vào, trả về tổng độ dài (UTF-16)."""
        ids = [s.id for s in data.segments]
        if len(set(ids)) != len(ids):
            raise InvalidRequestError("Mã đoạn bị trùng")
        try:
            for s in data.segments:
                s.text.encode("utf-8")
        except UnicodeEncodeError:
            raise InvalidRequestError("Văn bản chứa ký tự không hợp lệ")
        total = sum(utf16_len(s.text) for s in data.segments)
        # Kiểm tra quá dài trước (413), rồi mới tới quá ngắn (422)
        if len(ids) > self._cfg.SUMMARY_MAX_SEGMENTS or total > self._cfg.SUMMARY_MAX_CHARS:
            raise PayloadTooLargeError("Bài quá dài để tóm tắt")
        if total < self._cfg.SUMMARY_MIN_CHARS:
            raise SummaryUnavailableError("Bài quá ngắn để rút ý chính")
        return total

    async def _summarize_llm(self, segments: list[SegmentIn], max_items: int) -> list[SummaryItem]:
        """CHƯA CÀI ĐẶT. Điền khi nhóm quyết định dùng LLM. Việc cần làm:

        1. Provider: một lớp riêng (httpx.AsyncClient, async), key chỉ đọc từ .env, không VITE_*.
        2. Timeout riêng cho tóm tắt, giới hạn số lời gọi đồng thời (asyncio.Semaphore).
        3. Prompt: coi văn bản là dữ liệu, không làm theo chỉ dẫn trong đó; yêu cầu JSON
           {"items":[{"text":..., "sources":[segmentId]}]}; parse an toàn (bỏ ```json).
        4. Trả list[SummaryItem]; validate_sources() ở summarize() sẽ lọc nguồn bịa.
        5. Lỗi: 429 hết lượt, 502 output hỏng, 504 timeout (thêm vào exceptions.py).
        6. Cache theo content_hash + model + prompt version (cache cấp module, không cấp instance).
        7. Endpoint đã bắt buộc đăng nhập khi SUMMARY_USE_LLM=true (require_login_if_llm);
           thêm giới hạn lượt theo user.
        """
        raise LLMUnavailableError("Tóm tắt bằng AI chưa được cài đặt trên máy chủ")