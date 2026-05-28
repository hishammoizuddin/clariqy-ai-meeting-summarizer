import React from 'react'
import { UploadCloud, FileAudio, Sparkles, Mic2, Users, Brain } from 'lucide-react'
import { uploadFile } from '../lib/api'
import type { UploadResponse } from '../types'
import ProcessingOverlay from './ProcessingOverlay'
import type { ProcessingStep } from './ProcessingOverlay'

type Props = { onUploaded: (data: UploadResponse) => void }

const UPLOAD_STEPS: ProcessingStep[] = [
  {
    label: 'Uploading file',
    detail: 'Sending your recording to the server…',
    icon: <UploadCloud size={22} />,
  },
  {
    label: 'Transcribing audio',
    detail: 'Whisper is converting speech to text…',
    icon: <Mic2 size={22} />,
  },
  {
    label: 'Identifying speakers',
    detail: 'Detecting and labelling unique voices…',
    icon: <Users size={22} />,
  },
  {
    label: 'Generating summary',
    detail: 'Building your structured meeting summary…',
    icon: <Brain size={22} />,
  },
]

export default function UploadCard({ onUploaded }: Props) {
  const [dragOver, setDragOver] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  async function handleFiles(files?: FileList | null) {
    const file = files?.[0]
    if (!file) return
    setError(null)
    setBusy(true)
    try {
      const data = await uploadFile(file)
      onUploaded(data)
    } catch (e: any) {
      setError(e?.message || 'Upload failed')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
      setDragOver(false)
    }
  }

  return (
    <div
      className={`section transition-all duration-300 ${
        dragOver ? 'ring-2 ring-black shadow-glow bg-white/80' : ''
      }`}
      onDragEnter={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={(e) => { e.preventDefault(); setDragOver(false) }}
      onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer?.files) }}
    >
      {/* Drag-state glow */}
      <div
        className={`absolute -inset-10 bg-gray-200/40 blur-3xl rounded-[100%] pointer-events-none transition-opacity duration-500 ${
          dragOver ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Processing overlay */}
      {busy && (
        <ProcessingOverlay steps={UPLOAD_STEPS} title="Analysing recording" stepInterval={5000} />
      )}

      <div className="section-header relative z-10">
        <UploadCloud size={18} className="text-black" />
        <h3 className="font-bold text-black tracking-tight">Import an existing recording</h3>
      </div>

      <div className="section-body relative z-10">
        <button
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className={`w-full group flex flex-col items-center justify-center gap-3 px-6 py-12 rounded-xl border-2 border-dashed transition-all duration-300 disabled:opacity-60 bg-white/40 ${
            dragOver
              ? 'border-black bg-gray-50/50 scale-[1.02]'
              : 'border-gray-300 hover:border-black/50 hover:bg-white/80'
          }`}
          aria-disabled={busy}
        >
          <div
            className={`p-4 rounded-full transition-colors duration-300 ${
              dragOver
                ? 'bg-gray-200 text-black'
                : 'bg-gray-100 text-gray-500 group-hover:bg-gray-100 group-hover:text-black'
            }`}
          >
            <UploadCloud size={32} />
          </div>
          <div className="text-sm text-center">
            <span className="font-semibold text-black">Click to upload</span>
            <span className="text-gray-600"> or drag & drop</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-gray-100 text-gray-500">
            <FileAudio size={12} /> Accepts .mp3, .wav, .m4a, .mp4, .mov
          </div>
        </button>

        <input
          ref={inputRef}
          type="file"
          accept=".mp3,.wav,.m4a,.mp4,.mov,.webm,.mkv"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        {error && (
          <p className="mt-4 p-3 rounded-lg bg-gray-100 border border-black text-sm text-black font-semibold animate-scale-in">
            {error}
          </p>
        )}

        {!busy && !error && (
          <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-gray-50 border border-gray-200">
            <Sparkles size={16} className="text-black mt-0.5 shrink-0" />
            <p className="text-xs text-gray-600 font-medium leading-relaxed">
              Bring in past calls, screen recordings, or voice notes and turn them into
              the same searchable meeting record.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
