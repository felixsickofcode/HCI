from collections import OrderedDict, defaultdict, deque
from hashlib import sha256
from threading import Lock
from time import monotonic
from typing import Protocol

from app.core.exceptions import AssistInputError, AssistRateLimitError, AssistTooLargeError
from app.schemas.llm_assist import ExplainRequest, ExplainResponse, Explanation


class ExplanationProvider(Protocol):
    model: str

    def explain(self, term: str, context: str) -> Explanation: ...


class LLMAssistService:
    CACHE_TTL_SECONDS = 900
    CACHE_MAX_ITEMS = 500
    PROMPT_VERSION = "explain-v1"

    def __init__(self, provider: ExplanationProvider, hourly_limit: int = 20):
        self.provider = provider
        self.hourly_limit = hourly_limit
        self._lock = Lock()
        self._cache: OrderedDict[str, tuple[float, Explanation]] = OrderedDict()
        self._usage: dict[int, deque[float]] = defaultdict(deque)

    def explain_word(self, request: ExplainRequest, user_id: int) -> ExplainResponse:
        context = request.context_text
        selected = request.selected_text
        if len(context.encode("utf-16-le")) // 2 > 4000 or len(selected.encode("utf-16-le")) // 2 > 120:
            raise AssistTooLargeError()
        encoded = context.encode("utf-16-le")
        if request.start >= request.end or request.end * 2 > len(encoded):
            raise AssistInputError()
        try:
            actual = encoded[request.start * 2 : request.end * 2].decode("utf-16-le")
        except UnicodeDecodeError as exc:
            raise AssistInputError() from exc
        if actual != selected or not selected.strip():
            raise AssistInputError()

        now = monotonic()
        digest = sha256(f"{self.PROMPT_VERSION}\0{self.provider.model}\0{user_id}\0{context}\0{request.start}\0{request.end}".encode()).hexdigest()
        with self._lock:
            usage = self._usage[user_id]
            while usage and now - usage[0] >= 3600:
                usage.popleft()
            if len(usage) >= self.hourly_limit:
                raise AssistRateLimitError()
            usage.append(now)
            entry = self._cache.get(digest)
            if entry and now - entry[0] < self.CACHE_TTL_SECONDS:
                self._cache.move_to_end(digest)
                explanation = entry[1]
                cached = True
            else:
                self._cache.pop(digest, None)
                explanation = None
                cached = False
        if explanation is None:
            explanation = self.provider.explain(selected, context)
            with self._lock:
                self._cache[digest] = (monotonic(), explanation)
                self._cache.move_to_end(digest)
                while len(self._cache) > self.CACHE_MAX_ITEMS:
                    self._cache.popitem(last=False)
        return ExplainResponse(
            document_id=request.document_id,
            content_version=request.content_version,
            segment_id=request.segment_id,
            start=request.start,
            end=request.end,
            term=selected,
            meaning=explanation.meaning,
            example=explanation.example,
            cached=cached,
        )
