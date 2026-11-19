from app.schemas.llm_assist import Explanation
from app.services.llm_assist_service import LLMAssistService


class FakeProvider:
    model = "openai/gpt-oss-120b"

    def explain(self, term, context):
        return Explanation(meaning=f"Nghĩa của {term}", example="Đây là một ví dụ mới.")


def test_explain_requires_auth_and_returns_camel_case(client, create_user):
    from app.api.deps import get_llm_assist_service
    from app.main import app

    service = LLMAssistService(FakeProvider())
    app.dependency_overrides[get_llm_assist_service] = lambda: service
    payload = {
        "documentId": "doc-1", "contentVersion": "hash-1", "segmentId": "block-1",
        "contextText": "Em học sinh học.", "selectedText": "sinh học", "start": 7, "end": 15,
    }
    try:
        assert client.post("/api/v1/assist/explain", json=payload).status_code == 401
        _, headers = create_user()
        response = client.post("/api/v1/assist/explain", json=payload, headers=headers)
        assert response.status_code == 200, response.text
        assert response.json() == {
            "documentId": "doc-1", "contentVersion": "hash-1", "segmentId": "block-1",
            "start": 7, "end": 15, "term": "sinh học",
            "meaning": "Nghĩa của sinh học", "example": "Đây là một ví dụ mới.",
            "cached": False,
        }
        assert client.post("/api/v1/assist/explain", json={**payload, "selectedText": "học"}, headers=headers).status_code == 422
    finally:
        app.dependency_overrides.pop(get_llm_assist_service, None)
