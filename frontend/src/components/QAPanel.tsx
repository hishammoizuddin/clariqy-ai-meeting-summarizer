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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = input.trim()
    if (!q || !meetingId || busy) return

    setError(null)
    setBusy(true)
    setItems((prev) => [...prev, { role: 'user', content: q }])
    setInput('')

    try {
      const res: AskResponse = await askQuestion(meetingId, q)
      setItems((prev) => [...prev, { role: 'assistant', content: res.answer }])
    } catch (e: any) {
      setError(e?.message || 'Ask failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="section h-full flex flex-col">
      <div className="section-header">
        <Bot size={18} className="text-slate-700" />
        <h3 className="font-semibold">Ask about this meeting</h3>
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
                <div className="flex items-center gap-2 mb-1 opacity-70">
                  {m.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                  <span className="text-xs">{m.role === 'user' ? 'You' : 'Assistant'}</span>
                </div>
                <div className="whitespace-pre-wrap break-words">{m.content}</div>
              </div>
            </div>
          ))}

          {/* Inline typing indicator while waiting for answer */}
          {busy && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-xl px-3 py-2 text-sm bg-slate-100 border border-slate-200">
                <div className="flex items-center gap-2 mb-1 opacity-70">
                  <Bot size={14} />
                  <span className="text-xs">Assistant</span>
                </div>
                <Spinner label="Thinking…" />
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        {/* Composer */}
        <div className="mt-3">
          <form onSubmit={onSubmit} className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={meetingId ? 'Ask a question about the meeting…' : 'Upload a meeting to start…'}
              disabled={busy || !meetingId}
              className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-60"
            />
            <button
              className="px-4 py-2 rounded-xl bg-slate-900 text-white disabled:opacity-60 hover:bg-slate-800 transition flex items-center gap-2"
              disabled={busy || !meetingId}
              type="submit"
            >
              {busy ? <Spinner /> : <Send size={16} />}
              <span className="text-sm">{busy ? 'Sending' : 'Ask'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
