# ClarIQy - AI Meeting Summarizer

ClarIQy is a full-stack AI meeting summarizer that turns long conversations into structured, searchable insights. It allows users to upload meeting recordings, automatically generates summaries, and enables interactive Q&A based on the transcript.

The application is built with **FastAPI (Python)** for the backend and **React + Vite + Tailwind CSS (TypeScript)** for the frontend. It’s lightweight, responsive, and designed to handle real-world meeting content efficiently.

---

## Demo Video

[![Watch the demo](https://img.youtube.com/vi/KFzgvbd4pQ0/maxresdefault.jpg)](https://www.youtube.com/watch?v=KFzgvbd4pQ0)

---

## Features

- **Frontend:** React (Vite, TypeScript, Tailwind CSS)  
- **Backend:** FastAPI (Python)  
- **Database:** SQLite  
- **AI Layer:** OpenAI (GPT-4) and Whisper for transcription, summarization, and Q&A  
- **Vector Storage / Semantic Search:** Pinecone (for embedding storage and retrieval)  
- **File Storage:** Local uploads directory *(can be extended to cloud such as S3 or GCS)*

---

## Tech Stack

**Frontend:** React (Vite, TypeScript, Tailwind CSS)  
**Backend:** FastAPI (Python)  
**Database:** SQLite, Pinecone (Vector DB)
**AI Layer:** OpenAI / Whisper for transcription and summarization  
**Storage:** Local uploads directory (can be extended to cloud)

---

## Project Structure

```
MEETING_SUMMARIZER/
├── backend/
│   ├── main.py
│   ├── config.py
│   ├── utils/
│   ├── uploads/
│   ├── data.db
│   ├── requirements.txt
│   └── .env
└── frontend/
    ├── src/
    │   ├── components/
    │   ├── lib/
    │   ├── App.tsx
    │   └── main.tsx
    ├── package.json
    └── vite.config.ts
```

---

## Setup

### Backend (FastAPI)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # or .\venv\Scripts\activate on Windows
pip install -r requirements.txt
```

Create a `.env` file inside `backend/`:
```
OPENAI_API_KEY=your_api_key_here
PINECONE_API_KEY=your_api_key_here
PINECONE_INDEX_NAME=your_index_name_here
PINECONE_CLOUD=aws
PINECONE_REGION=us-east-1
DATABASE_URL=sqlite:///data.db
```

Run the server:
```bash
uvicorn main:app --reload
```
The backend runs on `http://localhost:8000`.

---

### Frontend (React + Vite)

```bash
cd frontend
npm install
```

Create a `.env` file:
```
VITE_API_BASE_URL=http://localhost:8000
```

Run the development server:
```bash
npm run dev
```
The frontend runs on `http://localhost:5173`.

---

## API Overview

| Endpoint | Method | Description |
|-----------|---------|-------------|
| `/upload` | POST | Upload an audio/video file for transcription |
| `/ask` | POST | Ask a follow-up question about a meeting |
| `/meetings` | GET | Retrieve the list of processed meetings |
| `/summary/pdf/{id}` | GET | Download summary as PDF |

---

## Roadmap

- Cloud storage (S3 or GCS)
- Authentication and user accounts
- Live meeting integrations (Zoom, Meet)
- Multi-user dashboards and analytics
- Fine-tuned summarization models

---

## Credits

Developed by **Mohammed Hisham Moizuddin**

> ClarIQy helps you focus on the conversation while it takes care of the notes.

---
