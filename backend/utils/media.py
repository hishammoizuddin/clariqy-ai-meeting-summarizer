import os
import math
import ffmpeg
import uuid
from typing import List, Tuple

AUDIO_DIR = "uploads/audio"
CHUNKS_DIR = "uploads/chunks"
os.makedirs(AUDIO_DIR, exist_ok=True)
os.makedirs(CHUNKS_DIR, exist_ok=True)

# Target settings to keep files small & Whisper-friendly
TARGET_SAMPLE_RATE = 16000  # Hz
TARGET_CHANNELS = 1         # mono
TARGET_AUDIO_BITRATE = "64k"  # keeps files tiny with good accuracy

def _ext(path: str) -> str:
    return os.path.splitext(path)[1].lower()

def extract_audio(input_path: str, audio_bitrate: str = TARGET_AUDIO_BITRATE) -> str:
    """
    Extract and compress audio from any input (audio/video) to MP3 mono 16kHz.
    Returns path to compressed MP3.
    """
    out_path = os.path.join(AUDIO_DIR, f"{uuid.uuid4().hex}.mp3")
    try:
        # Re-encode to mp3, 16kHz, mono, ~64kbps
        (
            ffmpeg
            .input(input_path)
            .output(
                out_path,
                ac=TARGET_CHANNELS,
                ar=TARGET_SAMPLE_RATE,
                audio_bitrate=audio_bitrate,
                vn=None,           # drop video
                f="mp3"
            )
            .overwrite_output()
            .run(quiet=True)
        )
        return out_path
    except ffmpeg.Error as e:
        raise RuntimeError(f"ffmpeg audio extraction failed: {e.stderr.decode() if e.stderr else e}") from e

def audio_duration_seconds(path: str) -> float:
    """
    Probe media duration in seconds.
    """
    try:
        probe = ffmpeg.probe(path)
        for stream in probe.get("streams", []):
            if stream.get("codec_type") == "audio":
                return float(stream.get("duration") or probe["format"]["duration"])
        # fallback to container duration
        return float(probe["format"]["duration"])
    except ffmpeg.Error as e:
        raise RuntimeError(f"ffmpeg probe failed: {e.stderr.decode() if e.stderr else e}") from e

def split_audio(
    input_path: str,
    segment_time: int = 600,
    audio_bitrate: str = TARGET_AUDIO_BITRATE,
) -> List[str]:
    """
    Split audio file into N segments (each ~segment_time seconds).
    Returns list of chunk paths in order.
    """
    base = os.path.join(CHUNKS_DIR, f"{uuid.uuid4().hex}_part_%03d.mp3")
    try:
        # Re-encode + segment to ensure uniform params & small size
        (
            ffmpeg
            .input(input_path)
            .output(
                base,
                f="segment",
                segment_time=segment_time,
                ac=TARGET_CHANNELS,
                ar=TARGET_SAMPLE_RATE,
                audio_bitrate=audio_bitrate,
                reset_timestamps=1
            )
            .overwrite_output()
            .run(quiet=True)
        )
    except ffmpeg.Error as e:
        raise RuntimeError(f"ffmpeg segmenting failed: {e.stderr.decode() if e.stderr else e}") from e

    # Collect generated parts in numeric order
    dir_name = os.path.dirname(base)
    prefix = os.path.basename(base).split("%03d")[0]
    parts = sorted(
        [os.path.join(dir_name, f) for f in os.listdir(dir_name) if f.startswith(prefix) and f.endswith(".mp3")]
    )
    if not parts:
        # If media shorter than segment_time, ffmpeg may output a single file with 000
        # but if nothing produced, fall back to original input
        parts = [input_path]
    return parts

import asyncio

def prepare_audio_pipeline(
    input_path: str,
    max_bytes: int = 24 * 1024 * 1024,
    segment_time: int = 600,
    audio_bitrate: str = TARGET_AUDIO_BITRATE,
) -> Tuple[str, list]:
    """
    End-to-end: extract+compress -> maybe split for large files.
    Returns (compressed_audio_path, chunk_paths). If not split, chunk_paths has one file.
    """
    compressed = extract_audio(input_path, audio_bitrate=audio_bitrate)
    size = os.path.getsize(compressed)

    if size <= max_bytes:
        return compressed, [compressed]

    # Large: split by time into safe chunks
    chunks = split_audio(compressed, segment_time=segment_time, audio_bitrate=audio_bitrate)
    return compressed, chunks

async def prepare_audio_pipeline_async(
    input_path: str,
    max_bytes: int = 24 * 1024 * 1024,
    segment_time: int = 600,
    audio_bitrate: str = TARGET_AUDIO_BITRATE,
) -> Tuple[str, list]:
    return await asyncio.to_thread(
        prepare_audio_pipeline,
        input_path,
        max_bytes,
        segment_time,
        audio_bitrate,
    )
