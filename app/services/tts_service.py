import asyncio
from collections import OrderedDict, defaultdict, deque
from hashlib import sha256
from threading import Lock
from time import monotonic
from typing import Protocol

from app.core.exceptions import (
    TtsInputError,
    TtsProviderError,
    TtsRateLimitError,
    TtsTimeoutError,
    TtsTooLargeError,
    TtsUnavailableError,
)
from app.schemas.tts import SpeechBoundary, SpeechRequest, SpeechResponse


class SpeechProvider(Protocol):
    """Nguồn tổng hợp giọng nói. Trả về audio MP3 và các mốc từ để canh highlight."""

    async def synthesize(
        self, text: str, voice: str, rate: int
    ) -> tuple[bytes, list[SpeechBoundary]]: ...


class EdgeTtsProvider:
    """Bọc thư viện `edge-tts` (miễn phí, không cần API key).

    `edge_tts` import muộn để backend vẫn chạy khi chưa cài gói này; khi đó endpoint trả 503.
    """

    def __init__(self, timeout: float = 20.0):
        self.timeout = timeout

    async def synthesize(
        self, text: str, voice: str, rate: int
    ) -> tuple[bytes, list[SpeechBoundary]]:
        try:
            import edge_tts
        except ImportError as exc:
            raise TtsUnavailableError("Chưa cài gói edge-tts trên máy chủ") from exc

        audio = bytearray()
        boundaries: list[SpeechBoundary] = []
        try:
            # edge-tts mặc định chỉ trả mốc câu; trang đọc cần mốc từng từ để canh highlight.
            communicate = edge_tts.Communicate(
                text, voice, rate=f"{rate:+d}%", boundary="WordBoundary"
            )
            async with asyncio.timeout(self.timeout):
                async for chunk in communicate.stream():
                    if chunk["type"] == "audio":
                        audio.extend(chunk["data"])
                    elif chunk["type"] == "WordBoundary":
                        # edge-tts trả offset theo đơn vị 100 nano giây.
                        boundaries.append(
                            SpeechBoundary(
                                text=chunk["text"],
                                offset_ms=chunk["offset"] // 10_000,
                                duration_ms=chunk["duration"] // 10_000,
                            )
                        )
        except TimeoutError as exc:
            raise TtsTimeoutError() from exc
        except Exception as exc:  # mạng, giọng không tồn tại, provider đổi định dạng
            raise TtsProviderError("Không tổng hợp được giọng đọc") from exc

        if not audio:
            raise TtsProviderError("Dịch vụ trả về audio rỗng")
        return bytes(audio), boundaries


class TtsService:
    """Giới hạn kích thước, kiểm tra giọng, đếm quota và cache audio theo nội dung."""

    def __init__(
        self,
        provider: SpeechProvider,
        voices: list[str],
        default_voice: str,
        max_chars: int = 2000,
        hourly_limit: int = 60,
        cache_items: int = 64,
        cache_bytes: int = 32 * 1024 * 1024,
    ):
        self.provider = provider
        self.voices = voices
        self.default_voice = default_voice
        self.max_chars = max_chars
        self.hourly_limit = hourly_limit
        self.cache_items = cache_items
        self.cache_bytes = cache_bytes
        self._lock = Lock()
        self._cache: OrderedDict[str, tuple[bytes, list[SpeechBoundary]]] = OrderedDict()
        self._cache_bytes_used = 0
        self._usage: dict[int, deque[float]] = defaultdict(deque)

    async def speak(self, request: SpeechRequest, user_id: int) -> SpeechResponse:
        text = request.text.strip()
        if not text:
            raise TtsInputError("Đoạn văn rỗng")
        voice = request.voice or self.default_voice
        if voice not in self.voices:
            raise TtsInputError("Giọng đọc không được hỗ trợ")
        if len(text) > self.max_chars:
            raise TtsTooLargeError(
                f"Đoạn văn dài {len(text)} ký tự, giới hạn {self.max_chars} ký tự mỗi lượt"
            )

        digest = sha256(f"{voice}\0{request.rate}\0{text}".encode()).hexdigest()
        cached = self._read_cache(digest)
        if cached is not None:
            audio, boundaries = cached
            return self._response(audio, boundaries, voice, cached=True)

        self._consume_quota(user_id)
        audio, boundaries = await self.provider.synthesize(text, voice, request.rate)
        self._write_cache(digest, audio, boundaries)
        return self._response(audio, boundaries, voice, cached=False)

    def _response(
        self, audio: bytes, boundaries: list[SpeechBoundary], voice: str, cached: bool
    ) -> SpeechResponse:
        from base64 import b64encode

        duration = boundaries[-1].offset_ms + boundaries[-1].duration_ms if boundaries else 0
        return SpeechResponse(
            audio_base64=b64encode(audio).decode("ascii"),
            voice=voice,
            duration_ms=duration,
            boundaries=boundaries,
            cached=cached,
        )

    def _read_cache(self, digest: str) -> tuple[bytes, list[SpeechBoundary]] | None:
        with self._lock:
            entry = self._cache.get(digest)
            if entry is None:
                return None
            self._cache.move_to_end(digest)
            return entry

    def _write_cache(self, digest: str, audio: bytes, boundaries: list[SpeechBoundary]) -> None:
        if len(audio) > self.cache_bytes:
            return
        with self._lock:
            previous = self._cache.pop(digest, None)
            if previous is not None:
                self._cache_bytes_used -= len(previous[0])
            self._cache[digest] = (audio, boundaries)
            self._cache_bytes_used += len(audio)
            while self._cache and (
                len(self._cache) > self.cache_items or self._cache_bytes_used > self.cache_bytes
            ):
                _, (removed, _) = self._cache.popitem(last=False)
                self._cache_bytes_used -= len(removed)

    def _consume_quota(self, user_id: int) -> None:
        now = monotonic()
        with self._lock:
            usage = self._usage[user_id]
            while usage and now - usage[0] >= 3600:
                usage.popleft()
            if len(usage) >= self.hourly_limit:
                raise TtsRateLimitError()
            usage.append(now)
