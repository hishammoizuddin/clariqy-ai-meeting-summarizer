from textwrap import wrap
from config import client, index

def embed_and_store(text: str, meeting_id: str):
    if index is None:
        return False

    chunks = wrap(text, 3000)
    for i, chunk in enumerate(chunks):
        emb = client.embeddings.create(
            model="text-embedding-3-small",
            input=chunk
        )
        vector = emb.data[0].embedding
        index.upsert(vectors=[{
            "id": f"{meeting_id}-{i}",
            "values": vector,
            "metadata": {"text": chunk, "chunk": i, "meeting_id": meeting_id}
        }])
    return True
