import React from 'react'
import { Mic, Square, Radio, Users, Languages, Waves, Loader2, UploadCloud, Brain, FileText, Sparkles } from 'lucide-react'
import { finalizeLiveRecording } from '../lib/api'
import type { UploadResponse } from '../types'
import ProcessingOverlay from './ProcessingOverlay'
import type { ProcessingStep } from './ProcessingOverlay'
import { useToast } from '../context/ToastContext'

const FINALIZE_STEPS: ProcessingStep[] = [
  { label: 'Uploading recording', detail: 'Sending the captured audio to the server…', icon: <UploadCloud size={22} /> },
  { label: 'Diarizing speakers', detail: 'AssemblyAI is identifying unique voices…', icon: <Users size={22} /> },
  { label: 'Transcribing audio', detail: 'Converting speech to a full transcript…', icon: <FileText size={22} /> },
  { label: 'Generating summary', detail: 'Building your speaker-labelled summary…', icon: <Brain size={22} /> },
]

type Props = {
  onUploaded: (data: UploadResponse) => void
  onGuestLimit?: () => void
  /** Runs before recording starts — used to lazily create a guest session. */
  beforeAction?: () => Promise<void>
  /** Auto-stop after this many ms (guest cap) to keep recordings small. */
  maxDurationMs?: number
}

type RecorderStatus = 'idle' | 'requesting' | 'recording' | 'finalizing'

type SessionHandles = {
  mediaRecorder: MediaRecorder | null
  stream: MediaStream
  chunks: Blob[]
  meterContext: AudioContext | null
  analyser: AnalyserNode | null
  animationFrame: number | null
}

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'hi', label: 'Hindi' },
]
const LIVE_RECORDING_BITRATE = 128000

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatElapsed(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function sanitizeFileName(value: string) {
  return (
    value.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'live-session'
  )
}

function pickRecorderMimeType() {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
  for (const candidate of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(candidate)) return candidate
  }
  return ''
}

function guessFileExtension(mimeType: string) {
  if (mimeType.includes('mp4')) return 'm4a'
  if (mimeType.includes('ogg')) return 'ogg'
  return 'webm'
}

function buildMicConstraints(): MediaTrackConstraints {
  return {
    channelCount: { ideal: 1 },
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LiveRecordingCard({ onUploaded, onGuestLimit, beforeAction, maxDurationMs }: Props) {
  const { toast } = useToast()
  const [status, setStatus] = React.useState<RecorderStatus>('idle')
  const [title, setTitle] = React.useState('')
  const [language, setLanguage] = React.useState('en')
  const [error, setError] = React.useState<string | null>(null)
  const [elapsedMs, setElapsedMs] = React.useState(0)
  const [audioLevel, setAudioLevel] = React.useState(0)

  const sessionRef = React.useRef<SessionHandles | null>(null)
  const startedAtRef = React.useRef<number | null>(null)
  const timerRef = React.useRef<number | null>(null)

  // ---- Timer -----------------------------------------------------------
  const stopTimer = React.useCallback(() => {
    startedAtRef.current = null
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const startTimer = React.useCallback(() => {
    stopTimer()
    startedAtRef.current = Date.now()
    setElapsedMs(0)
    timerRef.current = window.setInterval(() => {
      if (startedAtRef.current) setElapsedMs(Date.now() - startedAtRef.current)
    }, 500)
  }, [stopTimer])

  // ---- Audio level meter -----------------------------------------------
  const startMeter = React.useCallback((stream: MediaStream) => {
    try {
      const meterContext = new window.AudioContext()
      const analyser = meterContext.createAnalyser()
      analyser.fftSize = 512
      analyser.smoothingTimeConstant = 0.82
      meterContext.createMediaStreamSource(stream).connect(analyser)
      const data = new Uint8Array(analyser.frequencyBinCount)
      const tick = () => {
        analyser.getByteTimeDomainData(data)
        let sum = 0
        for (let i = 0; i < data.length; i++) {
          const n = (data[i] - 128) / 128
          sum += n * n
        }
        setAudioLevel(Math.min(1, Math.sqrt(sum / data.length) * 4))
        if (sessionRef.current) sessionRef.current.animationFrame = window.requestAnimationFrame(tick)
      }
      tick()
      return { meterContext, analyser }
    } catch {
      return { meterContext: null, analyser: null }
    }
  }, [])

  // ---- Teardown ---------------------------------------------------------
  const teardownSession = React.useCallback(
    async ({ collectRecording }: { collectRecording: boolean }) => {
      const session = sessionRef.current
      sessionRef.current = null
      stopTimer()
      setAudioLevel(0)
      if (!session) return null

      if (session.animationFrame !== null) window.cancelAnimationFrame(session.animationFrame)

      const recorder = session.mediaRecorder
      const blobPromise =
        recorder && recorder.state !== 'inactive'
          ? new Promise<Blob>((resolve) => {
              recorder.addEventListener(
                'stop',
                () => resolve(new Blob(session.chunks, { type: recorder.mimeType || 'audio/webm' })),
                { once: true },
              )
              recorder.stop()
            })
          : Promise.resolve(new Blob(session.chunks, { type: recorder?.mimeType || 'audio/webm' }))

      session.stream.getTracks().forEach((t) => t.stop())
      if (session.meterContext) {
        try { await session.meterContext.close() } catch { /* no-op */ }
      }

      if (!collectRecording) return null

      const blob = await blobPromise
      if (!blob.size) throw new Error('No audio was captured. Please try recording again.')
      const safeTitle = sanitizeFileName(title || 'live-session')
      const ext = guessFileExtension(blob.type || recorder?.mimeType || '')
      return new File([blob], `${safeTitle}.${ext}`, { type: blob.type || 'audio/webm' })
    },
    [stopTimer, title],
  )

  // Clean up if unmounted mid-recording
  React.useEffect(() => {
    return () => { void teardownSession({ collectRecording: false }) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Guest duration cap — auto-stop so recordings stay under the free size limit.
  const autoStopFiredRef = React.useRef(false)
  React.useEffect(() => {
    if (!maxDurationMs) return
    if (status !== 'recording') {
      if (status === 'idle') autoStopFiredRef.current = false
      return
    }
    if (elapsedMs >= maxDurationMs && !autoStopFiredRef.current) {
      autoStopFiredRef.current = true
      const mins = Math.round((maxDurationMs / 60000) * 10) / 10
      toast(`Free recordings are capped at ${mins} minutes — sign up for unlimited.`, 'info')
      void handleStop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedMs, status, maxDurationMs])

  // ---- Start recording -------------------------------------------------
  async function handleStart() {
    if (status !== 'idle') return
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Your browser does not support microphone recording.')
      return
    }
    if (typeof MediaRecorder === 'undefined') {
      setError('Your browser does not support local audio recording.')
      return
    }

    setError(null)
    setElapsedMs(0)
    setStatus('requesting')

    let stream: MediaStream | null = null
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: buildMicConstraints() })

      // Lazily create the guest session before we commit to recording.
      if (beforeAction) await beforeAction()

      const mimeType = pickRecorderMimeType()
      const mediaRecorder = new MediaRecorder(
        stream,
        mimeType
          ? { mimeType, audioBitsPerSecond: LIVE_RECORDING_BITRATE }
          : { audioBitsPerSecond: LIVE_RECORDING_BITRATE },
      )
      const chunks: Blob[] = []
      mediaRecorder.addEventListener('dataavailable', (evt) => {
        if (evt.data.size > 0) chunks.push(evt.data)
      })

      const { meterContext, analyser } = startMeter(stream)
      sessionRef.current = { mediaRecorder, stream, chunks, meterContext, analyser, animationFrame: null }

      mediaRecorder.start(1000)
      startTimer()
      setStatus('recording')
    } catch (err: any) {
      console.error('Recording start failed:', err)
      await teardownSession({ collectRecording: false })
      if (stream && !sessionRef.current) stream.getTracks().forEach((t) => t.stop())
      setStatus('idle')
      if (err?.message === 'guest_limit_reached' && onGuestLimit) {
        onGuestLimit()
      } else {
        setError(err?.message || 'Unable to start recording.')
      }
    }
  }

  // ---- Stop recording --------------------------------------------------
  async function handleStop() {
    if (status !== 'recording') return

    setError(null)
    setStatus('finalizing')
    try {
      const recordedFile = await teardownSession({ collectRecording: true })
      if (!recordedFile) throw new Error('No recording file was created.')

      const payload = await finalizeLiveRecording({ file: recordedFile, title, language })
      onUploaded(payload)
      setStatus('idle')
      setTitle('')
      setElapsedMs(0)
    } catch (err: any) {
      console.error('Live recording finalize failed:', err)
      setStatus('idle')
      if (err?.message === 'guest_limit_reached' && onGuestLimit) {
        onGuestLimit()
      } else if (err?.message === 'guest_file_too_large') {
        setError('Your recording exceeded the 10 MB free limit. Sign up for longer recordings.')
      } else {
        setError(err?.message || 'Unable to finalize the recording.')
      }
    }
  }

  // ---- UI --------------------------------------------------------------
  const isBusy = status !== 'idle'
  const statusLabel: Record<RecorderStatus, string> = {
    idle: 'Ready',
    requesting: 'Requesting mic',
    recording: 'Recording',
    finalizing: 'Generating summary',
  }
  const primaryMessage: Record<RecorderStatus, string> = {
    idle: 'Start when the conversation begins',
    requesting: 'Approve microphone access to begin',
    recording: 'Recording in progress',
    finalizing: 'Building the polished speaker summary',
  }
  const secondaryMessage: Record<RecorderStatus, string> = {
    idle: 'Your speaker-labeled transcript and summary are ready the moment you stop.',
    requesting: 'Your browser may show a permissions prompt before recording can start.',
    recording: 'Speak naturally — press Stop when you are done to transcribe and summarize.',
    finalizing: 'Processing the full recording with speaker diarization before saving it.',
  }

  return (
    <div className="section relative overflow-hidden">
      {/* Finalizing overlay */}
      {status === 'finalizing' && (
        <ProcessingOverlay steps={FINALIZE_STEPS} title="Finalising session" stepInterval={6000} />
      )}

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,0,0,0.06),transparent_46%)] pointer-events-none" />

      <div className="section-header relative z-10 items-start sm:items-center gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="p-2.5 rounded-2xl bg-black text-white shadow-sm shrink-0">
            <Radio size={18} />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-black tracking-tight text-lg">Live capture studio</h3>
            <p className="mt-1 text-sm leading-relaxed text-gray-500 max-w-[36rem]">
              Record the conversation, then get a structured speaker-aware summary the moment you stop.
            </p>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100/90 border border-gray-200 text-xs font-semibold text-gray-700 shadow-sm self-start sm:self-center">
          {status === 'recording'
            ? <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            : <span className="w-2 h-2 rounded-full bg-black/30" />}
          {statusLabel[status]}
        </div>
      </div>

      <div className="section-body relative z-10 space-y-5 md:space-y-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">Session title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Candidate interview with Alex"
              disabled={isBusy}
              className="w-full rounded-2xl border border-gray-200 bg-white/80 px-4 py-3.5 text-sm text-black shadow-sm outline-none transition focus:border-black/50 focus:ring-2 focus:ring-black/10 disabled:opacity-60"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">Language</span>
            <div className="relative">
              <Languages size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                disabled={isBusy}
                className="w-full appearance-none rounded-2xl border border-gray-200 bg-white/80 pl-10 pr-4 py-3.5 text-sm text-black shadow-sm outline-none transition focus:border-black/50 focus:ring-2 focus:ring-black/10 disabled:opacity-60"
              >
                {LANGUAGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </label>
        </div>

        <div className="rounded-[24px] border border-gray-200 bg-white/80 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-gray-100 p-2.5 text-black shrink-0">
              <Users size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">Speaker detection</p>
              <p className="mt-2 text-sm leading-relaxed text-black">
                We automatically detect unique speakers after recording ends.
              </p>
              <p className="mt-1 text-sm leading-relaxed text-gray-500">
                Review them as Speaker A, Speaker B, and so on, then rename each detected voice in the verification step.
              </p>
            </div>
          </div>
        </div>

        {/* Recorder control */}
        <div className="rounded-[28px] border border-gray-200/80 bg-white/85 shadow-sm p-4 md:p-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
            <div className="min-w-0 flex items-start gap-4">
              <div className="relative flex items-center justify-center shrink-0">
                {status === 'recording' && (
                  <>
                    <span
                      className="absolute rounded-2xl border border-black/20 transition-transform duration-100"
                      style={{ inset: '-4px', transform: `scale(${1 + audioLevel * 0.22})`, opacity: Math.max(0.1, audioLevel * 0.8) }}
                    />
                    <span className="absolute rounded-2xl border border-black/10 animate-ring-ping" style={{ inset: '-2px' }} />
                  </>
                )}
                {status === 'requesting' && (
                  <span className="absolute rounded-2xl bg-gray-200 animate-ping" style={{ inset: 0, opacity: 0.5 }} />
                )}
                <div
                  className={`relative z-10 h-14 w-14 flex items-center justify-center rounded-2xl border transition-colors duration-300 ${
                    status === 'recording'
                      ? 'border-black bg-black text-white shadow-lg'
                      : status === 'requesting'
                      ? 'border-gray-300 bg-gray-100 text-gray-600'
                      : 'border-gray-200 bg-gray-50 text-gray-500'
                  }`}
                >
                  {status === 'requesting' ? <Loader2 size={22} className="animate-spin-slow" /> : <Mic size={22} />}
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-lg font-semibold leading-snug text-black">{primaryMessage[status]}</p>
                <p className="mt-1 text-sm leading-6 text-gray-500 max-w-[34rem]">{secondaryMessage[status]}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 xl:w-[250px] 2xl:w-auto">
              <div className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-50 border border-gray-200 px-4 py-3 text-base font-semibold text-black min-w-[120px]">
                <Waves size={16} className="text-gray-500" />
                {formatElapsed(elapsedMs)}
              </div>

              {status === 'idle' ? (
                <button
                  type="button"
                  onClick={handleStart}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-gray-800 hover:-translate-y-0.5"
                >
                  <Mic size={16} />
                  Start recording
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStop}
                  disabled={status === 'finalizing' || status === 'requesting'}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-black bg-white px-5 py-3 text-sm font-semibold text-black shadow-sm transition hover:bg-gray-50 disabled:opacity-60"
                >
                  {status === 'finalizing' ? <Loader2 size={16} className="animate-spin" /> : <Square size={16} />}
                  {status === 'requesting' ? 'Preparing…' : status === 'finalizing' ? 'Finalizing…' : 'Stop & summarize'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* What happens next */}
        <div className="rounded-2xl border border-gray-200/80 bg-white/75 overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200/80 bg-gray-50/80">
            <Sparkles size={15} className="text-gray-500" />
            <h4 className="text-sm font-bold text-black">What happens when you stop</h4>
          </div>
          <div className="px-4 py-4 grid gap-3 sm:grid-cols-3">
            {[
              { icon: <FileText size={16} />, title: 'Transcribe', body: 'Your full recording is transcribed accurately.' },
              { icon: <Users size={16} />, title: 'Identify speakers', body: 'Distinct voices are auto-detected and labeled.' },
              { icon: <Brain size={16} />, title: 'Summarize', body: 'A structured summary you can chat with.' },
            ].map((s) => (
              <div key={s.title} className="rounded-2xl border border-gray-200 bg-white/80 p-3">
                <div className="flex items-center gap-2 text-black">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100">{s.icon}</span>
                  <span className="text-sm font-semibold">{s.title}</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-gray-500">{s.body}</p>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
