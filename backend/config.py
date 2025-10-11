import os
from dotenv import load_dotenv

# OpenAI v1 client
from openai import OpenAI

# Pinecone v4
from pinecone import Pinecone, ServerlessSpec

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")

PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "clariq-meeting-summarizer")
PINECONE_CLOUD = os.getenv("PINECONE_CLOUD", "aws")          # match your index
PINECONE_REGION = os.getenv("PINECONE_REGION", "us-east-1")  # match your index

# OpenAI client (reads API key from env or arg)
client = OpenAI(api_key=OPENAI_API_KEY)

# Pinecone client + index
pc = Pinecone(api_key=PINECONE_API_KEY)
existing_names = pc.list_indexes().names()
if PINECONE_INDEX_NAME not in existing_names:
    pc.create_index(
        name=PINECONE_INDEX_NAME,
        dimension=1536,
        metric="cosine",
        spec=ServerlessSpec(cloud=PINECONE_CLOUD, region=PINECONE_REGION),
    )
index = pc.Index(PINECONE_INDEX_NAME)
