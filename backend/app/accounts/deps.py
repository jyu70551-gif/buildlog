from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.accounts.models import User
from app.database import get_db
from app.errors import ApiError
from app.security import decode_access_token

_bearer = HTTPBearer(auto_error=False)

LOGIN_REQUIRED = "로그인이 필요합니다."


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    """로그인한 사용자를 돌려준다. 로그인하지 않았으면 요청을 거절한다."""
    user_id = decode_access_token(credentials.credentials) if credentials else None
    user = db.get(User, user_id) if user_id is not None else None
    if user is None:
        raise ApiError(401, LOGIN_REQUIRED)
    return user
