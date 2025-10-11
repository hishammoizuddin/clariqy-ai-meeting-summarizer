import React from 'react'
import { UploadCloud, FileAudio } from 'lucide-react'
import { uploadFile } from '../lib/api'
import type { UploadResponse } from '../types'
import Spinner from './Spinner'

type Props = { onUploaded: (data: UploadResponse) => void }

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
      className={`section ${dragOver ? 'ring-2 ring-indigo-400' : ''}`}
      onDragEnter={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={(e) => { e.preventDefault(); setDragOver(false) }}
      onDrop={(e) => {
        e.preventDefault()
        handleFiles(e.dataTransfer?.files)
      }}
    >
      <div className="section-header">
        <UploadCloud size={18} className="text-slate-700" />
        <h3 className="font-semibold">Upload audio/video</h3>
      </div>

      <div className="section-body relative">
        {/* Overlay while uploading */}
        {busy && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-white/70 backdrop-blur-sm">
            <Spinner label="Uploading…" size={20} />
            <p className="text-xs text-slate-500 mt-2">Large files process on the server; this can take a moment.</p>
          </div>
        )}

        <button
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="w-full flex flex-col items-center justify-center gap-2 px-6 py-10 rounded-xl border border-dashed border-slate-300 hover:border-slate-400 bg-white disabled:opacity-60 transition"
          aria-disabled={busy}
        >
          <UploadCloud />
          <div className="text-sm">
            <span className="font-medium">Click to upload</span> or drag & drop
          </div>
          <div className="text-xs text-slate-500">Accepts .mp3, .wav, .m4a, .mp4, .mov, .webm, .mkv</div>
        </button>

        <input
          ref={inputRef}
          type="file"
          accept=".mp3,.wav,.m4a,.mp4,.mov,.webm,.mkv"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {!busy && (
          <p className="mt-3 text-xs text-slate-500 flex items-center gap-2">
            <FileAudio size={14} /> Large files process on the server; it may take a bit.
          </p>
        )}
      </div>
    </div>
  )
}
