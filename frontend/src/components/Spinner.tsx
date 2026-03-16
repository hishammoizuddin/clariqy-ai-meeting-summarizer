import React from 'react'
import { Loader2 } from 'lucide-react'

type Props = {
  label?: string
  size?: number
  className?: string
}

export default function Spinner({ label, size = 18, className = '' }: Props) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`} aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading...</span>
      <Loader2 size={size} className="animate-spin" />
      {label ? <span className="text-sm text-gray-600">{label}</span> : null}
    </div>
  )
}
