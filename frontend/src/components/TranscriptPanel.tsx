import React from 'react'
import { MessageSquareText, ChevronDown } from 'lucide-react'

type Props = { transcript: string }

export default function TranscriptPanel({ transcript }: Props) {
  const [open, setOpen] = React.useState(false)

  return (
    <div className="glass rounded-2xl overflow-hidden transition-all duration-500 bg-white/40 border border-gray-200/50">
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-3 px-6 py-4 transition-colors ${open ? 'bg-gray-50/80 border-b border-gray-200/60' : 'hover:bg-gray-50/50'}`}
        aria-expanded={open}
      >
        <div className="p-2 bg-gray-100 text-black rounded-xl">
          <MessageSquareText size={18} />
        </div>
        <span className="text-base font-bold text-black tracking-tight">Full Transcript</span>
        <div className={`ml-auto w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm transition-transform duration-500 ${open ? 'rotate-180' : ''}`}>
          <ChevronDown size={18} className="text-black" />
        </div>
      </button>

      <div
        className={`transition-all duration-500 ease-in-out ${open ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}
      >
        <div className="p-6 bg-white/40">
          <pre className="whitespace-pre-wrap text-black/80 font-sans leading-relaxed text-[15px] max-h-[60vh] overflow-y-auto pr-4 scroll-y">
            {transcript}
          </pre>
        </div>
      </div>
    </div>
  )
}
