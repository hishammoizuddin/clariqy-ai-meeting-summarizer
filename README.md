# ClarIQy — Never Miss What Matters in a Meeting

ClarIQy is your AI-powered meeting intelligence companion. Whether you're recording a live conversation or uploading a recording after the fact, ClarIQy automatically listens, identifies who's speaking, and delivers a clean, structured summary with action items — all in moments. No more messy notes. No more missed decisions. Just clarity.

Built with **FastAPI (Python)** on the backend and **React + Vite + TypeScript + Tailwind CSS** on the frontend.

---

## Demo Video

[![Watch the demo](https://img.youtube.com/vi/KFzgvbd4pQ0/maxresdefault.jpg)](https://www.youtube.com/watch?v=KFzgvbd4pQ0)

---

## What ClarIQy Does

| Feature | Description |
|---|---|
| 🔴 **Live Recording** | Hit record and talk — ClarIQy streams a live transcript in real-time as the conversation unfolds. |
| 📁 **Upload Any Recording** | Drop in an audio or video file (MP3, WAV, M4A, MP4, MOV, WebM, MKV, OGG) and get results in seconds. |
| 🗣️ **Knows Who Said What** | Automatically detects distinct voices and labels each speaker. Rename them to real names in one click. |
| 📝 **Smart AI Summaries** | Get a clean, structured summary with key decisions, highlights, and next steps — ready to share. |
| 💬 **Ask Any Question** | Chat with your meeting. Ask "What did we agree on pricing?" and get an instant answer from the transcript. |
| 📄 **Download as PDF** | Export a polished, formatted summary PDF with speaker labels included. |
| 🔐 **Your Meetings Stay Yours** | Secure accounts — every meeting is private, searchable, and accessible only to you. |

---

## Who It's For

ClarIQy is built for **anyone** who sits through meetings and needs clarity:

- **Individuals & Freelancers** — Keep track of client calls, interviews, and brainstorming sessions without lifting a pen.
- **Teams & Startups** — Keep everyone aligned with instant post-meeting summaries and assigned action items.
- **Enterprises** — Eliminate accountability gaps, capture strategic decisions, and maintain a searchable institutional memory.
- **Consultants & Agencies** — Reference client discussions months later with precision.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS |
| **Backend** | FastAPI (Python 3.11+) |
| **Auth** | JWT (via `python-jose`) |
| **Database** | PostgreSQL (Aiven) via SQLModel |
| **AI — Transcription** | OpenAI Whisper |
| **AI — Live Transcription** | OpenAI Realtime API (WebRTC) |
| **AI — Summarization & Q&A** | OpenAI GPT-4o |
| **Semantic Search** | Pinecone (vector embeddings for Q&A) |

---

## Project Structure

```
meeting_summarizer/
├── backend/
│   ├── main.py              # All API routes and core logic
│   ├── config.py            # Environment & Pinecone setup
│   ├── utils/
│   │   ├── auth.py          # JWT auth helpers
│   │   ├── db.py            # Database models & session helpers
│   │   ├── transcribe.py    # Whisper + Realtime transcription
│   │   ├── summarize.py     # GPT-4o summarization
│   │   ├── embeddings.py    # Pinecone embedding storage
│   │   ├── rag.py           # Semantic Q&A retrieval
│   │   ├── pdf_generator.py # Summary PDF export
│   │   └── storage.py       # Meeting metadata persistence
│   ├── uploads/             # Uploaded & recorded audio files
│   ├── requirements.txt
│   └── .env
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── Landing.tsx
    │   │   ├── Dashboard.tsx
    │   │   ├── Login.tsx
    │   │   └── Signup.tsx
    │   ├── components/
    │   │   ├── LiveRecordingCard.tsx   # Live capture + real-time transcript
    │   │   ├── UploadCard.tsx          # File upload flow
    │   │   ├── SpeakerAssignmentCard.tsx # Rename detected speakers
    │   │   ├── RecordingReviewCard.tsx # Audio/video playback
    │   │   ├── SummaryCard.tsx         # Structured summary display
    │   │   ├── TranscriptPanel.tsx     # Full transcript viewer
    │   │   ├── QAPanel.tsx             # AI Q&A chat
    │   │   ├── MeetingsList.tsx        # Past meetings with delete
    │   │   ├── TopBar.tsx
    │   │   └── Footer.tsx
    │   ├── context/AuthContext.tsx
    │   ├── lib/api.ts
    │   └── types.ts
    ├── package.json
    └── vite.config.ts
```

---

## Setup

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate       # Windows: .\\venv\\Scripts\\activate
pip install -r requirements.txt
```

Create `backend/.env`:

```env
OPENAI_API_KEY=your_openai_key
PINECONE_API_KEY=your_pinecone_key
PINECONE_INDEX_NAME=your_index_name
PINECONE_CLOUD=aws
PINECONE_REGION=us-east-1
DATABASE_URL=postgresql+psycopg2://user:password@host:port/dbname
SECRET_KEY=your_jwt_secret
```

Start the server:

```bash
uvicorn main:app --reload
# Runs on http://localhost:8000
```

---

### Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:8000
```

Start the dev server:

```bash
npm run dev
# Runs on http://localhost:5173
```

---

## API Overview

| Endpoint | Method | Description |
|---|---|---|
| `/auth/signup` | POST | Register a new user |
| `/auth/login` | POST | Log in and receive a JWT |
| `/auth/me` | GET | Get the current user's profile |
| `/upload` | POST | Upload an audio/video file for processing |
| `/live/session` | POST | Start a live transcription session (returns WebRTC secret) |
| `/live/finalize` | POST | Finalize a live recording → diarized summary |
| `/meetings` | GET | List all meetings for the authenticated user |
| `/meetings/{id}` | GET | Get full detail for a specific meeting |
| `/meetings/{id}` | DELETE | Delete a meeting and its files |
| `/meetings/{id}/rename` | PATCH | Rename a meeting |
| `/meetings/{id}/speakers` | POST | Save speaker name assignments |
| `/ask` | POST | Ask a question about a specific meeting |
| `/summary/pdf/{id}` | GET | Download the meeting summary as a PDF |

---

## Roadmap

- [ ] Cloud storage (S3 / GCS) for uploaded files
- [ ] Multi-user team workspaces
- [ ] Zoom, Google Meet, and Teams integrations
- [ ] Analytics dashboard (talk time, sentiment trends)
- [ ] Fine-tuned summarization profiles per meeting type

---

## Credits

Developed by **Mohammed Hisham Moizuddin**

> ClarIQy helps you focus on the conversation while it takes care of the notes.
