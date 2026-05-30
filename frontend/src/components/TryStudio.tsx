import React from 'react'
import { Radio, UploadCloud, Sparkles } from 'lucide-react'
import LiveRecordingCard from './LiveRecordingCard'
import UploadCard from './UploadCard'
import SummaryCard from './SummaryCard'
import TranscriptPanel from './TranscriptPanel'
import QAPanel from './QAPanel'
import GuestSignupPrompt from './GuestSignupPrompt'
import { createGuestSession } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import type { UploadResponse } from '../types'

// Guest anti-abuse caps (backend enforces these authoritatively too).
const GUEST_MAX_BYTES = 10 * 1024 * 1024  // 10 MB
const GUEST_MAX_LIVE_MS = 540_000         // 9 min ≈ ~8.6 MB at 128 kbps

/**
 * Zero-friction "try it now" surface embedded directly in the landing page.
 * The visitor records or uploads immediately — a guest session is created
 * silently on their first action, so there is no sign-up gate up front.
 */
export default function TryStudio() {
  const { user, isGuest, login, refreshUser } = useAuth()

  const [captureMode, setCaptureMode] = React.useState<'live' | 'upload'>('live')
  const [sessions, setSessions] = React.useState<UploadResponse[]>([])
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [guestPrompt, setGuestPrompt] = React.useState<{ open: boolean; reason: 'upload' | 'live' | 'generic' }>({
    open: false,
    reason: 'generic',
  })

  const resultRef = React.useRef<HTMLDivElement>(null)
  const active = sessions.find((s) => s.meeting_id === activeId) || null

  // Lazily create a guest session right before the first real action.
  async function ensureGuestSession() {
    // Pre-empt wasted recording/processing if this modality is already exhausted.
    if (isGuest) {
      const remaining = captureMode === 'live'
        ? (user?.guest_live_remaining ?? 1)
        : (user?.guest_uploads_remaining ?? 1)
      if (remaining <= 0) {
        setGuestPrompt({ open: true, reason: captureMode })
        throw new Error('guest_limit_reached')
      }
    }
    if (localStorage.getItem('token')) return
    try {
      const res = await createGuestSession()
      login(res.access_token, res.user)
    } catch {
      setGuestPrompt({ open: true, reason: 'generic' })
      throw new Error('guest_limit_reached') // abort the action; prompt is shown
    }
  }

  function onUploaded(payload: UploadResponse) {
    setSessions((prev) => [payload, ...prev.filter((p) => p.meeting_id !== payload.meeting_id)])
    setActiveId(payload.meeting_id)
    if (isGuest) void refreshUser()
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 250)
  }

  return (
    <div className="w-full">
      {/* Capture surface */}
      <div className="max-w-3xl mx-auto">
        {/* Mode tabs */}
        <div className="rounded-[24px] border border-gray-200/80 bg-white/70 p-2 shadow-glass backdrop-blur-xl">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setCaptureMode('live')}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                captureMode === 'live'
                  ? 'bg-black text-white shadow-md'
                  : 'bg-white/80 text-gray-600 border border-gray-200 hover:text-black hover:border-black/20'
              }`}
            >
              <Radio size={16} /> Record live
            </button>
            <button
              type="button"
              onClick={() => setCaptureMode('upload')}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                captureMode === 'upload'
                  ? 'bg-black text-white shadow-md'
                  : 'bg-white/80 text-gray-600 border border-gray-200 hover:text-black hover:border-black/20'
              }`}
            >
              <UploadCloud size={16} /> Upload file
            </button>
          </div>
        </div>

        {/* Friendly no-signup hint / remaining counter */}
        <div className="mt-3 flex items-center justify-center gap-2 text-xs font-medium text-gray-500">
          <Sparkles size={13} className="text-gray-400" />
          {isGuest
            ? '100% free — no credit card, no catch'
            : 'No sign-up needed — start recording or upload a file to try it instantly'}
        </div>

        {/* Capture card */}
        <div className="mt-4">
          {captureMode === 'live' ? (
            <LiveRecordingCard
              onUploaded={onUploaded}
              beforeAction={ensureGuestSession}
              onGuestLimit={() => setGuestPrompt({ open: true, reason: 'live' })}
              maxDurationMs={GUEST_MAX_LIVE_MS}
            />
          ) : (
            <UploadCard
              onUploaded={onUploaded}
              beforeAction={ensureGuestSession}
              onGuestLimit={() => setGuestPrompt({ open: true, reason: 'upload' })}
              maxBytes={GUEST_MAX_BYTES}
            />
          )}
        </div>
      </div>

      {/* Result + chat — appears only after the first session is created */}
      {active && (
        <div ref={resultRef} className="max-w-6xl mx-auto mt-10 scroll-mt-24 animate-fade-in-up">
          {/* Mini session switcher (acts as a tiny knowledge base) */}
          {sessions.length > 1 && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400 mr-1">
                Your sessions
              </span>
              {sessions.map((s) => (
                <button
                  key={s.meeting_id}
                  onClick={() => setActiveId(s.meeting_id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    s.meeting_id === activeId
                      ? 'bg-black text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-black/30 hover:text-black'
                  }`}
                >
                  {s.source_filename || 'Session'}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
            {/* Left: summary + transcript */}
            <div className="space-y-5">
              <SummaryCard
                key={`sum-${active.meeting_id}`}
                meetingId={active.meeting_id}
                summary={active.summary}
                sourceType={active.source_type}
                speakers={active.speakers}
                durationSeconds={active.duration_seconds}
              />
              <TranscriptPanel
                key={`tr-${active.meeting_id}`}
                transcript={active.transcript}
                transcriptSegments={active.transcript_segments}
              />
            </div>

            {/* Right: chat */}
            <div className="lg:sticky lg:top-24 h-[560px]">
              <QAPanel
                key={`qa-${active.meeting_id}`}
                meetingId={active.meeting_id}
                meetingTitle={active.source_filename}
              />
            </div>
          </div>

          {/* Soft conversion nudge under the result */}
          {isGuest && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white/70 px-5 py-4 text-center shadow-sm">
              <p className="text-sm text-gray-600">
                Like what you see? Create a free account to keep your sessions and unlock unlimited use.
              </p>
              <button
                onClick={() => setGuestPrompt({ open: true, reason: 'generic' })}
                className="rounded-full bg-black px-4 py-2 text-xs font-semibold text-white transition hover:bg-gray-800"
              >
                Save my work — Sign up free
              </button>
            </div>
          )}
        </div>
      )}

      <GuestSignupPrompt
        open={guestPrompt.open}
        reason={guestPrompt.reason}
        onClose={() => setGuestPrompt((p) => ({ ...p, open: false }))}
      />
    </div>
  )
}
