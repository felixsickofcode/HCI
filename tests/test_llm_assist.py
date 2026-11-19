import pytest
import httpx

from app.core.exceptions import AssistInputError, AssistProviderError, AssistRateLimitError, AssistTimeoutError, AssistTooLargeError
from app.schemas.llm_assist import ExplainRequest, Explanation
from app.services.llm_assist_service import LLMAssistService
from app.services.llm_provider import GroqProvider

pytestmark = pytest.mark.no_db


class FakeProvider:
    model = "openai/gpt-oss-120b"

    def __init__(self):
        self.calls = []

    def explain(self, term, context):
        self.calls.append((term, context))
        return Explanation(meaning="Môn học về sự sống.", example="Em thích sinh học.")


def request(**changes):
    values = {
        "document_id": "doc-1",
        "content_version": "hash-1",
        "segment_id": "block-1",
        "context_text": "Em học sinh học.",
        "selected_text": "sinh học",
        "start": 7,
        "end": 15,
    }
    values.update(changes)
    return ExplainRequest(**values)


def test_explain_exact_repeated_term_and_cache_scope():
    provider = FakeProvider()
    service = LLMAssistService(provider)
    source = request(context_text="học sinh học sinh học", start=13, end=21, selected_text="sinh học")
    first = service.explain_word(source, user_id=1)
    second = service.explain_word(source, user_id=1)
    assert first.cached is False
    assert second.cached is True
    assert first.segment_id == "block-1"
    assert provider.calls == [("sinh học", source.context_text)]
    service.explain_word(request(), user_id=1)
    service.explain_word(source, user_id=2)
    assert len(provider.calls) == 3


def test_utf16_offset_after_emoji():
    provider = FakeProvider()
    result = LLMAssistService(provider).explain_word(
        request(context_text="😀 sinh học", selected_text="sinh học", start=3, end=11), 1
    )
    assert result.term == "sinh học"


@pytest.mark.parametrize("changes", [
    {"start": 3, "end": 5},
    {"start": 7, "end": 16},
    {"selected_text": "sinh"},
    {"start": 8, "end": 7},
])
def test_bad_range_rejected_before_provider(changes):
    provider = FakeProvider()
    with pytest.raises(AssistInputError):
        LLMAssistService(provider).explain_word(request(**changes), 1)
    assert provider.calls == []


def test_payload_limit_and_hourly_quota():
    provider = FakeProvider()
    service = LLMAssistService(provider, hourly_limit=1)
    with pytest.raises(AssistTooLargeError):
        service.explain_word(request(context_text="x" * 4001), 1)
    service.explain_word(request(), 1)
    with pytest.raises(AssistRateLimitError):
        service.explain_word(request(), 1)
    assert len(provider.calls) == 1


def test_groq_request_and_invalid_output(monkeypatch):
    def respond(url, *, headers, json, timeout):
        assert url == GroqProvider.URL
        assert headers["Authorization"] == "Bearer local-test-key"
        assert json["model"] == "openai/gpt-oss-120b"
        assert json["response_format"]["json_schema"]["strict"] is True
        assert json["include_reasoning"] is False
        assert timeout == 20
        return httpx.Response(200, json={"choices": [{"message": {"content": '{"meaning":"Nghĩa","example":"Ví dụ."}'}}]})

    monkeypatch.setattr(httpx, "post", respond)
    provider = GroqProvider("local-test-key", "openai/gpt-oss-120b", 20)
    assert provider.explain("từ", "đoạn").meaning == "Nghĩa"

    monkeypatch.setattr(httpx, "post", lambda *args, **kwargs: httpx.Response(200, json={"choices": [{"message": {"content": "oops"}}]}))
    with pytest.raises(AssistProviderError):
        provider.explain("từ", "đoạn")


def test_groq_timeout(monkeypatch):
    def timeout(*args, **kwargs):
        raise httpx.ReadTimeout("timeout")

    monkeypatch.setattr(httpx, "post", timeout)
    with pytest.raises(AssistTimeoutError):
        GroqProvider("local-test-key", "openai/gpt-oss-120b", 20).explain("từ", "đoạn")
