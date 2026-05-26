import os
import time
from dotenv import load_dotenv
from google import genai
from pinecone import Pinecone, ServerlessSpec

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")

PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "clariq-meeting-summarizer")
PINECONE_CLOUD = os.getenv("PINECONE_CLOUD", "aws")
PINECONE_REGION = os.getenv("PINECONE_REGION", "us-east-1")

# Gemini text-embedding-004 outputs 768-dimensional vectors
EMBEDDING_DIMENSION = 3072

# Gemini client (used across all AI tasks)
genai_client = genai.Client(api_key=GEMINI_API_KEY)

# Pinecone client + index
pc = None
index = None

if PINECONE_API_KEY:
    pc = Pinecone(api_key=PINECONE_API_KEY)
    existing_names = pc.list_indexes().names()

    # Migration guard: OpenAI embeddings were 1536-dim, Gemini are 768-dim.
    # If the existing index has a wrong dimension, delete and recreate it.
    if PINECONE_INDEX_NAME in existing_names:
        try:
            idx_info = pc.describe_index(PINECONE_INDEX_NAME)
            current_dim = getattr(idx_info, "dimension", None)
            if current_dim is not None and current_dim != EMBEDDING_DIMENSION:
                print(
                    f"[Pinecone] Index '{PINECONE_INDEX_NAME}' has dimension {current_dim} "
                    f"but Gemini embeddings require {EMBEDDING_DIMENSION}. "
                    f"Deleting old index and recreating for Gemini migration..."
                )
                pc.delete_index(PINECONE_INDEX_NAME)
                # Wait up to 30 s for deletion to propagate
                for _ in range(15):
                    time.sleep(2)
                    if PINECONE_INDEX_NAME not in pc.list_indexes().names():
                        break
                existing_names = pc.list_indexes().names()
        except Exception as e:
            print(f"[Pinecone] Could not inspect existing index: {e}")

    if PINECONE_INDEX_NAME not in existing_names:
        pc.create_index(
            name=PINECONE_INDEX_NAME,
            dimension=EMBEDDING_DIMENSION,
            metric="cosine",
            spec=ServerlessSpec(cloud=PINECONE_CLOUD, region=PINECONE_REGION),
        )

    index = pc.Index(PINECONE_INDEX_NAME)
