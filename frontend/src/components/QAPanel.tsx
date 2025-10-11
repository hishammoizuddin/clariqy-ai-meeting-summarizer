import React from 'react'
import { askQuestion } from '../lib/api'
import { Send, Bot, User } from 'lucide-react'
import type { AskResponse } from '../types'

type QAItem = { role: 'user' | 'assistant'; content: string }

export default function QAPanel({ meetingId }: { meetingId: string }) {
  const [input, setInput] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [items, setItems] = React.useState<QAItem[]>([])
  const [error, setError] = React.useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = input.trim()
    if (!q || !meetingId) return
    setError(null)
    setBusy(true)
    setItems((prev) => [...prev, { role: 'user', content: q }])
    setInput('')
    try {
      const res: AskResponse = await askQuestion(meetingId, q)
      setItems((prev) => [...prev, { role: 'assistant', content: res.answer }])
    } catch (e: any) {
      setError(e.message || 'Ask failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="section h-full flex flex-col">
      <div className="section-header">
        <Bot className="text-slate-700" />
        <h2 className="text-sm font-semibold">Chat</h2>
      </div>
      <div className="section-body flex-1 flex min-h-0">
        <div className="flex flex-col w-full">
          <div className="scroll-y maxh pr-1 space-y-3">
            {items.map((it, idx) => (
              <div key={idx} className={`flex gap-2 ${it.role === 'user' ? 'justify-end' : ''}`}>
                <div className={`rounded-xl px-3 py-2 ${it.role === 'user' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200'}`}>
                  <div className="flex items-center gap-2 text-xs mb-1 opacity-70">
                    {it.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                    {it.role === 'user' ? 'You' : 'Assistant'}
                  </div>
                  <div className="whitespace-pre-wrap">{it.content}</div>
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <p className="text-sm text-slate-500">Ask follow-ups about the current meeting once it’s processed.</p>
            )}
          </div>
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
          <form onSubmit={onSubmit} className="mt-3 flex items-center gap-2">
            <input
              value={input}
              disabled={busy || !meetingId}
              onChange={(e) => setInput(e.target.value)}
              placeholder={meetingId ? 'Ask a follow-up question…' : 'Upload or open a meeting first'}
              className="flex-1 px-4 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
            />
            <button
              className="px-4 py-2 rounded-xl bg-slate-900 text-white disabled:opacity-60 hover:bg-slate-800 transition flex items-center gap-2"
              disabled={busy || !meetingId}
              type="submit"
            >
              <Send size={16} /> Ask
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
