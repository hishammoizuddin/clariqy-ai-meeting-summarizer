import os
from typing import Optional, List
from datetime import datetime
from sqlalchemy import inspect as sa_inspect, text
from sqlmodel import SQLModel, Field, create_engine, Session, Relationship

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data.db")
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    engine = create_engine(DATABASE_URL, echo=False, connect_args=connect_args)
else:
    # Aiven PostgreSQL requires ssl credentials
    ca_cert_path = os.path.join(os.path.dirname(__file__), "..", "ca.pem")
    connect_args = {"sslrootcert": ca_cert_path}
    engine = create_engine(
        DATABASE_URL,
        echo=False,
        connect_args=connect_args,
        pool_size=5,
        max_overflow=10,
    )


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    name: str = Field(default="User")
    password_hash: str
    role: str = Field(default="user")
    phone_country_code: Optional[str] = None
    phone_number: Optional[str] = None
    country: Optional[str] = None
    avatar_filename: Optional[str] = None   # legacy – kept for zero-downtime migration
    avatar_data: Optional[str] = None       # base64 data-URI, e.g. "data:image/png;base64,..."
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    # Consent tracking
    terms_accepted_at: Optional[datetime] = None
    privacy_accepted_at: Optional[datetime] = None
    consent_ip: Optional[str] = None

    meetings: List["Meeting"] = Relationship(back_populates="user")
    collections: List["Collection"] = Relationship(back_populates="user")


class Collection(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id", index=True)
    name: str
    description: Optional[str] = None
    emoji: Optional[str] = Field(default="📁")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    user: Optional[User] = Relationship(back_populates="collections")
    meetings: List["Meeting"] = Relationship(back_populates="collection")


class Meeting(SQLModel, table=True):
    meeting_id: str = Field(primary_key=True, index=True)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    collection_id: Optional[int] = Field(default=None, foreign_key="collection.id", index=True)
    source_filename: Optional[str] = None
    summary: Optional[str] = None
    transcript: Optional[str] = None
    extra_data: Optional[str] = None        # JSON blob: source_type, segments, speakers, etc.
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    user: Optional[User] = Relationship(back_populates="meetings")
    collection: Optional[Collection] = Relationship(back_populates="meetings")


def init_db():
    SQLModel.metadata.create_all(engine)
    _migrate_user_profile_columns()
    _migrate_meeting_columns()


def _migrate_user_profile_columns() -> None:
    inspector = sa_inspect(engine)
    if "user" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("user")}
    dialect = engine.dialect.name
    statements = {
        "phone_country_code": {
            "sqlite": 'ALTER TABLE "user" ADD COLUMN phone_country_code VARCHAR',
            "default": 'ALTER TABLE "user" ADD COLUMN phone_country_code VARCHAR',
        },
        "phone_number": {
            "sqlite": 'ALTER TABLE "user" ADD COLUMN phone_number VARCHAR',
            "default": 'ALTER TABLE "user" ADD COLUMN phone_number VARCHAR',
        },
        "country": {
            "sqlite": 'ALTER TABLE "user" ADD COLUMN country VARCHAR',
            "default": 'ALTER TABLE "user" ADD COLUMN country VARCHAR',
        },
        "avatar_filename": {
            "sqlite": 'ALTER TABLE "user" ADD COLUMN avatar_filename VARCHAR',
            "default": 'ALTER TABLE "user" ADD COLUMN avatar_filename VARCHAR',
        },
        "updated_at": {
            "sqlite": 'ALTER TABLE "user" ADD COLUMN updated_at DATETIME',
            "default": 'ALTER TABLE "user" ADD COLUMN updated_at TIMESTAMP',
        },
        "terms_accepted_at": {
            "sqlite": 'ALTER TABLE "user" ADD COLUMN terms_accepted_at DATETIME',
            "default": 'ALTER TABLE "user" ADD COLUMN terms_accepted_at TIMESTAMP',
        },
        "privacy_accepted_at": {
            "sqlite": 'ALTER TABLE "user" ADD COLUMN privacy_accepted_at DATETIME',
            "default": 'ALTER TABLE "user" ADD COLUMN privacy_accepted_at TIMESTAMP',
        },
        "consent_ip": {
            "sqlite": 'ALTER TABLE "user" ADD COLUMN consent_ip VARCHAR',
            "default": 'ALTER TABLE "user" ADD COLUMN consent_ip VARCHAR',
        },
        "avatar_data": {
            "sqlite": 'ALTER TABLE "user" ADD COLUMN avatar_data TEXT',
            "default": 'ALTER TABLE "user" ADD COLUMN avatar_data TEXT',
        },
    }

    with engine.begin() as connection:
        for column_name, statement_map in statements.items():
            if column_name in existing_columns:
                continue
            statement = statement_map.get(dialect, statement_map["default"])
            connection.execute(text(statement))


def _migrate_meeting_columns() -> None:
    """Add any new columns to the meeting table for existing databases.  Idempotent."""
    inspector = sa_inspect(engine)
    if "meeting" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("meeting")}
    dialect = engine.dialect.name
    statements = {
        "collection_id": {
            "sqlite": 'ALTER TABLE "meeting" ADD COLUMN collection_id INTEGER REFERENCES "collection" (id)',
            "default": 'ALTER TABLE "meeting" ADD COLUMN collection_id INTEGER REFERENCES "collection" (id)',
        },
        "extra_data": {
            "sqlite": 'ALTER TABLE "meeting" ADD COLUMN extra_data TEXT',
            "default": 'ALTER TABLE "meeting" ADD COLUMN extra_data TEXT',
        },
    }

    with engine.begin() as connection:
        for column_name, statement_map in statements.items():
            if column_name in existing_columns:
                continue
            statement = statement_map.get(dialect, statement_map["default"])
            connection.execute(text(statement))


def save_meeting(
    meeting_id: str,
    summary: str,
    transcript: str,
    source_filename: Optional[str],
    user_id: Optional[int] = None,
):
    from datetime import datetime as dt

    with Session(engine) as session:
        m = session.get(Meeting, meeting_id)
        if m is None:
            m = Meeting(
                meeting_id=meeting_id,
                user_id=user_id,
                source_filename=source_filename,
                summary=summary,
                transcript=transcript,
            )
            session.add(m)
        else:
            m.summary = summary
            m.transcript = transcript
            if source_filename:
                m.source_filename = source_filename
            m.updated_at = dt.utcnow()
        session.commit()


def get_meeting(meeting_id: str) -> Optional[Meeting]:
    with Session(engine) as session:
        return session.get(Meeting, meeting_id)
