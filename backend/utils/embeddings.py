import time
from textwrap import wrap

from config import pc, index, PINECONE_EMBED_MODEL
from utils.logger import get_logger

log = get_logger("clariqy.embeddings")

# e5-large caps at ~512 tokens; keep chunks well under to avoid truncation.
CHUNK_CHARS = 1800
# Pinecone inference allows up to 96 inputs per embed call.
EMBED_BATCH = 96


def _extract_values(item) -> list:
    """Pinecone inference rows come back as dicts or objects depending on SDK version."""
    if isinstance(item, dict):
        return item["values"]
    return item.values


def embed_texts(texts: list, input_type: str = "passage") -> list:
    """Embed a list of texts via Pinecone hosted inference (no Gemini needed)."""
    vectors: list = []
    for start in range(0, len(texts), EMBED_BATCH):
        batch = texts[start:start + EMBED_BATCH]
        result = pc.inference.embed(
            model=PINECONE_EMBED_MODEL,
            inputs=batch,
            parameters={"input_type": input_type, "truncate": "END"},
        )
        vectors.extend(_extract_values(row) for row in result.data)
    return vectors


def embed_and_store(text: str, meeting_id: str) -> bool:
    if index is None:
        log.warning("[embeddings] Pinecone index not available — skipping embed for meeting=%s", meeting_id)
        return False

    chunks = wrap(text, CHUNK_CHARS)
    if not chunks:
        return False

    log.info("[embeddings] embedding meeting=%s chunks=%d total_chars=%d model=%s",
             meeting_id, len(chunks), len(text), PINECONE_EMBED_MODEL)
    t0 = time.perf_counter()

    vectors = embed_texts(chunks, input_type="passage")

    index.upsert(
        vectors=[
            {
                "id": f"{meeting_id}-{i}",
                "values": vec,
                "metadata": {"text": chunk, "chunk": i, "meeting_id": meeting_id},
            }
            for i, (chunk, vec) in enumerate(zip(chunks, vectors))
        ]
    )

    elapsed = time.perf_counter() - t0
    log.info("[embeddings] meeting=%s stored %d chunks in %.2fs", meeting_id, len(chunks), elapsed)
    return True
