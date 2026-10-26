import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

import app.models  # noqa: F401
from app.config import settings
from app.database import Base, get_db, make_engine
from app.main import app


@pytest.fixture(autouse=True)
def test_secret_key(monkeypatch):
    # 테스트에서만 쓰는 가짜 키. 실제 .env의 키는 사용하지 않는다.
    monkeypatch.setattr(settings, "secret_key", "test-only-key-0123456789-0123456789-0123456789")


@pytest.fixture
def engine(tmp_path):
    """테스트마다 새로 만든 임시 SQLite 파일. 실제 개발용 데이터 파일은 건드리지 않는다."""
    engine = make_engine(f"sqlite:///{(tmp_path / 'test.sqlite3').as_posix()}")
    Base.metadata.create_all(engine)
    yield engine
    engine.dispose()


@pytest.fixture
def db(engine):
    session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)()
    yield session
    session.close()


@pytest.fixture
def client(engine):
    session_factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

    def override_get_db():
        session = session_factory()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()
