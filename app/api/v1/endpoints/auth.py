from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUser, UserServiceDep
from app.core.security import create_access_token
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from app.schemas.user import UserCreate, UserRead

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest, service: UserServiceDep):
    full_name = (data.full_name or "").strip() or data.email.split("@")[0]
    return service.create_user(
        UserCreate(email=data.email, full_name=full_name, password=data.password)
    )


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, service: UserServiceDep):
    user = service.authenticate(data.email, data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    return TokenResponse(access_token=create_access_token(user.id))


@router.get("/me", response_model=UserRead)
def read_current_user(current_user: CurrentUser):
    return current_user
