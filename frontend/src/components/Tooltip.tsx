import React from 'react'

type Side = 'top' | 'bottom' | 'left' | 'right'

type Props = {
  content: string
  children: React.ReactNode
  side?: Side
  /** Extra class on the wrapper span */
  className?: string
}

const positionClasses: Record<Side, string> = {
  top:    'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left:   'right-full top-1/2 -translate-y-1/2 mr-2',
  right:  'left-full top-1/2 -translate-y-1/2 ml-2',
}

const arrowClasses: Record<Side, string> = {
  top:    'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-0 border-t-gray-900',
  bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-0 border-b-gray-900',
  left:   'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-0 border-l-gray-900',
  right:  'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-0 border-r-gray-900',
}

export default function Tooltip({ content, children, side = 'top', className = '' }: Props) {
  const [visible, setVisible] = React.useState(false)
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  function show() {
    timerRef.current = setTimeout(() => setVisible(true), 300)
  }
  function hide() {
    if (timerRef.current) clearTimeout(timerRef.current)
    setVisible(false)
  }

  return (
    <span
      className={`relative inline-flex ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && content && (
        <span
          className={`pointer-events-none absolute z-[9999] ${positionClasses[side]} animate-fade-in`}
        >
          <span className="relative block whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-lg leading-none">
            {content}
            {/* arrow */}
            <span
              className={`absolute w-0 h-0 border-4 ${arrowClasses[side]}`}
            />
          </span>
        </span>
      )}
    </span>
  )
}
