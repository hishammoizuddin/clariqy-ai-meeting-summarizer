import React, { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import PolicyModal, { type PolicyType } from './PolicyModal'
import { recordConsent } from '../lib/api'
import { useAuth } from '../context/AuthContext'

export default function ConsentGate() {
  const { updateUser } = useAuth()
  const [privacyChecked, setPrivacyChecked] = useState(false)
  const [termsChecked, setTermsChecked] = useState(false)
  const [openPolicy, setOpenPolicy] = useState<PolicyType | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canProceed = privacyChecked && termsChecked

  const handleAccept = async () => {
    if (!canProceed) return
    setError('')
    setLoading(true)
    try {
      const updatedUser = await recordConsent()
      updateUser(updatedUser)
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Full-screen overlay */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up">

          {/* Header */}
          <div className="px-8 pt-8 pb-6 border-b border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-black text-white shrink-0">
                <ShieldCheck size={20} />
              </div>
              <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">
                Before you continue
              </h2>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              Please review and accept our policies to use ClarIQy. We are committed to
              protecting your privacy and being transparent about how your data is used.
            </p>
          </div>

          {/* Checkboxes */}
          <div className="px-8 py-6 space-y-4">
            {/* Privacy Policy checkbox */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5 shrink-0">
                <input
                  type="checkbox"
                  checked={privacyChecked}
                  onChange={(e) => setPrivacyChecked(e.target.checked)}
                  className="sr-only peer"
                />
                <div className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center
                  ${privacyChecked
                    ? 'bg-black border-black'
                    : 'bg-white border-gray-300 group-hover:border-gray-500'
                  }`}
                >
                  {privacyChecked && (
                    <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-sm text-gray-700 leading-relaxed">
                I have read and agree to the{' '}
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setOpenPolicy('privacy') }}
                  className="font-semibold text-black underline underline-offset-2 hover:text-gray-600 transition-colors"
                >
                  Privacy Policy
                </button>
              </span>
            </label>

            {/* Terms of Service checkbox */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5 shrink-0">
                <input
                  type="checkbox"
                  checked={termsChecked}
                  onChange={(e) => setTermsChecked(e.target.checked)}
                  className="sr-only peer"
                />
                <div className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center
                  ${termsChecked
                    ? 'bg-black border-black'
                    : 'bg-white border-gray-300 group-hover:border-gray-500'
                  }`}
                >
                  {termsChecked && (
                    <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-sm text-gray-700 leading-relaxed">
                I have read and agree to the{' '}
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setOpenPolicy('terms') }}
                  className="font-semibold text-black underline underline-offset-2 hover:text-gray-600 transition-colors"
                >
                  Terms of Service
                </button>
              </span>
            </label>

            {/* Consent note */}
            <p className="text-[11px] text-gray-400 leading-relaxed pt-1">
              By continuing, you acknowledge that ClarIQy processes audio recordings and meeting
              content using AI. You confirm you have obtained all necessary consents from
              meeting participants before recording.
            </p>
          </div>

          {/* Footer */}
          <div className="px-8 pb-8 space-y-3">
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={handleAccept}
              disabled={!canProceed || loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-black hover:bg-gray-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Saving…
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  I Agree — Continue to ClarIQy
                </>
              )}
            </button>
            {!canProceed && (
              <p className="text-center text-[11px] text-gray-400">
                Please check both boxes above to continue
              </p>
            )}
          </div>

        </div>
      </div>

      <PolicyModal open={openPolicy} onClose={() => setOpenPolicy(null)} />
    </>
  )
}
