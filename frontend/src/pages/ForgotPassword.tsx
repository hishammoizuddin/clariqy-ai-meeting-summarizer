import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Brain, ArrowRight, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react'
import { forgotPasswordApi } from '../lib/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) { setError('Please enter your email address.'); return }

    setError('')
    setLoading(true)
    try {
      await forgotPasswordApi(trimmed)
      setSent(true)
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-md w-full animate-fade-in-up">

        {/* Logo + heading */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-black text-white shadow-soft relative group mb-4">
            <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <Brain size={24} className="relative z-10 drop-shadow-md" />
          </Link>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            {sent ? 'Check your inbox' : 'Forgot password?'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {sent
              ? 'We sent a reset link to your email.'
              : "No worries — we'll send you a reset link."}
          </p>
        </div>

        <div className="bg-white/70 backdrop-blur-xl border border-gray-100 shadow-glass rounded-3xl p-6 sm:p-8 lg:p-10">

          {/* ── Success state ── */}
          {sent ? (
            <div className="flex flex-col items-center text-center gap-5">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 border border-gray-100">
                <CheckCircle2 size={32} className="text-black" />
              </div>
              <div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  A password reset link has been sent to{' '}
                  <span className="font-semibold text-black">{email.trim()}</span>.
                  <br />
                  The link expires in <span className="font-semibold">1 hour</span>.
                </p>
                <p className="mt-3 text-xs text-gray-400 leading-relaxed">
                  Didn't get it? Check your spam folder, or{' '}
                  <button
                    type="button"
                    onClick={() => setSent(false)}
                    className="underline underline-offset-2 text-gray-500 hover:text-black transition-colors"
                  >
                    try again
                  </button>.
                </p>
              </div>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm font-semibold text-black hover:text-gray-700 transition-colors"
              >
                <ArrowLeft size={15} />
                Back to sign in
              </Link>
            </div>
          ) : (
            /* ── Form state ── */
            <form className="space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    id="email"
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-xl border border-gray-200 bg-white/50 pl-10 pr-4 py-3 text-gray-900 text-sm shadow-sm focus:border-black focus:ring-2 focus:ring-black/10 outline-none transition-all placeholder:text-gray-400"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center items-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4 mr-2 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Sending…
                  </>
                ) : (
                  <>
                    Send reset link
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              <div className="text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-black transition-colors"
                >
                  <ArrowLeft size={14} />
                  Back to sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
