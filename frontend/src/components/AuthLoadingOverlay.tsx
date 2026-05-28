import { Brain } from 'lucide-react'

interface Props {
  message: string
  subMessage?: string
}

export default function AuthLoadingOverlay({ message, subMessage }: Props) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/85 backdrop-blur-md rounded-3xl animate-fade-in">

      {/* Brain icon + pulsing rings */}
      <div className="relative flex items-center justify-center mb-5">
        {/* Outer slow ping */}
        <span
          className="absolute inline-flex rounded-full bg-black/8 animate-ping"
          style={{ width: '88px', height: '88px', animationDuration: '1.8s' }}
        />
        {/* Middle ping */}
        <span
          className="absolute inline-flex rounded-full bg-black/12 animate-ping"
          style={{ width: '64px', height: '64px', animationDuration: '1.8s', animationDelay: '0.35s' }}
        />
        {/* Brain icon */}
        <div className="relative z-10 flex items-center justify-center h-12 w-12 rounded-2xl bg-black text-white shadow-soft"
          style={{ animation: 'authFloat 2.8s ease-in-out infinite' }}
        >
          <Brain size={24} className="drop-shadow-md" />
        </div>
      </div>

      {/* Text */}
      <p className="text-sm font-bold text-gray-900 tracking-tight">{message}</p>
      {subMessage && (
        <p className="text-xs text-gray-400 mt-1">{subMessage}</p>
      )}

      {/* Bouncing dots */}
      <div className="flex gap-1.5 mt-4">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.9s' }}
          />
        ))}
      </div>

      <style>{`
        @keyframes authFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  )
}
