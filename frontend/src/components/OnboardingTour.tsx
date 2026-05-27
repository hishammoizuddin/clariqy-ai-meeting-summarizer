import React, { useState, useEffect, useCallback, useRef } from 'react'
import { ArrowRight, ArrowLeft, X, Layers, Mic, MessageCircle, Sparkles } from 'lucide-react'

const STORAGE_KEY = 'clariqy_tour_v1'

type Placement = 'right' | 'left' | 'bottom' | 'top' | 'center'

interface Step {
  target: string | null
  placement: Placement
  icon: React.ReactNode
  title: string
  body: string
}

const STEPS: Step[] = [
  {
    target: null,
    placement: 'center',
    icon: <Sparkles size={28} className="text-white" />,
    title: 'Welcome to ClarIQy 👋',
    body: 'Your AI-powered knowledge base for every conversation. Transcribe, summarize, and chat across all your sessions — organized exactly the way you think.',
  },
  {
    target: 'sidebar',
    placement: 'right',
    icon: <Layers size={22} className="text-black" />,
    title: 'Your Knowledge Base',
    body: 'Organize recordings into collections — a course, a project, a client. Group related sessions together and search across all of them at once.',
  },
  {
    target: 'capture',
    placement: 'top',
    icon: <Mic size={22} className="text-black" />,
    title: 'Start a New Session',
    body: 'Record live conversations or import any audio/video file. ClarIQy transcribes every word and identifies each speaker automatically.',
  },
  {
    target: 'chat',
    placement: 'left',
    icon: <MessageCircle size={22} className="text-black" />,
    title: 'Your AI Research Assistant',
    body: 'Ask anything about a single session or an entire collection. ClarIQy searches your full knowledge base and synthesizes answers in seconds.',
  },
  {
    target: null,
    placement: 'center',
    icon: <span className="text-3xl">🎉</span>,
    title: "You're all set!",
    body: 'Create your first collection or upload a recording to get started. You can always revisit this tour from the Help menu.',
  },
]

// ── Spotlight rect ────────────────────────────────────────────────────────────

const SPOT_PAD = 14

interface SpotlightRect { x: number; y: number; w: number; h: number }

function getSpotlightRect(target: string): SpotlightRect | null {
  const el = document.querySelector(`[data-tour="${target}"]`)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return {
    x: r.left - SPOT_PAD,
    y: r.top  - SPOT_PAD,
    w: r.width  + SPOT_PAD * 2,
    h: r.height + SPOT_PAD * 2,
  }
}

// ── Tooltip positioning ───────────────────────────────────────────────────────

const CARD_W    = 300
const CARD_H    = 230   // generous estimate so clamping is conservative
const CARD_GAP  = 16    // gap between spotlight edge and card
const VW_MARGIN = 12    // min distance from viewport edge

interface CardPos { left: number; top: number }

function computeCardPos(rect: SpotlightRect, preferred: Placement): CardPos {
  const vw = window.innerWidth
  const vh = window.innerHeight

  // Candidate positions for each placement
  const candidates: Record<string, CardPos> = {
    right:  { left: rect.x + rect.w + CARD_GAP,            top: rect.y + rect.h / 2 - CARD_H / 2 },
    left:   { left: rect.x - CARD_GAP - CARD_W,            top: rect.y + rect.h / 2 - CARD_H / 2 },
    bottom: { left: rect.x + rect.w / 2 - CARD_W / 2,      top: rect.y + rect.h + CARD_GAP        },
    top:    { left: rect.x + rect.w / 2 - CARD_W / 2,      top: rect.y - CARD_GAP - CARD_H        },
  }

  // Try the preferred placement first, then fallbacks
  const order: Placement[] = [preferred, 'bottom', 'top', 'right', 'left']

  for (const p of order) {
    if (p === 'center') continue
    const pos = candidates[p]
    if (!pos) continue
    const okH = pos.left >= VW_MARGIN && pos.left + CARD_W <= vw - VW_MARGIN
    const okV = pos.top  >= VW_MARGIN && pos.top  + CARD_H <= vh - VW_MARGIN
    if (okH && okV) return pos
  }

  // Last resort: use preferred but clamp hard to viewport
  const base = candidates[preferred] ?? candidates.bottom
  return {
    left: Math.max(VW_MARGIN, Math.min(base.left, vw - CARD_W - VW_MARGIN)),
    top:  Math.max(VW_MARGIN, Math.min(base.top,  vh - CARD_H - VW_MARGIN)),
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface TourProps {
  restartSignal?: number  // increment this to restart the tour at any time
}

export default function OnboardingTour({ restartSignal = 0 }: TourProps) {
  const [step, setStep]       = useState(0)
  const [rect, setRect]       = useState<SpotlightRect | null>(null)
  const [cardPos, setCardPos] = useState<CardPos | null>(null)
  const [visible, setVisible] = useState(false)
  const [done, setDone]       = useState(() => Boolean(localStorage.getItem(STORAGE_KEY)))
  const animRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Restart tour whenever restartSignal increments
  useEffect(() => {
    if (restartSignal === 0) return
    localStorage.removeItem(STORAGE_KEY)
    setDone(false)
    setStep(0)
    setVisible(false)
    if (animRef.current) clearTimeout(animRef.current)
    animRef.current = setTimeout(() => setVisible(true), 300)
  }, [restartSignal])

  // Recalculate spotlight + card position
  const recalc = useCallback(() => {
    const target = STEPS[step].target
    const placement = STEPS[step].placement

    if (!target || placement === 'center') {
      setRect(null)
      setCardPos(null)
      return
    }

    const sr = getSpotlightRect(target)
    setRect(sr)
    if (sr) setCardPos(computeCardPos(sr, placement))
    else     setCardPos(null)
  }, [step])

  // Initial show after render
  useEffect(() => {
    if (done) return
    animRef.current = setTimeout(() => { setVisible(true); recalc() }, 800)
    return () => { if (animRef.current) clearTimeout(animRef.current) }
  }, [done, recalc])

  // Recalc on step change, resize, or scroll
  useEffect(() => {
    if (!visible || done) return
    recalc()
    window.addEventListener('resize', recalc)
    window.addEventListener('scroll', recalc, true)
    return () => {
      window.removeEventListener('resize', recalc)
      window.removeEventListener('scroll', recalc, true)
    }
  }, [visible, step, recalc, done])

  const finish = useCallback(() => {
    setVisible(false)
    localStorage.setItem(STORAGE_KEY, '1')
    setDone(true)
  }, [])

  const next = useCallback(() => {
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else finish()
  }, [step, finish])

  const prev = useCallback(() => {
    if (step > 0) setStep(s => s - 1)
  }, [step])

  // Keyboard nav
  useEffect(() => {
    if (!visible) return
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') next()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'Escape') finish()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [visible, next, prev, finish])

  if (!visible || done) return null

  const currentStep = STEPS[step]
  const isCentered  = currentStep.placement === 'center'
  const isFirst     = step === 0
  const isLast      = step === STEPS.length - 1

  // Build the card's fixed-position style
  const cardStyle: React.CSSProperties = isCentered
    ? { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 92 }
    : cardPos
      ? { position: 'fixed', left: cardPos.left, top: cardPos.top, width: CARD_W, zIndex: 92 }
      : { display: 'none' }

  return (
    <>
      {/* ── SVG spotlight overlay ── */}
      <svg
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 90, width: '100vw', height: '100vh' }}
      >
        <defs>
          <mask id="tour-spotlight-mask">
            <rect fill="white" x="0" y="0" width="100%" height="100%" />
            {rect && !isCentered && (
              <rect
                fill="black"
                x={rect.x} y={rect.y}
                width={rect.w} height={rect.h}
                rx={16}
              />
            )}
          </mask>
        </defs>
        <rect
          x="0" y="0" width="100%" height="100%"
          fill="rgba(0,0,0,0.62)"
          mask="url(#tour-spotlight-mask)"
        />
      </svg>

      {/* ── Click blocker (outside the card) ── */}
      <div className="fixed inset-0" style={{ zIndex: 91 }} />

      {/* ── Tooltip / welcome card ── */}
      <div style={cardStyle} className="pointer-events-auto animate-scale-in">

        {isFirst || isLast ? (
          /* Welcome / done full card */
          <div className="bg-black rounded-3xl p-8 shadow-2xl text-white text-center"
               style={{ width: 360, maxWidth: 'calc(100vw - 24px)' }}>
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 mx-auto mb-5">
              {currentStep.icon}
            </div>
            <h2 className="text-xl font-extrabold mb-3 tracking-tight">{currentStep.title}</h2>
            <p className="text-sm text-white/70 leading-relaxed mb-6">{currentStep.body}</p>

            {isFirst ? (
              <div className="space-y-3">
                <button onClick={next}
                  className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-white text-black font-bold rounded-xl hover:bg-gray-100 transition-all">
                  Take a quick tour <ArrowRight size={16} />
                </button>
                <button onClick={finish}
                  className="w-full py-2 text-sm text-white/50 hover:text-white/80 transition-colors">
                  Skip for now
                </button>
              </div>
            ) : (
              <button onClick={finish}
                className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-white text-black font-bold rounded-xl hover:bg-gray-100 transition-all">
                Let's go! <ArrowRight size={16} />
              </button>
            )}
          </div>

        ) : (
          /* Spotlight tooltip */
          <div className="relative bg-white rounded-2xl p-5 shadow-2xl">
            {/* Close */}
            <button onClick={finish}
              className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              <X size={13} />
            </button>

            <div className="flex items-center gap-3 mb-3 pr-6">
              <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                {currentStep.icon}
              </div>
              <h3 className="text-sm font-extrabold text-gray-900 leading-snug">{currentStep.title}</h3>
            </div>

            <p className="text-[13px] text-gray-500 leading-relaxed mb-4">{currentStep.body}</p>

            {/* Progress + nav */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1.5">
                {STEPS.map((_, i) => (
                  <div key={i} className={`rounded-full transition-all duration-300 ${
                    i === step ? 'w-4 h-2 bg-black' : 'w-2 h-2 bg-gray-200'
                  }`} />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={prev}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                  <ArrowLeft size={14} />
                </button>
                <button onClick={next}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black text-white text-xs font-bold hover:bg-gray-800 transition-colors">
                  {step === STEPS.length - 2 ? 'Finish' : 'Next'} <ArrowRight size={12} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
