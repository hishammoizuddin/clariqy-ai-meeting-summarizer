"""
Purge stale, unconverted guest accounts and everything they created.

A guest who never signs up leaves behind a User row, Meeting rows, JSON
metadata sidecars, and Pinecone vectors — all of which cost storage/quota.
This script deletes guests older than GUEST_TTL_HOURS that are still flagged
is_guest=True (i.e. never upgraded to a real account).

Run manually:      python cleanup_guests.py
Or via Render cron: python cleanup_guests.py   (e.g. daily)
"""

import os
from datetime import datetime, timedelta

from sqlmodel import Session, select

from utils.db import engine, User, Meeting
from utils.logger import get_logger

log = get_logger("clariqy.cleanup")

GUEST_TTL_HOURS = int(os.getenv("GUEST_TTL_HOURS", "48"))


def _delete_pinecone_vectors(meeting_id: str) -> None:
    try:
        from config import index
        if index is not None:
            index.delete(filter={"meeting_id": meeting_id})
    except Exception as e:
        log.warning("[cleanup] could not delete Pinecone vectors for %s: %s", meeting_id, e)


def _delete_meeting_sidecar(meeting_id: str) -> None:
    try:
        from utils.storage import delete_meeting_data  # type: ignore
        delete_meeting_data(meeting_id)
    except Exception:
        # Storage helper may not expose a delete; ignore — DB row is the source of truth.
        pass


def cleanup() -> None:
    cutoff = datetime.utcnow() - timedelta(hours=GUEST_TTL_HOURS)
    log.info("[cleanup] purging unconverted guests created before %s (TTL=%dh)",
             cutoff.isoformat(), GUEST_TTL_HOURS)

    deleted_users = 0
    deleted_meetings = 0

    with Session(engine) as session:
        stale_guests = session.exec(
            select(User).where(
                User.is_guest == True,           # noqa: E712
                User.created_at < cutoff,
            )
        ).all()

        for guest in stale_guests:
            meetings = session.exec(
                select(Meeting).where(Meeting.user_id == guest.id)
            ).all()

            for m in meetings:
                _delete_pinecone_vectors(m.meeting_id)
                _delete_meeting_sidecar(m.meeting_id)
                session.delete(m)
                deleted_meetings += 1

            session.delete(guest)
            deleted_users += 1

        session.commit()

    log.info("[cleanup] done — removed %d guest accounts and %d meetings",
             deleted_users, deleted_meetings)


if __name__ == "__main__":
    cleanup()
