import React from 'react'
import { MessageSquareText, ChevronDown } from 'lucide-react'

type Props = {
  transcript: string
}

export default function TranscriptPanel({ transcript }: Props) {
  const [open, setOpen] = React.useState(false)
  return (
    <div className="glass rounded-2xl">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-6 py-4"
        aria-expanded={open}
      >
        <MessageSquareText className="text-brand-600" />
        <span className="font-semibold text-slate-800">Transcript</span>
        <ChevronDown
          className={`ml-auto transition ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-6 pb-6">
          <pre className="whitespace-pre-wrap text-slate-700 max-h-[60vh] overflow-auto">
            {transcript}
          </pre>
        </div>
      )}
    </div>
  )
}
