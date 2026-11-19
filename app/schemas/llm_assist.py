from pydantic import Field

from app.schemas.base import CamelModel


class ExplainRequest(CamelModel):
    document_id: str = Field(min_length=1, max_length=100)
    content_version: str = Field(min_length=1, max_length=128)
    segment_id: str = Field(min_length=1, max_length=100)
    context_text: str = Field(min_length=1)
    selected_text: str = Field(min_length=1)
    start: int = Field(ge=0)
    end: int = Field(gt=0)


class ExplainResponse(CamelModel):
    document_id: str
    content_version: str
    segment_id: str
    start: int
    end: int
    term: str
    meaning: str
    example: str
    cached: bool


class Explanation(CamelModel):
    meaning: str = Field(min_length=1, max_length=600)
    example: str = Field(min_length=1, max_length=400)
