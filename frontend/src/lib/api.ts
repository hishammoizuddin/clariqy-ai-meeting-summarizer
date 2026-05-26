import type { AppUser, AuthResponse, Collection, LiveSessionResponse, UploadResponse } from '../types'

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const getToken = () => localStorage.getItem('token')

export function downloadPdfUrl(meeting_id: string) {
  const t = getToken()
  return `${BASE}/meetings/${encodeURIComponent(meeting_id)}/summary.pdf${t ? `?token=${t}` : ''}`
}

export function meetingMediaUrl(meeting_id: string) {
  const t = getToken()
  return `${BASE}/meetings/${encodeURIComponent(meeting_id)}/media${t ? `?token=${t}` : ''}`
}

export function profileAvatarUrl(user_id: number, version?: string) {
  const t = getToken()
  const versionQuery = version ? `&v=${encodeURIComponent(version)}` : ''
  return `${BASE}/users/${encodeURIComponent(String(user_id))}/avatar${t ? `?token=${t}${versionQuery}` : version ? `?v=${encodeURIComponent(version)}` : ''}`
}

async function safeDetail(res: Response) {
  try {
    const data = await res.json()
    return (data && (data.detail || data.message)) || ''
  } catch {
    return ''
  }
}

export async function uploadFile(file: File): Promise<UploadResponse> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch(`${BASE}/upload`, { 
    method: 'POST', 
    body: fd,
    headers: { Authorization: `Bearer ${getToken()}` }
  })
  if (!res.ok) throw new Error((await safeDetail(res)) || `Upload failed (${res.status})`)
  return res.json()
}

export async function createLiveSession(language?: string): Promise<LiveSessionResponse> {
  // Build the WebSocket URL from the HTTP base URL.
  // No network call needed — the backend WebSocket endpoint is always at /live/stream.
  const wsBase = BASE.replace(/^http/, 'ws')
  const params = new URLSearchParams()
  params.set('token', getToken() || '')
  if (language) params.set('language', language)
  return { ws_url: `${wsBase}/live/stream?${params.toString()}` }
}

export async function finalizeLiveRecording(params: {
  file: File
  title?: string
  language?: string
}): Promise<UploadResponse> {
  const fd = new FormData()
  fd.append('file', params.file)
  fd.append('title', params.title || '')
  fd.append('language', params.language || '')

  const res = await fetch(`${BASE}/live/finalize`, {
    method: 'POST',
    body: fd,
    headers: { Authorization: `Bearer ${getToken()}` }
  })
  if (!res.ok) throw new Error((await safeDetail(res)) || `Live finalization failed (${res.status})`)
  return res.json()
}

export async function askQuestion(meeting_id: string, question: string) {
  const fd = new FormData()
  fd.append('meeting_id', meeting_id)
  fd.append('question', question)
  const res = await fetch(`${BASE}/ask`, { 
    method: 'POST', 
    body: fd,
    headers: { Authorization: `Bearer ${getToken()}` }
  })
  if (!res.ok) throw new Error((await safeDetail(res)) || `Ask failed (${res.status})`)
  return res.json()
}

export async function listMeetings() {
  const res = await fetch(`${BASE}/meetings`, {
    headers: { Authorization: `Bearer ${getToken()}` }
  })
  if (!res.ok) throw new Error((await safeDetail(res)) || `List failed (${res.status})`)
  return res.json()
}

export async function loginApi(fd: FormData): Promise<AuthResponse> {
  const res = await fetch(`${BASE}/auth/login`, { method: 'POST', body: fd })
  if (!res.ok) throw new Error((await safeDetail(res)) || `Login failed (${res.status})`)
  return res.json()
}

export async function signupApi(fd: FormData): Promise<AuthResponse> {
  const res = await fetch(`${BASE}/auth/signup`, { method: 'POST', body: fd })
  if (!res.ok) throw new Error((await safeDetail(res)) || `Signup failed (${res.status})`)
  return res.json()
}

export async function getMe(): Promise<AppUser> {
  const res = await fetch(`${BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${getToken()}` }
  })
  if (!res.ok) throw new Error('Not authenticated')
  return res.json()
}

export async function updateProfile(fd: FormData): Promise<AuthResponse> {
  const res = await fetch(`${BASE}/auth/profile`, {
    method: 'PATCH',
    body: fd,
    headers: { Authorization: `Bearer ${getToken()}` },
  })
  if (!res.ok) throw new Error((await safeDetail(res)) || `Profile update failed (${res.status})`)
  return res.json()
}

export async function getRecord(meeting_id: string): Promise<UploadResponse> {
  const res = await fetch(`${BASE}/meetings/${meeting_id}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  })
  if (!res.ok) throw new Error((await safeDetail(res)) || `Get Record failed (${res.status})`)
  return res.json()
}

export async function renameRecord(meeting_id: string, new_name: string) {
  const res = await fetch(`${BASE}/meetings/${meeting_id}`, {
    method: 'PATCH',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}` 
    },
    body: JSON.stringify({ new_name })
  })
  if (!res.ok) throw new Error((await safeDetail(res)) || `Rename failed (${res.status})`)
  return res.json()
}

export async function updateSpeakerAssignments(
  meeting_id: string,
  assignments: Record<string, string>,
): Promise<UploadResponse> {
  const res = await fetch(`${BASE}/meetings/${meeting_id}/speaker-assignments`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`
    },
    body: JSON.stringify({ assignments })
  })
  if (!res.ok) throw new Error((await safeDetail(res)) || `Speaker update failed (${res.status})`)
  return res.json()
}

export async function deleteRecord(meeting_id: string) {
  const res = await fetch(`${BASE}/meetings/${meeting_id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${getToken()}` },
  })
  if (!res.ok) throw new Error((await safeDetail(res)) || `Delete failed (${res.status})`)
  return res.json()
}

// ── Collections ──────────────────────────────────────────────────────────────

export async function listCollections(): Promise<Collection[]> {
  const res = await fetch(`${BASE}/collections`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  })
  if (!res.ok) throw new Error((await safeDetail(res)) || `List collections failed (${res.status})`)
  return res.json()
}

export async function createCollection(data: { name: string; description?: string; emoji?: string }): Promise<Collection> {
  const res = await fetch(`${BASE}/collections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error((await safeDetail(res)) || `Create collection failed (${res.status})`)
  return res.json()
}

export async function updateCollection(id: number, data: { name?: string; description?: string; emoji?: string }): Promise<Collection> {
  const res = await fetch(`${BASE}/collections/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error((await safeDetail(res)) || `Update collection failed (${res.status})`)
  return res.json()
}

export async function deleteCollection(id: number): Promise<void> {
  const res = await fetch(`${BASE}/collections/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${getToken()}` },
  })
  if (!res.ok) throw new Error((await safeDetail(res)) || `Delete collection failed (${res.status})`)
}

export async function assignMeetingToCollection(meeting_id: string, collection_id: number | null): Promise<void> {
  const res = await fetch(`${BASE}/meetings/${encodeURIComponent(meeting_id)}/collection`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify({ collection_id }),
  })
  if (!res.ok) throw new Error((await safeDetail(res)) || `Assign collection failed (${res.status})`)
}

export async function askCollectionQuestion(collection_id: number, question: string): Promise<{ answer: string }> {
  const fd = new FormData()
  fd.append('question', question)
  const res = await fetch(`${BASE}/collections/${collection_id}/ask`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: fd,
  })
  if (!res.ok) throw new Error((await safeDetail(res)) || `Collection ask failed (${res.status})`)
  return res.json()
}

// ─────────────────────────────────────────────────────────────────────────────

export async function recordConsent(): Promise<AppUser> {
  const res = await fetch(`${BASE}/auth/consent`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
  })
  if (!res.ok) throw new Error((await safeDetail(res)) || `Consent recording failed (${res.status})`)
  return res.json()
}
