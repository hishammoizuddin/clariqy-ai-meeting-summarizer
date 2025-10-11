import React from 'react'
import { UploadCloud, FileAudio } from 'lucide-react'
import { uploadFile } from '../lib/api'
import type { UploadResponse } from '../types'

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
      setError(e.message || 'Upload failed')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
      setDragOver(false)
    }
  }

  return (
    <div
      className={`section ${dragOver ? 'ring-2 ring-slate-400' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
    >
      <div className="section-header">
        <UploadCloud className="text-slate-700" />
        <h2 className="text-sm font-semibold">Upload audio/video</h2>
      </div>
      <div className="section-body">
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="w-full rounded-xl border border-dashed border-slate-300 py-10 flex flex-col items-center justify-center hover:bg-slate-50 transition"
        >
          <UploadCloud className="mb-2" />
          <span className="font-medium">{busy ? 'Uploading…' : 'Click to choose or drag & drop'}</span>
          <span className="text-xs text-slate-500 mt-1">MP3, WAV, M4A, MP4, MOV, WEBM, MKV</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".mp3,.wav,.m4a,.mp4,.mov,.webm,.mkv"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <p className="mt-3 text-xs text-slate-500 flex items-center gap-2">
          <FileAudio size={14} /> Large files process on the server; it may take a bit.
        </p>
      </div>
    </div>
  )
}
