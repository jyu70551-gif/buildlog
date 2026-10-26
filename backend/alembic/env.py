from logging.config import fileConfig

from alembic import context

from app.config import settings
from app.database import Base, make_engine
import app.models  # noqa: F401  (모든 데이터 구조를 불러와 마이그레이션이 알 수 있게 함)

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name, disable_existing_loggers=False)

target_metadata = Base.metadata


def get_url() -> str:
    # 테스트 등에서 alembic 설정으로 주소를 직접 넘기면 그 값을, 아니면 .env의 DATABASE_URL을 쓴다.
    return config.get_main_option("sqlalchemy.url") or settings.database_url


def run_migrations_offline() -> None:
    context.configure(
        url=get_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = make_engine(get_url())

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            # SQLite는 열 변경이 제한적이라 배치 방식을 쓴다. 다른 데이터베이스에서도 문제없다.
            render_as_batch=True,
        )

        with context.begin_transaction():
            context.run_migrations()

    connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
