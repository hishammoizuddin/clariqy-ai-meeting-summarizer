import React from 'react'
import { Send, Bot, User, MessageCircle, Eraser } from 'lucide-react'
import { askQuestion } from '../lib/api'
import type { AskResponse } from '../types'
import Spinner from './Spinner'

type QAItem = { role: 'user' | 'assistant'; content: string }

export default function QAPanel({ meetingId, meetingTitle }: { meetingId: string, meetingTitle?: string | null }) {
  const [input, setInput] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [items, setItems] = React.useState<QAItem[]>([])
  const [error, setError] = React.useState<string | null>(null)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  // 🔄 Reset chat whenever the active meeting context changes
  React.useEffect(() => {
    setItems([])
    setError(null)
    setInput('')
  }, [meetingId])

  // Scroll to bottom on new message
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [items, busy])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!meetingId || !input.trim() || busy) return
    const q = input.trim()
    setInput('')
    setBusy(true)
    setError(null)

    // show the user message immediately
    setItems((prev) => [...prev, { role: 'user', content: q }])

    try {
      const resp: AskResponse = await askQuestion(meetingId, q)
      const answer = resp?.answer || '(no answer)'
      setItems((prev) => [...prev, { role: 'assistant', content: answer }])
    } catch (err: any) {
      setError(err?.message || 'Failed to get an answer')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="section h-full flex flex-col min-h-0 relative overflow-hidden">
      <div className="section-header relative z-10 flex items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 text-black rounded-xl">
            <MessageCircle size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-black">Ask Questions</h2>
            <span className="text-[11px] font-medium text-gray-500 line-clamp-1 max-w-[200px]">
              {meetingId ? `Chatting about ${meetingTitle || 'Active Meeting'}` : 'Upload or select a meeting first'}
            </span>
          </div>
        </div>
        {/* 🧹 Small Clear button */}
        <button
          type="button"
          onClick={() => { setItems([]); setError(null); }}
          className="ml-3 px-3 py-1.5 text-xs font-semibold rounded-full border border-gray-200 bg-white hover:bg-gray-50 hover:border-black/50 text-gray-600 hover:text-black disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-sm shrink-0"
          disabled={items.length === 0 && !error}
          title="Clear chat"
        >
          <Eraser size={12} /> Clear
        </button>
      </div>

      <div className="section-body flex-1 flex flex-col min-h-0 pt-2 pb-5 z-10">
        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto pr-2 space-y-5 scroll-smooth scroll-y mb-4">

          {items.length === 0 && !busy && (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60 px-4 text-center">
              <Bot size={48} className="mb-4 text-gray-300" />
              <p className="text-sm max-w-[200px]">
                {meetingId ? `Ask anything about "${meetingTitle || 'the meeting'}" to get instant answers.` : 'Ask anything about the meeting to get instant answers.'}
              </p>
            </div>
          )}

          {items.map((m, i) => (
            <div key={i} className={`flex w-full animate-fade-in-up ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'} gap-3 items-end`}>

                {/* Avatar */}
                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${m.role === 'user' ? 'bg-black text-white' : 'bg-white border border-gray-200 text-black'}`}>
                  {m.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                </div>

                {/* Bubble */}
                <div
                  className={`px-4 py-3 text-[15px] leading-relaxed shadow-sm ${m.role === 'user'
                    ? 'bg-black text-white rounded-2xl rounded-br-sm'
                    : 'bg-white text-black border border-gray-200 rounded-2xl rounded-bl-sm'
                    }`}
                >
                  <div className="whitespace-pre-wrap break-words">{m.content}</div>
                </div>

              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {busy && (
            <div className="flex w-full justify-start animate-fade-in">
              <div className="flex max-w-[85%] flex-row gap-3 items-end">
                <div className="shrink-0 w-8 h-8 rounded-full bg-white border border-gray-200 text-black flex items-center justify-center shadow-sm">
                  <Bot size={14} />
                </div>
                <div className="px-5 py-3.5 bg-white text-gray-500 border border-gray-200 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            </div>
          )}

          {error && <div className="text-sm text-black font-semibold text-center bg-gray-100 p-3 rounded-xl border border-black">{error}</div>}
        </div>

        {/* Composer */}
        <div className="relative mt-auto pt-2">
          <form onSubmit={onSubmit} className="relative flex items-end gap-2 bg-white/80 backdrop-blur border border-gray-200 shadow-sm rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-black/20 focus-within:border-black transition-all">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={meetingId ? 'Ask a question...' : 'Upload or select a meeting'}
              disabled={busy || !meetingId}
              className="flex-1 w-full bg-transparent px-4 pl-4 py-3 h-12 text-[15px] text-black placeholder:text-gray-400 focus:outline-none disabled:opacity-50"
            />
            <button
              className="w-10 h-10 rounded-xl bg-black text-white disabled:opacity-50 disabled:bg-gray-300 disabled:text-gray-500 hover:bg-gray-800 transition-all flex items-center justify-center shrink-0 shadow-md transform hover:scale-105 active:scale-95"
              disabled={busy || !meetingId || !input.trim()}
              type="submit"
              title="Send message"
            >
              {busy ? <Spinner size={16} /> : <Send size={16} className="-ml-0.5 mt-0.5" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
