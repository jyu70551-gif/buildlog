from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

GENERIC_INVALID = "입력한 내용을 확인해 주세요."

# 입력 검사에 실패했을 때 항목별로 보여줄 안내 문구
FIELD_MESSAGES = {
    "email": "올바른 이메일 주소를 입력해 주세요.",
    "password": "비밀번호는 8자 이상 64자 이하로 입력해 주세요.",
    "nickname": "닉네임은 2~20자이며 한글, 영문, 숫자, 밑줄만 사용할 수 있습니다.",
}


class ApiError(Exception):
    """화면에 보여줄 실패 이유를 담은 오류. detail은 전체 안내, errors는 항목별 안내."""

    def __init__(self, status_code: int, detail: str, errors: dict[str, str] | None = None):
        self.status_code = status_code
        self.detail = detail
        self.errors = errors or {}


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def handle_api_error(_: Request, exc: ApiError):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail, "errors": exc.errors},
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(_: Request, exc: RequestValidationError):
        errors: dict[str, str] = {}
        for item in exc.errors():
            loc = item.get("loc", ())
            if len(loc) >= 2 and loc[0] == "body":
                field = str(loc[-1])
                errors.setdefault(field, FIELD_MESSAGES.get(field, GENERIC_INVALID))
        return JSONResponse(
            status_code=422,
            content={"detail": GENERIC_INVALID, "errors": errors},
        )
