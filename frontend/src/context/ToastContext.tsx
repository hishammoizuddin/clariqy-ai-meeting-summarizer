import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  type: ToastType
  message: string
}

interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void
  confirm: (opts: ConfirmOptions) => Promise<boolean>
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

// ── Confirm modal ────────────────────────────────────────────────────────────

function ConfirmModal({ opts, onResolve }: { opts: ConfirmOptions; onResolve: (v: boolean) => void }) {
  // Focus the confirm button on mount
  const confirmRef = useRef<HTMLButtonElement>(null)
  useEffect(() => { confirmRef.current?.focus() }, [])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onResolve(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onResolve])

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 space-y-4 animate-scale-in">
        <div>
          <h3 className="text-base font-bold text-gray-900">{opts.title}</h3>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">{opts.message}</p>
        </div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => onResolve(false)}
            className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {opts.cancelLabel ?? 'Cancel'}
          </button>
          <button
            ref={confirmRef}
            onClick={() => onResolve(true)}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors ${
              opts.destructive
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-black text-white hover:bg-gray-800'
            }`}
          >
            {opts.confirmLabel ?? 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Toast item ───────────────────────────────────────────────────────────────

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />,
  error: <AlertCircle size={16} className="text-red-500 shrink-0" />,
  info: <Info size={16} className="text-blue-500 shrink-0" />,
  warning: <AlertTriangle size={16} className="text-amber-500 shrink-0" />,
}

function ToastItem({ toast: t, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Animate in
    const show = setTimeout(() => setVisible(true), 10)
    // Auto-dismiss
    const hide = setTimeout(() => {
      setVisible(false)
      setTimeout(onDismiss, 300)
    }, 4000)
    return () => { clearTimeout(show); clearTimeout(hide) }
  }, [onDismiss])

  return (
    <div
      className={`flex items-start gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-lg max-w-sm transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      {ICONS[t.type]}
      <p className="text-sm font-medium text-gray-800 flex-1 leading-snug">{t.message}</p>
      <button onClick={() => { setVisible(false); setTimeout(onDismiss, 300) }}
        className="text-gray-400 hover:text-gray-600 transition-colors shrink-0 mt-0.5">
        <X size={14} />
      </button>
    </div>
  )
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [confirmState, setConfirmState] = useState<{ opts: ConfirmOptions; resolve: (v: boolean) => void } | null>(null)

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, type, message }])
  }, [])

  const showConfirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise(resolve => {
      setConfirmState({ opts, resolve: (v: boolean) => { setConfirmState(null); resolve(v) } })
    })
  }, [])

  return (
    <ToastContext.Provider value={{ toast: addToast, confirm: showConfirm }}>
      {children}

      {/* Toast stack */}
      <div className="fixed bottom-6 right-6 z-[150] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem
              toast={t}
              onDismiss={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
            />
          </div>
        ))}
      </div>

      {/* Confirm dialog */}
      {confirmState && <ConfirmModal opts={confirmState.opts} onResolve={confirmState.resolve} />}
    </ToastContext.Provider>
  )
}
