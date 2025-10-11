from config import client, index

def query_meeting(meeting_id: str, question: str) -> str:
    emb = client.embeddings.create(
        model="text-embedding-3-small",
        input=question
    ).data[0].embedding

    results = index.query(
        vector=emb,
        top_k=5,
        include_metadata=True,
        filter={"meeting_id": meeting_id}
    )

    context = "\n\n".join([m.metadata.get("text", "") for m in results.matches])

    prompt = f"""
    Answer the following question based on the meeting transcript context.
    If unsure, say you don't know. Be detailed and structured.

    Context:
    {context}

    Question: {question}
    """

    completion = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You answer questions based on meeting content."},
            {"role": "user", "content": prompt}
        ]
    )
    return completion.choices[0].message.content.strip()
