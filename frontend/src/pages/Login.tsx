import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Brain, ArrowRight, AlertCircle } from 'lucide-react';

// RFC 5322-ish regex — catches typos like "user@" or "user.com" without being pedantic
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function validateEmail(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return 'Email address is required.'
  if (!EMAIL_RE.test(trimmed)) return 'Please enter a valid email address (e.g. you@example.com).'
  if (trimmed.length > 254) return 'Email address is too long.'
  return null
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailTouched, setEmailTouched] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEmail(e.target.value)
    if (emailTouched) {
      setEmailError(validateEmail(e.target.value))
    }
  }

  function handleEmailBlur() {
    setEmailTouched(true)
    setEmailError(validateEmail(email))
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    // Run validation before submit
    setEmailTouched(true)
    const emailErr = validateEmail(email)
    setEmailError(emailErr)
    if (emailErr) return

    setError('');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('username', email.trim()); // OAuth2 expects username
      fd.append('password', password);
      const res = await loginApi(fd);
      login(res.access_token, res.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const showEmailError = emailTouched && emailError

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-md w-full animate-fade-in-up">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-black text-white shadow-soft relative group mb-4">
            <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <Brain size={24} className="relative z-10 drop-shadow-md" />
          </Link>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Welcome back</h2>
          <p className="mt-2 text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/signup" className="font-semibold text-black hover:text-gray-700 transition-colors">
              Sign up today
            </Link>
          </p>
        </div>

        <div className="bg-white/70 backdrop-blur-xl border border-gray-100 shadow-glass rounded-3xl p-8 sm:p-10">
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="flex items-start gap-3 p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={handleEmailChange}
                onBlur={handleEmailBlur}
                className={`block w-full rounded-xl border px-4 py-3 text-gray-900 text-sm shadow-sm outline-none transition-all placeholder:text-gray-400
                  ${showEmailError
                    ? 'border-red-400 bg-red-50/40 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                    : 'border-gray-200 bg-white/50 focus:border-black focus:ring-2 focus:ring-black/10'
                  }`}
                placeholder="you@example.com"
              />
              {showEmailError && (
                <p className="flex items-center gap-1.5 text-xs text-red-600 mt-1">
                  <AlertCircle size={12} />
                  {emailError}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-xl border border-gray-200 bg-white/50 px-4 py-3 text-gray-900 shadow-sm focus:border-black focus:ring-2 focus:ring-black/10 sm:text-sm outline-none transition-all placeholder:text-gray-400"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center items-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in…' : 'Sign in'}
              {!loading && <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
