import os
import asyncio
import json
from typing import Any, Dict, List, Optional
import inspect
from config import client
from utils.media import audio_duration_seconds, prepare_audio_pipeline_async

MAX_OPENAI_UPLOAD_BYTES = 24 * 1024 * 1024
SEGMENT_SECONDS = 600  # 10 min chunks

def _sync_transcribe(path: str) -> str:
    with open(path, "rb") as f:
        resp = client.audio.transcriptions.create(
            model="gpt-4o-transcribe",
            file=f
        )
    if not getattr(resp, "text", None):
        raise RuntimeError("No transcription text returned from OpenAI.")
    return resp.text

async def _transcribe_one(path: str) -> str:
    return await asyncio.to_thread(_sync_transcribe, path)

async def transcribe_audio(input_file_path: str) -> str:
    """
    Extract/compress -> split if large -> transcribe chunk-by-chunk and stitch.
    """
    _compressed_path, chunks = await prepare_audio_pipeline_async(
        input_file_path,
        max_bytes=MAX_OPENAI_UPLOAD_BYTES,
        segment_time=SEGMENT_SECONDS
    )

    parts: List[str] = []
    for i, chunk in enumerate(chunks, start=1):
        text = await _transcribe_one(chunk)
        parts.append(f"\n\n[Part {i}]\n{text.strip()}")

    return "".join(parts).strip()

def _format_timestamp(seconds: float) -> str:
    total_seconds = max(0, int(round(seconds)))
    hours, remainder = divmod(total_seconds, 3600)
    minutes, secs = divmod(remainder, 60)
    if hours:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"
    return f"{minutes:02d}:{secs:02d}"

def _sync_create_realtime_transcription_secret(language: Optional[str] = None):
    transcription: Dict[str, str] = {"model": "gpt-4o-mini-transcribe"}
    if language:
        transcription["language"] = language

    return client.realtime.client_secrets.create(
        session={
            "type": "transcription",
            "audio": {
                "input": {
                    "transcription": transcription,
                    "turn_detection": {
                        "type": "server_vad",
                        "create_response": False,
                        "interrupt_response": False,
                        "prefix_padding_ms": 300,
                        "silence_duration_ms": 650,
                    },
                }
            },
        }
    )

async def create_realtime_transcription_secret(language: Optional[str] = None) -> Dict[str, Any]:
    session = await asyncio.to_thread(_sync_create_realtime_transcription_secret, language)
    serialized_session = session.session.model_dump() if hasattr(session.session, "model_dump") else session.session
    return {
        "client_secret": session.value,
        "expires_at": session.expires_at,
        "session": serialized_session,
    }

def _sync_transcribe_diarized_chunk(
    path: str,
    language: Optional[str] = None,
):
    with open(path, "rb") as f:
        create_fn = (
            client.audio.transcriptions.with_raw_response.create
            if hasattr(client.audio.transcriptions, "with_raw_response")
            else client.audio.transcriptions.create
        )
        supported = set(inspect.signature(create_fn).parameters)

        kwargs: Dict[str, Any] = {
            "model": "gpt-4o-transcribe-diarize",
            "file": f,
        }
        extra_body: Dict[str, Any] = {}

        if "response_format" in supported:
            kwargs["response_format"] = "diarized_json"
        else:
            extra_body["response_format"] = "diarized_json"

        if "chunking_strategy" in supported:
            kwargs["chunking_strategy"] = "auto"
        else:
            extra_body["chunking_strategy"] = "auto"

        if language:
            if "language" in supported:
                kwargs["language"] = language
            else:
                extra_body["language"] = language

        if extra_body and "extra_body" in supported:
            kwargs["extra_body"] = extra_body

        return create_fn(**kwargs)

def _load_diarized_payload(response: Any) -> Dict[str, Any]:
    if hasattr(response, "http_response"):
        http_response = response.http_response
        try:
            data = http_response.json()
            if isinstance(data, dict):
                return data
            if isinstance(data, list):
                return {"segments": data}
        except Exception:
            raw_text = getattr(http_response, "text", "") or ""
            if raw_text:
                try:
                    parsed = json.loads(raw_text)
                    if isinstance(parsed, dict):
                        return parsed
                    if isinstance(parsed, list):
                        return {"segments": parsed}
                except Exception:
                    return {"text": raw_text}

    if hasattr(response, "model_dump"):
        dumped = response.model_dump()
        if isinstance(dumped, dict):
            return dumped

    if isinstance(response, dict):
        return response

    if isinstance(response, list):
        return {"segments": response}

    if isinstance(response, (bytes, bytearray)):
        try:
            decoded = response.decode("utf-8")
        except Exception:
            decoded = ""
        if decoded:
            try:
                parsed = json.loads(decoded)
                if isinstance(parsed, dict):
                    return parsed
                if isinstance(parsed, list):
                    return {"segments": parsed}
            except Exception:
                return {"text": decoded}

    if isinstance(response, str):
        try:
            parsed = json.loads(response)
            if isinstance(parsed, dict):
                return parsed
            if isinstance(parsed, list):
                return {"segments": parsed}
        except Exception:
            return {"text": response}

    payload: Dict[str, Any] = {}
    for attr in ("duration", "segments", "text"):
        value = getattr(response, attr, None)
        if value is not None:
            payload[attr] = value
    return payload

def _coerce_diarized_segments(payload: Dict[str, Any], fallback_duration: float) -> List[Dict[str, Any]]:
    raw_segments = payload.get("segments") or payload.get("speaker_segments") or []
    coerced: List[Dict[str, Any]] = []
    for segment in raw_segments:
        if hasattr(segment, "model_dump"):
            item = segment.model_dump()
        elif isinstance(segment, dict):
            item = segment
        else:
            item = {
                "speaker": getattr(segment, "speaker", None),
                "text": getattr(segment, "text", None),
                "start": getattr(segment, "start", None),
                "end": getattr(segment, "end", None),
            }

        text = str(item.get("text") or "").strip()
        if not text:
            continue

        speaker = str(
            item.get("speaker")
            or item.get("speaker_label")
            or item.get("speaker_name")
            or "Speaker"
        ).strip() or "Speaker"
        start = float(item.get("start") or item.get("start_time") or 0.0)
        end = float(item.get("end") or item.get("end_time") or start)
        coerced.append(
            {
                "speaker": speaker,
                "text": text,
                "start": start,
                "end": end,
            }
        )

    if coerced:
        return coerced

    fallback_text = str(payload.get("text") or "").strip()
    if fallback_text:
        return [
            {
                "speaker": "A",
                "text": fallback_text,
                "start": 0.0,
                "end": fallback_duration if fallback_duration > 0 else 0.0,
            }
        ]

    return []

def _speaker_id_from_index(index: int) -> str:
    if index < 26:
        return chr(ord("A") + index)
    return f"S{index + 1}"

def _merge_segments(raw_segments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    merged: List[Dict[str, Any]] = []
    for segment in raw_segments:
        text = (segment.get("text") or "").strip()
        if not text:
            continue

        speaker_id = (segment.get("speaker_id") or "Speaker").strip() or "Speaker"
        start = float(segment.get("start") or 0)
        end = float(segment.get("end") or start)

        if (
            merged
            and merged[-1]["speaker_id"] == speaker_id
            and start - merged[-1]["end"] <= 1.2
        ):
            merged[-1]["text"] = f"{merged[-1]['text']} {text}".strip()
            merged[-1]["end"] = end
            continue

        merged.append(
            {
                "speaker_id": speaker_id,
                "text": text,
                "start": start,
                "end": end,
            }
        )
    return merged

async def transcribe_audio_diarized(
    input_file_path: str,
    language: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Generate a diarized transcription with speaker-labeled segments.

    For long recordings we recompress speech aggressively first so most sessions
    still fit within a single diarized request, then fall back to chunk-wise
    diarization when absolutely necessary.
    """
    compressed_path, chunks = await prepare_audio_pipeline_async(
        input_file_path,
        max_bytes=MAX_OPENAI_UPLOAD_BYTES,
        segment_time=SEGMENT_SECONDS,
        audio_bitrate="48k",
    )
    if os.path.getsize(compressed_path) <= MAX_OPENAI_UPLOAD_BYTES:
        chunks = [compressed_path]

    raw_segments: List[Dict[str, Any]] = []
    combined_text_parts: List[str] = []
    offset_seconds = 0.0
    identity_map: Dict[str, str] = {}
    multi_chunk = len(chunks) > 1

    for chunk_index, chunk in enumerate(chunks):
        response = await asyncio.to_thread(
            _sync_transcribe_diarized_chunk,
            chunk,
            language,
        )
        payload = _load_diarized_payload(response)
        duration = float(payload.get("duration") or 0.0)
        if duration <= 0:
            duration = audio_duration_seconds(chunk)
        text = str(payload.get("text") or "").strip()
        if text:
            combined_text_parts.append(text)

        chunk_segments = []
        for segment in _coerce_diarized_segments(payload, duration):
            raw_speaker = str(segment.get("speaker") or "Speaker").strip() or "Speaker"
            identity_key = raw_speaker if not multi_chunk else f"chunk-{chunk_index + 1}:{raw_speaker}"
            speaker_id = identity_map.setdefault(identity_key, _speaker_id_from_index(len(identity_map)))
            start = float(segment.get("start") or 0.0) + offset_seconds
            end = float(segment.get("end") or start) + offset_seconds
            chunk_segments.append(
                {
                    "speaker_id": speaker_id,
                    "text": segment.get("text") or "",
                    "start": start,
                    "end": end,
                }
            )

        raw_segments.extend(chunk_segments)
        offset_seconds += duration

    merged_segments = _merge_segments(raw_segments)
    speakers: List[str] = []
    for segment in merged_segments:
        speaker_id = segment["speaker_id"]
        if speaker_id not in speakers:
            speakers.append(speaker_id)

    if merged_segments:
        analysis_transcript = "\n".join(
            f"{segment['speaker_id']}: {segment['text']}" for segment in merged_segments
        )
        display_transcript = "\n".join(
            f"[{_format_timestamp(segment['start'])} - {_format_timestamp(segment['end'])}] "
            f"{segment['speaker_id']}: {segment['text']}"
            for segment in merged_segments
        )
    else:
        fallback_text = "\n\n".join(part for part in combined_text_parts if part).strip()
        if not fallback_text:
            raise RuntimeError("No diarized transcription segments returned from OpenAI.")
        analysis_transcript = fallback_text
        display_transcript = fallback_text

    return {
        "analysis_transcript": analysis_transcript.strip(),
        "display_transcript": display_transcript.strip(),
        "segments": merged_segments,
        "speakers": speakers,
        "duration_seconds": offset_seconds or None,
    }
