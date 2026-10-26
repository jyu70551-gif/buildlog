from datetime import datetime, timedelta, timezone

import jwt
import pytest
from sqlalchemy import select

from app.accounts.models import User
from app.config import settings

PASSWORD = "password123"


def signup(client, email="a@example.com", password=PASSWORD, nickname="alpha"):
    return client.post(
        "/api/accounts/signup",
        json={"email": email, "password": password, "nickname": nickname},
    )


def login(client, email="a@example.com", password=PASSWORD):
    return client.post("/api/accounts/login", json={"email": email, "password": password})


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def login_token(client, email="a@example.com", password=PASSWORD):
    return login(client, email, password).json()["access_token"]


# ---------- 회원가입 (spec 2.1) ----------


def test_signup_succeeds_and_hides_password(client, db):
    response = signup(client)

    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "a@example.com"
    assert body["nickname"] == "alpha"
    assert "password" not in body and "password_hash" not in body

    stored = db.scalar(select(User).where(User.email == "a@example.com"))
    assert stored.password_hash != PASSWORD
    assert PASSWORD not in stored.password_hash


def test_signup_removes_surrounding_spaces_of_email_and_nickname(client):
    response = signup(client, email="  a@example.com  ", nickname="  alpha  ")

    assert response.status_code == 201
    assert response.json()["email"] == "a@example.com"
    assert response.json()["nickname"] == "alpha"


def test_same_email_cannot_sign_up_twice(client):
    signup(client, email="a@example.com", nickname="alpha")
    response = signup(client, email="a@example.com", nickname="beta")

    assert response.status_code == 409
    assert "email" in response.json()["errors"]
    assert "nickname" not in response.json()["errors"]


def test_same_nickname_cannot_sign_up_twice(client):
    signup(client, email="a@example.com", nickname="alpha")
    response = signup(client, email="b@example.com", nickname="alpha")

    assert response.status_code == 409
    assert "nickname" in response.json()["errors"]
    assert "email" not in response.json()["errors"]


def test_different_email_and_nickname_can_both_sign_up(client):
    assert signup(client, "a@example.com", nickname="alpha").status_code == 201
    assert signup(client, "b@example.com", nickname="beta").status_code == 201


@pytest.mark.parametrize("email", ["plain", "a@", "@example.com", "a b@example.com", ""])
def test_invalid_email_format_is_rejected(client, email):
    response = signup(client, email=email)

    assert response.status_code == 422
    assert "email" in response.json()["errors"]


@pytest.mark.parametrize("length, ok", [(7, False), (8, True), (64, True), (65, False)])
def test_password_length_limits(client, length, ok):
    response = signup(client, password="p" * length)

    if ok:
        assert response.status_code == 201
    else:
        assert response.status_code == 422
        assert "password" in response.json()["errors"]


def test_password_is_not_trimmed(client):
    password = "  spaced pass  "
    assert signup(client, password=password).status_code == 201

    assert login(client, password=password).status_code == 200
    assert login(client, password=password.strip()).status_code == 401


@pytest.mark.parametrize(
    "nickname, ok",
    [
        ("a", False),
        ("가", False),
        ("ab", True),
        ("가나", True),
        ("a" * 20, True),
        ("a" * 21, False),
        ("한글_abc1", True),
        ("닉 네임", False),
        ("nick-name", False),
        ("nick!", False),
        ("nick@name", False),
        ("   ", False),
        ("", False),
    ],
)
def test_nickname_length_and_characters(client, nickname, ok):
    response = signup(client, nickname=nickname)

    if ok:
        assert response.status_code == 201
    else:
        assert response.status_code == 422
        assert "nickname" in response.json()["errors"]


def test_missing_fields_are_rejected(client):
    response = client.post("/api/accounts/signup", json={})

    assert response.status_code == 422
    assert set(response.json()["errors"]) == {"email", "password", "nickname"}


def test_failed_signup_creates_no_account(client, db):
    signup(client, password="short")

    assert db.scalars(select(User)).all() == []


# ---------- 로그인 (spec 2.2) ----------


def test_login_succeeds_with_correct_information(client):
    signup(client)
    response = login(client)

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["user"]["nickname"] == "alpha"
    assert "password_hash" not in body["user"]


def test_login_fails_with_wrong_password(client):
    signup(client)
    response = login(client, password="wrong-password")

    assert response.status_code == 401
    assert "access_token" not in response.json()


def test_login_fails_with_unknown_email_and_gives_same_message(client):
    signup(client)
    wrong_password = login(client, password="wrong-password")
    unknown_email = login(client, email="nobody@example.com")

    assert unknown_email.status_code == 401
    assert unknown_email.json()["detail"] == wrong_password.json()["detail"]


def test_login_removes_surrounding_spaces_of_email(client):
    signup(client)

    assert login(client, email="  a@example.com ").status_code == 200


def test_login_accepts_different_letter_case_in_domain(client):
    signup(client, email="a@example.com")

    assert login(client, email="a@EXAMPLE.com").status_code == 200


def test_login_with_empty_values_fails(client):
    signup(client)

    assert login(client, email="", password="").status_code == 401


def test_token_cannot_be_used_after_user_is_deleted(client, db):
    signup(client)
    token = login_token(client)
    db.delete(db.scalar(select(User)))
    db.commit()

    assert client.get("/api/accounts/me", headers=auth(token)).status_code == 401


# ---------- 로그인이 필요한 요청 ----------


def test_me_returns_logged_in_user(client):
    signup(client)
    token = login_token(client)

    response = client.get("/api/accounts/me", headers=auth(token))

    assert response.status_code == 200
    assert response.json()["email"] == "a@example.com"


def test_requests_without_login_are_rejected(client):
    response = client.get("/api/accounts/me")

    assert response.status_code == 401
    assert response.json()["detail"] == "로그인이 필요합니다."


def test_garbage_token_is_rejected(client):
    assert client.get("/api/accounts/me", headers=auth("not-a-real-token")).status_code == 401


def test_token_signed_with_another_key_is_rejected(client):
    signup(client)
    forged = jwt.encode({"sub": "1"}, "some-other-key-0123456789-0123456789-0123456789", algorithm="HS256")

    assert client.get("/api/accounts/me", headers=auth(forged)).status_code == 401


def test_expired_token_is_rejected(client):
    signup(client)
    expired = jwt.encode(
        {"sub": "1", "exp": datetime.now(timezone.utc) - timedelta(seconds=5)},
        settings.secret_key,
        algorithm="HS256",
    )

    assert client.get("/api/accounts/me", headers=auth(expired)).status_code == 401


def test_login_stays_valid_for_a_long_time(client):
    signup(client)
    token = login_token(client)

    payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
    remaining = datetime.fromtimestamp(payload["exp"], timezone.utc) - datetime.now(timezone.utc)
    assert remaining > timedelta(days=300)


# ---------- 닉네임 변경 (spec 2.3) ----------


def change_nickname(client, token, nickname):
    return client.patch("/api/accounts/me/nickname", json={"nickname": nickname}, headers=auth(token))


def test_nickname_can_be_changed_to_unused_one(client):
    signup(client)
    token = login_token(client)

    response = change_nickname(client, token, "  newname  ")

    assert response.status_code == 200
    assert response.json()["nickname"] == "newname"
    assert client.get("/api/accounts/me", headers=auth(token)).json()["nickname"] == "newname"


def test_nickname_used_by_another_user_is_rejected(client):
    signup(client, "a@example.com", nickname="alpha")
    signup(client, "b@example.com", nickname="beta")
    token = login_token(client, "b@example.com")

    response = change_nickname(client, token, "alpha")

    assert response.status_code == 409
    assert "nickname" in response.json()["errors"]
    assert client.get("/api/accounts/me", headers=auth(token)).json()["nickname"] == "beta"


def test_keeping_own_nickname_is_allowed(client):
    signup(client)
    token = login_token(client)

    assert change_nickname(client, token, "alpha").status_code == 200


@pytest.mark.parametrize("nickname", ["a", "a" * 21, "nick name", "nick!", "   "])
def test_nickname_change_applies_same_rules_as_signup(client, nickname):
    signup(client)
    token = login_token(client)

    response = change_nickname(client, token, nickname)

    assert response.status_code == 422
    assert "nickname" in response.json()["errors"]


def test_nickname_change_only_affects_own_account(client):
    signup(client, "a@example.com", nickname="alpha")
    signup(client, "b@example.com", nickname="beta")
    token_a = login_token(client, "a@example.com")
    token_b = login_token(client, "b@example.com")

    change_nickname(client, token_a, "alpha2")

    assert client.get("/api/accounts/me", headers=auth(token_a)).json()["nickname"] == "alpha2"
    assert client.get("/api/accounts/me", headers=auth(token_b)).json()["nickname"] == "beta"


def test_nickname_change_requires_login(client):
    response = client.patch("/api/accounts/me/nickname", json={"nickname": "newname"})

    assert response.status_code == 401
