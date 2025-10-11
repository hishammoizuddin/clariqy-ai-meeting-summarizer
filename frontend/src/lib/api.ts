const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export function downloadPdfUrl(meeting_id: string) {
  return `${BASE}/summary/pdf/${encodeURIComponent(meeting_id)}`
}

async function safeDetail(res: Response) {
  try {
    const data = await res.json()
    return (data && (data.detail || data.message)) || ''
  } catch {
    return ''
  }
}

export async function uploadFile(file: File) {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch(`${BASE}/upload`, { method: 'POST', body: fd })
  if (!res.ok) throw new Error((await safeDetail(res)) || `Upload failed (${res.status})`)
  return res.json()
}

export async function askQuestion(meeting_id: string, question: string) {
  const fd = new FormData()
  fd.append('meeting_id', meeting_id)
  fd.append('question', question)
  const res = await fetch(`${BASE}/ask`, { method: 'POST', body: fd })
  if (!res.ok) throw new Error((await safeDetail(res)) || `Ask failed (${res.status})`)
  return res.json()
}

export async function listMeetings() {
  const res = await fetch(`${BASE}/meetings`)
  if (!res.ok) throw new Error((await safeDetail(res)) || `List failed (${res.status})`)
  return res.json()
}
