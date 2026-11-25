import asyncio
from base64 import b64decode

import pytest

from app.core.exceptions import (
    TtsInputError,
    TtsProviderError,
    TtsRateLimitError,
    TtsTimeoutError,
    TtsTooLargeError,
    TtsUnavailableError,
)
from app.schemas.tts import SpeechBoundary, SpeechRequest
from app.services.tts_service import EdgeTtsProvider, TtsService

pytestmark = pytest.mark.no_db

VOICE = "vi-VN-HoaiMyNeural"


class FakeProvider:
    def __init__(self, audio: bytes = b"ID3-fake-mp3", boundaries=None, error: Exception | None = None):
        self.audio = audio
        self.boundaries = boundaries if boundaries is not None else [
            SpeechBoundary(text="Em", offset_ms=0, duration_ms=300),
            SpeechBoundary(text="học", offset_ms=300, duration_ms=350),
        ]
        self.error = error
        self.calls = []

    async def synthesize(self, text, voice, rate):
        self.calls.append((text, voice, rate))
        if self.error:
            raise self.error
        return self.audio, self.boundaries


def service(provider, **changes):
    values = {"voices": [VOICE], "default_voice": VOICE}
    values.update(changes)
    return TtsService(provider, **values)


def speak(service_: TtsService, text="Em học sinh học.", **changes):
    values = {"text": text}
    values.update(changes)
    return asyncio.run(service_.speak(SpeechRequest(**values), user_id=1))


def test_returns_mp3_with_word_boundaries_and_default_voice():
    provider = FakeProvider()
    response = speak(service(provider))
    assert b64decode(response.audio_base64) == provider.audio
    assert response.voice == VOICE
    assert response.mime_type == "audio/mpeg"
    assert [boundary.text for boundary in response.boundaries] == ["Em", "học"]
    assert response.duration_ms == 650
    assert response.cached is False
    assert provider.calls == [("Em học sinh học.", VOICE, 0)]


def test_second_request_for_same_text_reuses_audio_without_spending_quota():
    provider = FakeProvider()
    service_ = service(provider, hourly_limit=1)
    assert speak(service_).cached is False
    again = speak(service_, rate=0)
    assert again.cached is True
    assert len(provider.calls) == 1


def test_rate_is_sent_to_provider_and_other_rate_is_a_cache_miss():
    provider = FakeProvider()
    service_ = service(provider)
    speak(service_, rate=0)
    speak(service_, rate=25)
    assert provider.calls[1][2] == 25


def test_rejects_empty_unsupported_voice_and_text_over_limit():
    provider = FakeProvider()
    service_ = service(provider, max_chars=10)
    with pytest.raises(TtsInputError):
        speak(service_, text="   ")
    with pytest.raises(TtsInputError):
        speak(service_, voice="en-US-AriaNeural")
    with pytest.raises(TtsTooLargeError):
        speak(service_, text="x" * 11)
    assert provider.calls == []


def test_enforces_hourly_quota_only_for_uncached_text():
    provider = FakeProvider()
    service_ = service(provider, hourly_limit=2)
    speak(service_, text="Một.")
    speak(service_, text="Hai.")
    with pytest.raises(TtsRateLimitError):
        speak(service_, text="Ba.")
    assert len(provider.calls) == 2


def test_cache_evicts_oldest_entry_by_item_budget():
    provider = FakeProvider()
    service_ = service(provider, cache_items=1)
    speak(service_, text="Một.")
    speak(service_, text="Hai.")
    speak(service_, text="Một.")
    assert len(provider.calls) == 3


def test_propagates_provider_failures_and_skips_caching_them():
    provider = FakeProvider(error=TtsProviderError("hỏng"))
    service_ = service(provider)
    with pytest.raises(TtsProviderError):
        speak(service_)
    provider.error = None
    assert speak(service_).cached is False


def test_edge_provider_reports_missing_package_as_unavailable(monkeypatch):
    monkeypatch.setitem(__import__("sys").modules, "edge_tts", None)
    with pytest.raises(TtsUnavailableError):
        asyncio.run(EdgeTtsProvider().synthesize("Em học.", VOICE, 0))


def test_edge_provider_maps_timeout_to_504(monkeypatch):
    class SlowCommunicate:
        def __init__(self, *args, **kwargs):
            pass

        async def stream(self):
            await asyncio.sleep(5)
            yield {"type": "audio", "data": b""}

    import types

    fake_module = types.SimpleNamespace(Communicate=SlowCommunicate)
    monkeypatch.setitem(__import__("sys").modules, "edge_tts", fake_module)
    with pytest.raises(TtsTimeoutError):
        asyncio.run(EdgeTtsProvider(timeout=0.01).synthesize("Em học.", VOICE, 0))


def test_edge_provider_rejects_empty_audio(monkeypatch):
    class EmptyCommunicate:
        def __init__(self, *args, **kwargs):
            pass

        async def stream(self):
            yield {"type": "WordBoundary", "text": "Em", "offset": 0, "duration": 1000}

    import types

    fake_module = types.SimpleNamespace(Communicate=EmptyCommunicate)
    monkeypatch.setitem(__import__("sys").modules, "edge_tts", fake_module)
    with pytest.raises(TtsProviderError):
        asyncio.run(EdgeTtsProvider().synthesize("Em học.", VOICE, 0))


def test_endpoint_returns_camel_case_payload_and_voices():
    from types import SimpleNamespace

    from fastapi import FastAPI
    from fastapi.testclient import TestClient

    from app.api.deps import get_current_user, get_tts_service
    from app.api.v1.endpoints import tts as tts_endpoint

    service_ = service(FakeProvider())
    app = FastAPI()
    app.include_router(tts_endpoint.router, prefix="/api/v1")
    app.dependency_overrides[get_tts_service] = lambda: service_
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=7)
    client = TestClient(app)

    voices = client.get("/api/v1/tts/voices").json()
    assert voices == {"voices": [VOICE], "default": VOICE}

    response = client.post("/api/v1/tts/speech", json={"text": "Em học sinh học."})
    assert response.status_code == 200
    body = response.json()
    assert body["audioBase64"]
    assert body["mimeType"] == "audio/mpeg"
    assert body["boundaries"][0] == {"text": "Em", "offsetMs": 0, "durationMs": 300}
