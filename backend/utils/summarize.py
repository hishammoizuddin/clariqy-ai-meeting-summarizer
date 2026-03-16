import asyncio
from config import client

def _sync_generate_summary(prompt: str) -> str:
    completion = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You summarize meetings with clarity and structure."},
            {"role": "user", "content": prompt}
        ]
    )
    return completion.choices[0].message.content.strip()

async def generate_summary(transcript: str) -> str:
    prompt = f"""
    You are a precise and structured meeting summarizer.
    Summarize the following transcript in full detail:
    - Capture main points, topics, and decisions
    - Mention speakers if possible
    - List key action items
    - Use bullet points where possible

    Transcript:
    {transcript}
    """

    return await asyncio.to_thread(_sync_generate_summary, prompt)
