import { Brain, LogOut } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function TopBar() {
  const { user, logout } = useAuth()

  return (
    <header className="sticky top-0 z-30 bg-white/50 backdrop-blur-xl border-b border-gray-200/60 shadow-glass transition-all duration-300">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-4 group">
          <div className="h-10 w-10 rounded-2xl bg-black text-white flex items-center justify-center shadow-soft relative">
            <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <Brain size={20} className="relative z-10 drop-shadow-md" />
          </div>
          <div className="flex items-start gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-black">ClarIQy</h1>
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-gray-100/80 text-gray-600 border border-gray-200/50">Beta</span>
              </div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-gray-500 hidden sm:block">AI Meeting Summarizer</p>
            </div>
          </div>
        </Link>
        {user ? (
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-sm font-semibold text-gray-600 hover:text-black hidden sm:block">Dashboard</Link>
            <button onClick={logout} className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-black transition-colors">
              <LogOut size={16} /> <span className="hidden sm:block">Sign out</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-semibold py-2 px-4 rounded-xl bg-black text-white hover:bg-gray-800 transition-all shadow-soft group">
              Sign In
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
