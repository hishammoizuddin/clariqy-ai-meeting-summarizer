"""
reset_data.py — wipe all user data for a fresh start.

Clears:
  • PostgreSQL: truncates User, Collection, Meeting tables (schema kept intact)
  • Pinecone:   deletes ALL vectors from the index

Run from the backend directory with your .env present:
    cd backend
    python reset_data.py
"""

import os
import sys
from dotenv import load_dotenv

load_dotenv()

# ── Confirm before nuking anything ───────────────────────────────────────────
print("⚠️  This will permanently delete ALL data from PostgreSQL and Pinecone.")
answer = input("Type YES to confirm: ").strip()
if answer != "YES":
    print("Aborted.")
    sys.exit(0)

errors = []

# ── 1. PostgreSQL ─────────────────────────────────────────────────────────────
print("\n[1/2] Clearing PostgreSQL tables...")
try:
    from sqlmodel import Session, text
    from utils.db import engine

    with Session(engine) as session:
        # Delete in FK-safe order: meetings → collections → users
        session.exec(text('DELETE FROM "meeting"'))
        session.exec(text('DELETE FROM "collection"'))
        session.exec(text('DELETE FROM "user"'))
        session.commit()

    print("     ✅ All rows deleted from meeting, collection, user tables.")
except Exception as e:
    print(f"     ❌ PostgreSQL error: {e}")
    errors.append(str(e))

# ── 2. Pinecone ───────────────────────────────────────────────────────────────
print("\n[2/2] Clearing Pinecone index...")
try:
    from config import pc, index, PINECONE_INDEX_NAME

    if pc is None or index is None:
        print("     ⚠️  Pinecone not configured (PINECONE_API_KEY missing) — skipped.")
    else:
        index.delete(delete_all=True)
        print(f"     ✅ All vectors deleted from index '{PINECONE_INDEX_NAME}'.")
except Exception as e:
    print(f"     ❌ Pinecone error: {e}")
    errors.append(str(e))

# ── Done ──────────────────────────────────────────────────────────────────────
print()
if errors:
    print(f"⚠️  Completed with {len(errors)} error(s):")
    for err in errors:
        print(f"   - {err}")
    sys.exit(1)
else:
    print("🎉 Fresh start! All data cleared successfully.")
