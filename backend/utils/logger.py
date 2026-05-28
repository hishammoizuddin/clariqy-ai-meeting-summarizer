"""
utils/logger.py — Centralised logging setup for ClarIQy backend.

Import this module early (it is imported by config.py) so the format is
applied before any other module emits log records.
"""

import logging
import os
import sys

_LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

# Root formatter — structured, single-line, easy to grep in Render logs
_FMT = "%(asctime)s [%(levelname)s] %(name)s — %(message)s"
_DATE_FMT = "%Y-%m-%dT%H:%M:%S"

logging.basicConfig(
    level=_LOG_LEVEL,
    format=_FMT,
    datefmt=_DATE_FMT,
    stream=sys.stdout,
    force=True,          # override any handler already attached by uvicorn
)

# Quiet down noisy third-party loggers
for _noisy in ("httpx", "httpcore", "urllib3", "google", "pinecone"):
    logging.getLogger(_noisy).setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """Return a named logger. Use module __name__ as the name."""
    return logging.getLogger(name)
