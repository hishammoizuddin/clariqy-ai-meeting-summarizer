from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordRequestForm
import os, uuid, shutil, json, glob
from sqlmodel import select, Session
from utils.db import init_db, save_meeting, get_meeting, engine, User, Meeting
from utils.transcribe import transcribe_audio
from utils.summarize import generate_summary
from utils.embeddings import embed_and_store
from utils.rag import query_meeting
from utils.pdf_generator import generate_summary_pdf
from utils.auth import get_password_hash, verify_password, create_access_token, get_current_user

app = FastAPI(title="ClarIQy - AI Meeting Summarizer")

# CORS (restrict in prod)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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

# Ensure directories exist
UPLOAD_FOLDER = "uploads"

@app.post("/auth/signup")
def signup(email: str = Form(...), name: str = Form(...), password: str = Form(...)):
    with Session(engine) as session:
        existing = session.exec(select(User).where(User.email == email)).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        hashed_pw = get_password_hash(password)
        new_user = User(email=email, name=name, password_hash=hashed_pw)
        session.add(new_user)
        session.commit()
        session.refresh(new_user)
        token = create_access_token({"sub": new_user.email, "role": new_user.role})
        return {"access_token": token, "token_type": "bearer", "user": {"id": new_user.id, "email": new_user.email, "name": new_user.name, "role": new_user.role}}

@app.post("/auth/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == form_data.username)).first()
        if not user or not verify_password(form_data.password, user.password_hash):
            raise HTTPException(status_code=400, detail="Incorrect email or password")
        token = create_access_token({"sub": user.email, "role": user.role})
        return {"access_token": token, "token_type": "bearer", "user": {"id": user.id, "email": user.email, "name": user.name, "role": user.role}}

@app.get("/auth/me")
def get_me(user: User = Depends(get_current_user)):
    return {"id": user.id, "email": user.email, "name": user.name, "role": user.role}

@app.post("/upload")
async def upload_file(file: UploadFile = File(...), user: User = Depends(get_current_user)):
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
        import asyncio
        transcript = await transcribe_audio(file_path)
        
        # Summarize
        summary = await generate_summary(transcript)
    
        # Store embeddings in Pinecone for RAG
        # embeddings contains blocking calls, run in thread
        await asyncio.to_thread(embed_and_store, transcript, meeting_id)
        
    except Exception as e:
        # Prevent indefinite hang or silent unhandled error from failing upload indefinitely
        raise HTTPException(status_code=400, detail=f"Media processing failed: {str(e)}")

    # Persist meeting data in SQLite/Postgres
    save_meeting(
        meeting_id=meeting_id,
        summary=summary,
        transcript=transcript,
        source_filename=file.filename,
        user_id=user.id
    )

    # Clear temp chunk files
    try:
        shutil.rmtree("uploads/chunks")
        os.makedirs("uploads/chunks", exist_ok=True)
    except Exception:
        pass

    return {"meeting_id": meeting_id, "summary": summary, "transcript": transcript}

@app.post("/ask")
async def ask_question(meeting_id: str = Form(...), question: str = Form(...), user: User = Depends(get_current_user)):
    # Verify ownership
    m = get_meeting(meeting_id)
    if not m or m.user_id != user.id:
        raise HTTPException(status_code=404, detail="Meeting not found or unauthorized.")
    
    answer = query_meeting(meeting_id, question)
    return {"answer": answer}

@app.post("/download-summary")
async def download_summary(meeting_id: str = Form(...), user: User = Depends(get_current_user)):
    m = get_meeting(meeting_id)
    if not m or m.user_id != user.id:
        raise HTTPException(status_code=404, detail="Meeting not found or unauthorized.")
    if not (m.summary or m.transcript):
        raise HTTPException(status_code=422, detail="No summary/transcript stored for this meeting.")

    pdf_path = generate_summary_pdf(m.meeting_id, m.summary or "", m.transcript or "")
    return FileResponse(pdf_path, media_type="application/pdf", filename=f"{m.meeting_id}_summary.pdf")

@app.get("/meetings/{meeting_id}/summary.pdf")
async def download_summary_get(meeting_id: str, token: str):
    # Pass token in query since browsers don't send auth headers automatically on simple links
    try:
        from utils.auth import SECRET_KEY, ALGORITHM, jwt
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401)
        with Session(engine) as s:
            t_user = s.exec(select(User).where(User.email == email)).first()
            if not t_user:
                raise HTTPException(status_code=401)
            
            m = get_meeting(meeting_id)
            if not m or m.user_id != t_user.id:
                raise HTTPException(status_code=404, detail="Meeting not found or unauthorized.")
            
            pdf_path = generate_summary_pdf(m.meeting_id, m.summary or "", m.transcript or "")
            return FileResponse(pdf_path, media_type="application/pdf", filename=f"{m.meeting_id}_summary.pdf")
    except Exception:
        raise HTTPException(status_code=401, detail="Unauthorized")

@app.get("/")
def home():
    return {"message": "AI Meeting Summarizer Backend is running!"}

# list meetings for UI
@app.get("/meetings")
def list_meetings(limit: int = 20, offset: int = 0, user: User = Depends(get_current_user)):
    with Session(engine) as s:
        q = s.exec(select(Meeting).where(Meeting.user_id == user.id).order_by(Meeting.created_at.desc()).offset(offset).limit(limit))
        rows = q.all()
    return [{"meeting_id": m.meeting_id, "source_filename": m.source_filename, "created_at": m.created_at} for m in rows]

@app.get("/meetings/{meeting_id}")
def get_meeting_record(meeting_id: str, user: User = Depends(get_current_user)):
    m = get_meeting(meeting_id)
    if not m or m.user_id != user.id:
        raise HTTPException(status_code=404, detail="Meeting not found or unauthorized.")
    return m

from pydantic import BaseModel

class RenameRequest(BaseModel):
    new_name: str

@app.patch("/meetings/{meeting_id}")
def rename_meeting_record(meeting_id: str, req: RenameRequest, user: User = Depends(get_current_user)):
    with Session(engine) as s:
        m = s.get(Meeting, meeting_id)
        if not m or m.user_id != user.id:
            raise HTTPException(status_code=404, detail="Meeting not found or unauthorized.")
        
        m.source_filename = req.new_name
        s.add(m)
        s.commit()
        s.refresh(m)
        
    return {"message": "Renamed successfully", "source_filename": req.new_name}

@app.delete("/meetings/{meeting_id}")
def delete_meeting_record(meeting_id: str, user: User = Depends(get_current_user)):
    with Session(engine) as s:
        m = s.get(Meeting, meeting_id)
        if not m or m.user_id != user.id:
            raise HTTPException(status_code=404, detail="Meeting not found or unauthorized.")
        
        # 1. Delete from SQL DB
        s.delete(m)
        s.commit()
        
    # 2. Delete vectors from Pinecone
    try:
        from config import index
        index.delete(filter={"meeting_id": meeting_id})
    except Exception as e:
        print(f"Failed to delete Pinecone index for {meeting_id}: {e}")
        
    # 3. Delete local disk files (media, generated pdfs, json data)
    try:
        data_json = os.path.join(UPLOAD_FOLDER, "data", f"{meeting_id}.json")
        if os.path.exists(data_json):
            os.remove(data_json)
        
        # Find any media file or transcript starting with `{meeting_id}_`
        for f in glob.glob(os.path.join(UPLOAD_FOLDER, f"{meeting_id}_*")):
            os.remove(f)
    except Exception as e:
        print(f"Failed to delete local files for {meeting_id}: {e}")

    return {"message": "Deleted successfully"}