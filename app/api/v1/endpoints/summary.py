from fastapi import APIRouter, Depends

from app.api.deps import SummaryServiceDep, get_current_user
from app.schemas.summary import SummarizeRequest, SummarizeResponse

router = APIRouter(
    prefix="/assist",
    tags=["assist"],
    dependencies=[Depends(get_current_user)],
)


@router.post("/summarize", response_model=SummarizeResponse)
async def summarize(data: SummarizeRequest, service: SummaryServiceDep):
    return await service.summarize(data)