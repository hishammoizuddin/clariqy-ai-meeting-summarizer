import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signupApi, recordConsent } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Brain, ArrowRight } from 'lucide-react';
import PolicyModal, { type PolicyType } from '../components/PolicyModal';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);
  const [openPolicy, setOpenPolicy] = useState<PolicyType | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, updateUser } = useAuth();
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!privacyChecked || !termsChecked) {
      setError('Please accept the Privacy Policy and Terms of Service to continue.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('name', name);
      fd.append('email', email);
      fd.append('password', password);
      const res = await signupApi(fd);
      // Log in first so the token is set before calling consent endpoint
      login(res.access_token, res.user);
      // Record consent with the new token
      try {
        const updatedUser = await recordConsent();
        updateUser(updatedUser);
      } catch {
        // Non-fatal — consent can be re-prompted on dashboard if needed
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 sm:p-6 lg:p-8 font-sans">
        <div className="max-w-md w-full animate-fade-in-up">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-black text-white shadow-soft relative group mb-4">
              <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <Brain size={24} className="relative z-10 drop-shadow-md" />
            </Link>
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Create an account</h2>
            <p className="mt-2 text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-black hover:text-gray-700 transition-colors">
                Sign in here
              </Link>
            </p>
          </div>

          <div className="bg-white/70 backdrop-blur-xl border border-gray-100 shadow-glass rounded-3xl p-8 sm:p-10">
            <form className="space-y-6" onSubmit={handleSignup}>
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="name">Full Name</label>
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full rounded-xl border-gray-200 bg-white/50 px-4 py-3 text-gray-900 shadow-sm focus:border-black focus:ring-black sm:text-sm outline-none transition-all placeholder:text-gray-400"
                  placeholder="Jane Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="email">Email address</label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl border-gray-200 bg-white/50 px-4 py-3 text-gray-900 shadow-sm focus:border-black focus:ring-black sm:text-sm outline-none transition-all placeholder:text-gray-400"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border-gray-200 bg-white/50 px-4 py-3 text-gray-900 shadow-sm focus:border-black focus:ring-black sm:text-sm outline-none transition-all placeholder:text-gray-400"
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>

              {/* Consent checkboxes */}
              <div className="space-y-3 pt-1 border-t border-gray-100">
                <p className="text-xs text-gray-500 pt-1 font-medium">Required to create your account</p>

                {/* Privacy Policy */}
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative mt-0.5 shrink-0">
                    <input
                      type="checkbox"
                      checked={privacyChecked}
                      onChange={(e) => setPrivacyChecked(e.target.checked)}
                      className="sr-only"
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
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); setOpenPolicy('privacy'); }}
                      className="font-semibold text-black underline underline-offset-2 hover:text-gray-600 transition-colors"
                    >
                      Privacy Policy
                    </button>
                  </span>
                </label>

                {/* Terms of Service */}
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative mt-0.5 shrink-0">
                    <input
                      type="checkbox"
                      checked={termsChecked}
                      onChange={(e) => setTermsChecked(e.target.checked)}
                      className="sr-only"
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
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); setOpenPolicy('terms'); }}
                      className="font-semibold text-black underline underline-offset-2 hover:text-gray-600 transition-colors"
                    >
                      Terms of Service
                    </button>
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || !privacyChecked || !termsChecked}
                className="group relative w-full flex justify-center items-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Account...' : 'Sign up'}
                {!loading && <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />}
              </button>
            </form>
          </div>
        </div>
      </div>

      <PolicyModal open={openPolicy} onClose={() => setOpenPolicy(null)} />
    </>
  );
}
