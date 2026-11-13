from typing import Annotated

from fastapi import APIRouter, Query, Response, status

from app.api.deps import CurrentUser, VocabularyServiceDep
from app.schemas.vocabulary import (
    VocabularyPage, VocabularyQuery, VocabularyRead, VocabularySource, VocabularyWrite,
)

router = APIRouter(prefix="/me/vocabulary", tags=["vocabulary"])


@router.get("", response_model=VocabularyPage)
def list_vocabulary(current_user: CurrentUser, service: VocabularyServiceDep,
                    query: Annotated[VocabularyQuery, Query()]):
    items, total = service.list(current_user.id, query)
    return VocabularyPage(items=[VocabularyRead.model_validate(item) for item in items],
                          total=total, skip=query.skip, limit=query.limit)


@router.get("/sources", response_model=list[VocabularySource])
def list_sources(current_user: CurrentUser, service: VocabularyServiceDep):
    return service.sources(current_user.id)


@router.post("", response_model=VocabularyRead, status_code=status.HTTP_201_CREATED)
def save_vocabulary(data: VocabularyWrite, current_user: CurrentUser,
                    service: VocabularyServiceDep, response: Response):
    entry, created = service.save(current_user.id, data)
    if not created:
        response.status_code = status.HTTP_200_OK
    return VocabularyRead.model_validate(entry)


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vocabulary(entry_id: int, current_user: CurrentUser, service: VocabularyServiceDep):
    service.delete(current_user.id, entry_id)


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def clear_vocabulary(current_user: CurrentUser, service: VocabularyServiceDep):
    service.clear(current_user.id)
