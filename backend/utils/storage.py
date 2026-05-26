"""
DB-backed meeting metadata storage.

All meeting extra data (source_type, segments, speakers, etc.) is stored in the
`Meeting.extra_data` TEXT column as a JSON blob — no files written to disk.
"""

import json
from datetime import datetime
from typing import Optional, Dict, Any

from utils.db import engine, Meeting
from sqlmodel import Session


def save_meeting_data(
    meeting_id: str,
    summary: str,
    transcript: str,
    source_filename: Optional[str] = None,
    extras: Optional[Dict[str, Any]] = None,
) -> None:
    """Persist metadata JSON into Meeting.extra_data."""
    payload: Dict[str, Any] = {
        "meeting_id": meeting_id,
        "summary": summary,
        "transcript": transcript,
        "source_filename": source_filename,
        "created_at": datetime.utcnow().isoformat() + "Z",
    }
    if extras:
        payload.update({k: v for k, v in extras.items() if v is not None})

    with Session(engine) as session:
        m = session.get(Meeting, meeting_id)
        if m is not None:
            m.extra_data = json.dumps(payload, ensure_ascii=False)
            m.updated_at = datetime.utcnow()
            session.add(m)
            session.commit()


def load_meeting_data(meeting_id: str) -> Dict[str, Any]:
    """Load the metadata JSON for a meeting from the DB."""
    with Session(engine) as session:
        m = session.get(Meeting, meeting_id)
        if m is None:
            raise FileNotFoundError(f"No stored data for meeting_id={meeting_id}")
        if m.extra_data:
            return json.loads(m.extra_data)
        # Fallback: reconstruct minimal dict from core Meeting columns
        return {
            "meeting_id": m.meeting_id,
            "summary": m.summary or "",
            "transcript": m.transcript or "",
            "source_filename": m.source_filename,
        }


def update_meeting_data(meeting_id: str, updates: Dict[str, Any]) -> None:
    """Merge `updates` into the existing metadata JSON for a meeting."""
    with Session(engine) as session:
        m = session.get(Meeting, meeting_id)
        if m is None:
            return

        try:
            payload: Dict[str, Any] = json.loads(m.extra_data) if m.extra_data else {}
        except Exception:
            payload = {}

        payload.update(updates)
        m.extra_data = json.dumps(payload, ensure_ascii=False)
        m.updated_at = datetime.utcnow()
        session.add(m)
        session.commit()
