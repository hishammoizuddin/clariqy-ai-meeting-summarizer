import React from 'react'
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
 * Full-card overlay shown while an API call is in progress.
 * Auto-advances through `steps` on a timer to communicate what's happening,
 * staying on the final step until the parent unmounts this component.
 */
export default function ProcessingOverlay({ steps, stepInterval = 4200, title }: Props) {
  const [activeStep, setActiveStep] = React.useState(0)
  const [completedSteps, setCompletedSteps] = React.useState<Set<number>>(new Set())

  React.useEffect(() => {
    // Advance through all steps except the last
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

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center rounded-2xl bg-white/[0.97] backdrop-blur-2xl animate-fade-in px-6">

      {/* Animated orb */}
      <div className="relative mb-4 flex items-center justify-center">
        <span className="absolute h-20 w-20 rounded-full border border-black/10 animate-ring-ping" />
        <span className="absolute h-20 w-20 rounded-full border border-black/10 animate-ring-ping" style={{ animationDelay: '0.6s' }} />
        <div className="relative z-10 h-12 w-12 rounded-2xl bg-black flex items-center justify-center shadow-lg animate-float text-white">
          {current.icon}
        </div>
      </div>

      {/* Title & current detail */}
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400 mb-0.5">
        {title ?? 'Processing'}
      </p>
      <p
        key={activeStep}
        className="text-sm font-bold text-black text-center mb-0.5 animate-slide-up"
      >
        {current.label}
      </p>
      <p
        key={`d-${activeStep}`}
        className="text-xs text-gray-500 text-center max-w-[240px] leading-relaxed mb-4 animate-slide-up"
        style={{ animationDelay: '0.05s' }}
      >
        {current.detail}
      </p>

      {/* Indeterminate progress bar */}
      <div className="w-44 h-1 rounded-full bg-gray-100 overflow-hidden mb-4">
        <div className="h-full w-1/2 rounded-full bg-black origin-left animate-progress-bar" />
      </div>

      {/* Step list */}
      <div className="flex flex-col gap-1.5 w-full max-w-[220px]">
        {steps.map((step, i) => {
          const done = completedSteps.has(i)
          const active = i === activeStep
          return (
            <div
              key={i}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-300 ${
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
                  {active ? (
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-gray-300" />
                  )}
                </span>
              )}
              <span className="text-xs font-semibold truncate">{step.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
