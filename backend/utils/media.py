import os
import math
import ffmpeg
import uuid
from typing import List, Optional, Tuple

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

def _parse_ffprobe_duration(value: Optional[str]) -> Optional[float]:
    if value is None:
        return None

    raw = str(value).strip()
    if not raw:
        return None

    try:
        return float(raw)
    except ValueError:
        pass

    if ":" not in raw:
        return None

    try:
        hours, minutes, seconds = raw.split(":")
        return (int(hours) * 3600) + (int(minutes) * 60) + float(seconds)
    except ValueError:
        return None

def extract_audio(
    input_path: str,
    audio_bitrate: str = TARGET_AUDIO_BITRATE,
    sample_rate: Optional[int] = TARGET_SAMPLE_RATE,
    channels: Optional[int] = TARGET_CHANNELS,
) -> str:
    """
    Extract and compress audio from any input (audio/video) to MP3.
    When sample_rate/channels are None, the source layout is preserved.
    Returns path to compressed MP3.
    """
    out_path = os.path.join(AUDIO_DIR, f"{uuid.uuid4().hex}.mp3")
    try:
        output_kwargs = {
            "audio_bitrate": audio_bitrate,
            "vn": None,
            "f": "mp3",
        }
        if channels is not None:
            output_kwargs["ac"] = channels
        if sample_rate is not None:
            output_kwargs["ar"] = sample_rate

        (
            ffmpeg
            .input(input_path)
            .output(out_path, **output_kwargs)
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
        format_info = probe.get("format") or {}

        for stream in probe.get("streams", []):
            if stream.get("codec_type") == "audio":
                direct_duration = _parse_ffprobe_duration(stream.get("duration"))
                if direct_duration is not None:
                    return direct_duration

                tagged_duration = _parse_ffprobe_duration((stream.get("tags") or {}).get("DURATION"))
                if tagged_duration is not None:
                    return tagged_duration

                duration_ts = stream.get("duration_ts")
                time_base = stream.get("time_base")
                if duration_ts is not None and time_base:
                    try:
                        numerator, denominator = str(time_base).split("/", 1)
                        computed_duration = float(duration_ts) * (float(numerator) / float(denominator))
                        if computed_duration > 0:
                            return computed_duration
                    except (TypeError, ValueError, ZeroDivisionError):
                        pass

        container_duration = _parse_ffprobe_duration(format_info.get("duration"))
        if container_duration is not None:
            return container_duration

        # fallback to container duration
        raise RuntimeError("Duration metadata was not present in ffprobe output.")
    except ffmpeg.Error as e:
        raise RuntimeError(f"ffmpeg probe failed: {e.stderr.decode() if e.stderr else e}") from e

def split_audio(
    input_path: str,
    segment_time: int = 600,
    audio_bitrate: str = TARGET_AUDIO_BITRATE,
    sample_rate: Optional[int] = TARGET_SAMPLE_RATE,
    channels: Optional[int] = TARGET_CHANNELS,
) -> List[str]:
    """
    Split audio file into N segments (each ~segment_time seconds).
    Returns list of chunk paths in order.
    """
    base = os.path.join(CHUNKS_DIR, f"{uuid.uuid4().hex}_part_%03d.mp3")
    try:
        output_kwargs = {
            "f": "segment",
            "segment_time": segment_time,
            "audio_bitrate": audio_bitrate,
            "reset_timestamps": 1,
        }
        if channels is not None:
            output_kwargs["ac"] = channels
        if sample_rate is not None:
            output_kwargs["ar"] = sample_rate

        # Re-encode + segment to ensure uniform params & small size
        (
            ffmpeg
            .input(input_path)
            .output(base, **output_kwargs)
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
    sample_rate: Optional[int] = TARGET_SAMPLE_RATE,
    channels: Optional[int] = TARGET_CHANNELS,
) -> Tuple[str, list]:
    """
    End-to-end: extract+compress -> maybe split for large files.
    Returns (compressed_audio_path, chunk_paths). If not split, chunk_paths has one file.
    """
    compressed = extract_audio(
        input_path,
        audio_bitrate=audio_bitrate,
        sample_rate=sample_rate,
        channels=channels,
    )
    size = os.path.getsize(compressed)

    if size <= max_bytes:
        return compressed, [compressed]

    # Large: split by time into safe chunks
    chunks = split_audio(
        compressed,
        segment_time=segment_time,
        audio_bitrate=audio_bitrate,
        sample_rate=sample_rate,
        channels=channels,
    )
    return compressed, chunks

async def prepare_audio_pipeline_async(
    input_path: str,
    max_bytes: int = 24 * 1024 * 1024,
    segment_time: int = 600,
    audio_bitrate: str = TARGET_AUDIO_BITRATE,
    sample_rate: Optional[int] = TARGET_SAMPLE_RATE,
    channels: Optional[int] = TARGET_CHANNELS,
) -> Tuple[str, list]:
    return await asyncio.to_thread(
        prepare_audio_pipeline,
        input_path,
        max_bytes,
        segment_time,
        audio_bitrate,
        sample_rate,
        channels,
    )
