import os
import time
from typing import Optional
from dotenv import load_dotenv
from google import genai
from pinecone import Pinecone, ServerlessSpec

# Logger must be initialised before anything else emits records
from utils.logger import get_logger

load_dotenv()

log = get_logger("clariqy.config")

# ── Gemini keys ───────────────────────────────────────────────────────────────
GEMINI_API_KEY      = os.getenv("GEMINI_API_KEY", "")
GEMINI_API_KEY_WEST = os.getenv("GEMINI_API_KEY_WEST", "")

PINECONE_API_KEY    = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "clariq-meeting-summarizer")
PINECONE_CLOUD      = os.getenv("PINECONE_CLOUD", "aws")
PINECONE_REGION     = os.getenv("PINECONE_REGION", "us-east-1")

EMBEDDING_DIMENSION = 3072


# ── Gemini fallback proxy ─────────────────────────────────────────────────────

class _NamespaceProxy:
    """
    Transparently proxies attribute access on a Gemini client namespace
    (e.g. client.models, client.files).

    On ANY exception from the primary client the call is retried once using
    the fallback client.  Both attempts are fully logged.
    """

    def __init__(self, ns_name: str, primary_ns, fallback_ns):
        self._ns   = ns_name
        self._pri  = primary_ns
        self._fall = fallback_ns

    def __getattr__(self, method: str):
        ns, pri, fall = self._ns, self._pri, self._fall

        def _call(*args, **kwargs):
            label = f"gemini.{ns}.{method}"
            log.info("[%s] calling primary key", label)
            try:
                result = getattr(pri, method)(*args, **kwargs)
                log.info("[%s] primary key succeeded", label)
                return result
            except Exception as primary_exc:
                log.warning(
                    "[%s] primary key failed — %s: %s",
                    label,
                    type(primary_exc).__name__,
                    primary_exc,
                )
                if fall is None:
                    log.error("[%s] no fallback key configured — raising", label)
                    raise

                log.info("[%s] retrying with fallback key (GEMINI_API_KEY_WEST)", label)
                try:
                    result = getattr(fall, method)(*args, **kwargs)
                    log.info("[%s] fallback key succeeded", label)
                    return result
                except Exception as fallback_exc:
                    log.error(
                        "[%s] fallback key also failed — %s: %s",
                        label,
                        type(fallback_exc).__name__,
                        fallback_exc,
                    )
                    raise fallback_exc

        return _call


class GeminiFallbackClient:
    """
    Drop-in replacement for google.genai.Client that adds silent key-level
    fallback.  All existing code continues to call:

        genai_client.models.generate_content(...)
        genai_client.models.embed_content(...)
        genai_client.files.upload(...)
        genai_client.files.get(...)
        genai_client.files.delete(...)

    without any changes.
    """

    def __init__(self, primary: genai.Client, fallback: Optional[genai.Client]):
        self._primary  = primary
        self._fallback = fallback
        self.models    = _NamespaceProxy("models", primary.models,
                                         fallback.models if fallback else None)
        self.files     = _NamespaceProxy("files",  primary.files,
                                         fallback.files  if fallback else None)
        _has_fall = fallback is not None
        log.info(
            "[gemini] client ready — primary key=%s…%s | fallback key=%s",
            GEMINI_API_KEY[:8],
            GEMINI_API_KEY[-4:],
            f"{GEMINI_API_KEY_WEST[:8]}…{GEMINI_API_KEY_WEST[-4:]}" if _has_fall
            else "NOT CONFIGURED",
        )


def _build_gemini_client() -> GeminiFallbackClient:
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY env var is missing.")

    primary  = genai.Client(api_key=GEMINI_API_KEY)
    fallback = genai.Client(api_key=GEMINI_API_KEY_WEST) if GEMINI_API_KEY_WEST else None

    if not fallback:
        log.warning(
            "[gemini] GEMINI_API_KEY_WEST is not set — "
            "no fallback available if the primary key is rate-limited."
        )

    return GeminiFallbackClient(primary, fallback)


genai_client = _build_gemini_client()

# Raw clients exported for transcription, which uses the Files API.
# Files uploaded by one API key cannot be accessed by another key, so
# transcribe.py must re-upload with the fallback client rather than
# reusing the file reference from the primary client.
primary_genai_client  = genai_client._primary
fallback_genai_client = genai_client._fallback


# ── Pinecone ──────────────────────────────────────────────────────────────────
pc    = None
index = None

if PINECONE_API_KEY:
    log.info("[pinecone] initialising client …")
    pc = Pinecone(api_key=PINECONE_API_KEY)
    existing_names = pc.list_indexes().names()

    if PINECONE_INDEX_NAME in existing_names:
        try:
            idx_info    = pc.describe_index(PINECONE_INDEX_NAME)
            current_dim = getattr(idx_info, "dimension", None)
            if current_dim is not None and current_dim != EMBEDDING_DIMENSION:
                log.warning(
                    "[pinecone] index '%s' has dim=%d but Gemini requires %d — "
                    "deleting and recreating …",
                    PINECONE_INDEX_NAME, current_dim, EMBEDDING_DIMENSION,
                )
                pc.delete_index(PINECONE_INDEX_NAME)
                for _ in range(15):
                    time.sleep(2)
                    if PINECONE_INDEX_NAME not in pc.list_indexes().names():
                        break
                existing_names = pc.list_indexes().names()
        except Exception as e:
            log.warning("[pinecone] could not inspect existing index: %s", e)

    if PINECONE_INDEX_NAME not in existing_names:
        log.info("[pinecone] creating index '%s' (dim=%d) …",
                 PINECONE_INDEX_NAME, EMBEDDING_DIMENSION)
        pc.create_index(
            name=PINECONE_INDEX_NAME,
            dimension=EMBEDDING_DIMENSION,
            metric="cosine",
            spec=ServerlessSpec(cloud=PINECONE_CLOUD, region=PINECONE_REGION),
        )

    index = pc.Index(PINECONE_INDEX_NAME)
    log.info("[pinecone] index '%s' ready", PINECONE_INDEX_NAME)
else:
    log.warning("[pinecone] PINECONE_API_KEY not set — vector search disabled")
