from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.accounts.router import router as accounts_router
from app.config import settings
from app.errors import register_error_handlers

app = FastAPI(title="BuildLog")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_methods=["*"],
    allow_headers=["*"],
)

register_error_handlers(app)
app.include_router(accounts_router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
