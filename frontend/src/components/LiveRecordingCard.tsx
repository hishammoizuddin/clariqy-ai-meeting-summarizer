import React, { startTransition, useDeferredValue } from 'react'
import { Mic, Square, Radio, Users, Languages, Waves, Loader2 } from 'lucide-react'
import { createLiveSession, finalizeLiveRecording } from '../lib/api'
import type { UploadResponse } from '../types'

type Props = {
  onUploaded: (data: UploadResponse) => void
}

type RecorderStatus = 'idle' | 'requesting' | 'connecting' | 'recording' | 'finalizing'

type LiveTurn = {
  id: string
  previousItemId?: string | null
  text: string
  state: 'pending' | 'partial' | 'final'
}

type TranscriptState = {
  order: string[]
  turns: Record<string, LiveTurn>
}

type SessionHandles = {
  peerConnection: RTCPeerConnection
  dataChannel: RTCDataChannel
  mediaRecorder: MediaRecorder | null
  stream: MediaStream
  chunks: Blob[]
  audioContext: AudioContext | null
  analyser: AnalyserNode | null
  animationFrame: number | null
}

const OPENAI_REALTIME_URL = 'https://api.openai.com/v1/realtime/calls'
const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'hi', label: 'Hindi' },
]

const EMPTY_TRANSCRIPT: TranscriptState = { order: [], turns: {} }

function insertAfter(order: string[], id: string, previousItemId?: string | null) {
  if (order.includes(id)) {
    return order
  }

  if (!previousItemId) {
    return [...order, id]
  }

  const previousIndex = order.indexOf(previousItemId)
  if (previousIndex === -1) {
    return [...order, id]
  }

  const nextOrder = [...order]
  nextOrder.splice(previousIndex + 1, 0, id)
  return nextOrder
}

function formatElapsed(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function sanitizeFileName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'live-session'
}

function pickRecorderMimeType() {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
  ]

  for (const candidate of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(candidate)) {
      return candidate
    }
  }

  return ''
}

function guessFileExtension(mimeType: string) {
  if (mimeType.includes('mp4')) return 'm4a'
  if (mimeType.includes('ogg')) return 'ogg'
  return 'webm'
}

export default function LiveRecordingCard({ onUploaded }: Props) {
  const [status, setStatus] = React.useState<RecorderStatus>('idle')
  const [title, setTitle] = React.useState('')
  const [language, setLanguage] = React.useState('en')
  const [error, setError] = React.useState<string | null>(null)
  const [elapsedMs, setElapsedMs] = React.useState(0)
  const [audioLevel, setAudioLevel] = React.useState(0)
  const [transcriptState, setTranscriptState] = React.useState<TranscriptState>(EMPTY_TRANSCRIPT)

  const sessionRef = React.useRef<SessionHandles | null>(null)
  const startedAtRef = React.useRef<number | null>(null)
  const statusRef = React.useRef<RecorderStatus>('idle')
  const timerRef = React.useRef<number | null>(null)
  const transcriptRef = React.useRef<HTMLDivElement>(null)
  const deferredTranscript = useDeferredValue(transcriptState)

  React.useEffect(() => {
    statusRef.current = status
  }, [status])

  const renderedTurns = React.useMemo(() => {
    return deferredTranscript.order
      .map((id) => deferredTranscript.turns[id])
      .filter((turn): turn is LiveTurn => Boolean(turn))
      .map((turn, index) => ({
        ...turn,
        label: `Turn ${index + 1}`,
      }))
  }, [deferredTranscript])

  React.useEffect(() => {
    if (!transcriptRef.current) return
    transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight
  }, [renderedTurns, status])

  React.useEffect(() => {
    return () => {
      void teardownSession({ collectRecording: false })
    }
  }, [])

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
      if (startedAtRef.current) {
        setElapsedMs(Date.now() - startedAtRef.current)
      }
    }, 500)
  }, [stopTimer])

  const updateTurn = React.useCallback((itemId: string, updater: (turn: LiveTurn) => LiveTurn, previousItemId?: string | null) => {
    startTransition(() => {
      setTranscriptState((prev) => {
        const current = prev.turns[itemId] || {
          id: itemId,
          previousItemId,
          text: '',
          state: 'pending' as const,
        }

        const nextTurn = updater({
          ...current,
          previousItemId: previousItemId ?? current.previousItemId ?? null,
        })

        return {
          order: insertAfter(prev.order, itemId, previousItemId ?? current.previousItemId),
          turns: {
            ...prev.turns,
            [itemId]: nextTurn,
          },
        }
      })
    })
  }, [])

  const startMeter = React.useCallback((stream: MediaStream) => {
    try {
      const audioContext = new window.AudioContext()
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 512
      analyser.smoothingTimeConstant = 0.82
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)

      const data = new Uint8Array(analyser.frequencyBinCount)
      const tick = () => {
        analyser.getByteTimeDomainData(data)
        let sum = 0
        for (let i = 0; i < data.length; i += 1) {
          const normalized = (data[i] - 128) / 128
          sum += normalized * normalized
        }
        const rms = Math.sqrt(sum / data.length)
        setAudioLevel(Math.min(1, rms * 4))
        sessionRef.current && (sessionRef.current.animationFrame = window.requestAnimationFrame(tick))
      }

      tick()
      return { audioContext, analyser }
    } catch {
      return { audioContext: null, analyser: null }
    }
  }, [])

  const teardownSession = React.useCallback(async ({ collectRecording }: { collectRecording: boolean }) => {
    const session = sessionRef.current
    sessionRef.current = null

    stopTimer()
    setAudioLevel(0)

    if (!session) {
      return null
    }

    if (session.animationFrame !== null) {
      window.cancelAnimationFrame(session.animationFrame)
    }

    session.dataChannel.close()
    session.peerConnection.close()

    const recorder = session.mediaRecorder
    const blobPromise = recorder && recorder.state !== 'inactive'
      ? new Promise<Blob>((resolve) => {
          recorder.addEventListener(
            'stop',
            () => {
              resolve(new Blob(session.chunks, { type: recorder.mimeType || 'audio/webm' }))
            },
            { once: true },
          )
          recorder.stop()
        })
      : Promise.resolve(new Blob(session.chunks, { type: recorder?.mimeType || 'audio/webm' }))

    session.stream.getTracks().forEach((track) => track.stop())

    if (session.audioContext) {
      try {
        await session.audioContext.close()
      } catch {
        // no-op
      }
    }

    if (!collectRecording) {
      return null
    }

    const blob = await blobPromise
    if (!blob.size) {
      throw new Error('No audio was captured. Please try recording again.')
    }

    const safeTitle = sanitizeFileName(title || 'live-session')
    const extension = guessFileExtension(blob.type || session.mediaRecorder?.mimeType || '')
    return new File([blob], `${safeTitle}.${extension}`, { type: blob.type || 'audio/webm' })
  }, [stopTimer, title])

  const handleRealtimeEvent = React.useCallback((event: MessageEvent<string>) => {
    let payload: any
    try {
      payload = JSON.parse(event.data)
    } catch {
      return
    }

    switch (payload.type) {
      case 'input_audio_buffer.committed':
        updateTurn(payload.item_id, (turn) => turn, payload.previous_item_id)
        break
      case 'input_audio_buffer.speech_started':
        updateTurn(payload.item_id, (turn) => ({ ...turn, state: turn.text ? turn.state : 'pending' }))
        break
      case 'conversation.item.input_audio_transcription.delta':
        if (!payload.item_id || !payload.delta) return
        updateTurn(payload.item_id, (turn) => ({
          ...turn,
          text: `${turn.text}${payload.delta}`,
          state: 'partial',
        }))
        break
      case 'conversation.item.input_audio_transcription.completed':
        if (!payload.item_id) return
        updateTurn(payload.item_id, (turn) => ({
          ...turn,
          text: (payload.transcript || turn.text || '').trim(),
          state: 'final',
        }))
        break
      default:
        break
    }
  }, [updateTurn])

  async function handleStart() {
    if (status !== 'idle') return
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Your browser does not support microphone recording.')
      return
    }
    if (typeof RTCPeerConnection === 'undefined') {
      setError('Your browser does not support realtime WebRTC connections.')
      return
    }
    if (typeof MediaRecorder === 'undefined') {
      setError('Your browser does not support local audio recording.')
      return
    }

    setError(null)
    setTranscriptState(EMPTY_TRANSCRIPT)
    setElapsedMs(0)
    setStatus('requesting')

    let stream: MediaStream | null = null
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
        },
      })
      const activeStream = stream

      setStatus('connecting')
      const liveSession = await createLiveSession(language)
      const peerConnection = new RTCPeerConnection()
      const dataChannel = peerConnection.createDataChannel('oai-events')
      dataChannel.addEventListener('message', handleRealtimeEvent)

      activeStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, activeStream)
      })

      peerConnection.onconnectionstatechange = () => {
        if (
          ['failed', 'disconnected', 'closed'].includes(peerConnection.connectionState) &&
          statusRef.current !== 'finalizing'
        ) {
          setError('The live transcription connection was interrupted.')
        }
      }

      const mimeType = pickRecorderMimeType()
      const mediaRecorder = new MediaRecorder(
        activeStream,
        mimeType ? { mimeType, audioBitsPerSecond: 32000 } : { audioBitsPerSecond: 32000 },
      )
      const chunks: Blob[] = []
      mediaRecorder.addEventListener('dataavailable', (evt) => {
        if (evt.data.size > 0) {
          chunks.push(evt.data)
        }
      })

      sessionRef.current = {
        peerConnection,
        dataChannel,
        mediaRecorder,
        stream: activeStream,
        chunks,
        audioContext: null,
        analyser: null,
        animationFrame: null,
      }

      const { audioContext, analyser } = startMeter(activeStream)
      if (sessionRef.current) {
        sessionRef.current.audioContext = audioContext
        sessionRef.current.analyser = analyser
      }

      const offer = await peerConnection.createOffer()
      await peerConnection.setLocalDescription(offer)

      const sdpResponse = await fetch(OPENAI_REALTIME_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${liveSession.client_secret}`,
          'Content-Type': 'application/sdp',
        },
        body: offer.sdp || '',
      })

      if (!sdpResponse.ok) {
        throw new Error(`OpenAI realtime handshake failed (${sdpResponse.status})`)
      }

      const answerSdp = await sdpResponse.text()
      await peerConnection.setRemoteDescription({ type: 'answer', sdp: answerSdp })

      mediaRecorder.start(1000)
      startTimer()
      setStatus('recording')
    } catch (err: any) {
      console.error('Live recording start failed:', err)
      await teardownSession({ collectRecording: false })
      if (stream && !sessionRef.current) {
        stream.getTracks().forEach((track) => track.stop())
      }
      setStatus('idle')
      setError(err?.message || 'Unable to start live recording.')
    }
  }

  async function handleStop() {
    if (!['connecting', 'recording'].includes(status)) return

    if (status === 'connecting') {
      await teardownSession({ collectRecording: false })
      setStatus('idle')
      return
    }

    setError(null)
    setStatus('finalizing')

    try {
      const recordedFile = await teardownSession({ collectRecording: true })
      if (!recordedFile) {
        throw new Error('No recording file was created.')
      }

      const payload = await finalizeLiveRecording({
        file: recordedFile,
        title,
        language,
      })

      onUploaded(payload)
      setStatus('idle')
      setTitle('')
      setTranscriptState(EMPTY_TRANSCRIPT)
      setElapsedMs(0)
    } catch (err: any) {
      console.error('Live recording finalize failed:', err)
      setStatus('idle')
      setError(err?.message || 'Unable to finalize the recording.')
    }
  }

  const isBusy = status !== 'idle'
  const statusLabel = {
    idle: 'Ready',
    requesting: 'Requesting mic',
    connecting: 'Connecting',
    recording: 'Recording live',
    finalizing: 'Generating summary',
  }[status]

  const primaryMessage = {
    idle: 'Start when the conversation begins',
    requesting: 'Approve microphone access to begin',
    connecting: 'Connecting the live transcript stream',
    recording: 'Transcript is actively listening',
    finalizing: 'Building the polished speaker summary',
  }[status]

  const secondaryMessage = {
    idle: 'The final transcript will add stable speaker labels after you stop recording.',
    requesting: 'Your browser may show a permissions prompt before the session can start.',
    connecting: 'This usually takes a moment while the browser establishes the realtime session.',
    recording: 'Realtime turns will appear below as the conversation unfolds.',
    finalizing: 'We are processing the full recording with diarization before saving it to history.',
  }[status]

  return (
    <div className="section relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,0,0,0.06),transparent_46%)] pointer-events-none" />

      <div className="section-header relative z-10 items-start sm:items-center gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="p-2.5 rounded-2xl bg-black text-white shadow-sm shrink-0">
            <Radio size={18} />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-black tracking-tight text-lg">Live capture studio</h3>
            <p className="mt-1 text-sm leading-relaxed text-gray-500 max-w-[36rem]">
              Realtime transcript while you record, then a structured speaker-aware summary once you stop.
            </p>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100/90 border border-gray-200 text-xs font-semibold text-gray-700 shadow-sm self-start sm:self-center">
          {status === 'recording' ? <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> : <span className="w-2 h-2 rounded-full bg-black/30" />}
          {statusLabel}
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
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
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

        <div className="rounded-[28px] border border-gray-200/80 bg-white/85 shadow-sm p-4 md:p-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
            <div className="min-w-0 flex items-start gap-4">
              <div className={`relative flex h-14 w-14 items-center justify-center rounded-2xl border shrink-0 ${status === 'recording' ? 'border-black bg-black text-white' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
                <Mic size={22} />
                <span
                  className={`absolute inset-0 rounded-2xl border transition-transform duration-150 ${status === 'recording' ? 'border-black/20' : 'border-gray-200/80'}`}
                  style={{ transform: `scale(${1 + audioLevel * 0.18})`, opacity: status === 'recording' ? Math.max(0.12, audioLevel) : 0.25 }}
                />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-semibold leading-snug text-black">{primaryMessage}</p>
                <p className="mt-1 text-sm leading-6 text-gray-500 max-w-[34rem]">{secondaryMessage}</p>
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
                  {status === 'requesting'
                    ? 'Preparing...'
                    : status === 'connecting'
                      ? 'Cancel'
                      : status === 'finalizing'
                        ? 'Finalizing...'
                        : 'Stop & summarize'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200/80 bg-white/75 overflow-hidden shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-gray-200/80 bg-gray-50/80">
            <div>
              <h4 className="text-sm font-bold text-black">Live transcript</h4>
              <p className="text-[11px] text-gray-500">Turn-by-turn transcription streams here while the interview is running.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {renderedTurns.length > 0 && (
                <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-600">
                  {renderedTurns.length} turn{renderedTurns.length === 1 ? '' : 's'}
                </span>
              )}
              {status === 'finalizing' && (
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-gray-600">
                  <Loader2 size={14} className="animate-spin" />
                  Preparing diarized summary
                </div>
              )}
            </div>
          </div>

          <div
            ref={transcriptRef}
            className="max-h-[280px] md:max-h-[340px] min-h-[220px] overflow-y-auto px-4 py-4 space-y-3"
          >
            {renderedTurns.length === 0 && (
              <div className="h-[188px] flex items-center justify-center text-center px-6">
                <div>
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                    <Radio size={18} />
                  </div>
                  <p className="text-sm font-medium text-gray-600">No live transcript yet</p>
                  <p className="mt-1 text-xs text-gray-400">Once the recorder is running, each detected speech turn will appear here in realtime.</p>
                </div>
              </div>
            )}

            {renderedTurns.map((turn) => (
              <div
                key={turn.id}
                className={`rounded-2xl border px-4 py-3 transition-all ${turn.state === 'final'
                  ? 'bg-white border-gray-200'
                  : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-700 border border-gray-200">
                    {turn.label}
                  </span>
                  <span className={`text-[11px] font-semibold ${turn.state === 'final' ? 'text-gray-400' : 'text-black/60'}`}>
                    {turn.state === 'final' ? 'Finalized' : 'Streaming'}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-black whitespace-pre-wrap">
                  {turn.text || '...'}
                </p>
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
