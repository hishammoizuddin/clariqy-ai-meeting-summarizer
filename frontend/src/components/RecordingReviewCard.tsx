import React from 'react'
import { AudioLines, Play, Video } from 'lucide-react'
import { meetingMediaUrl } from '../lib/api'
import type { SpeakerProfile } from '../types'

type Props = {
  meetingId: string
  mediaKind?: 'audio' | 'video' | null
  mediaAvailable?: boolean
  profiles?: SpeakerProfile[]
  selectedSpeakerId?: string | null
  onSelectSpeaker?: (speakerId: string | null) => void
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

export default function RecordingReviewCard({
  meetingId,
  mediaKind,
  mediaAvailable,
  profiles,
  selectedSpeakerId,
  onSelectSpeaker,
}: Props) {
  const mediaRef = React.useRef<HTMLMediaElement | null>(null)
  const usableProfiles = profiles || []

  if (!mediaAvailable || usableProfiles.length === 0 || !mediaKind) {
    return null
  }

  function jumpTo(seconds: number, speakerId: string) {
    const element = mediaRef.current
    if (element) {
      element.currentTime = Math.max(0, seconds)
      void element.play().catch(() => {
        // Autoplay may be blocked until the user presses play manually.
      })
    }
    onSelectSpeaker?.(speakerId)
  }

  const mediaSource = meetingMediaUrl(meetingId)

  return (
    <div className="rounded-[28px] border border-gray-200/80 bg-white/85 shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200/80 bg-gray-50/80 px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="rounded-2xl bg-gray-100 p-2 text-black">
              {mediaKind === 'video' ? <Video size={18} /> : <AudioLines size={18} />}
            </div>
            <h3 className="text-base font-bold tracking-tight text-black">Review the recording</h3>
          </div>
          <p className="mt-2 max-w-[48rem] text-sm leading-relaxed text-gray-500">
            Jump to each detected speaker before you apply names. This keeps the final transcript and summary aligned with the real voice timeline.
          </p>
        </div>
      </div>

      <div className="space-y-4 p-5">
        {mediaKind === 'video' ? (
          <video
            ref={(node) => {
              mediaRef.current = node
            }}
            controls
            preload="metadata"
            src={mediaSource}
            className="w-full rounded-[24px] border border-gray-200 bg-black/90 shadow-sm"
          />
        ) : (
          <audio
            ref={(node) => {
              mediaRef.current = node
            }}
            controls
            preload="metadata"
            src={mediaSource}
            className="w-full"
          />
        )}

        <div className="grid gap-3 xl:grid-cols-2">
          {usableProfiles.map((profile) => {
            const isSelected = selectedSpeakerId === profile.speaker_id
            return (
              <div
                key={profile.speaker_id}
                className={`rounded-[24px] border p-4 shadow-sm transition-all ${
                  isSelected ? 'border-black bg-gray-50' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-black">
                        {profile.assigned_name || profile.speaker_label}
                      </span>
                      {profile.assigned_name && (
                        <span className="text-xs font-medium text-gray-500">{profile.speaker_label}</span>
                      )}
                    </div>
                    <p className="mt-1 text-xs font-medium text-gray-500">
                      First heard at {formatTimestamp(profile.first_timestamp)} · {profile.turn_count} turn{profile.turn_count === 1 ? '' : 's'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => jumpTo(profile.first_timestamp, profile.speaker_id)}
                    className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-black/30 hover:text-black"
                  >
                    <Play size={12} />
                    Jump to first sample
                  </button>
                </div>

                {profile.samples && profile.samples.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {profile.samples.map((sample, index) => (
                      <button
                        key={`${profile.speaker_id}-${sample.start}-${index}`}
                        type="button"
                        onClick={() => jumpTo(sample.start, profile.speaker_id)}
                        className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-black/20 hover:bg-white hover:text-black"
                        title={sample.text}
                      >
                        <span>{formatTimestamp(sample.start)}</span>
                        <span className="max-w-[220px] truncate">{sample.text}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
