import React, { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Brain, ArrowRight, Eye, EyeOff, CheckCircle2, AlertTriangle } from 'lucide-react'
import { resetPasswordApi } from '../lib/api'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  // Redirect to login after success
  const handleGoLogin = () => navigate('/login')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setError('')
    setLoading(true)
    try {
      await resetPasswordApi(token, password)
      setDone(true)
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // No token in URL
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans">
        <div className="max-w-md w-full animate-fade-in-up text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-50 border border-amber-100 mb-5">
            <AlertTriangle size={26} className="text-amber-500" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Invalid link</h2>
          <p className="text-sm text-gray-500 mb-6">
            This reset link is missing or malformed. Please request a new one.
          </p>
          <Link
            to="/forgot-password"
            className="inline-flex items-center gap-2 py-3 px-6 rounded-xl bg-black text-white text-sm font-semibold hover:bg-gray-800 transition-all"
          >
            Request a new link
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    )
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
            {done ? 'Password updated!' : 'Set a new password'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {done
              ? 'You can now sign in with your new password.'
              : 'Choose a strong password for your account.'}
          </p>
        </div>

        <div className="bg-white/70 backdrop-blur-xl border border-gray-100 shadow-glass rounded-3xl p-6 sm:p-8 lg:p-10">

          {/* ── Success state ── */}
          {done ? (
            <div className="flex flex-col items-center text-center gap-5">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 border border-gray-100">
                <CheckCircle2 size={32} className="text-black" />
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                Your password has been changed successfully.<br />
                Sign in to continue using ClarIQy.
              </p>
              <button
                onClick={handleGoLogin}
                className="group w-full flex justify-center items-center py-3 px-4 rounded-xl text-sm font-semibold text-white bg-black hover:bg-gray-800 transition-all"
              >
                Sign in now
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          ) : (
            /* ── Form state ── */
            <form className="space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl">
                  {error}
                </div>
              )}

              {/* New password */}
              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  New password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoFocus
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-xl border border-gray-200 bg-white/50 px-4 py-3 pr-11 text-gray-900 text-sm shadow-sm focus:border-black focus:ring-2 focus:ring-black/10 outline-none transition-all placeholder:text-gray-400"
                    placeholder="At least 6 characters"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors p-0.5"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div className="space-y-1.5">
                <label htmlFor="confirm" className="block text-sm font-medium text-gray-700">
                  Confirm new password
                </label>
                <div className="relative">
                  <input
                    id="confirm"
                    type={showConfirm ? 'text' : 'password'}
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className={`block w-full rounded-xl border bg-white/50 px-4 py-3 pr-11 text-gray-900 text-sm shadow-sm outline-none transition-all placeholder:text-gray-400
                      ${confirm && confirm !== password
                        ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100'
                        : 'border-gray-200 focus:border-black focus:ring-2 focus:ring-black/10'
                      }`}
                    placeholder="Repeat your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors p-0.5"
                    tabIndex={-1}
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {confirm && confirm !== password && (
                  <p className="text-xs text-red-500 mt-1">Passwords don't match.</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !password || !confirm}
                className="group relative w-full flex justify-center items-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4 mr-2 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Updating…
                  </>
                ) : (
                  <>
                    Update password
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
