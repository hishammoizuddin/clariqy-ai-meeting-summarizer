import time

from config import genai_client, groq_client, index
from utils.logger import get_logger

log = get_logger("clariqy.rag")

GROQ_MODEL             = "llama-3.3-70b-versatile"
GEMINI_EMBEDDING_MODEL = "gemini-embedding-001"


# ---------------------------------------------------------------------------
# Embeddings — still Gemini (3072-dim, no dimension migration needed)
# ---------------------------------------------------------------------------

def _embed_question(question: str) -> list:
    """Embed the user's question for semantic search using Gemini embeddings."""
    log.debug("[rag] embedding question chars=%d", len(question))
    result = genai_client.models.embed_content(
        model=GEMINI_EMBEDDING_MODEL,
        contents=[question],
    )
    return result.embeddings[0].values


# ---------------------------------------------------------------------------
# Answer generation — Groq Llama
# ---------------------------------------------------------------------------

def _ask_groq(prompt: str, system: str) -> str:
    """Generate an answer using Groq Llama."""
    if groq_client is None:
        raise RuntimeError(
            "GROQ_API_KEY is not configured. "
            "Add it to your .env file and restart the server."
        )
    response = groq_client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
        temperature=0.2,
        max_tokens=4096,
    )
    return (response.choices[0].message.content or "").strip()


# ---------------------------------------------------------------------------
# Public query functions
# ---------------------------------------------------------------------------

def query_meeting(meeting_id: str, question: str) -> str:
    log.info("[rag] query_meeting meeting=%s question_chars=%d", meeting_id, len(question))
    if index is None:
        log.warning("[rag] Pinecone index unavailable")
        return "Semantic Q&A is unavailable because vector search is not configured for this workspace."

    t0 = time.perf_counter()
    question_vector = _embed_question(question)

    results = index.query(
        vector=question_vector,
        top_k=5,
        include_metadata=True,
        filter={"meeting_id": meeting_id},
    )
    log.info("[rag] pinecone returned %d matches for meeting=%s",
             len(results.matches), meeting_id)

    context = "\n\n".join(
        m.metadata.get("text", "") for m in results.matches if m.metadata
    )

    prompt = f"""Answer the following question based solely on the meeting transcript context below.
If the answer is not in the context, say you don't know. Be detailed and structured.

Context:
{context}

Question: {question}"""

    system = "You answer questions accurately based on meeting transcript content."

    log.info("[rag] generating answer — model=%s", GROQ_MODEL)
    answer = _ask_groq(prompt, system)

    elapsed = time.perf_counter() - t0
    log.info("[rag] query_meeting done — %.2fs answer_chars=%d", elapsed, len(answer))
    return answer


def query_collection(
    meeting_ids: list,
    question: str,
    collection_name: str = "this collection",
) -> str:
    """Answer a question by searching across ALL meetings in a collection."""
    log.info("[rag] query_collection meetings=%d question_chars=%d collection=%r",
             len(meeting_ids), len(question), collection_name)

    if index is None:
        log.warning("[rag] Pinecone index unavailable")
        return "Semantic Q&A is unavailable because vector search is not configured for this workspace."

    if not meeting_ids:
        return (
            "This collection has no recordings yet. "
            "Add some sessions to start asking questions across them."
        )

    t0 = time.perf_counter()
    question_vector = _embed_question(question)

    results = index.query(
        vector=question_vector,
        top_k=10,
        include_metadata=True,
        filter={"meeting_id": {"$in": meeting_ids}},
    )
    log.info("[rag] pinecone returned %d matches across collection", len(results.matches))

    if not results.matches:
        return (
            "No relevant content was found across the sessions in this collection. "
            "Make sure the recordings have been processed and their transcripts are indexed."
        )

    chunks_by_meeting: dict = {}
    for m in results.matches:
        if not m.metadata:
            continue
        mid = m.metadata.get("meeting_id", "unknown")
        txt = m.metadata.get("text", "")
        if txt:
            chunks_by_meeting.setdefault(mid, []).append(txt)

    context_sections: list = []
    for mid, chunks in chunks_by_meeting.items():
        context_sections.append(f"[Session: {mid}]\n" + "\n".join(chunks))

    context = "\n\n---\n\n".join(context_sections)

    prompt = f"""You are answering a question about the "{collection_name}" knowledge base, which contains multiple recorded sessions.
Synthesize insights across all sessions when relevant. Reference which session content supports each point where helpful.
If the answer is not in the provided context, say so clearly. Be detailed and structured.

Context (from {len(chunks_by_meeting)} session(s)):
{context}

Question: {question}"""

    system = (
        "You synthesize insights across multiple recorded sessions to answer questions accurately. "
        "Always ground your answers in the provided transcript context."
    )

    log.info("[rag] generating collection answer — model=%s across %d sessions",
             GROQ_MODEL, len(chunks_by_meeting))
    answer = _ask_groq(prompt, system)

    elapsed = time.perf_counter() - t0
    log.info("[rag] query_collection done — %.2fs answer_chars=%d", elapsed, len(answer))
    return answer
