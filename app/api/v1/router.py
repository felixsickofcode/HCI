from fastapi import APIRouter

from app.api.v1.endpoints import auth, display_settings, text_extraction, users, vocabulary

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(display_settings.router)
api_router.include_router(text_extraction.router)
api_router.include_router(vocabulary.router)
