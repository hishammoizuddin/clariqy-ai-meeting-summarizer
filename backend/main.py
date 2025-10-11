from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import os, uuid, shutil
from sqlmodel import select, Session
from utils.db import init_db, save_meeting, get_meeting
from utils.transcribe import transcribe_audio
from utils.summarize import generate_summary
from utils.embeddings import embed_and_store
from utils.rag import query_meeting
from utils.pdf_generator import generate_summary_pdf

app = FastAPI(title="ClarIQ - AI Meeting Summarizer")

# CORS (restrict in prod)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # e.g., ["http://localhost:3000"] for a React app
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def _startup():
    init_db()
    os.makedirs("uploads", exist_ok=True)
    os.makedirs("uploads/audio", exist_ok=True)
    os.makedirs("uploads/chunks", exist_ok=True)
    os.makedirs("uploads/pdfs", exist_ok=True)
    os.makedirs("uploads/data", exist_ok=True)

UPLOAD_FOLDER = "uploads"

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    allowed = {".mp3", ".wav", ".m4a", ".mp4", ".mov", ".webm", ".mkv"}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

    meeting_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_FOLDER, f"{meeting_id}_{file.filename}")

    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())

    # Transcribe (handles large files via ffmpeg chunking in utils/transcribe.py)
    try:
        transcript = await transcribe_audio(file_path)
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=f"Media processing failed: {e}")

    # Summarize
    summary = await generate_summary(transcript)

    # Store embeddings in Pinecone for RAG
    embed_and_store(transcript, meeting_id)

    # Persist meeting data in SQLite
    save_meeting(
        meeting_id=meeting_id,
        summary=summary,
        transcript=transcript,
        source_filename=file.filename
    )

    # Clear temp chunk files
    try:
        shutil.rmtree("uploads/chunks")
        os.makedirs("uploads/chunks", exist_ok=True)
    except Exception:
        pass

    return {"meeting_id": meeting_id, "summary": summary, "transcript": transcript}

@app.post("/ask")
async def ask_question(meeting_id: str = Form(...), question: str = Form(...)):
    answer = query_meeting(meeting_id, question)
    return {"answer": answer}

@app.post("/download-summary")
async def download_summary(meeting_id: str = Form(...)):
    m = get_meeting(meeting_id)
    if not m:
        raise HTTPException(status_code=404, detail="Meeting not found or not processed yet.")
    if not (m.summary or m.transcript):
        raise HTTPException(status_code=422, detail="No summary/transcript stored for this meeting.")

    pdf_path = generate_summary_pdf(m.meeting_id, m.summary or "", m.transcript or "")
    return FileResponse(pdf_path, media_type="application/pdf", filename=f"{m.meeting_id}_summary.pdf")

@app.get("/meetings/{meeting_id}/summary.pdf")
async def download_summary_get(meeting_id: str):
    m = get_meeting(meeting_id)
    if not m:
        raise HTTPException(status_code=404, detail="Meeting not found or not processed yet.")
    pdf_path = generate_summary_pdf(m.meeting_id, m.summary or "", m.transcript or "")
    return FileResponse(pdf_path, media_type="application/pdf", filename=f"{m.meeting_id}_summary.pdf")

@app.get("/")
def home():
    return {"message": "AI Meeting Summarizer Backend is running!"}

# list meetings for UI
@app.get("/meetings")
def list_meetings(limit: int = 20, offset: int = 0):
    from utils.db import engine, Meeting
    with Session(engine) as s:
        q = s.exec(select(Meeting).order_by(Meeting.created_at.desc()).offset(offset).limit(limit))
        rows = q.all()
    return [{"meeting_id": m.meeting_id, "source_filename": m.source_filename, "created_at": m.created_at} for m in rows]