import os
import asyncio
from typing import List
from config import client
from utils.media import prepare_audio_pipeline, prepare_audio_pipeline_async

MAX_OPENAI_UPLOAD_BYTES = 24 * 1024 * 1024
SEGMENT_SECONDS = 600  # 10 min chunks

def _sync_transcribe(path: str) -> str:
    with open(path, "rb") as f:
        resp = client.audio.transcriptions.create(
            model="whisper-1",
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
    compressed_path, chunks = await prepare_audio_pipeline_async(
        input_file_path,
        max_bytes=MAX_OPENAI_UPLOAD_BYTES,
        segment_time=SEGMENT_SECONDS
    )

    parts: List[str] = []
    for i, chunk in enumerate(chunks, start=1):
        text = await _transcribe_one(chunk)
        parts.append(f"\n\n[Part {i}]\n{text.strip()}")

    return "".join(parts).strip()
