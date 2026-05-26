"""
On-the-fly PDF generation — returns raw bytes, nothing written to disk.
"""

import io
from datetime import datetime

from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.units import inch


def generate_summary_pdf(meeting_id: str, summary: str, transcript: str = None) -> bytes:
    """Generate a well-formatted PDF for the meeting summary and return it as bytes."""
    buffer = io.BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=LETTER,
        rightMargin=72,
        leftMargin=72,
        topMargin=72,
        bottomMargin=72,
    )

    styles = getSampleStyleSheet()
    story = []

    title_style = ParagraphStyle(
        "TitleStyle",
        parent=styles["Title"],
        fontSize=22,
        spaceAfter=12,
        alignment=1,
    )
    story.append(Paragraph("Meeting Summary Report", title_style))
    story.append(Spacer(1, 12))

    meta_style = styles["Normal"]
    meta_text = (
        f"Meeting ID: <b>{meeting_id}</b><br/>"
        f"Generated on: <b>{datetime.now().strftime('%B %d, %Y - %I:%M %p')}</b>"
    )
    story.append(Paragraph(meta_text, meta_style))
    story.append(Spacer(1, 20))

    header_style = ParagraphStyle(
        "HeaderStyle",
        parent=styles["Heading2"],
        fontSize=16,
        textColor="#003366",
        spaceAfter=10,
    )
    story.append(Paragraph("Detailed Meeting Summary", header_style))

    summary_style = ParagraphStyle(
        "BodyStyle",
        parent=styles["Normal"],
        fontSize=11,
        leading=16,
        spaceAfter=8,
    )
    for line in summary.split("\n"):
        if line.strip():
            story.append(Paragraph(line.strip(), summary_style))

    story.append(Spacer(1, 20))

    if transcript:
        story.append(Paragraph("Full Transcript (Appendix)", header_style))
        transcript_style = ParagraphStyle(
            "TranscriptStyle",
            parent=styles["Normal"],
            fontSize=10,
            leading=14,
            textColor="#555555",
        )
        story.append(Paragraph(transcript.replace("\n", "<br/>"), transcript_style))

    doc.build(story)
    return buffer.getvalue()
