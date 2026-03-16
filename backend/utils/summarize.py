import asyncio
import re
from typing import Any, Dict, List, Optional

from config import client

SUMMARY_PROFILES: Dict[str, Dict[str, Any]] = {
    "interview": {
        "label": "Candidate interview",
        "objective": "Capture the candidate's fit, strongest evidence, concerns, and the hiring signal.",
        "sections": [
            "Candidate snapshot",
            "Strengths and evidence",
            "Concerns or gaps",
            "Role fit",
            "Recommended follow-up",
        ],
    },
    "standup": {
        "label": "Standup or status update",
        "objective": "Capture progress, blockers, ownership, and what happens next.",
        "sections": [
            "Progress updates",
            "Current blockers",
            "Cross-team dependencies",
            "Next steps",
        ],
    },
    "sales": {
        "label": "Sales or client conversation",
        "objective": "Capture customer needs, objections, commitments, and commercial next steps.",
        "sections": [
            "Customer context",
            "Needs and priorities",
            "Objections or risks",
            "Commercial signals",
            "Next steps",
        ],
    },
    "incident": {
        "label": "Incident, bug, or escalation review",
        "objective": "Capture impact, likely causes, mitigations, unresolved risks, and follow-up actions.",
        "sections": [
            "Current situation",
            "Impact and scope",
            "Likely causes or contributing factors",
            "Mitigations underway",
            "Open risks and follow-up",
        ],
    },
    "planning": {
        "label": "Planning or strategy discussion",
        "objective": "Capture priorities, tradeoffs, decisions, dependencies, and delivery expectations.",
        "sections": [
            "Strategic priorities",
            "Key decisions",
            "Tradeoffs and dependencies",
            "Delivery plan",
            "Next steps",
        ],
    },
    "general": {
        "label": "General meeting",
        "objective": "Capture what mattered most, what changed, and what happens next.",
        "sections": [
            "Executive overview",
            "Key discussion points",
            "Decisions and agreements",
            "Risks or open questions",
            "Next steps",
        ],
    },
}


def _normalize_text(value: Optional[str]) -> str:
    return re.sub(r"\s+", " ", value or "").strip().lower()


def infer_summary_blueprint(title: Optional[str], transcript: str) -> Dict[str, Any]:
    haystack = f"{_normalize_text(title)} {_normalize_text(transcript[:6000])}".strip()

    profiles = [
        (
            "interview",
            ["interview", "candidate", "recruiter", "hiring", "role fit", "resume", "experience"],
        ),
        (
            "standup",
            ["standup", "daily", "blocker", "today", "yesterday", "sprint", "status update"],
        ),
        (
            "sales",
            ["customer", "client", "prospect", "pricing", "proposal", "demo", "contract", "renewal"],
        ),
        (
            "incident",
            ["incident", "outage", "sev", "bug", "production", "mitigation", "root cause", "error"],
        ),
        (
            "planning",
            ["planning", "roadmap", "strategy", "milestone", "timeline", "launch", "scope", "quarter"],
        ),
    ]

    scores: Dict[str, int] = {key: 0 for key in SUMMARY_PROFILES}
    for profile_key, keywords in profiles:
        for keyword in keywords:
            if keyword in haystack:
                scores[profile_key] += 1

    winner = max(scores, key=scores.get)
    if scores[winner] <= 0:
        winner = "general"

    return {
        "key": winner,
        **SUMMARY_PROFILES[winner],
    }


def _build_summary_prompt(
    transcript: str,
    *,
    title: Optional[str] = None,
    speakers: Optional[List[str]] = None,
) -> str:
    blueprint = infer_summary_blueprint(title, transcript)
    title_context = f"Meeting title: {title}\n" if title else ""
    speaker_context = (
        f"Detected speaker labels in the transcript: {', '.join(speakers)}\n"
        if speakers
        else ""
    )
    section_bank = ", ".join(blueprint["sections"])

    return f"""
You are a senior chief of staff and meeting analyst. Build a smart summary that adapts to the conversation instead of forcing a rigid template.

{title_context}{speaker_context}Inferred meeting context: {blueprint['label']}
Primary objective: {blueprint['objective']}
Useful section candidates for this meeting type: {section_bank}

Output requirements:
- Use plain text only.
- Start with a concise overview paragraph.
- Then choose 3 to 6 section headings that best fit the transcript.
- Prefer the suggested section candidates when they fit, but rename or replace them if a better heading is clearer.
- Omit empty or irrelevant sections.
- If the conversation is short or narrow, keep the summary compact instead of stretching it into unnecessary categories.
- Highlight decisions, risks, objections, follow-ups, and action items only when they actually appear.
- Attribute notable comments to speaker labels only when that adds clarity.
- Do not invent facts, owners, or outcomes.
- Do not say that you are "choosing sections" or mention these instructions.

Transcript:
{transcript}
""".strip()


def _sync_generate_summary(prompt: str) -> str:
    completion = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You summarize meetings with clarity, judgment, and adaptive structure."},
            {"role": "user", "content": prompt},
        ],
    )
    content = completion.choices[0].message.content
    if not content:
        raise RuntimeError("OpenAI returned an empty summary response.")
    return content.strip()


async def generate_summary(
    transcript: str,
    title: Optional[str] = None,
    speakers: Optional[List[str]] = None,
) -> str:
    prompt = _build_summary_prompt(
        transcript,
        title=title,
        speakers=speakers,
    )
    return await asyncio.to_thread(_sync_generate_summary, prompt)
