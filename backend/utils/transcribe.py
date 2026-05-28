import asyncio
import os
import time
from typing import Any, Dict, List, Optional

from config import GROQ_API_KEY, ASSEMBLYAI_API_KEY, groq_client
from utils.media import audio_duration_seconds, prepare_audio_pipeline_async
from utils.logger import get_logger

log = get_logger("clariqy.transcribe")

# Groq Whisper hard limit is 25 MB.
# At 32 kbps mono, 1 hour ≈ 14 MB  →  SEGMENT_SECONDS=3600 keeps every chunk well under.
MAX_UPLOAD_BYTES = 24 * 1024 * 1024   # 24 MB
SEGMENT_SECONDS  = 3600               # 1-hour chunks

GROQ_WHISPER_MODEL = "whisper-large-v3"


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def _format_timestamp(seconds: float) -> str:
    total_seconds = max(0, int(round(seconds)))
    hours, remainder = divmod(total_seconds, 3600)
    minutes, secs = divmod(remainder, 60)
    if hours:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"
    return f"{minutes:02d}:{secs:02d}"


def _speaker_id_from_index(i: int) -> str:
    return chr(ord("A") + i) if i < 26 else f"S{i + 1}"


def _merge_segments(raw_segments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Merge consecutive segments from the same speaker with < 1.2 s gap."""
    merged: List[Dict[str, Any]] = []
    for seg in raw_segments:
        text = (seg.get("text") or "").strip()
        if not text:
            continue
        speaker_id = (seg.get("speaker_id") or "Speaker").strip() or "Speaker"
        start = float(seg.get("start") or 0)
        end = float(seg.get("end") or start)

        if (
            merged
            and merged[-1]["speaker_id"] == speaker_id
            and start - merged[-1]["end"] <= 1.2
        ):
            merged[-1]["text"] = f"{merged[-1]['text']} {text}".strip()
            merged[-1]["end"] = end
            continue

        merged.append({"speaker_id": speaker_id, "text": text, "start": start, "end": end})
    return merged


# ---------------------------------------------------------------------------
# Plain transcription — Groq Whisper
# ---------------------------------------------------------------------------

def _sync_transcribe(path: str, language: Optional[str] = None) -> str:
    """Transcribe a single audio chunk using Groq Whisper."""
    if groq_client is None:
        raise RuntimeError(
            "GROQ_API_KEY is not configured. "
            "Add it to your .env file and restart the server."
        )

    log.info("[transcribe] Groq Whisper starting for %s lang=%s",
             os.path.basename(path), language or "auto")
    t0 = time.perf_counter()

    kwargs: Dict[str, Any] = {
        "model": GROQ_WHISPER_MODEL,
        "response_format": "verbose_json",
    }
    if language:
        kwargs["language"] = language

    with open(path, "rb") as f:
        result = groq_client.audio.transcriptions.create(
            file=(os.path.basename(path), f),
            **kwargs,
        )

    text = (result.text or "").strip()
    log.info("[transcribe] Groq Whisper done — %.2fs chars=%d",
             time.perf_counter() - t0, len(text))
    return text


async def _transcribe_one(path: str, language: Optional[str] = None) -> str:
    return await asyncio.to_thread(_sync_transcribe, path, language)


async def transcribe_audio(
    input_file_path: str,
    language: Optional[str] = None,
) -> str:
    """
    Compress → chunk if necessary → transcribe each chunk with Groq Whisper → stitch.

    Audio is re-encoded at 32 kbps (plenty for speech recognition) to keep
    every chunk safely under Groq's 25 MB file limit.
    """
    _compressed_path, chunks = await prepare_audio_pipeline_async(
        input_file_path,
        max_bytes=MAX_UPLOAD_BYTES,
        segment_time=SEGMENT_SECONDS,
        audio_bitrate="32k",   # 32 kbps is ideal for Whisper; 1 h ≈ 14 MB
    )

    if len(chunks) == 1:
        return await _transcribe_one(chunks[0], language)

    parts: List[str] = []
    for i, chunk in enumerate(chunks, start=1):
        log.info("[transcribe] processing chunk %d/%d", i, len(chunks))
        text = await _transcribe_one(chunk, language)
        parts.append(f"\n\n[Part {i}]\n{text.strip()}")
    return "".join(parts).strip()


# ---------------------------------------------------------------------------
# Diarized transcription — AssemblyAI
# ---------------------------------------------------------------------------

def _sync_transcribe_diarized(path: str, language: Optional[str] = None) -> Dict[str, Any]:
    """
    Transcribe audio with speaker diarization using AssemblyAI's REST API directly.

    The assemblyai Python SDK's SpeechModel enum is out of sync with the current
    API — the SDK only allows 'universal' but the API now requires 'universal-2'
    or 'universal-3-pro'.  Calling the REST API directly avoids SDK validation.

    Timestamps in the returned segments are in **seconds** (float).
    """
    import requests as _req

    if not ASSEMBLYAI_API_KEY:
        raise RuntimeError(
            "ASSEMBLYAI_API_KEY is not configured. "
            "Add it to your .env file and restart the server."
        )

    log.info("[transcribe] AssemblyAI diarized starting for %s lang=%s",
             os.path.basename(path), language or "en")
    t0 = time.perf_counter()

    auth = {"authorization": ASSEMBLYAI_API_KEY}

    # ── Step 1: upload the audio file ─────────────────────────────────────
    log.info("[transcribe] AssemblyAI uploading file …")
    with open(path, "rb") as f:
        up = _req.post(
            "https://api.assemblyai.com/v2/upload",
            headers=auth,
            data=f,
            timeout=300,
        )
    up.raise_for_status()
    audio_url = up.json()["upload_url"]
    log.info("[transcribe] AssemblyAI upload done — %.2fs", time.perf_counter() - t0)

    # ── Step 2: submit transcription job ──────────────────────────────────
    body: Dict[str, Any] = {
        "audio_url": audio_url,
        "speaker_labels": True,
        "speech_models": ["universal-2"],  # plural list — required by current API
    }
    if language:
        body["language_code"] = language

    sub = _req.post(
        "https://api.assemblyai.com/v2/transcript",
        headers={**auth, "content-type": "application/json"},
        json=body,
        timeout=30,
    )
    if not sub.ok:
        log.error("[transcribe] AssemblyAI submit error %d: %s", sub.status_code, sub.text)
    sub.raise_for_status()
    tid = sub.json()["id"]
    log.info("[transcribe] AssemblyAI job submitted — id=%s", tid)

    # ── Step 3: poll until complete ───────────────────────────────────────
    poll_url = f"https://api.assemblyai.com/v2/transcript/{tid}"
    max_wait, interval, elapsed = 600, 5, 0
    data: Dict[str, Any] = {}

    while elapsed < max_wait:
        time.sleep(interval)
        elapsed += interval
        r = _req.get(poll_url, headers=auth, timeout=30)
        r.raise_for_status()
        data = r.json()
        status = data.get("status")
        log.debug("[transcribe] AssemblyAI poll — status=%s elapsed=%ds", status, elapsed)
        if status == "completed":
            break
        if status == "error":
            raise RuntimeError(f"AssemblyAI transcription failed: {data.get('error')}")
    else:
        raise RuntimeError("AssemblyAI transcription timed out after 10 minutes.")

    # ── Step 4: extract utterances ────────────────────────────────────────
    utterances = data.get("utterances") or []
    segments = [
        {
            "speaker": utt.get("speaker") or "A",
            "text":    utt.get("text") or "",
            "start":   float(utt.get("start") or 0) / 1000.0,  # ms → s
            "end":     float(utt.get("end")   or 0) / 1000.0,
        }
        for utt in utterances
        if (utt.get("text") or "").strip()
    ]

    log.info("[transcribe] AssemblyAI done — %.2fs utterances=%d",
             time.perf_counter() - t0, len(segments))
    return {"segments": segments}


async def transcribe_audio_diarized(
    input_file_path: str,
    language: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Full diarized transcription pipeline using AssemblyAI.

    AssemblyAI handles files of any length — no chunking required.
    Audio is compressed to 64 kbps before upload to speed things up.

    Returns:
        analysis_transcript  – plain "SPEAKER_ID: text" lines
        display_transcript   – timestamped "[ HH:MM - HH:MM ] SPEAKER: text" lines
        segments             – list of {speaker_id, text, start, end}
        speakers             – ordered list of unique speaker IDs
        duration_seconds     – total duration (float) or None
    """
    # Compress audio for faster upload; set max_bytes high so we never split —
    # AssemblyAI natively handles files up to 2.2 GB.
    _compressed_path, _chunks = await prepare_audio_pipeline_async(
        input_file_path,
        max_bytes=2 * 1024 * 1024 * 1024,   # 2 GB — effectively no split
        segment_time=7200,
        audio_bitrate="64k",
        sample_rate=None,
        channels=None,
    )

    payload = await asyncio.to_thread(
        _sync_transcribe_diarized, _compressed_path, language
    )

    # Map AssemblyAI speaker labels (A, B, …) to our internal IDs
    raw_segs = payload.get("segments") or []
    identity_map: Dict[str, str] = {}
    raw_segments: List[Dict[str, Any]] = []

    for seg in raw_segs:
        raw_speaker = str(seg.get("speaker") or "Speaker").strip() or "Speaker"
        speaker_id = identity_map.setdefault(
            raw_speaker, _speaker_id_from_index(len(identity_map))
        )
        start = float(seg.get("start") or 0.0)
        end = float(seg.get("end") or start)
        seg_text = str(seg.get("text") or "").strip()
        if not seg_text:
            continue
        raw_segments.append(
            {"speaker_id": speaker_id, "text": seg_text, "start": start, "end": end}
        )

    merged = _merge_segments(raw_segments)

    speakers: List[str] = []
    for seg in merged:
        if seg["speaker_id"] not in speakers:
            speakers.append(seg["speaker_id"])

    duration_seconds: Optional[float] = merged[-1]["end"] if merged else None

    if merged:
        analysis_transcript = "\n".join(
            f"{seg['speaker_id']}: {seg['text']}" for seg in merged
        )
        display_transcript = "\n".join(
            f"[{_format_timestamp(seg['start'])} - {_format_timestamp(seg['end'])}] "
            f"{seg['speaker_id']}: {seg['text']}"
            for seg in merged
        )
    else:
        # No diarization output — fall back to plain Groq transcription
        log.warning(
            "[transcribe] AssemblyAI returned no utterances — "
            "falling back to plain Groq Whisper transcription"
        )
        plain_text = await transcribe_audio(input_file_path, language)
        if not plain_text:
            raise RuntimeError("No transcription text returned for this recording.")
        analysis_transcript = plain_text
        display_transcript = plain_text

    return {
        "analysis_transcript": analysis_transcript.strip(),
        "display_transcript": display_transcript.strip(),
        "segments": merged,
        "speakers": speakers,
        "duration_seconds": duration_seconds,
    }


# ---------------------------------------------------------------------------
# Live session helper (legacy shim — live stream handled by /live/stream WS)
# ---------------------------------------------------------------------------

async def create_realtime_transcription_secret(
    language: Optional[str] = None,
) -> Dict[str, Any]:
    """Legacy shim kept for import compatibility."""
    return {"ws_url": "/live/stream"}
