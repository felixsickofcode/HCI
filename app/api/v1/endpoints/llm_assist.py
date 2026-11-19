from fastapi import APIRouter

from app.api.deps import CurrentUser, LLMAssistServiceDep
from app.schemas.llm_assist import ExplainRequest, ExplainResponse

router = APIRouter(prefix="/assist", tags=["assist"])


@router.post("/explain", response_model=ExplainResponse)
def explain_word(data: ExplainRequest, service: LLMAssistServiceDep, user: CurrentUser):
    return service.explain_word(data, user.id)
