from fastapi import APIRouter

from app.api.v1.endpoints import auth, display_settings, summary, text_extraction, users

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(display_settings.router)
api_router.include_router(text_extraction.router)
api_router.include_router(summary.router)