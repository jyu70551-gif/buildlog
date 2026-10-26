from fastapi.testclient import TestClient

from app.config import settings
from app.main import app

client = TestClient(app)


def test_health_returns_ok():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_allowed_frontend_origin_gets_cors_header():
    response = client.get("/api/health", headers={"Origin": settings.frontend_origin})
    assert response.headers["access-control-allow-origin"] == settings.frontend_origin


def test_other_origin_gets_no_cors_header():
    response = client.get("/api/health", headers={"Origin": "http://evil.example"})
    assert "access-control-allow-origin" not in response.headers
