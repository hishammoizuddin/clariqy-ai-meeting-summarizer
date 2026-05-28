import React from 'react'
import { MessageSquareText, ChevronDown } from 'lucide-react'
import type { TranscriptSegment } from '../types'

type Props = {
  transcript: string
  transcriptSegments?: TranscriptSegment[] | null
  selectedSpeakerId?: string | null
  onClearSpeakerFocus?: () => void
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

export default function TranscriptPanel({
  transcript,
  transcriptSegments,
  selectedSpeakerId,
  onClearSpeakerFocus,
}: Props) {
  const [open, setOpen] = React.useState(false)
  const hasSegments = Boolean(transcriptSegments && transcriptSegments.length > 0)
  const focusedSegments = selectedSpeakerId && transcriptSegments
    ? transcriptSegments.filter((s) => s.speaker_id === selectedSpeakerId)
    : transcriptSegments
  const focusedSpeakerName =
    focusedSegments && focusedSegments.length > 0 ? focusedSegments[0].speaker : null

  React.useEffect(() => {
    if (selectedSpeakerId) setOpen(true)
  }, [selectedSpeakerId])

  return (
    <div className="glass rounded-2xl overflow-hidden border border-gray-200/50 bg-white/40">
      {/* Header / toggle */}
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex flex-wrap items-center gap-3 px-6 py-4 transition-colors ${
          open ? 'bg-gray-50/80 border-b border-gray-200/60' : 'hover:bg-gray-50/50'
        }`}
        aria-expanded={open}
      >
        <div className="p-2 bg-gray-100 text-black rounded-xl">
          <MessageSquareText size={18} />
        </div>
        <span className="text-base font-bold text-black tracking-tight">Full Transcript</span>
        {hasSegments && focusedSegments && (
          <span className="text-xs text-gray-500 font-medium">
            {focusedSegments.length} segment{focusedSegments.length === 1 ? '' : 's'}
            {selectedSpeakerId ? ` · ${focusedSpeakerName ?? selectedSpeakerId}` : ''}
          </span>
        )}
        <div
          className={`ml-auto w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm transition-transform duration-300 ${
            open ? 'rotate-180' : ''
          }`}
        >
          <ChevronDown size={18} className="text-black" />
        </div>
      </button>

      {/*
        CSS grid trick: gridTemplateRows animates from "0fr" → "1fr"
        which correctly collapses/expands to the natural content height
        with no max-height clipping and no inner scroll.
      */}
      <div
        style={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          transition: 'grid-template-rows 400ms ease',
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <div className="p-6 bg-white/40 space-y-4">
            {/* Speaker focus banner */}
            {selectedSpeakerId && focusedSpeakerName && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-gray-50/90 px-4 py-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">
                    Speaker focus
                  </p>
                  <p className="mt-1 text-sm font-semibold text-black">
                    Reviewing segments for {focusedSpeakerName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClearSpeakerFocus}
                  className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-black/30 hover:text-black"
                >
                  Show full transcript
                </button>
              </div>
            )}

            {/* Segments or plain text — no inner scroll, page scrolls naturally */}
            {hasSegments ? (
              <div className="space-y-3">
                {focusedSegments?.map((segment, index) => (
                  <div
                    key={`${segment.speaker_id || segment.speaker}-${segment.start}-${index}`}
                    className="rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 border border-gray-200 text-[11px] font-semibold text-black">
                        {segment.speaker}
                      </span>
                      <span className="text-[11px] font-medium text-gray-500">
                        {formatTimestamp(segment.start)} – {formatTimestamp(segment.end)}
                      </span>
                    </div>
                    <p className="text-black/85 font-sans leading-relaxed text-[15px]">
                      {segment.text}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="whitespace-pre-wrap text-black/80 font-sans leading-relaxed text-[15px]">
                {transcript}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
