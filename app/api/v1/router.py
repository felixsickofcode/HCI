from fastapi import APIRouter

from app.api.v1.endpoints import display_settings, users

api_router = APIRouter()
api_router.include_router(users.router)
api_router.include_router(display_settings.router)