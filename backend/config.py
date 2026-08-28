import os
import time
from dotenv import load_dotenv
from pinecone import Pinecone, ServerlessSpec

# Logger must be initialised before anything else emits records
from utils.logger import get_logger

load_dotenv()

log = get_logger("clariqy.config")

# ── Gemini keys (used only for embeddings + live streaming) ───────────────────
GEMINI_API_KEY      = os.getenv("GEMINI_API_KEY", "")
GEMINI_API_KEY_WEST = os.getenv("GEMINI_API_KEY_WEST", "")

# ── Groq (transcription via Whisper + summarization/Q&A via an LLM) ───────────
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
# Chat model for summarization + Q&A. Override via env if Groq rotates models.
# (Groq periodically decommissions models — check https://console.groq.com/docs/models)
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

# ── AssemblyAI (speaker-diarized transcription) ───────────────────────────────
ASSEMBLYAI_API_KEY = os.getenv("ASSEMBLYAI_API_KEY", "")

# ── Pinecone ──────────────────────────────────────────────────────────────────
PINECONE_API_KEY    = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "clariq-meeting-summarizer")
PINECONE_CLOUD      = os.getenv("PINECONE_CLOUD", "aws")
PINECONE_REGION     = os.getenv("PINECONE_REGION", "us-east-1")

# Embeddings now use Pinecone's own hosted inference (no Gemini dependency).
# multilingual-e5-large → 1024-dim. Override the model via env if needed.
PINECONE_EMBED_MODEL = os.getenv("PINECONE_EMBED_MODEL", "multilingual-e5-large")
EMBEDDING_DIMENSION  = 1024


# ── Gemini ────────────────────────────────────────────────────────────────────
# The app is fully Gemini-independent: transcription/summaries use Groq,
# diarization uses AssemblyAI, and embeddings use Pinecone hosted inference.
# The optional live-stream WebSocket endpoint reads GEMINI_API_KEY directly if
# a billing-enabled key is ever provided; nothing else here depends on Gemini.
if not GEMINI_API_KEY:
    log.info("[gemini] no GEMINI_API_KEY set — running fully Gemini-free")


# ── Groq client ───────────────────────────────────────────────────────────────
groq_client = None
try:
    from groq import Groq as _Groq
    if GROQ_API_KEY:
        groq_client = _Groq(api_key=GROQ_API_KEY, max_retries=3)
        log.info("[groq] client ready")
    else:
        log.warning("[groq] GROQ_API_KEY not set — transcription and summarization unavailable")
except ImportError:
    log.warning("[groq] 'groq' package not installed — run: pip install groq")


# ── AssemblyAI ────────────────────────────────────────────────────────────────
# We call AssemblyAI via its REST API directly (not the SDK) to avoid model-name
# enum validation issues in the SDK.  Just validate the key is present here.
if ASSEMBLYAI_API_KEY:
    log.info("[assemblyai] API key configured")
else:
    log.warning("[assemblyai] ASSEMBLYAI_API_KEY not set — diarized transcription unavailable")


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
                    "[pinecone] index '%s' has dim=%d but the embedding model requires %d — "
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
