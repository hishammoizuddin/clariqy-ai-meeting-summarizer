import { Brain } from 'lucide-react'

export default function TopBar() {
  return (
    <header className="sticky top-0 z-30 bg-white/50 backdrop-blur-xl border-b border-gray-200/60 shadow-glass transition-all duration-300">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-4">
        <div className="h-10 w-10 rounded-2xl bg-black text-white flex items-center justify-center shadow-soft relative group">
          <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <Brain size={20} className="relative z-10 drop-shadow-md" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-black">ClarIQy</h1>
          <p className="text-[10px] uppercase font-bold tracking-wider text-gray-500 -mt-1 hidden sm:block">AI Meeting Summarizer</p>
        </div>
      </div>
    </header>
  )
}
