import React from 'react'
import ReactDOM from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Check, X, ArrowRight } from 'lucide-react'

type Reason = 'upload' | 'live' | 'generic'

type Props = {
  open: boolean
  onClose: () => void
  reason?: Reason
}

const HEADLINES: Record<Reason, { title: string; sub: string }> = {
  upload: {
    title: 'Loving it so far?',
    sub: 'Create your free account to keep importing — ClarIQy is completely free.',
  },
  live: {
    title: 'Nice recording!',
    sub: 'Create your free account to keep recording — ClarIQy is completely free.',
  },
  generic: {
    title: 'Create your free account',
    sub: 'Unlock unlimited recordings, uploads, and collections — completely free.',
  },
}

const PERKS = [
  'Unlimited recordings & uploads',
  'Organize meetings into collections',
  'Ask questions across all your sessions',
  'Everything you just created is saved',
]

export default function GuestSignupPrompt({ open, onClose, reason = 'generic' }: Props) {
  const navigate = useNavigate()

  // Lock scroll + push sticky header behind overlay while open
  React.useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    document.body.classList.add('modal-open')
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      document.body.classList.remove('modal-open')
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  const { title, sub } = HEADLINES[reason]

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in">
      {/* Frosted backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-2xl" onClick={onClose} />

      {/* Card */}
      <div className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl border border-white/60 overflow-hidden animate-scale-in">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full text-gray-400 hover:text-black hover:bg-gray-100 transition-all"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Header band */}
        <div className="bg-black px-6 sm:px-8 pt-10 pb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white animate-float">
            <Sparkles size={26} />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">{title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-white/70 max-w-[20rem] mx-auto">{sub}</p>
        </div>

        {/* Perks */}
        <div className="px-6 sm:px-8 py-6 space-y-3">
          {PERKS.map((perk) => (
            <div key={perk} className="flex items-center gap-3">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 shrink-0">
                <Check size={12} className="text-black" />
              </span>
              <span className="text-sm font-medium text-gray-700">{perk}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="px-6 sm:px-8 pb-8 space-y-3">
          <button
            onClick={() => navigate('/signup')}
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-5 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-gray-800 hover:-translate-y-0.5"
          >
            Create free account
            <ArrowRight size={16} />
          </button>
          <button
            onClick={() => navigate('/login')}
            className="w-full inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-600 transition hover:border-black/30 hover:text-black"
          >
            I already have an account
          </button>
          <p className="text-center text-[11px] text-gray-400 pt-1">
            Free forever · No credit card required
          </p>
        </div>
      </div>
    </div>,
    document.body,
  )
}
