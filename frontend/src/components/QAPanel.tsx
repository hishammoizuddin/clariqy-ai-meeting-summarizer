import React from 'react'
import { Send, Bot, User } from 'lucide-react'
import { askQuestion } from '../lib/api'
import type { AskResponse } from '../types'
import Spinner from './Spinner'

type QAItem = { role: 'user' | 'assistant'; content: string }

export default function QAPanel({ meetingId }: { meetingId: string }) {
  const [input, setInput] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [items, setItems] = React.useState<QAItem[]>([])
  const [error, setError] = React.useState<string | null>(null)

  // 🔄 Reset chat whenever the active meeting context changes
  React.useEffect(() => {
    setItems([])
    setError(null)
    setInput('')
  }, [meetingId])

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
    <div className="section h-full flex flex-col min-h-0">
      <div className="section-header">
        <h2 className="text-sm font-semibold">Ask the transcript</h2>
        <span className="ml-auto text-xs text-slate-500">
          {meetingId ? 'Ready' : 'Upload or select a meeting first'}
        </span>
        {/* 🧹 Small Clear button */}
        <button
          type="button"
          onClick={() => { setItems([]); setError(null); }}
          className="ml-3 px-2 py-1 text-xs rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-50"
          disabled={items.length === 0 && !error}
          title="Clear chat"
        >
          Clear
        </button>
      </div>

      <div className="section-body flex-1 flex flex-col min-h-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3">
          {items.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                  m.role === 'user'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-800 border border-slate-200'
                }`}
              >
                <div className="mb-1 flex items-center gap-2 opacity-70">
                  {m.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                  <span className="text-xs">{m.role === 'user' ? 'You' : 'Assistant'}</span>
                </div>
                <div className="whitespace-pre-wrap break-words">{m.content}</div>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {busy && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-xl px-3 py-2 text-sm bg-slate-100 text-slate-800 border border-slate-200">
                <div className="mb-1 flex items-center gap-2 opacity-70">
                  <Bot size={14} />
                  <span className="text-xs">Assistant</span>
                </div>
                <Spinner label="Thinking…" />
              </div>
            </div>
          )}

          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>

        {/* Composer */}
        <form onSubmit={onSubmit} className="mt-3 flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={meetingId ? 'Ask a question about this meeting…' : 'Upload a meeting to ask questions'}
            disabled={busy || !meetingId}
            className="flex-1 min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-60"
          />
          <button
            className="px-4 py-2 rounded-xl bg-slate-900 text-white disabled:opacity-50 hover:bg-slate-800 transition flex items-center gap-2 shrink-0 nowrap"
            disabled={busy || !meetingId}
            type="submit"
          >
            {busy ? <Spinner /> : <Send size={16} />}
            <span className="text-sm">{busy ? 'Sending' : 'Ask'}</span>
          </button>
        </form>
      </div>
    </div>
  )
}
