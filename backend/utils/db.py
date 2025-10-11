import os
from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field, create_engine, Session

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data.db")
# SQLite needs this for multi-threaded FastAPI apps
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, echo=False, connect_args=connect_args)

class Meeting(SQLModel, table=True):
    meeting_id: str = Field(primary_key=True, index=True)
    source_filename: Optional[str] = None
    summary: Optional[str] = None
    transcript: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

def init_db():
    SQLModel.metadata.create_all(engine)

def save_meeting(meeting_id: str, summary: str, transcript: str, source_filename: Optional[str]):
    from datetime import datetime as dt
    with Session(engine) as session:
        m = session.get(Meeting, meeting_id)
        if m is None:
            m = Meeting(
                meeting_id=meeting_id,
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
