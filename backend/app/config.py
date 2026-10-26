from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_DIR = BACKEND_DIR.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env", extra="ignore")

    # 서버 요청을 허용할 화면 주소
    frontend_origin: str = "http://localhost:5173"
    # 개발·테스트 기본값은 SQLite 파일. Phase 2부터 사용한다.
    database_url: str = f"sqlite:///{(PROJECT_DIR / 'database' / 'buildlog.sqlite3').as_posix()}"


settings = Settings()
