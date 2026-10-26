import re

from email_validator import EmailNotValidError, validate_email
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

# 한글(완성형 글자와 자음·모음), 영문, 숫자, 밑줄만 허용
NICKNAME_PATTERN = re.compile(r"^[가-힣ㄱ-ㅎㅏ-ㅣA-Za-z0-9_]+$")


def _strip(value):
    return value.strip() if isinstance(value, str) else value


def _check_nickname(value: str) -> str:
    if not NICKNAME_PATTERN.match(value):
        raise ValueError("닉네임에 사용할 수 없는 문자가 있습니다.")
    return value


def normalize_email(value: str) -> str:
    """가입할 때와 같은 방식으로 이메일을 정리한다. 형식이 맞지 않으면 앞뒤 공백만 제거한다."""
    value = value.strip()
    try:
        return validate_email(value, check_deliverability=False).normalized
    except EmailNotValidError:
        return value


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=64)
    nickname: str = Field(min_length=2, max_length=20)

    # 이메일과 닉네임은 앞뒤 공백을 제거하고, 비밀번호는 입력한 그대로 둔다.
    strip_email = field_validator("email", mode="before")(_strip)
    strip_nickname = field_validator("nickname", mode="before")(_strip)
    check_nickname = field_validator("nickname")(_check_nickname)


class LoginRequest(BaseModel):
    email: str
    password: str

    strip_email = field_validator("email", mode="before")(_strip)


class NicknameUpdateRequest(BaseModel):
    nickname: str = Field(min_length=2, max_length=20)

    strip_nickname = field_validator("nickname", mode="before")(_strip)
    check_nickname = field_validator("nickname")(_check_nickname)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    nickname: str
    is_admin: bool


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
