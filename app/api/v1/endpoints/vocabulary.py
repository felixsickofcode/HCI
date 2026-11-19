from typing import Annotated

from fastapi import APIRouter, Query, Response, status

from app.api.deps import CurrentUser, VocabularyServiceDep
from app.schemas.vocabulary import (
    VocabularyNote, VocabularyPage, VocabularyQuery, VocabularyRead, VocabularySource, VocabularyWrite,
)

router = APIRouter(prefix="/me/vocabulary", tags=["vocabulary"])


@router.get("", response_model=VocabularyPage)
def list_vocabulary(current_user: CurrentUser, service: VocabularyServiceDep,
                    query: Annotated[VocabularyQuery, Query()]):
    items, total, library_total, last_removed = service.list(current_user.id, query)
    return VocabularyPage(items=[VocabularyRead.model_validate(item) for item in items],
                          total=total, library_total=library_total, last_removed=last_removed, skip=query.skip, limit=query.limit)


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


@router.patch("/{entry_id}", response_model=VocabularyRead)
def update_note(entry_id: int, data: VocabularyNote, current_user: CurrentUser, service: VocabularyServiceDep):
    return service.update_note(current_user.id, entry_id, data.meaning)


@router.post("/{entry_id}/restore", response_model=VocabularyRead)
def restore_vocabulary(entry_id: int, current_user: CurrentUser, service: VocabularyServiceDep):
    return service.restore(current_user.id, entry_id)


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vocabulary(entry_id: int, current_user: CurrentUser, service: VocabularyServiceDep, undoable: bool = False):
    service.delete(current_user.id, entry_id, undoable)


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def clear_vocabulary(current_user: CurrentUser, service: VocabularyServiceDep,
                     expected_total: Annotated[int | None, Query(alias="expectedTotal", ge=0)] = None):
    service.clear(current_user.id, expected_total)
