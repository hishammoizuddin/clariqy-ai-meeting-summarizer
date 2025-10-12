import React from 'react'
import { MessageSquareText, ChevronDown } from 'lucide-react'

type Props = { transcript: string }

export default function TranscriptPanel({ transcript }: Props) {
  const [open, setOpen] = React.useState(false)
  return (
    <div className="glass rounded-2xl">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-5 py-3"
        aria-expanded={open}
      >
        <MessageSquareText className="text-slate-700" />
        <span className="text-sm font-semibold">Transcript</span>
        <ChevronDown className={`ml-auto transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-5 pb-5">
          <pre className="whitespace-pre-wrap text-slate-700 max-h-[60vh] overflow-auto">
            {transcript}
          </pre>
        </div>
      )}
    </div>
  )
}
