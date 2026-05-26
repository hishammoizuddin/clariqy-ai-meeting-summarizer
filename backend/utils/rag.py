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
