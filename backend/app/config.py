from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_DIR = BACKEND_DIR.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env", extra="ignore")

    # 서버 요청을 허용할 화면 주소
    frontend_origin: str = "http://localhost:5173"
    # 개발·테스트 기본값은 SQLite 파일
    database_url: str = f"sqlite:///{(PROJECT_DIR / 'database' / 'buildlog.sqlite3').as_posix()}"
    # 로그인 확인 값(토큰)을 만들 때 쓰는 비밀 키. 실제 값은 .env에만 둔다.
    secret_key: str = ""
    # 로그인 확인 값의 유효 기간(일). 로그아웃할 때까지 유지하기 위해 길게 둔다.
    access_token_days: int = 365


settings = Settings()
