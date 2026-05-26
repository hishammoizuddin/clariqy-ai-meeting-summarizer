from google.genai import types as genai_types

from config import genai_client, index

GEMINI_MODEL = "gemini-2.5-flash"
GEMINI_EMBEDDING_MODEL = "gemini-embedding-001"


def _embed_question(question: str) -> list[float]:
    """Embed the user's question for semantic search."""
    result = genai_client.models.embed_content(
        model=GEMINI_EMBEDDING_MODEL,
        contents=[question],
    )
    return result.embeddings[0].values


def query_meeting(meeting_id: str, question: str) -> str:
    if index is None:
        return "Semantic Q&A is unavailable because vector search is not configured for this workspace."

    # Embed the question
    question_vector = _embed_question(question)

    # Retrieve top-k relevant transcript chunks
    results = index.query(
        vector=question_vector,
        top_k=5,
        include_metadata=True,
        filter={"meeting_id": meeting_id},
    )

    context = "\n\n".join(
        m.metadata.get("text", "") for m in results.matches if m.metadata
    )

    prompt = f"""Answer the following question based solely on the meeting transcript context below.
If the answer is not in the context, say you don't know. Be detailed and structured.

Context:
{context}

Question: {question}"""

    response = genai_client.models.generate_content(
        model=GEMINI_MODEL,
        contents=[prompt],
        config=genai_types.GenerateContentConfig(
            system_instruction="You answer questions accurately based on meeting transcript content.",
            temperature=0.2,
        ),
    )

    return (response.text or "").strip()


def query_collection(meeting_ids: list[str], question: str, collection_name: str = "this collection") -> str:
    """Answer a question by searching across ALL meetings in a collection."""
    if index is None:
        return "Semantic Q&A is unavailable because vector search is not configured for this workspace."

    if not meeting_ids:
        return (
            "This collection has no recordings yet. "
            "Add some sessions to start asking questions across them."
        )

    question_vector = _embed_question(question)

    # Pinecone $in filter — retrieve chunks from any meeting in the collection
    results = index.query(
        vector=question_vector,
        top_k=10,
        include_metadata=True,
        filter={"meeting_id": {"$in": meeting_ids}},
    )

    if not results.matches:
        return (
            "No relevant content was found across the sessions in this collection. "
            "Make sure the recordings have been processed and their transcripts are indexed."
        )

    # Group chunks by meeting so the model can reference which session each insight came from
    chunks_by_meeting: dict[str, list[str]] = {}
    for m in results.matches:
        if not m.metadata:
            continue
        mid = m.metadata.get("meeting_id", "unknown")
        txt = m.metadata.get("text", "")
        if txt:
            chunks_by_meeting.setdefault(mid, []).append(txt)

    context_sections: list[str] = []
    for mid, chunks in chunks_by_meeting.items():
        context_sections.append(f"[Session: {mid}]\n" + "\n".join(chunks))

    context = "\n\n---\n\n".join(context_sections)

    prompt = f"""You are answering a question about the "{collection_name}" knowledge base, which contains multiple recorded sessions.
Synthesize insights across all sessions when relevant. Reference which session content supports each point where helpful.
If the answer is not in the provided context, say so clearly. Be detailed and structured.

Context (from {len(chunks_by_meeting)} session(s)):
{context}

Question: {question}"""

    response = genai_client.models.generate_content(
        model=GEMINI_MODEL,
        contents=[prompt],
        config=genai_types.GenerateContentConfig(
            system_instruction=(
                "You synthesize insights across multiple recorded sessions to answer questions accurately. "
                "Always ground your answers in the provided transcript context."
            ),
            temperature=0.2,
        ),
    )

    return (response.text or "").strip()
