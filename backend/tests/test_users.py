from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import inspect, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker

from app.accounts.models import User
from app.database import make_engine
from app.security import hash_password, verify_password

BACKEND_DIR = Path(__file__).resolve().parent.parent


def make_user(email="a@example.com", nickname="alpha", password="password123"):
    return User(email=email, nickname=nickname, password_hash=hash_password(password))


def test_user_can_be_saved_and_read(db):
    db.add(make_user())
    db.commit()

    user = db.scalar(select(User).where(User.email == "a@example.com"))
    assert user.nickname == "alpha"
    assert user.created_at is not None


def test_same_email_cannot_be_saved_twice(db):
    db.add(make_user(email="a@example.com", nickname="alpha"))
    db.commit()
    db.add(make_user(email="a@example.com", nickname="beta"))
    with pytest.raises(IntegrityError):
        db.commit()


def test_same_nickname_cannot_be_saved_twice(db):
    db.add(make_user(email="a@example.com", nickname="alpha"))
    db.commit()
    db.add(make_user(email="b@example.com", nickname="alpha"))
    with pytest.raises(IntegrityError):
        db.commit()


def test_different_email_and_nickname_can_be_saved(db):
    db.add(make_user(email="a@example.com", nickname="alpha"))
    db.add(make_user(email="b@example.com", nickname="beta"))
    db.commit()
    assert len(db.scalars(select(User)).all()) == 2


def test_user_is_not_admin_by_default(db):
    db.add(make_user())
    db.commit()
    assert db.scalar(select(User)).is_admin is False


def test_password_is_stored_as_hash_not_plain_text(db):
    db.add(make_user(password="password123"))
    db.commit()

    stored = db.scalar(select(User)).password_hash
    assert "password123" not in stored
    assert verify_password("password123", stored)
    assert not verify_password("wrong-password", stored)


def test_data_remains_after_reconnecting(tmp_path):
    url = f"sqlite:///{(tmp_path / 'persist.sqlite3').as_posix()}"
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("sqlalchemy.url", url)
    command.upgrade(cfg, "head")

    first = make_engine(url)
    with sessionmaker(bind=first)() as session:
        session.add(make_user())
        session.commit()
    first.dispose()

    second = make_engine(url)  # 연결을 끊고 다시 연결 = 서버를 다시 시작한 것과 같은 상황
    with sessionmaker(bind=second)() as session:
        assert session.scalar(select(User)).email == "a@example.com"
    second.dispose()


def test_migration_creates_users_table_on_empty_database(tmp_path):
    url = f"sqlite:///{(tmp_path / 'empty.sqlite3').as_posix()}"
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("sqlalchemy.url", url)

    command.upgrade(cfg, "head")

    engine = make_engine(url)
    inspector = inspect(engine)
    assert "users" in inspector.get_table_names()
    columns = {c["name"] for c in inspector.get_columns("users")}
    assert columns == {"id", "email", "password_hash", "nickname", "is_admin", "created_at"}
    unique_columns = {tuple(u["column_names"]) for u in inspector.get_unique_constraints("users")}
    assert unique_columns == {("email",), ("nickname",)}
    engine.dispose()
