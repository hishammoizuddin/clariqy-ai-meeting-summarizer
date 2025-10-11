import os
from typing import List
from config import client
from utils.media import prepare_audio_pipeline

MAX_OPENAI_UPLOAD_BYTES = 24 * 1024 * 1024
SEGMENT_SECONDS = 600  # 10 min chunks

async def _transcribe_one(path: str) -> str:
    with open(path, "rb") as f:
        resp = client.audio.transcriptions.create(
            model="whisper-1",
            file=f
        )
    # v1 returns `text`
    if not getattr(resp, "text", None):
        raise RuntimeError("No transcription text returned from OpenAI.")
    return resp.text

async def transcribe_audio(input_file_path: str) -> str:
    """
    Extract/compress -> split if large -> transcribe chunk-by-chunk and stitch.
    """
    compressed_path, chunks = prepare_audio_pipeline(
        input_file_path,
        max_bytes=MAX_OPENAI_UPLOAD_BYTES,
        segment_time=SEGMENT_SECONDS
    )

    parts: List[str] = []
    for i, chunk in enumerate(chunks, start=1):
        text = await _transcribe_one(chunk)
        parts.append(f"\n\n[Part {i}]\n{text.strip()}")

    return "".join(parts).strip()
