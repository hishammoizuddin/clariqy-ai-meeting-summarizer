# ClarIQy — AI Meeting Intelligence

ClarIQy is a production-deployed AI meeting intelligence SaaS. Record a live conversation or upload an existing file — ClarIQy transcribes it, identifies every speaker, and delivers a clean structured summary with action items in moments. Organise sessions into collections and ask questions across your entire knowledge base.

Built with **FastAPI (Python)** on the backend and **React + Vite + TypeScript + Tailwind CSS** on the frontend.

---

## Demo

[![Watch the demo](https://img.youtube.com/vi/kgE4Wk-5GwI/hqdefault.jpg)](https://www.youtube.com/watch?v=kgE4Wk-5GwI)

---

## Features

| Feature | Description |
|---|---|
| 🔴 **Live Capture** | Hit record and speak — real-time turn-by-turn transcript streams live via WebSocket while you talk. |
| 📁 **File Import** | Drop in any audio or video file (MP3, WAV, M4A, MP4, MOV, WebM, MKV, OGG) for instant processing. |
| 🗣️ **Speaker Diarization** | Automatically detects and labels distinct voices. Verify and rename each speaker in one step. |
| 📝 **Adaptive AI Summaries** | Context-aware structured summaries that detect meeting type (standup, interview, sales, planning, incident) and adapt sections accordingly. |
| 💬 **Semantic Q&A** | Ask natural language questions about any meeting — or across an entire collection — powered by vector search and Llama 3.3. |
| 📚 **Knowledge Base & Collections** | Organise meetings into named collections. Chat across all sessions in a collection simultaneously. |
| 📄 **PDF Export** | Download a polished formatted summary PDF with speaker labels included. |
| 🔐 **Secure Accounts** | JWT auth, bcrypt passwords, forgot-password flow with one-time reset tokens, and consent management. |
| 🎨 **Polished UI** | Glassmorphism design, real-time processing overlays, skeleton loaders, tooltips, and an onboarding tour. |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS — deployed on **Vercel** |
| **Backend** | FastAPI (Python 3.9+), async endpoints — deployed on **Render** |
| **Auth** | JWT (`python-jose`), bcrypt, one-time reset tokens |
| **Database** | PostgreSQL (Aiven) via SQLModel + psycopg2 |
| **AI — Transcription** | Groq Whisper large-v3 (≤ 24 MB chunks, 32 kbps, auto-rechunked) |
| **AI — Diarization** | AssemblyAI REST API (`universal-2` model, speaker labels) |
| **AI — Live Transcription** | Gemini Live API (`gemini-2.0-flash-live-001`) via WebSocket proxy |
| **AI — Summarization & Q&A** | Groq `llama-3.3-70b-versatile` |
| **AI — Embeddings** | Gemini `embedding-001` (3072-dim, used for semantic search) |
| **Vector DB** | Pinecone serverless (cosine similarity) |
| **Email** | Resend HTTP API (transactional — password reset) |
| **Key Redundancy** | Dual Gemini API key fallback with automatic retry for embedding and live stream calls |

---

## Project Structure

```
meeting_summarizer/
├── backend/
│   ├── main.py                  # All API routes, WebSocket handler, business logic
│   ├── config.py                # Gemini + Groq + Pinecone client setup, key fallback
│   ├── utils/
│   │   ├── auth.py              # JWT creation, verification, password hashing
│   │   ├── db.py                # SQLModel database models and session helpers
│   │   ├── transcribe.py        # Groq Whisper transcription + AssemblyAI diarization
│   │   ├── summarize.py         # Groq Llama summarization with meeting-type inference
│   │   ├── embeddings.py        # Gemini embeddings → Pinecone upsert
│   │   ├── rag.py               # Semantic Q&A (embed question → Pinecone → Groq answer)
│   │   ├── email.py             # Resend transactional email (password reset)
│   │   ├── logger.py            # Centralised structured logging
│   │   ├── media.py             # ffmpeg audio extraction, compression, chunking
│   │   ├── pdf_generator.py     # ReportLab PDF summary export
│   │   └── storage.py           # Meeting metadata persistence (JSON sidecar)
│   ├── requirements.txt
│   └── .env
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── Landing.tsx
    │   │   ├── Dashboard.tsx
    │   │   ├── Login.tsx
    │   │   ├── Signup.tsx
    │   │   ├── Profile.tsx
    │   │   ├── ForgotPassword.tsx
    │   │   └── ResetPassword.tsx
    │   ├── components/
    │   │   ├── LiveRecordingCard.tsx      # Live capture, WebSocket, audio meter
    │   │   ├── UploadCard.tsx             # File upload with processing overlay
    │   │   ├── SpeakerAssignmentCard.tsx  # Speaker verification and renaming
    │   │   ├── RecordingReviewCard.tsx    # Audio/video playback with speaker jump
    │   │   ├── SummaryCard.tsx            # Structured summary with section parser
    │   │   ├── TranscriptPanel.tsx        # Accordion transcript viewer
    │   │   ├── QAPanel.tsx                # AI Q&A chat panel
    │   │   ├── KnowledgePanel.tsx         # Sidebar: meetings + collections
    │   │   ├── CollectionView.tsx         # Collection detail with cross-session Q&A
    │   │   ├── ProcessingOverlay.tsx      # Animated multi-step processing indicator
    │   │   ├── Tooltip.tsx                # Hover tooltips (all interactive controls)
    │   │   ├── AuthLoadingOverlay.tsx     # Login/signup loading animation
    │   │   ├── OnboardingTour.tsx         # First-run guided tour
    │   │   ├── ConsentGate.tsx            # Terms & privacy consent on first login
    │   │   ├── TopBar.tsx
    │   │   ├── Footer.tsx
    │   │   └── Spinner.tsx
    │   ├── context/
    │   │   ├── AuthContext.tsx
    │   │   └── ToastContext.tsx
    │   ├── lib/api.ts
    │   └── types.ts
    ├── package.json
    └── vite.config.ts
```

---

## Setup

### Prerequisites

- Python 3.9+
- Node.js 18+
- `ffmpeg` installed and on `$PATH` (required for audio extraction)

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate       # Windows: .\\venv\\Scripts\\activate
pip install -r requirements.txt
```

Create `backend/.env`:

```env
# Core
DATABASE_URL=postgresql+psycopg2://user:password@host:port/dbname
SECRET_KEY=your_jwt_secret_key
ALLOWED_ORIGINS=http://localhost:5173   # comma-separated in production

# AI — Gemini (embeddings + live streaming)
GEMINI_API_KEY=your_gemini_api_key
GEMINI_API_KEY_WEST=your_gemini_fallback_key   # optional second key for redundancy

# AI — Groq (transcription + summarization + Q&A)
GROQ_API_KEY=your_groq_api_key

# AI — AssemblyAI (speaker diarization)
ASSEMBLYAI_API_KEY=your_assemblyai_api_key

# Vector DB
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=clariq-meeting-summarizer
PINECONE_CLOUD=aws
PINECONE_REGION=us-east-1

# Email (password reset)
RESEND_API_KEY=your_resend_api_key
RESEND_FROM=Your Name <you@yourdomain.com>
FRONTEND_URL=http://localhost:5173
```

Start the server:

```bash
uvicorn main:app --reload
# Runs on http://localhost:8000
```

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

### Auth

| Endpoint | Method | Description |
|---|---|---|
| `/auth/signup` | POST | Register a new user |
| `/auth/login` | POST | Log in and receive a JWT |
| `/auth/me` | GET | Get the authenticated user's profile |
| `/auth/forgot-password` | POST | Send a one-time password reset email |
| `/auth/reset-password` | POST | Reset password using a valid token |

### Meetings

| Endpoint | Method | Description |
|---|---|---|
| `/upload` | POST | Upload an audio/video file — transcribe, diarise, summarise |
| `/live/session` | POST | Create a live session (returns WebSocket URL) |
| `/live/stream` | WS | WebSocket proxy: mic audio → Gemini Live → real-time transcript |
| `/live/finalize` | POST | Finalise a live recording → diarized summary |
| `/meetings` | GET | List all meetings for the authenticated user |
| `/meetings/{id}` | GET | Full detail for a specific meeting |
| `/meetings/{id}` | DELETE | Delete a meeting and its associated data |
| `/meetings/{id}/rename` | PATCH | Rename a meeting |
| `/meetings/{id}/speakers` | POST | Save speaker name assignments |
| `/ask` | POST | Ask a semantic question about a specific meeting |

### Collections

| Endpoint | Method | Description |
|---|---|---|
| `/collections` | GET | List all collections for the user |
| `/collections` | POST | Create a new collection |
| `/collections/{id}` | PATCH | Update a collection's name, emoji, or description |
| `/collections/{id}` | DELETE | Delete a collection (meetings are kept) |
| `/collections/{id}/meetings` | GET | List meetings in a collection |
| `/meetings/{id}/collection` | POST | Assign or remove a meeting from a collection |
| `/ask/collection` | POST | Semantic Q&A across all meetings in a collection |

### User Profile

| Endpoint | Method | Description |
|---|---|---|
| `/users/{id}/profile` | PATCH | Update name, phone, country |
| `/users/{id}/avatar` | POST | Upload a profile avatar image |
| `/users/{id}/avatar` | GET | Retrieve avatar |
| `/users/{id}/consent` | POST | Record terms/privacy acceptance |

### Export

| Endpoint | Method | Description |
|---|---|---|
| `/summary/pdf/{id}` | GET | Download the meeting summary as a formatted PDF |

---

## How the AI Pipeline Works

```
Audio/Video file
      │
      ▼
  ffmpeg (extract + compress to 32 kbps MP3)
      │
      ├──► Groq Whisper large-v3          → plain transcript
      │
      └──► AssemblyAI universal-2         → speaker-diarized segments
                                               (ms timestamps → seconds)
                                               (fallback: Groq Whisper)
      │
      ▼
  Groq llama-3.3-70b-versatile            → adaptive structured summary
      │
      ▼
  Gemini embedding-001 (3072-dim)         → vector embeddings
      │
      ▼
  Pinecone (cosine, serverless)           → stored per meeting_id chunk

  Q&A: question → embed → Pinecone top-k → Groq Llama answer
```

For **live recording**: browser mic → PCM 16 kHz → WebSocket → Gemini Live API → real-time transcript turns. On stop, the full recording is sent through the same diarization + summarization pipeline above.

---

## Deployment

| Service | Platform | Notes |
|---|---|---|
| Backend | Render (web service) | Set all env vars in Render dashboard |
| Frontend | Vercel | Set `VITE_API_BASE_URL` to the Render service URL |
| Database | Aiven (PostgreSQL) | Free tier available |
| Vector DB | Pinecone | Free serverless tier (1 index) |

---

## Roadmap

- [ ] Zoom, Google Meet, and Teams direct integrations
- [ ] Cloud storage (S3 / R2) for uploaded files
- [ ] Multi-user team workspaces and shared collections
- [ ] Analytics dashboard — talk time, sentiment trends, speaker balance
- [ ] Webhook support for post-meeting automation

---

## Credits

Developed by **Mohammed Hisham Moizuddin**

> ClarIQy helps you focus on the conversation while it takes care of the notes.
