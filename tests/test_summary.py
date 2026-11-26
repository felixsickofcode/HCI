import httpx
import pytest

from app.core.exceptions import (
    AssistProviderError,
    AssistRateLimitError,
    AssistTimeoutError,
    AssistUnavailableError,
    InvalidRequestError,
    PayloadTooLargeError,
    SummaryUnavailableError,
)
from app.core.config import Settings
from app.schemas.summary import SegmentIn, SummarizeRequest, SummaryItem
from app.services.llm_provider import GroqProvider
from app.services.summary_service import SummaryService, content_hash, validate_sources

pytestmark = pytest.mark.no_db


@pytest.fixture(autouse=True)
def run_threadpool_inline(monkeypatch):
    async def run_inline(func, *args, **kwargs):
        return func(*args, **kwargs)

    monkeypatch.setattr("app.services.summary_service.run_in_threadpool", run_inline)


def request(*, method="extractive", segments=None):
    return SummarizeRequest(
        documentId="doc-1",
        method=method,
        segments=segments or [
            SegmentIn(id="block-1", text="Một đoạn văn đủ dài để kiểm tra nội dung đầu vào." * 5)
        ],
    )


class FakeProvider:
    def __init__(self, items=None, error=None):
        self.items = items or [SummaryItem(id="ignored", text=" Ý chính ", sources=["block-1"])]
        self.error = error
        self.calls = []

    def summarize(self, segments):
        self.calls.append(segments)
        if self.error:
            raise self.error
        return self.items


@pytest.mark.parametrize("method", ["extractive", "llm"])
def test_summary_rejects_duplicate_segment_ids(method):
    service = SummaryService(Settings(DATABASE_URL="postgresql://user:pass@localhost/db"), FakeProvider())
    data = request(method=method, segments=[
        SegmentIn(id="same", text="a" * 160),
        SegmentIn(id="same", text="b" * 160),
    ])
    with pytest.raises(InvalidRequestError):
        import asyncio
        asyncio.run(service.summarize(data))


def test_summary_rejects_too_short_and_too_many_segments():
    service = SummaryService(Settings(DATABASE_URL="postgresql://user:pass@localhost/db"))
    import asyncio

    with pytest.raises(SummaryUnavailableError):
        asyncio.run(service.summarize(request(segments=[SegmentIn(id="short", text="ngắn")])))

    many = [SegmentIn(id=f"b-{i}", text="x") for i in range(501)]
    # Schema cho phép payload này; service phải từ chối theo giới hạn cấu hình.
    data = request(segments=many)
    with pytest.raises(PayloadTooLargeError):
        asyncio.run(service.summarize(data))


def test_validate_sources_drops_unknown_and_duplicate_ids():
    items = [
        SummaryItem(id="old", text="  Ý một  ", sources=["bad", "block-1", "block-1"]),
        SummaryItem(id="old-2", text="Không có nguồn hợp lệ", sources=["missing"]),
    ]
    result = validate_sources(items, {"block-1"})
    assert [item.model_dump() for item in result] == [
        {"id": "summary-1", "text": "Ý một", "sources": ["block-1"]}
    ]


def test_llm_summary_response_has_content_hash_and_validated_sources():
    provider = FakeProvider(items=[
        SummaryItem(id="provider-id", text=" Ý chính ", sources=["block-1", "unknown"]),
        SummaryItem(id="empty-source", text="Không có nguồn", sources=["unknown"]),
    ])
    service = SummaryService(Settings(DATABASE_URL="postgresql://user:pass@localhost/db"), provider)
    import asyncio

    data = request(method="llm", segments=[
        SegmentIn(id="block-1", text="Một đoạn văn đủ dài để kiểm tra nội dung đầu vào." * 7)
    ])
    result = asyncio.run(service.summarize(data))
    assert result.document_id == "doc-1"
    assert result.content_version == content_hash(data.segments)
    assert result.method == "llm"
    assert [(item.id, item.text, item.sources) for item in result.items] == [
        ("summary-1", "Ý chính", ["block-1"])
    ]
    assert provider.calls == [data.segments]


@pytest.mark.parametrize("status, error", [
    (429, AssistRateLimitError),
    (401, AssistUnavailableError),
    (503, AssistUnavailableError),
    (400, AssistProviderError),
])
def test_groq_summary_maps_http_errors(monkeypatch, status, error):
    monkeypatch.setattr(httpx, "post", lambda *args, **kwargs: httpx.Response(status))
    provider = GroqProvider("test-key", "test-model", 1)
    with pytest.raises(error):
        provider.summarize([SegmentIn(id="block-1", text="source")])


def test_groq_summary_request_and_source_filtering(monkeypatch):
    def respond(url, *, headers, json, timeout):
        assert url == GroqProvider.URL
        assert headers["Authorization"] == "Bearer test-key"
        assert json["model"] == "test-model"
        assert json["response_format"]["json_schema"]["strict"] is True
        assert json["max_completion_tokens"] == 1500
        assert timeout == 2
        assert json["messages"][1]["content"].find("block-1") >= 0
        return httpx.Response(200, json={"choices": [{"message": {"content":
            '{"items":[{"text":"Ý chính","sources":["block-1","unknown"]}]}'
        }}]})

    monkeypatch.setattr(httpx, "post", respond)
    provider = GroqProvider("test-key", "test-model", 2)
    result = provider.summarize([SegmentIn(id="block-1", text="source")])
    assert result[0].text == "Ý chính"
    # Provider trả source IDs; lọc unknown thuộc trách nhiệm SummaryService.
    assert result[0].sources == ["block-1", "unknown"]


@pytest.mark.parametrize("content, error", [
    ("not json", AssistProviderError),
    ('{"items":[{"text":"","sources":["block-1"]}]}', AssistProviderError),
    ('{"items":[{"text":"Ý chính","sources":[]}]}', AssistProviderError),
])
def test_groq_summary_rejects_malformed_output(monkeypatch, content, error):
    monkeypatch.setattr(httpx, "post", lambda *args, **kwargs: httpx.Response(
        200, json={"choices": [{"message": {"content": content}}]},
    ))
    with pytest.raises(error):
        GroqProvider("test-key", "test-model", 1).summarize(
            [SegmentIn(id="block-1", text="source")]
        )


def test_groq_summary_timeout_and_missing_key():
    def timeout(*args, **kwargs):
        raise httpx.ReadTimeout("timeout")

    provider = GroqProvider("test-key", "test-model", 1)
    from unittest.mock import patch
    with patch("app.services.llm_provider.httpx.post", timeout):
        with pytest.raises(AssistTimeoutError):
            provider.summarize([SegmentIn(id="block-1", text="source")])

    with pytest.raises(AssistUnavailableError):
        GroqProvider(None, "test-model", 1).summarize(
            [SegmentIn(id="block-1", text="source")]
        )
