import asyncio
from datetime import datetime
import glob
import mimetypes
import os
import re
import shutil
import uuid
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordRequestForm
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlmodel import select, Session
from utils.db import init_db, save_meeting, get_meeting, engine, User, Meeting
from utils.storage import load_meeting_data, save_meeting_data, update_meeting_data
from utils.transcribe import (
    create_realtime_transcription_secret,
    transcribe_audio,
    transcribe_audio_diarized,
)
from utils.summarize import generate_summary, infer_summary_blueprint
from utils.embeddings import embed_and_store
from utils.rag import query_meeting
from utils.pdf_generator import generate_summary_pdf
from utils.auth import (
    ALGORITHM,
    SECRET_KEY,
    create_access_token,
    get_current_user,
    get_password_hash,
    verify_password,
)

app = FastAPI(title="ClarIQy - AI Meeting Summarizer")

# CORS (restrict in prod)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def _startup():
    init_db()
    os.makedirs("uploads", exist_ok=True)
    os.makedirs("uploads/audio", exist_ok=True)
    os.makedirs("uploads/chunks", exist_ok=True)
    os.makedirs("uploads/pdfs", exist_ok=True)
    os.makedirs("uploads/data", exist_ok=True)

# Ensure directories exist
UPLOAD_FOLDER = "uploads"
ALLOWED_UPLOAD_EXTENSIONS = {".mp3", ".wav", ".m4a", ".mp4", ".mov", ".webm", ".mkv", ".ogg"}
MEETING_METADATA_FIELDS = {
    "source_type",
    "language",
    "transcript_segments",
    "raw_transcript_segments",
    "speakers",
    "duration_seconds",
    "speaker_assignments",
    "expected_speakers",
}

class RenameRequest(BaseModel):
    new_name: str

class LiveSessionRequest(BaseModel):
    language: Optional[str] = "en"

class SpeakerAssignmentsRequest(BaseModel):
    assignments: Dict[str, str]

def _default_live_title() -> str:
    return datetime.utcnow().strftime("Live session %b %d, %Y %I:%M %p UTC")

def _clean_language(language: Optional[str]) -> Optional[str]:
    if not language:
        return None
    clean = language.strip().lower()
    return clean or None

def _parse_speaker_names(raw: Optional[str]) -> List[str]:
    if not raw:
        return []

    speakers: List[str] = []
    seen = set()
    for part in re.split(r"[,\n]", raw):
        name = part.strip()
        if not name:
            continue
        key = name.lower()
        if key in seen:
            continue
        seen.add(key)
        speakers.append(name)
    return speakers[:10]

def _parse_expected_speakers_json(raw: Optional[str]) -> List[str]:
    if not raw:
        return []

    try:
        import json

        data = json.loads(raw)
        if isinstance(data, list):
            cleaned: List[str] = []
            seen = set()
            for value in data:
                if isinstance(value, dict):
                    candidate = value.get("name")
                else:
                    candidate = value
                if not isinstance(candidate, str):
                    continue
                name = candidate.strip()
                if not name:
                    continue
                key = name.lower()
                if key in seen:
                    continue
                seen.add(key)
                cleaned.append(name)
            return cleaned[:12]
    except Exception:
        pass

    return _parse_speaker_names(raw)

def _assert_allowed_extension(filename: str) -> str:
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_UPLOAD_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")
    return ext

def _sanitize_disk_name(value: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9._-]+", "-", value).strip("-._")
    return cleaned or "meeting"

def _serialize_meeting(m: Meeting) -> Dict[str, Any]:
    return {
        "meeting_id": m.meeting_id,
        "user_id": m.user_id,
        "source_filename": m.source_filename,
        "summary": m.summary,
        "transcript": m.transcript,
        "created_at": m.created_at,
        "updated_at": m.updated_at,
    }

def _normalize_speaker_id(speaker_id: Optional[str]) -> str:
    clean = (speaker_id or "").strip()
    return clean or "Speaker"

def _default_speaker_label(speaker_id: str) -> str:
    clean = _normalize_speaker_id(speaker_id)
    if re.fullmatch(r"[A-Z]", clean):
        return f"Speaker {clean}"
    match = re.fullmatch(r"S(\d+)", clean)
    if match:
        return f"Speaker {match.group(1)}"
    return clean

def _normalize_speaker_segments(raw_segments: Optional[List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
    normalized: List[Dict[str, Any]] = []
    for segment in raw_segments or []:
        text = str(segment.get("text") or "").strip()
        if not text:
            continue

        speaker_id = _normalize_speaker_id(
            segment.get("speaker_id") or segment.get("speaker")
        )
        start = float(segment.get("start") or 0.0)
        end = float(segment.get("end") or start)
        normalized.append(
            {
                "speaker_id": speaker_id,
                "text": text,
                "start": start,
                "end": end,
            }
        )
    return normalized

def _clean_speaker_assignments(assignments: Optional[Dict[str, str]]) -> Dict[str, str]:
    cleaned: Dict[str, str] = {}
    for speaker_id, label in (assignments or {}).items():
        canonical = _normalize_speaker_id(speaker_id)
        value = (label or "").strip()
        if value:
            cleaned[canonical] = value
    return cleaned

def _apply_speaker_assignments(
    raw_segments: List[Dict[str, Any]],
    assignments: Optional[Dict[str, str]] = None,
) -> List[Dict[str, Any]]:
    cleaned_assignments = _clean_speaker_assignments(assignments)
    mapped: List[Dict[str, Any]] = []
    for segment in raw_segments:
        speaker_id = _normalize_speaker_id(segment.get("speaker_id"))
        mapped.append(
            {
                "speaker_id": speaker_id,
                "speaker": cleaned_assignments.get(speaker_id, _default_speaker_label(speaker_id)),
                "text": segment["text"],
                "start": float(segment["start"]),
                "end": float(segment["end"]),
            }
        )
    return mapped

def _format_timestamp(seconds: float) -> str:
    total_seconds = max(0, int(round(seconds)))
    hours, remainder = divmod(total_seconds, 3600)
    minutes, secs = divmod(remainder, 60)
    if hours:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"
    return f"{minutes:02d}:{secs:02d}"

def _build_display_transcript(segments: List[Dict[str, Any]]) -> str:
    return "\n".join(
        f"[{_format_timestamp(segment['start'])} - {_format_timestamp(segment['end'])}] "
        f"{segment['speaker']}: {segment['text']}"
        for segment in segments
    ).strip()

def _build_analysis_transcript(segments: List[Dict[str, Any]]) -> str:
    return "\n".join(
        f"{segment['speaker']}: {segment['text']}"
        for segment in segments
    ).strip()

def _clean_transcript_lines(transcript: str) -> List[str]:
    lines: List[str] = []
    for raw_line in transcript.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        line = re.sub(r"^\[[0-9:\s-]+\]\s*", "", line)
        lines.append(line)
    return lines

def _extract_keyword_matches(lines: List[str], keywords: List[str], limit: int = 4) -> List[str]:
    matches: List[str] = []
    seen = set()
    for line in lines:
        lowered = line.lower()
        if not any(keyword in lowered for keyword in keywords):
            continue
        if line in seen:
            continue
        seen.add(line)
        matches.append(line)
        if len(matches) >= limit:
            break
    return matches

def _profile_keywords(profile_key: str) -> Dict[str, List[str]]:
    mapping: Dict[str, Dict[str, List[str]]] = {
        "interview": {
            "primary": ["experience", "built", "led", "shipped", "managed", "improved", "candidate"],
            "secondary": ["concern", "gap", "missing", "unclear", "weakness", "challenge"],
            "tertiary": ["follow up", "next step", "interview", "assessment", "reference"],
        },
        "standup": {
            "primary": ["completed", "finished", "working on", "today", "yesterday", "progress"],
            "secondary": ["blocker", "blocked", "dependency", "waiting", "risk"],
            "tertiary": ["next", "tomorrow", "follow up", "owner"],
        },
        "sales": {
            "primary": ["need", "priority", "pain", "customer", "client", "requirement"],
            "secondary": ["objection", "risk", "budget", "pricing", "concern", "legal"],
            "tertiary": ["proposal", "demo", "contract", "renewal", "next step"],
        },
        "incident": {
            "primary": ["impact", "issue", "error", "incident", "customer", "production"],
            "secondary": ["root cause", "cause", "risk", "unknown", "concern", "severity"],
            "tertiary": ["mitigation", "rollback", "owner", "follow up", "next step"],
        },
        "planning": {
            "primary": ["priority", "goal", "roadmap", "milestone", "strategy", "scope"],
            "secondary": ["dependency", "risk", "tradeoff", "constraint", "unclear"],
            "tertiary": ["timeline", "owner", "next step", "launch", "follow up"],
        },
        "general": {
            "primary": ["discussed", "shared", "noted", "important", "focus"],
            "secondary": ["risk", "concern", "question", "unclear", "issue"],
            "tertiary": ["next step", "follow up", "owner", "action", "will "],
        },
    }
    return mapping.get(profile_key, mapping["general"])

def _fallback_summary_from_transcript(
    transcript: str,
    *,
    title: Optional[str] = None,
    speakers: Optional[List[str]] = None,
    previous_summary: Optional[str] = None,
) -> str:
    lines = _clean_transcript_lines(transcript)
    blueprint = infer_summary_blueprint(title, transcript)
    profile_keywords = _profile_keywords(blueprint["key"])
    discussion_points = lines[:5]
    decision_lines = _extract_keyword_matches(lines, ["decide", "decision", "agreed", "approved", "final", "aligned"])
    primary_lines = _extract_keyword_matches(lines, profile_keywords["primary"])
    secondary_lines = _extract_keyword_matches(lines, profile_keywords["secondary"])
    action_lines = _extract_keyword_matches(lines, profile_keywords["tertiary"])

    if not primary_lines and discussion_points:
        primary_lines = discussion_points[:4]
    if not secondary_lines and lines:
        secondary_lines = ["No major risks or unresolved concerns were explicitly captured in the saved transcript."]
    if not action_lines and lines:
        action_lines = ["No explicit next steps were detected automatically. Review the transcript for follow-up commitments."]

    speaker_highlights: List[str] = []
    if speakers:
        for speaker in speakers[:6]:
            prefix = f"{speaker}:"
            match = next((line for line in lines if line.startswith(prefix)), None)
            if match:
                speaker_highlights.append(match)
        if not speaker_highlights:
            speaker_highlights = [f"Detected speakers: {', '.join(speakers)}."]

    overview_sentence = "Transcript saved successfully. AI summary regeneration is temporarily unavailable, so this fallback summary is based on the saved transcript."
    if title:
        overview_sentence = f"{title}: {overview_sentence}"

    section_map = {
        "interview": ("Candidate evidence", "Concerns or gaps", "Recommended follow-up"),
        "standup": ("Progress updates", "Current blockers", "Next steps"),
        "sales": ("Customer needs and signals", "Objections or risks", "Commercial next steps"),
        "incident": ("Impact and current state", "Risks or unresolved causes", "Mitigations and follow-up"),
        "planning": ("Strategic priorities", "Dependencies and tradeoffs", "Delivery next steps"),
        "general": ("Key discussion points", "Risks or open questions", "Next steps"),
    }
    primary_heading, secondary_heading, action_heading = section_map.get(
        blueprint["key"],
        section_map["general"],
    )

    sections = [
        "Executive overview",
        overview_sentence,
        "",
        primary_heading,
    ]
    sections.extend(
        f"- {point}" for point in (primary_lines or ["Transcript was saved, but there were not enough non-empty lines to extract highlights."])
    )
    if decision_lines:
        sections.extend([
            "",
            "Decisions and agreements",
        ])
        sections.extend(f"- {item}" for item in decision_lines)
    sections.extend([
        "",
        secondary_heading,
    ])
    sections.extend(f"- {item}" for item in secondary_lines)
    sections.extend([
        "",
        action_heading,
    ])
    sections.extend(f"- {item}" for item in action_lines)
    sections.extend([
        "",
        "Speaker highlights",
    ])
    if speaker_highlights:
        sections.extend(f"- {item}" for item in speaker_highlights)
    else:
        sections.append("- Review the transcript for speaker-specific details.")

    if previous_summary and previous_summary.strip():
        sections.extend([
            "",
            "Previous AI summary",
            previous_summary.strip(),
        ])

    return "\n".join(sections).strip()

async def _generate_summary_resilient(
    transcript: str,
    *,
    title: Optional[str] = None,
    speakers: Optional[List[str]] = None,
    previous_summary: Optional[str] = None,
) -> str:
    try:
        summary = await generate_summary(
            transcript,
            title=title,
            speakers=speakers,
        )
        if summary and summary.strip():
            return summary.strip()
    except Exception as exc:
        print(f"Summary generation skipped for {title or 'meeting'}: {exc}")

    return _fallback_summary_from_transcript(
        transcript,
        title=title,
        speakers=speakers,
        previous_summary=previous_summary,
    )

def _unique_speakers_from_segments(segments: List[Dict[str, Any]]) -> List[str]:
    seen = set()
    ordered: List[str] = []
    for segment in segments:
        speaker = segment["speaker"]
        if speaker in seen:
            continue
        seen.add(speaker)
        ordered.append(speaker)
    return ordered

def _build_speaker_profiles(
    raw_segments: List[Dict[str, Any]],
    assignments: Optional[Dict[str, str]],
    expected_speakers: Optional[List[str]],
) -> List[Dict[str, Any]]:
    cleaned_assignments = _clean_speaker_assignments(assignments)
    grouped: Dict[str, Dict[str, Any]] = {}
    for segment in raw_segments:
        speaker_id = _normalize_speaker_id(segment["speaker_id"])
        bucket = grouped.setdefault(
            speaker_id,
            {
                "speaker_id": speaker_id,
                "speaker_label": _default_speaker_label(speaker_id),
                "assigned_name": cleaned_assignments.get(speaker_id),
                "sample_text": segment["text"],
                "first_timestamp": float(segment["start"]),
                "turn_count": 0,
                "samples": [],
            },
        )
        bucket["turn_count"] += 1
        if len(bucket["samples"]) < 3:
            bucket["samples"].append(
                {
                    "start": float(segment["start"]),
                    "end": float(segment["end"]),
                    "text": segment["text"],
                }
            )

    suggestions = expected_speakers or []
    return [
        {
            **profile,
            "suggested_names": suggestions,
        }
        for profile in sorted(grouped.values(), key=lambda item: item["first_timestamp"])
    ]

def _find_meeting_media_path(meeting_id: str) -> Optional[str]:
    matches = sorted(glob.glob(os.path.join(UPLOAD_FOLDER, f"{meeting_id}_*")))
    for path in matches:
        if os.path.isfile(path):
            return path
    return None

def _guess_media_kind(path: Optional[str]) -> Optional[str]:
    if not path:
        return None
    media_type, _ = mimetypes.guess_type(path)
    if media_type and media_type.startswith("audio/"):
        return "audio"
    if media_type and media_type.startswith("video/"):
        return "video"

    ext = os.path.splitext(path)[1].lower()
    if ext in {".mp4", ".mov", ".mkv"}:
        return "video"
    if ext in {".mp3", ".wav", ".m4a", ".ogg", ".webm"}:
        return "audio"
    return None

def _get_user_from_token_value(token: Optional[str]) -> Optional[User]:
    if not token:
        return None

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if not email:
            return None
    except JWTError:
        return None

    with Session(engine) as session:
        return session.exec(select(User).where(User.email == email)).first()

def _require_request_user(request: Request) -> User:
    auth_header = request.headers.get("authorization") or ""
    token = None
    if auth_header.lower().startswith("bearer "):
        token = auth_header.split(" ", 1)[1].strip()
    if not token:
        token = request.query_params.get("token")

    user = _get_user_from_token_value(token)
    if user is None:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return user

def _enrich_meeting_payload(payload: Dict[str, Any], metadata: Dict[str, Any]) -> Dict[str, Any]:
    enriched = {**payload}
    expected_speakers = metadata.get("expected_speakers") or []
    speaker_assignments = _clean_speaker_assignments(metadata.get("speaker_assignments"))
    raw_segments = _normalize_speaker_segments(
        metadata.get("raw_transcript_segments") or metadata.get("transcript_segments")
    )

    enriched["source_type"] = metadata.get("source_type")
    enriched["language"] = metadata.get("language")
    enriched["duration_seconds"] = metadata.get("duration_seconds")
    enriched["expected_speakers"] = expected_speakers
    enriched["speaker_assignments"] = speaker_assignments
    media_path = _find_meeting_media_path(payload["meeting_id"])
    enriched["media_available"] = media_path is not None
    enriched["media_kind"] = _guess_media_kind(media_path)

    if raw_segments:
        mapped_segments = _apply_speaker_assignments(raw_segments, speaker_assignments)
        enriched["transcript_segments"] = mapped_segments
        enriched["transcript"] = _build_display_transcript(mapped_segments)
        enriched["speakers"] = _unique_speakers_from_segments(mapped_segments)
        enriched["speaker_profiles"] = _build_speaker_profiles(
            raw_segments,
            speaker_assignments,
            expected_speakers,
        )
    else:
        enriched["transcript_segments"] = metadata.get("transcript_segments")
        enriched["speakers"] = metadata.get("speakers")
        enriched["speaker_profiles"] = []

    return enriched

def _load_meeting_metadata(meeting_id: str) -> Dict[str, Any]:
    try:
        data = load_meeting_data(meeting_id)
    except FileNotFoundError:
        return {}

    return {
        field: data[field]
        for field in MEETING_METADATA_FIELDS
        if field in data
    }

async def _store_embeddings_safe(transcript: str, meeting_id: str) -> None:
    try:
        await asyncio.to_thread(embed_and_store, transcript, meeting_id)
    except Exception as exc:
        print(f"Embedding storage skipped for {meeting_id}: {exc}")

async def _replace_embeddings_safe(transcript: str, meeting_id: str) -> None:
    try:
        from config import index

        if index is not None:
            await asyncio.to_thread(index.delete, filter={"meeting_id": meeting_id})
    except Exception as exc:
        print(f"Existing embeddings cleanup skipped for {meeting_id}: {exc}")

    await _store_embeddings_safe(transcript, meeting_id)

def _cleanup_chunk_dir() -> None:
    try:
        shutil.rmtree("uploads/chunks")
        os.makedirs("uploads/chunks", exist_ok=True)
    except Exception:
        pass

async def _process_meeting_file(
    *,
    meeting_id: str,
    file_path: str,
    source_filename: str,
    user_id: int,
    source_type: str,
    language: Optional[str] = None,
    diarize: bool = False,
    expected_speakers: Optional[List[str]] = None,
) -> Dict[str, Any]:
    transcript_segments = None
    raw_transcript_segments = None
    speaker_assignments: Dict[str, str] = {}
    speakers: List[str] = []
    duration_seconds = None

    if diarize:
        diarized = await transcribe_audio_diarized(
            file_path,
            language=language,
        )
        raw_transcript_segments = _normalize_speaker_segments(diarized["segments"])
        duration_seconds = diarized["duration_seconds"]

        if raw_transcript_segments:
            transcript_segments = _apply_speaker_assignments(raw_transcript_segments, speaker_assignments)
            transcript = _build_display_transcript(transcript_segments)
            transcript_for_ai = _build_analysis_transcript(transcript_segments)
            speakers = _unique_speakers_from_segments(transcript_segments)
        else:
            fallback_text = (diarized.get("analysis_transcript") or "").strip()
            if not fallback_text:
                fallback_text = (await transcribe_audio(file_path)).strip()
            if not fallback_text:
                raise RuntimeError("No transcript text was returned from the recording.")

            raw_transcript_segments = _normalize_speaker_segments(
                [
                    {
                        "speaker_id": "A",
                        "text": fallback_text,
                        "start": 0.0,
                        "end": duration_seconds or 0.0,
                    }
                ]
            )
            transcript_segments = _apply_speaker_assignments(raw_transcript_segments, speaker_assignments)
            transcript = _build_display_transcript(transcript_segments)
            transcript_for_ai = _build_analysis_transcript(transcript_segments)
            speakers = _unique_speakers_from_segments(transcript_segments)
    else:
        transcript = await transcribe_audio(file_path)
        transcript_for_ai = transcript

    summary = await _generate_summary_resilient(
        transcript_for_ai,
        title=source_filename,
        speakers=speakers or None,
    )
    await _store_embeddings_safe(transcript_for_ai, meeting_id)

    save_meeting(
        meeting_id=meeting_id,
        summary=summary,
        transcript=transcript,
        source_filename=source_filename,
        user_id=user_id,
    )
    save_meeting_data(
        meeting_id=meeting_id,
        summary=summary,
        transcript=transcript,
        source_filename=source_filename,
        extras={
            "source_type": source_type,
            "language": language,
            "raw_transcript_segments": raw_transcript_segments,
            "transcript_segments": transcript_segments,
            "speakers": speakers,
            "duration_seconds": duration_seconds,
            "speaker_assignments": speaker_assignments,
            "expected_speakers": expected_speakers or [],
        },
    )

    payload = _enrich_meeting_payload({
        "meeting_id": meeting_id,
        "source_filename": source_filename,
        "summary": summary,
        "transcript": transcript,
    }, {
        "source_type": source_type,
        "language": language,
        "raw_transcript_segments": raw_transcript_segments,
        "transcript_segments": transcript_segments,
        "speakers": speakers,
        "duration_seconds": duration_seconds,
        "speaker_assignments": speaker_assignments,
        "expected_speakers": expected_speakers or [],
    })
    return payload

@app.post("/auth/signup")
def signup(email: str = Form(...), name: str = Form(...), password: str = Form(...)):
    with Session(engine) as session:
        existing = session.exec(select(User).where(User.email == email)).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        hashed_pw = get_password_hash(password)
        new_user = User(email=email, name=name, password_hash=hashed_pw)
        session.add(new_user)
        session.commit()
        session.refresh(new_user)
        token = create_access_token({"sub": new_user.email, "role": new_user.role})
        return {"access_token": token, "token_type": "bearer", "user": {"id": new_user.id, "email": new_user.email, "name": new_user.name, "role": new_user.role}}

@app.post("/auth/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == form_data.username)).first()
        if not user or not verify_password(form_data.password, user.password_hash):
            raise HTTPException(status_code=400, detail="Incorrect email or password")
        token = create_access_token({"sub": user.email, "role": user.role})
        return {"access_token": token, "token_type": "bearer", "user": {"id": user.id, "email": user.email, "name": user.name, "role": user.role}}

@app.get("/auth/me")
def get_me(user: User = Depends(get_current_user)):
    return {"id": user.id, "email": user.email, "name": user.name, "role": user.role}

@app.post("/live/session")
async def create_live_session(req: LiveSessionRequest, user: User = Depends(get_current_user)):
    try:
        return await create_realtime_transcription_secret(language=_clean_language(req.language))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Unable to start live transcription: {exc}")

@app.post("/upload")
async def upload_file(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    _assert_allowed_extension(file.filename)

    meeting_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_FOLDER, f"{meeting_id}_{file.filename}")

    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())

    try:
        payload = await _process_meeting_file(
            meeting_id=meeting_id,
            file_path=file_path,
            source_filename=file.filename,
            user_id=user.id,
            source_type="upload",
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Media processing failed: {exc}")
    finally:
        _cleanup_chunk_dir()

    return payload

@app.post("/live/finalize")
async def finalize_live_recording(
    file: UploadFile = File(...),
    title: str = Form(""),
    language: str = Form("en"),
    expected_speakers_json: str = Form(""),
    speaker_names: str = Form(""),
    user: User = Depends(get_current_user),
):
    ext = _assert_allowed_extension(file.filename or "recording.webm")
    meeting_id = str(uuid.uuid4())
    source_filename = title.strip() or _default_live_title()
    disk_stem = _sanitize_disk_name(source_filename)
    file_path = os.path.join(UPLOAD_FOLDER, f"{meeting_id}_{disk_stem}{ext}")

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    expected_speakers = _parse_expected_speakers_json(expected_speakers_json) or _parse_speaker_names(speaker_names)

    try:
        payload = await _process_meeting_file(
            meeting_id=meeting_id,
            file_path=file_path,
            source_filename=source_filename,
            user_id=user.id,
            source_type="live",
            language=_clean_language(language),
            diarize=True,
            expected_speakers=expected_speakers,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Live recording finalization failed: {exc}")
    finally:
        _cleanup_chunk_dir()

    return payload

@app.post("/ask")
async def ask_question(meeting_id: str = Form(...), question: str = Form(...), user: User = Depends(get_current_user)):
    # Verify ownership
    m = get_meeting(meeting_id)
    if not m or m.user_id != user.id:
        raise HTTPException(status_code=404, detail="Meeting not found or unauthorized.")
    
    answer = query_meeting(meeting_id, question)
    return {"answer": answer}

@app.post("/download-summary")
async def download_summary(meeting_id: str = Form(...), user: User = Depends(get_current_user)):
    m = get_meeting(meeting_id)
    if not m or m.user_id != user.id:
        raise HTTPException(status_code=404, detail="Meeting not found or unauthorized.")
    if not (m.summary or m.transcript):
        raise HTTPException(status_code=422, detail="No summary/transcript stored for this meeting.")

    pdf_path = generate_summary_pdf(m.meeting_id, m.summary or "", m.transcript or "")
    return FileResponse(pdf_path, media_type="application/pdf", filename=f"{m.meeting_id}_summary.pdf")

@app.get("/meetings/{meeting_id}/summary.pdf")
async def download_summary_get(meeting_id: str, request: Request):
    try:
        t_user = _require_request_user(request)

        m = get_meeting(meeting_id)
        if not m or m.user_id != t_user.id:
            raise HTTPException(status_code=404, detail="Meeting not found or unauthorized.")

        pdf_path = generate_summary_pdf(m.meeting_id, m.summary or "", m.transcript or "")
        return FileResponse(pdf_path, media_type="application/pdf", filename=f"{m.meeting_id}_summary.pdf")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Unauthorized")

@app.get("/meetings/{meeting_id}/media")
async def get_meeting_media(meeting_id: str, request: Request):
    user = _require_request_user(request)
    meeting = get_meeting(meeting_id)
    if not meeting or meeting.user_id != user.id:
        raise HTTPException(status_code=404, detail="Meeting not found or unauthorized.")

    media_path = _find_meeting_media_path(meeting_id)
    if not media_path:
        raise HTTPException(status_code=404, detail="Recording media not found.")

    media_type, _ = mimetypes.guess_type(media_path)
    return FileResponse(
        media_path,
        media_type=media_type or "application/octet-stream",
        filename=os.path.basename(media_path),
    )

@app.get("/")
def home():
    return {"message": "AI Meeting Summarizer Backend is running!"}

# list meetings for UI
@app.get("/meetings")
def list_meetings(limit: int = 20, offset: int = 0, user: User = Depends(get_current_user)):
    with Session(engine) as s:
        q = s.exec(select(Meeting).where(Meeting.user_id == user.id).order_by(Meeting.created_at.desc()).offset(offset).limit(limit))
        rows = q.all()
    return [{"meeting_id": m.meeting_id, "source_filename": m.source_filename, "created_at": m.created_at} for m in rows]

@app.get("/meetings/{meeting_id}")
def get_meeting_record(meeting_id: str, user: User = Depends(get_current_user)):
    m = get_meeting(meeting_id)
    if not m or m.user_id != user.id:
        raise HTTPException(status_code=404, detail="Meeting not found or unauthorized.")
    payload = _serialize_meeting(m)
    return _enrich_meeting_payload(payload, _load_meeting_metadata(meeting_id))

@app.patch("/meetings/{meeting_id}/speaker-assignments")
async def update_speaker_assignments(
    meeting_id: str,
    req: SpeakerAssignmentsRequest,
    user: User = Depends(get_current_user),
):
    meeting = get_meeting(meeting_id)
    if not meeting or meeting.user_id != user.id:
        raise HTTPException(status_code=404, detail="Meeting not found or unauthorized.")

    metadata = _load_meeting_metadata(meeting_id)
    raw_segments = _normalize_speaker_segments(metadata.get("raw_transcript_segments"))
    if not raw_segments:
        raise HTTPException(status_code=422, detail="This meeting does not have diarized speaker segments.")

    assignments = _clean_speaker_assignments(req.assignments)
    current_assignments = _clean_speaker_assignments(metadata.get("speaker_assignments"))
    if assignments == current_assignments:
        return _enrich_meeting_payload(_serialize_meeting(meeting), metadata)

    mapped_segments = _apply_speaker_assignments(raw_segments, assignments)
    transcript = _build_display_transcript(mapped_segments)
    transcript_for_ai = _build_analysis_transcript(mapped_segments)
    speakers = _unique_speakers_from_segments(mapped_segments)

    summary = await _generate_summary_resilient(
        transcript_for_ai,
        title=meeting.source_filename,
        speakers=speakers or None,
        previous_summary=meeting.summary,
    )
    await _replace_embeddings_safe(transcript_for_ai, meeting_id)

    save_meeting(
        meeting_id=meeting_id,
        summary=summary,
        transcript=transcript,
        source_filename=meeting.source_filename,
        user_id=meeting.user_id,
    )
    update_meeting_data(
        meeting_id,
        {
            "summary": summary,
            "transcript": transcript,
            "transcript_segments": mapped_segments,
            "speakers": speakers,
            "speaker_assignments": assignments,
        },
    )

    refreshed = get_meeting(meeting_id)
    if refreshed is None:
        raise HTTPException(status_code=500, detail="Meeting update failed.")

    updated_metadata = _load_meeting_metadata(meeting_id)
    return _enrich_meeting_payload(_serialize_meeting(refreshed), updated_metadata)

@app.patch("/meetings/{meeting_id}")
def rename_meeting_record(meeting_id: str, req: RenameRequest, user: User = Depends(get_current_user)):
    with Session(engine) as s:
        m = s.get(Meeting, meeting_id)
        if not m or m.user_id != user.id:
            raise HTTPException(status_code=404, detail="Meeting not found or unauthorized.")
        
        m.source_filename = req.new_name
        s.add(m)
        s.commit()
        s.refresh(m)

    update_meeting_data(meeting_id, {"source_filename": req.new_name})
    return {"message": "Renamed successfully", "source_filename": req.new_name}

@app.delete("/meetings/{meeting_id}")
def delete_meeting_record(meeting_id: str, user: User = Depends(get_current_user)):
    with Session(engine) as s:
        m = s.get(Meeting, meeting_id)
        if not m or m.user_id != user.id:
            raise HTTPException(status_code=404, detail="Meeting not found or unauthorized.")
        
        # 1. Delete from SQL DB
        s.delete(m)
        s.commit()
        
    # 2. Delete vectors from Pinecone
    try:
        from config import index
        if index is not None:
            index.delete(filter={"meeting_id": meeting_id})
    except Exception as e:
        print(f"Failed to delete Pinecone index for {meeting_id}: {e}")
        
    # 3. Delete local disk files (media, generated pdfs, json data)
    try:
        data_json = os.path.join(UPLOAD_FOLDER, "data", f"{meeting_id}.json")
        if os.path.exists(data_json):
            os.remove(data_json)
        
        # Find any media file or transcript starting with `{meeting_id}_`
        for f in glob.glob(os.path.join(UPLOAD_FOLDER, f"{meeting_id}_*")):
            os.remove(f)
    except Exception as e:
        print(f"Failed to delete local files for {meeting_id}: {e}")

    return {"message": "Deleted successfully"}
