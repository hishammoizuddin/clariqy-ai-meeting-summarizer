import os, json
from datetime import datetime
from typing import Optional, Dict, Any

DATA_DIR = "uploads/data"
os.makedirs(DATA_DIR, exist_ok=True)

def _path(meeting_id: str) -> str:
    return os.path.join(DATA_DIR, f"{meeting_id}.json")

def save_meeting_data(
    meeting_id: str,
    summary: str,
    transcript: str,
    source_filename: Optional[str] = None,
) -> None:
    payload = {
        "meeting_id": meeting_id,
        "summary": summary,
        "transcript": transcript,
        "source_filename": source_filename,
        "created_at": datetime.utcnow().isoformat() + "Z",
    }
    with open(_path(meeting_id), "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

def load_meeting_data(meeting_id: str) -> Dict[str, Any]:
    p = _path(meeting_id)
    if not os.path.exists(p):
        raise FileNotFoundError(f"No stored data for meeting_id={meeting_id}")
    with open(p, "r", encoding="utf-8") as f:
        return json.load(f)
