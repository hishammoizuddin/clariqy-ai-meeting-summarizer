import React from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Camera,
  Globe2,
  Loader2,
  Mail,
  Phone,
  Trash2,
  UserRound,
} from 'lucide-react'
import TopBar from '../components/TopBar'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import { profileAvatarUrl, updateProfile } from '../lib/api'
import { COUNTRIES, COUNTRY_NAMES } from '../data/countries'

function initials(name?: string | null) {
  const parts = (name || '')
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)

  if (parts.length === 0) return 'U'
  return parts.map((part) => part[0]?.toUpperCase() || '').join('')
}

export default function Profile() {
  const { user, updateUser } = useAuth()
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [country, setCountry] = React.useState('')
  const [phoneCountryCode, setPhoneCountryCode] = React.useState('')
  const [phoneNumber, setPhoneNumber] = React.useState('')
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null)
  const [removeAvatar, setRemoveAvatar] = React.useState(false)
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (!user) return
    setName(user.name || '')
    setEmail(user.email || '')
    setCountry(user.country || '')
    setPhoneCountryCode(user.phone_country_code || '')
    setPhoneNumber(user.phone_number || '')
    setRemoveAvatar(false)
    setAvatarFile(null)
    setPreviewUrl(null)
  }, [user])

  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  if (!user) {
    return null
  }

  const existingAvatar = user.has_avatar ? profileAvatarUrl(user.id, user.updated_at) : null
  const avatarSrc = removeAvatar ? null : previewUrl || existingAvatar

  function handleAvatarChange(file?: File | null) {
    setError(null)
    setSuccess(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    if (!file) {
      setAvatarFile(null)
      setPreviewUrl(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file for the profile picture.')
      setAvatarFile(null)
      setPreviewUrl(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Profile pictures must be 5MB or smaller.')
      setAvatarFile(null)
      setPreviewUrl(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    setAvatarFile(file)
    setRemoveAvatar(false)
    setPreviewUrl(URL.createObjectURL(file))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (phoneNumber.trim() && !phoneCountryCode.trim()) {
      setError('Choose a country code before saving a phone number.')
      setSuccess(null)
      return
    }
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const fd = new FormData()
      fd.append('name', name)
      fd.append('email', email)
      fd.append('country', country)
      fd.append('phone_country_code', phoneNumber.trim() ? phoneCountryCode : '')
      fd.append('phone_number', phoneNumber)
      fd.append('remove_avatar', String(removeAvatar))
      if (avatarFile) {
        fd.append('avatar', avatarFile)
      }

      const response = await updateProfile(fd)
      updateUser(response.user, response.access_token)
      setSuccess('Profile updated successfully.')
      setAvatarFile(null)
      setRemoveAvatar(false)
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to update profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col font-sans bg-gray-50/60">
      <TopBar />

      <main className="mx-auto w-full max-w-[1320px] flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition hover:text-black">
              <ArrowLeft size={16} />
              Back to dashboard
            </Link>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-black sm:text-4xl">Account profile</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-gray-600">
              Manage your public identity inside ClarIQy, keep your contact details current, and upload a professional profile picture for a polished workspace experience.
            </p>
          </div>
          <div className="rounded-[24px] border border-gray-200 bg-white/85 px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">Session note</p>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-gray-600">
              If you update your email, your session will refresh automatically so you stay signed in.
            </p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <section className="rounded-[32px] border border-gray-200/80 bg-white/90 p-6 shadow-soft">
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <div className="h-32 w-32 overflow-hidden rounded-[32px] border border-gray-200 bg-gray-100 flex items-center justify-center text-3xl font-bold text-black shadow-sm">
                  {avatarSrc ? (
                    <img src={avatarSrc} alt={user.name} className="h-full w-full object-cover" />
                  ) : (
                    initials(name || user.name)
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-3 right-0 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-black text-white shadow-lg transition hover:bg-gray-800"
                  title="Upload profile picture"
                >
                  <Camera size={16} />
                </button>
              </div>

              <h2 className="mt-6 text-xl font-bold text-black">{name || user.name}</h2>
              <p className="mt-1 text-sm text-gray-500">{email || user.email}</p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                className="hidden"
                onChange={(event) => handleAvatarChange(event.target.files?.[0] || null)}
              />

              <div className="mt-6 flex w-full flex-col gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-black/20 hover:text-black"
                >
                  <Camera size={15} />
                  {avatarSrc ? 'Change photo' : 'Upload photo'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleAvatarChange(null)
                    setRemoveAvatar(Boolean(existingAvatar))
                  }}
                  disabled={!avatarSrc}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-600 transition hover:border-black/20 hover:text-black disabled:opacity-50"
                >
                  <Trash2 size={15} />
                  Remove photo
                </button>
              </div>

              <div className="mt-8 w-full rounded-[24px] border border-gray-200 bg-gray-50/80 p-4 text-left">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">Profile preview</p>
                <div className="mt-4 space-y-3 text-sm text-gray-600">
                  <div className="flex items-center gap-3">
                    <UserRound size={15} className="text-gray-400" />
                    <span>{name || 'Add your full name'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail size={15} className="text-gray-400" />
                    <span>{email || 'Add your email'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone size={15} className="text-gray-400" />
                    <span>{phoneNumber ? `${phoneCountryCode} ${phoneNumber}` : 'Add your contact number'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Globe2 size={15} className="text-gray-400" />
                    <span>{country || 'Add your country'}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[32px] border border-gray-200/80 bg-white/90 p-6 shadow-soft sm:p-8">
            <form className="space-y-8" onSubmit={handleSubmit}>
              <div className="grid gap-6 md:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">Full name</span>
                  <div className="relative">
                    <UserRound size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      autoComplete="name"
                      className="w-full rounded-2xl border border-gray-200 bg-white pl-11 pr-4 py-3.5 text-sm text-black shadow-sm outline-none transition focus:border-black/40 focus:ring-2 focus:ring-black/10"
                      placeholder="Jane Doe"
                      required
                    />
                  </div>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">Email address</span>
                  <div className="relative">
                    <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      autoComplete="email"
                      className="w-full rounded-2xl border border-gray-200 bg-white pl-11 pr-4 py-3.5 text-sm text-black shadow-sm outline-none transition focus:border-black/40 focus:ring-2 focus:ring-black/10"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                </label>
              </div>

              <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
                <label className="flex flex-col gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">Country code</span>
                  <select
                    value={phoneCountryCode}
                    onChange={(event) => setPhoneCountryCode(event.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm text-black shadow-sm outline-none transition focus:border-black/40 focus:ring-2 focus:ring-black/10"
                  >
                    <option value="">Select country code</option>
                    {COUNTRIES.map((c, i) => (
                      <option key={`${c.name}-${i}`} value={c.dialCode}>
                        {c.name} ({c.dialCode})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">Phone number</span>
                  <div className="relative">
                    <Phone size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      value={phoneNumber}
                      onChange={(event) => setPhoneNumber(event.target.value)}
                      autoComplete="tel"
                      inputMode="tel"
                      className="w-full rounded-2xl border border-gray-200 bg-white pl-11 pr-4 py-3.5 text-sm text-black shadow-sm outline-none transition focus:border-black/40 focus:ring-2 focus:ring-black/10"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </label>
              </div>

              <label className="flex flex-col gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">Country</span>
                <div className="relative">
                  <Globe2 size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
                  <select
                    value={country}
                    onChange={(event) => setCountry(event.target.value)}
                    autoComplete="country-name"
                    className="w-full rounded-2xl border border-gray-200 bg-white pl-11 pr-4 py-3.5 text-sm text-black shadow-sm outline-none transition focus:border-black/40 focus:ring-2 focus:ring-black/10 appearance-none"
                  >
                    <option value="">Select your country</option>
                    {COUNTRY_NAMES.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              </label>

              <div className="rounded-[24px] border border-gray-200 bg-gray-50/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">Professional profile guidance</p>
                <p className="mt-3 text-sm leading-7 text-gray-600">
                  Use the same identity details you would share in a client-facing workspace. Your name, avatar, and contact details help the app feel polished and trustworthy when you revisit meetings.
                </p>
              </div>

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">
                  {success}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Link
                  to="/dashboard"
                  className="inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-black/20 hover:text-black"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-black/10 transition hover:bg-gray-800 disabled:opacity-60"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                  Save profile
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
