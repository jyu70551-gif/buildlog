from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.accounts.deps import get_current_user
from app.accounts.models import User
from app.accounts.schemas import (
    LoginRequest,
    NicknameUpdateRequest,
    SignupRequest,
    TokenOut,
    UserOut,
    normalize_email,
)
from app.database import get_db
from app.errors import ApiError
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/accounts", tags=["accounts"])

EMAIL_TAKEN = "이미 사용 중인 이메일입니다. 다른 이메일을 입력해 주세요."
NICKNAME_TAKEN = "이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해 주세요."
LOGIN_FAILED = "로그인 정보가 맞지 않습니다. 이메일과 비밀번호를 확인해 주세요."


def _taken_errors(db: Session, email: str | None, nickname: str, own_id: int | None = None):
    errors: dict[str, str] = {}
    if email is not None and db.scalar(select(User.id).where(User.email == email)) is not None:
        errors["email"] = EMAIL_TAKEN
    other_id = db.scalar(select(User.id).where(User.nickname == nickname))
    if other_id is not None and other_id != own_id:
        errors["nickname"] = NICKNAME_TAKEN
    return errors


@router.post("/signup", response_model=UserOut, status_code=201)
def signup(data: SignupRequest, db: Session = Depends(get_db)):
    errors = _taken_errors(db, data.email, data.nickname)
    if errors:
        raise ApiError(409, "회원가입에 실패했습니다.", errors)

    user = User(email=data.email, nickname=data.nickname, password_hash=hash_password(data.password))
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        # 거의 동시에 같은 이메일·닉네임으로 가입한 경우
        db.rollback()
        errors = _taken_errors(db, data.email, data.nickname)
        raise ApiError(409, "회원가입에 실패했습니다.", errors)
    return user


@router.post("/login", response_model=TokenOut)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == normalize_email(data.email)))
    # 이메일이 없어도 비밀번호 확인과 같은 시간이 걸리도록 항상 확인 절차를 거친다.
    password_ok = verify_password(data.password, user.password_hash if user else None)
    if user is None or not password_ok:
        raise ApiError(401, LOGIN_FAILED)
    return TokenOut(access_token=create_access_token(user.id), user=user)


@router.get("/me", response_model=UserOut)
def read_me(user: User = Depends(get_current_user)):
    return user


@router.patch("/me/nickname", response_model=UserOut)
def update_nickname(
    data: NicknameUpdateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    errors = _taken_errors(db, None, data.nickname, own_id=user.id)
    if errors:
        raise ApiError(409, "닉네임을 바꾸지 못했습니다.", errors)

    user.nickname = data.nickname
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ApiError(409, "닉네임을 바꾸지 못했습니다.", {"nickname": NICKNAME_TAKEN})
    return user
