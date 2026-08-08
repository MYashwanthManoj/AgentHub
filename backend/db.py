"""
db.py — SQLite database setup via SQLModel.

Phase 2 note: swap sqlite:///./database.db for postgres://... with zero code changes.
"""

import os
from sqlmodel import SQLModel, create_engine, Session
from typing import Generator

# Overridable via env for tests / ephemeral instances.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./backend/database.db")

engine = create_engine(DATABASE_URL, echo=False, connect_args={"check_same_thread": False})


def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
