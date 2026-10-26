from datetime import datetime, timedelta, timezone

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

from app.config import settings

_hasher = PasswordHasher()
# 존재하지 않는 이메일로 로그인해도 같은 시간이 걸리도록 비교에 쓰는 가짜 해시
_DUMMY_HASH = _hasher.hash("buildlog-dummy-password")

_ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    try:
        return _hasher.verify(password_hash or _DUMMY_HASH, password) and password_hash is not None
    except (VerificationError, InvalidHashError):
        return False


def create_access_token(user_id: int) -> str:
    if not settings.secret_key:
        raise RuntimeError("SECRET_KEY가 설정되지 않았습니다. backend/.env에 값을 넣어 주세요.")
    expires = datetime.now(timezone.utc) + timedelta(days=settings.access_token_days)
    return jwt.encode({"sub": str(user_id), "exp": expires}, settings.secret_key, algorithm=_ALGORITHM)


def decode_access_token(token: str) -> int | None:
    """토큰이 올바르면 사용자 번호를, 아니면 None을 돌려준다."""
    if not settings.secret_key:
        return None
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[_ALGORITHM])
        return int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        return None
