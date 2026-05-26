from textwrap import wrap

from config import genai_client, index

GEMINI_EMBEDDING_MODEL = "gemini-embedding-001"


def _embed_text(text: str) -> list[float]:
    """Embed a single text chunk using Gemini text-embedding-004 (768 dims)."""
    result = genai_client.models.embed_content(
        model=GEMINI_EMBEDDING_MODEL,
        contents=[text],
    )
    return result.embeddings[0].values


def embed_and_store(text: str, meeting_id: str) -> bool:
    if index is None:
        return False

    chunks = wrap(text, 3000)
    for i, chunk in enumerate(chunks):
        vector = _embed_text(chunk)
        index.upsert(
            vectors=[
                {
                    "id": f"{meeting_id}-{i}",
                    "values": vector,
                    "metadata": {"text": chunk, "chunk": i, "meeting_id": meeting_id},
                }
            ]
        )
    return True
