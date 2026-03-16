import os
from typing import Optional, List
from datetime import datetime
from sqlmodel import SQLModel, Field, create_engine, Session, Relationship
from sqlmodel import SQLModel, Field, create_engine, Session

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data.db")
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    engine = create_engine(DATABASE_URL, echo=False, connect_args=connect_args)
else:
    # Aiven PostgreSQL requires ssl credentials
    # Use the absolute path for ca.pem so that no matter where the script is executed from it works
    ca_cert_path = os.path.join(os.path.dirname(__file__), "..", "ca.pem")
    connect_args = {
        "sslrootcert": ca_cert_path
    }
    # Aiven connection limit is 20, keeping it to 5 pool + 10 max_overflow
    engine = create_engine(
        DATABASE_URL,
        echo=False,
        connect_args=connect_args,
        pool_size=5,
        max_overflow=10
    )

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    password_hash: str
    role: str = Field(default="user")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    meetings: List["Meeting"] = Relationship(back_populates="user")

class Meeting(SQLModel, table=True):
    meeting_id: str = Field(primary_key=True, index=True)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    source_filename: Optional[str] = None
    summary: Optional[str] = None
    transcript: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    user: Optional[User] = Relationship(back_populates="meetings")

def init_db():
    SQLModel.metadata.create_all(engine)

def save_meeting(meeting_id: str, summary: str, transcript: str, source_filename: Optional[str], user_id: Optional[int] = None):
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
