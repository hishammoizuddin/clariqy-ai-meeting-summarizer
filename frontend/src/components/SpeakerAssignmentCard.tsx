import React from 'react'
import { CheckCircle2, Loader2, Mic2, PencilLine, RotateCcw } from 'lucide-react'
import { updateSpeakerAssignments } from '../lib/api'
import type { SpeakerProfile, UploadResponse } from '../types'

type Props = {
  meetingId: string
  profiles?: SpeakerProfile[]
  assignments?: Record<string, string>
  selectedSpeakerId?: string | null
  onSelectSpeaker?: (speakerId: string | null) => void
  onUpdated: (meeting: UploadResponse) => void
}

function formatTimestamp(seconds: number) {
  const rounded = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(rounded / 3600)
  const minutes = Math.floor((rounded % 3600) / 60)
  const secs = rounded % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export default function SpeakerAssignmentCard({
  meetingId,
  profiles,
  assignments,
  selectedSpeakerId,
  onSelectSpeaker,
  onUpdated,
}: Props) {
  const usableProfiles = profiles || []
  const [drafts, setDrafts] = React.useState<Record<string, string>>(assignments || {})
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    setDrafts(assignments || {})
    setError(null)
  }, [assignments, meetingId])

  if (usableProfiles.length === 0) {
    return null
  }

  const normalizedCurrent = JSON.stringify(assignments || {})
  const normalizedDrafts = JSON.stringify(
    Object.fromEntries(
      Object.entries(drafts)
        .map(([key, value]) => [key, value.trim()])
        .filter(([, value]) => value),
    ),
  )
  const hasChanges = normalizedCurrent !== normalizedDrafts
  const cleanedDrafts: Record<string, string> = Object.fromEntries(
    Object.entries(drafts)
      .map(([key, value]) => [key, value.trim()])
      .filter(([, value]) => value),
  )
  const duplicateTracker = Object.values(cleanedDrafts).reduce<Record<string, { count: number; display: string }>>((acc, value) => {
    const key = value.toLowerCase()
    if (!acc[key]) {
      acc[key] = { count: 0, display: value }
    }
    acc[key].count += 1
    return acc
  }, {})
  const duplicateNames = Object.values(duplicateTracker)
    .filter((entry) => entry.count > 1)
    .map((entry) => entry.display)

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const nextAssignments = cleanedDrafts
      const updated = await updateSpeakerAssignments(meetingId, nextAssignments)
      onUpdated(updated)
    } catch (err: any) {
      setError(err?.message || 'Failed to update speaker names')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-[28px] border border-gray-200/80 bg-white/85 shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200/80 bg-gray-50/80 px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="rounded-2xl bg-gray-100 p-2 text-black">
              <PencilLine size={18} />
            </div>
            <h3 className="text-base font-bold tracking-tight text-black">Verify speaker names</h3>
          </div>
          <p className="mt-2 max-w-[48rem] text-sm leading-relaxed text-gray-500">
            We detected unique speakers from the recording. Assign names only after you verify them against the sample snippets below.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600">
            {Object.keys(cleanedDrafts).length}/{usableProfiles.length} assigned
          </span>
          <button
            type="button"
            onClick={() => {
              setDrafts({})
              onSelectSpeaker?.(null)
            }}
            disabled={saving || Object.keys(drafts).length === 0}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-black/30 hover:text-black disabled:opacity-50"
          >
            <RotateCcw size={12} />
            Reset names
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
            Save speaker names
          </button>
        </div>
      </div>

      <div className="space-y-4 p-5">
        {duplicateNames.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm leading-relaxed text-gray-600">
            {duplicateNames.length === 1
              ? `One name is currently mapped to multiple detected speaker tracks: ${duplicateNames[0]}. Keep that only if the same person was split across the recording.`
              : `Some names are mapped to multiple detected speaker tracks: ${duplicateNames.join(', ')}. Keep that only if the same person was split across the recording.`}
          </div>
        )}

        <div className="space-y-3">
          {usableProfiles.map((profile) => {
            const isSelected = selectedSpeakerId === profile.speaker_id
            const currentDraft = drafts[profile.speaker_id]?.trim()
            return (
              <div
                key={profile.speaker_id}
                onClick={() => onSelectSpeaker?.(profile.speaker_id)}
                className={`rounded-[24px] border p-4 shadow-sm transition-all ${
                  isSelected ? 'border-black bg-gray-50' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-semibold text-black">
                        <Mic2 size={14} />
                        {profile.speaker_label}
                      </span>
                      {currentDraft && (
                        <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700">
                          {currentDraft}
                        </span>
                      )}
                      <span className="text-xs font-medium text-gray-500">
                        First heard at {formatTimestamp(profile.first_timestamp)} · {profile.turn_count} turn{profile.turn_count === 1 ? '' : 's'}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-gray-600">
                      “{profile.sample_text}”
                    </p>
                    {profile.samples && profile.samples.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {profile.samples.map((sample, index) => (
                          <button
                            key={`${profile.speaker_id}-${sample.start}-${index}`}
                            type="button"
                            onClick={() => onSelectSpeaker?.(profile.speaker_id)}
                            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-600 transition hover:border-black/20 hover:bg-white hover:text-black"
                            title={sample.text}
                          >
                            <span>{formatTimestamp(sample.start)}</span>
                            <span className="max-w-[180px] truncate">{sample.text}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">
                        Assign name
                      </label>
                      <button
                        type="button"
                        onClick={() => onSelectSpeaker?.(isSelected ? null : profile.speaker_id)}
                        className="text-[11px] font-semibold text-gray-500 transition hover:text-black"
                      >
                        {isSelected ? 'Clear focus' : 'Focus transcript'}
                      </button>
                    </div>
                    <input
                      value={drafts[profile.speaker_id] || ''}
                      onChange={(e) => {
                        onSelectSpeaker?.(profile.speaker_id)
                        setDrafts((prev) => ({ ...prev, [profile.speaker_id]: e.target.value }))
                      }}
                      onClick={(e) => e.stopPropagation()}
                      placeholder={`Keep as ${profile.speaker_label}`}
                      disabled={saving}
                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-black shadow-sm outline-none transition focus:border-black/50 focus:ring-2 focus:ring-black/10 disabled:opacity-60"
                    />
                    <p className="text-xs leading-relaxed text-gray-500">
                      Rename this track after you verify the voice against the recording and transcript.
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
