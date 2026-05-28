import asyncio
import json
import os
import time
from typing import Any, Dict, List, Optional

from google.genai import types as genai_types

from config import genai_client, primary_genai_client, fallback_genai_client
from utils.media import audio_duration_seconds, prepare_audio_pipeline_async
from utils.logger import get_logger

log = get_logger("clariqy.transcribe")

# Gemini can handle files up to 2 GB via the Files API, so we only chunk
# truly enormous recordings (500 MB threshold keeps the upload fast and
# avoids the 2 GB hard cap while comfortably covering any real meeting).
MAX_UPLOAD_BYTES = 500 * 1024 * 1024  # 500 MB
SEGMENT_SECONDS = 3600  # 1-hour chunks (fallback for very long recordings)

GEMINI_MODEL = "gemini-2.5-flash"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_audio_mime_type(path: str) -> str:
    ext = os.path.splitext(path)[1].lower()
    return {
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".m4a": "audio/mp4",
        ".ogg": "audio/ogg",
        ".webm": "audio/webm",
        ".mp4": "audio/mp4",
        ".mov": "audio/mp4",
        ".mkv": "audio/webm",
    }.get(ext, "audio/mpeg")


def _upload_and_wait(path: str, client: Any = None) -> Any:
    """Upload an audio file to the Gemini Files API and wait until active.
    Uses the provided client (defaults to primary_genai_client)."""
    c = client or primary_genai_client
    mime_type = _get_audio_mime_type(path)
    size_mb = os.path.getsize(path) / (1024 * 1024)
    key_label = "fallback" if (client is not None and client is not primary_genai_client) else "primary"
    log.info("[transcribe] uploading file=%s size=%.1f MB mime=%s key=%s",
             os.path.basename(path), size_mb, mime_type, key_label)
    t0 = time.perf_counter()
    with open(path, "rb") as f:
        uploaded = c.files.upload(
            file=f,
            config=genai_types.UploadFileConfig(
                display_name=os.path.basename(path),
                mime_type=mime_type,
            ),
        )
    log.info("[transcribe] upload complete in %.2fs — waiting for ACTIVE state", time.perf_counter() - t0)

    max_wait_s = 120
    elapsed = 0
    while elapsed < max_wait_s:
        state = str(getattr(uploaded, "state", "")).upper()
        if "ACTIVE" in state:
            log.info("[transcribe] file ACTIVE after %ds", elapsed)
            break
        if "FAILED" in state:
            raise RuntimeError(f"Gemini file upload failed for {path}: {uploaded.state}")
        time.sleep(2)
        elapsed += 2
        try:
            uploaded = c.files.get(name=uploaded.name)
        except Exception:
            pass
    else:
        raise RuntimeError(f"Gemini file upload timed out for {path}")

    return uploaded


def _delete_uploaded(uploaded: Any, client: Any = None) -> None:
    """Best-effort cleanup of a Gemini Files API file."""
    c = client or primary_genai_client
    try:
        c.files.delete(name=uploaded.name)
        log.debug("[transcribe] deleted uploaded file %s", uploaded.name)
    except Exception as e:
        log.warning("[transcribe] could not delete uploaded file %s: %s",
                    getattr(uploaded, "name", "?"), e)


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


def _extract_json_text(text: str) -> str:
    """Strip markdown code fences and return clean JSON string."""
    text = text.strip()
    if "```json" in text:
        text = text.split("```json", 1)[1].split("```", 1)[0]
    elif text.startswith("```"):
        text = text.split("```", 1)[1].split("```", 1)[0]
    return text.strip()


# ---------------------------------------------------------------------------
# Plain transcription (no diarization)
# ---------------------------------------------------------------------------

def _transcribe_with_client(path: str, client: Any, prompt_text: str) -> str:
    """Upload, transcribe, and clean up using a specific Gemini client."""
    uploaded = _upload_and_wait(path, client=client)
    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=[uploaded, prompt_text],
        )
        if not response.text:
            raise RuntimeError("Gemini returned an empty transcription response.")
        return response.text.strip()
    finally:
        _delete_uploaded(uploaded, client=client)


def _sync_transcribe(path: str) -> str:
    """Transcribe a single audio chunk using Gemini, with key-level fallback."""
    log.info("[transcribe] _sync_transcribe starting for %s", os.path.basename(path))
    t0 = time.perf_counter()

    prompt_text = (
        "Transcribe this audio completely and verbatim. "
        "Output only the transcription text with no additional commentary, "
        "labels, or formatting."
    )

    # Try primary key
    log.info("[transcribe] requesting transcription — key=primary model=%s", GEMINI_MODEL)
    try:
        result = _transcribe_with_client(path, primary_genai_client, prompt_text)
        log.info("[transcribe] done (primary) — %.2fs chars=%d", time.perf_counter() - t0, len(result))
        return result
    except Exception as primary_exc:
        log.warning("[transcribe] primary key failed — %s: %s", type(primary_exc).__name__, primary_exc)
        if fallback_genai_client is None:
            log.error("[transcribe] no fallback key — raising")
            raise

    # Fallback: re-upload under the fallback key (files are scoped per API key)
    log.info("[transcribe] re-uploading + retrying with fallback key (GEMINI_API_KEY_WEST)")
    try:
        result = _transcribe_with_client(path, fallback_genai_client, prompt_text)
        log.info("[transcribe] done (fallback) — %.2fs chars=%d", time.perf_counter() - t0, len(result))
        return result
    except Exception as fallback_exc:
        log.error("[transcribe] fallback key also failed — %s: %s", type(fallback_exc).__name__, fallback_exc)
        raise fallback_exc


async def _transcribe_one(path: str) -> str:
    return await asyncio.to_thread(_sync_transcribe, path)


async def transcribe_audio(input_file_path: str) -> str:
    """
    Compress → chunk if necessary → transcribe each chunk with Gemini → stitch.
    """
    _compressed_path, chunks = await prepare_audio_pipeline_async(
        input_file_path,
        max_bytes=MAX_UPLOAD_BYTES,
        segment_time=SEGMENT_SECONDS,
    )

    if len(chunks) == 1:
        return await _transcribe_one(chunks[0])

    parts: List[str] = []
    for i, chunk in enumerate(chunks, start=1):
        text = await _transcribe_one(chunk)
        parts.append(f"\n\n[Part {i}]\n{text.strip()}")
    return "".join(parts).strip()


# ---------------------------------------------------------------------------
# Diarized transcription
# ---------------------------------------------------------------------------

def _diarize_with_client(path: str, client: Any, language: Optional[str] = None) -> Dict[str, Any]:
    """Upload, diarize, and clean up using a specific Gemini client."""
    lang_hint = (
        f" The spoken language is {language}." if language and language != "en" else ""
    )
    prompt = (
        f"Transcribe this audio with speaker diarization.{lang_hint}\n"
        "Label distinct speakers as A, B, C, etc.\n"
        "Return ONLY a valid JSON object with this exact structure — no markdown, no extra text:\n"
        '{"segments": [{"speaker": "A", "text": "...", "start": 0.0, "end": 2.5}]}\n'
        "Use decimal seconds for start/end timestamps. Include all audible speech."
    )
    uploaded = _upload_and_wait(path, client=client)
    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=[uploaded, prompt],
            config=genai_types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )
        if not response.text:
            raise RuntimeError("Gemini returned an empty diarization response.")
        raw = _extract_json_text(response.text)
        payload: Dict[str, Any] = json.loads(raw)
        return payload
    finally:
        _delete_uploaded(uploaded, client=client)


def _sync_transcribe_diarized(path: str, language: Optional[str] = None) -> Dict[str, Any]:
    """
    Transcribe a single audio chunk with speaker diarization using Gemini,
    with key-level fallback (re-uploads under fallback key if primary fails).
    Returns a dict with a 'segments' list of {speaker, text, start, end}.
    """
    log.info("[transcribe] diarized transcription starting for %s lang=%s",
             os.path.basename(path), language or "en")
    t0 = time.perf_counter()

    # Try primary key
    log.info("[transcribe] diarized — requesting with key=primary model=%s", GEMINI_MODEL)
    try:
        payload = _diarize_with_client(path, primary_genai_client, language)
        seg_count = len(payload.get("segments") or [])
        log.info("[transcribe] diarized done (primary) — %.2fs segments=%d",
                 time.perf_counter() - t0, seg_count)
        return payload
    except Exception as primary_exc:
        log.warning("[transcribe] diarized primary key failed — %s: %s",
                    type(primary_exc).__name__, primary_exc)
        if fallback_genai_client is None:
            log.error("[transcribe] diarized no fallback key — raising")
            raise

    # Fallback: re-upload under the fallback key
    log.info("[transcribe] diarized re-uploading + retrying with fallback key (GEMINI_API_KEY_WEST)")
    try:
        payload = _diarize_with_client(path, fallback_genai_client, language)
        seg_count = len(payload.get("segments") or [])
        log.info("[transcribe] diarized done (fallback) — %.2fs segments=%d",
                 time.perf_counter() - t0, seg_count)
        return payload
    except Exception as fallback_exc:
        log.error("[transcribe] diarized fallback key also failed — %s: %s",
                  type(fallback_exc).__name__, fallback_exc)
        raise fallback_exc


async def transcribe_audio_diarized(
    input_file_path: str,
    language: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Full diarized transcription pipeline.

    Returns:
        analysis_transcript  – plain "SPEAKER_ID: text" lines
        display_transcript   – timestamped "[ HH:MM - HH:MM ] SPEAKER: text" lines
        segments             – list of {speaker_id, text, start, end}
        speakers             – ordered list of unique speaker IDs
        duration_seconds     – total duration (float) or None
    """
    # Compress / chunk
    _compressed_path, chunks = await prepare_audio_pipeline_async(
        input_file_path,
        max_bytes=MAX_UPLOAD_BYTES,
        segment_time=SEGMENT_SECONDS,
        audio_bitrate="128k",
        sample_rate=None,
        channels=None,
    )

    raw_segments: List[Dict[str, Any]] = []
    combined_text_parts: List[str] = []
    offset_seconds = 0.0
    identity_map: Dict[str, str] = {}
    multi_chunk = len(chunks) > 1

    for chunk_index, chunk in enumerate(chunks):
        payload = await asyncio.to_thread(_sync_transcribe_diarized, chunk, language)

        # Extract plain text (if Gemini included it)
        text = str(payload.get("text") or "").strip()
        if text:
            combined_text_parts.append(text)

        # Parse segments
        raw_segs = payload.get("segments") or []
        duration = 0.0

        for seg in raw_segs:
            if not isinstance(seg, dict):
                continue
            seg_text = str(seg.get("text") or "").strip()
            if not seg_text:
                continue

            raw_speaker = str(seg.get("speaker") or "Speaker").strip() or "Speaker"
            identity_key = (
                raw_speaker if not multi_chunk else f"chunk-{chunk_index + 1}:{raw_speaker}"
            )
            speaker_id = identity_map.setdefault(
                identity_key, _speaker_id_from_index(len(identity_map))
            )
            start = float(seg.get("start") or 0.0) + offset_seconds
            end = float(seg.get("end") or start) + offset_seconds

            raw_segments.append(
                {"speaker_id": speaker_id, "text": seg_text, "start": start, "end": end}
            )
            if end > duration:
                duration = end - offset_seconds

        # Determine chunk duration for offset
        if duration <= 0:
            try:
                duration = audio_duration_seconds(chunk)
            except RuntimeError:
                duration = 0.0

        offset_seconds += duration

    merged = _merge_segments(raw_segments)
    speakers: List[str] = []
    for seg in merged:
        if seg["speaker_id"] not in speakers:
            speakers.append(seg["speaker_id"])

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
        # Fallback: plain text (no speaker labels)
        fallback_text = "\n\n".join(p for p in combined_text_parts if p).strip()
        if not fallback_text:
            raise RuntimeError("Gemini returned no diarized transcription segments.")
        analysis_transcript = fallback_text
        display_transcript = fallback_text

    return {
        "analysis_transcript": analysis_transcript.strip(),
        "display_transcript": display_transcript.strip(),
        "segments": merged,
        "speakers": speakers,
        "duration_seconds": offset_seconds or None,
    }


# ---------------------------------------------------------------------------
# Live session helper
# ---------------------------------------------------------------------------

async def create_realtime_transcription_secret(language: Optional[str] = None) -> Dict[str, Any]:
    """
    Legacy shim kept for import compatibility.
    The live transcription is now handled via the /live/stream WebSocket endpoint,
    which proxies audio to the Gemini Live API. This function is no longer called.
    """
    return {"ws_url": "/live/stream"}
