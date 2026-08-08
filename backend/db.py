"""
db.py — SQLite database setup via SQLModel.

Phase 2 note: swap sqlite:///./database.db for postgres://... with zero code changes.
"""

import os
from typing import Generator

from fastapi import HTTPException
from sqlalchemy import inspect, text
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import SQLModel, create_engine, Session

# Overridable via env for tests / ephemeral instances.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./backend/database.db")

engine = create_engine(DATABASE_URL, echo=False, connect_args={"check_same_thread": False})


def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)
    migrate_schema()


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session


def safe_commit(session: Session) -> None:
    """
    Commit, converting any database error into a clean HTTP 500 instead of a
    raw stack trace. Rolls back so the session stays usable. Routers call this
    instead of session.commit() so a locked/failed write never 500s opaquely.
    """
    try:
        session.commit()
    except SQLAlchemyError as exc:
        session.rollback()
        print(f"[db] commit failed: {exc}")
        raise HTTPException(status_code=500, detail="Database write failed") from exc


# ─── Lightweight additive migration ──────────────────────────────────────────
# SQLModel.create_all() creates missing *tables* but never alters existing ones,
# so a column added to a model after the DB file already exists would be missing
# on disk. This reconciles each mapped table by ADD COLUMN-ing any declared
# column SQLite doesn't have yet. Additive only — never drops or retypes — so it
# is safe to run on every startup and preserves all existing rows.

# SQLModel column type → SQLite column type (best-effort; SQLite is dynamically
# typed, so affinity is all that matters here).
_SQLITE_TYPE_FALLBACK = "TEXT"


def _sqlite_type(column) -> str:
    try:
        return column.type.compile(dialect=engine.dialect)
    except Exception:  # noqa: BLE001 — fall back to a permissive affinity
        return _SQLITE_TYPE_FALLBACK


def migrate_schema() -> None:
    """ADD COLUMN any model column missing from the on-disk SQLite table."""
    if not engine.url.get_backend_name().startswith("sqlite"):
        return  # only needed for the file-based demo DB

    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    with engine.begin() as conn:
        for table in SQLModel.metadata.sorted_tables:
            if table.name not in existing_tables:
                continue  # create_all() already made it with all columns
            have = {col["name"] for col in inspector.get_columns(table.name)}
            for column in table.columns:
                if column.name in have:
                    continue
                col_type = _sqlite_type(column)
                default = ""
                if column.default is not None and getattr(column.default, "is_scalar", False):
                    val = column.default.arg
                    if isinstance(val, str):
                        default = f" DEFAULT '{val}'"
                    elif isinstance(val, (int, float)):
                        default = f" DEFAULT {val}"
                ddl = f'ALTER TABLE "{table.name}" ADD COLUMN "{column.name}" {col_type}{default}'
                try:
                    conn.execute(text(ddl))
                    print(f"[db] migrated: added {table.name}.{column.name}")
                except SQLAlchemyError as exc:
                    print(f"[db] migration skipped for {table.name}.{column.name}: {exc}")
