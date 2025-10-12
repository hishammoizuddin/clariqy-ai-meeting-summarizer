import { Brain } from 'lucide-react'

export default function TopBar() {
  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-soft">
          <Brain size={18} />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">ClarIQy - AI Meeting Summarizer</h1>
        <span className="ml-auto text-xs text-slate-500">
          {/* API: {import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'} */}
        </span>
      </div>
    </header>
  )
}
