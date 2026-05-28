import time
from textwrap import wrap

from config import genai_client, index
from utils.logger import get_logger

log = get_logger("clariqy.embeddings")

GEMINI_EMBEDDING_MODEL = "gemini-embedding-001"


def _embed_text(text: str, chunk_index: int = 0) -> list[float]:
    """Embed a single text chunk using Gemini embedding model."""
    log.debug("[embeddings] embedding chunk=%d chars=%d", chunk_index, len(text))
    t0 = time.perf_counter()
    result = genai_client.models.embed_content(
        model=GEMINI_EMBEDDING_MODEL,
        contents=[text],
    )
    elapsed = time.perf_counter() - t0
    log.debug("[embeddings] chunk=%d embedded in %.2fs", chunk_index, elapsed)
    return result.embeddings[0].values


def embed_and_store(text: str, meeting_id: str) -> bool:
    if index is None:
        log.warning("[embeddings] Pinecone index not available — skipping embed for meeting=%s", meeting_id)
        return False

    chunks = wrap(text, 3000)
    log.info("[embeddings] embedding meeting=%s chunks=%d total_chars=%d",
             meeting_id, len(chunks), len(text))
    t0 = time.perf_counter()

    for i, chunk in enumerate(chunks):
        vector = _embed_text(chunk, chunk_index=i)
        index.upsert(
            vectors=[
                {
                    "id": f"{meeting_id}-{i}",
                    "values": vector,
                    "metadata": {"text": chunk, "chunk": i, "meeting_id": meeting_id},
                }
            ]
        )

    elapsed = time.perf_counter() - t0
    log.info("[embeddings] meeting=%s stored %d chunks in %.2fs", meeting_id, len(chunks), elapsed)
    return True
