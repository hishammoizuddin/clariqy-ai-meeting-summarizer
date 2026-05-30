import React from 'react'
import ReactDOM from 'react-dom'
import { Check } from 'lucide-react'

export type ProcessingStep = {
  label: string
  detail: string
  icon: React.ReactNode
}

type Props = {
  steps: ProcessingStep[]
  /** ms between each step auto-advance. Default 4200 */
  stepInterval?: number
  title?: string
}

/**
 * Full-screen overlay portal — renders directly on document.body so it sits
 * above every element (including sticky headers with backdrop-filter).
 * Auto-advances through `steps` on a timer until the parent unmounts it.
 */
export default function ProcessingOverlay({ steps, stepInterval = 4200, title }: Props) {
  const [activeStep, setActiveStep] = React.useState(0)
  const [completedSteps, setCompletedSteps] = React.useState<Set<number>>(new Set())

  // Push the sticky header behind the overlay. We intentionally do NOT lock
  // body scroll here — the overlay is already a full-screen fixed element, and
  // locking scroll during a mid-action auth state change (guest session
  // creation on the landing page) could leave the page frozen after unmount.
  React.useEffect(() => {
    document.body.classList.add('modal-open')
    return () => {
      document.body.classList.remove('modal-open')
    }
  }, [])

  // Auto-advance through steps
  React.useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    steps.forEach((_, i) => {
      if (i === 0) return
      timers.push(
        setTimeout(() => {
          setCompletedSteps((prev) => new Set([...prev, i - 1]))
          setActiveStep(i)
        }, i * stepInterval),
      )
    })
    return () => timers.forEach(clearTimeout)
  }, [steps.length, stepInterval])

  const current = steps[activeStep] ?? steps[steps.length - 1]

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center animate-fade-in">

      {/* Full-screen frosted backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-xl" />

      {/* Floating card */}
      <div className="relative z-10 flex flex-col items-center bg-white rounded-3xl shadow-2xl px-6 pt-10 pb-8 sm:px-10 sm:pt-14 sm:pb-10 w-full max-w-sm mx-4 animate-scale-in border border-white/60 overflow-hidden">

        {/* Animated orb */}
        <div className="relative mb-6 flex items-center justify-center">
          <span className="absolute h-24 w-24 rounded-full border border-black/8 animate-ring-ping" />
          <span className="absolute h-24 w-24 rounded-full border border-black/8 animate-ring-ping" style={{ animationDelay: '0.7s' }} />
          <div className="relative z-10 h-14 w-14 rounded-2xl bg-black flex items-center justify-center shadow-lg animate-float text-white">
            {current.icon}
          </div>
        </div>

        {/* Labels */}
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400 mb-1">
          {title ?? 'Processing'}
        </p>
        <p key={activeStep} className="text-lg font-bold text-black text-center mb-1 animate-slide-up">
          {current.label}
        </p>
        <p
          key={`d-${activeStep}`}
          className="text-sm text-gray-500 text-center max-w-[260px] leading-relaxed mb-6 animate-slide-up"
          style={{ animationDelay: '0.05s' }}
        >
          {current.detail}
        </p>

        {/* Indeterminate progress bar */}
        <div className="w-full h-1 rounded-full bg-gray-100 overflow-hidden mb-6">
          <div className="h-full w-1/2 rounded-full bg-black origin-left animate-progress-bar" />
        </div>

        {/* Step list */}
        <div className="flex flex-col gap-2 w-full">
          {steps.map((step, i) => {
            const done = completedSteps.has(i)
            const active = i === activeStep
            return (
              <div
                key={i}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 ${
                  active
                    ? 'bg-black text-white'
                    : done
                    ? 'bg-gray-50 text-gray-400'
                    : 'text-gray-300'
                }`}
              >
                {done ? (
                  <span className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center shrink-0 animate-check-in">
                    <Check size={11} className="text-gray-500" />
                  </span>
                ) : (
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${
                      active ? 'border-white/30 bg-white/10' : 'border-gray-200 bg-gray-100'
                    }`}
                  >
                    {active
                      ? <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      : <span className="w-2 h-2 rounded-full bg-gray-300" />}
                  </span>
                )}
                <span className="text-xs font-semibold">{step.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>,
    document.body,
  )
}
