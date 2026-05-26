import React from 'react'
import { Send, Bot, User, MessageCircle, Eraser, Layers } from 'lucide-react'
import { askQuestion, askCollectionQuestion } from '../lib/api'
import type { AskResponse } from '../types'
import Spinner from './Spinner'

type QAItem = { role: 'user' | 'assistant'; content: string }

export default function QAPanel({
  meetingId,
  meetingTitle,
  collectionId,
  collectionName,
}: {
  meetingId: string
  meetingTitle?: string | null
  collectionId?: number | null
  collectionName?: string | null
}) {
  const [input, setInput] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [items, setItems] = React.useState<QAItem[]>([])
  const [error, setError] = React.useState<string | null>(null)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  const isCollectionMode = Boolean(collectionId)

  // 🔄 Reset chat whenever the active context changes
  React.useEffect(() => {
    setItems([])
    setError(null)
    setInput('')
  }, [meetingId, collectionId])

  // Scroll to bottom on new message
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [items, busy])

  const canAsk = isCollectionMode ? Boolean(collectionId) : Boolean(meetingId)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canAsk || !input.trim() || busy) return
    const q = input.trim()
    setInput('')
    setBusy(true)
    setError(null)

    setItems((prev) => [...prev, { role: 'user', content: q }])

    try {
      let resp: AskResponse
      if (isCollectionMode && collectionId) {
        resp = await askCollectionQuestion(collectionId, q)
      } else {
        resp = await askQuestion(meetingId, q)
      }
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
      <div className="section-header relative z-10 flex items-start sm:items-center justify-between gap-3 pb-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className={`p-2 rounded-xl ${isCollectionMode ? 'bg-black text-white' : 'bg-gray-100 text-black'}`}>
            {isCollectionMode ? <Layers size={18} /> : <MessageCircle size={18} />}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold tracking-tight text-black">
              {isCollectionMode ? 'Ask Across Collection' : 'Ask Questions'}
            </h2>
            <span className="block text-[11px] font-medium leading-relaxed text-gray-500 break-words sm:line-clamp-2">
              {isCollectionMode
                ? `Searching all sessions in "${collectionName || 'Collection'}"`
                : meetingId
                  ? `Chatting about ${meetingTitle || 'Active Record'}`
                  : 'Upload or select a record first'}
            </span>
          </div>
        </div>
        {/* 🧹 Small Clear button */}
        <button
          type="button"
          onClick={() => { setItems([]); setError(null); }}
          className="px-3 py-1.5 text-xs font-semibold rounded-full border border-gray-200 bg-white hover:bg-gray-50 hover:border-black/50 text-gray-600 hover:text-black disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-sm shrink-0 self-start sm:self-center"
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
              <p className="text-sm max-w-[240px] leading-relaxed">
                {isCollectionMode
                  ? `Ask anything across all sessions in "${collectionName || 'this collection'}" — ClarIQy searches the entire knowledge base.`
                  : meetingId
                    ? `Ask anything about "${meetingTitle || 'the record'}" to get instant answers.`
                    : 'Upload or select a record to start asking questions.'}
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
          <form onSubmit={onSubmit} className="relative flex items-center gap-2 bg-white/80 backdrop-blur border border-gray-200 shadow-sm rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-black/20 focus-within:border-black transition-all">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={canAsk ? 'Ask a question...' : 'Upload or select a record'}
              disabled={busy || !canAsk}
              className="flex-1 w-full bg-transparent px-4 pl-4 py-3 h-12 text-[15px] text-black placeholder:text-gray-400 focus:outline-none disabled:opacity-50"
            />
            <button
              className="w-10 h-10 rounded-xl bg-black text-white disabled:opacity-50 disabled:bg-gray-300 disabled:text-gray-500 hover:bg-gray-800 transition-all flex items-center justify-center shrink-0 shadow-md transform hover:scale-105 active:scale-95"
              disabled={busy || !canAsk || !input.trim()}
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
