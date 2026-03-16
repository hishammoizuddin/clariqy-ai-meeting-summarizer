import { downloadPdfUrl } from '../lib/api'
import { Download, Sparkles } from 'lucide-react'

type Props = {
  meetingId: string
  summary: string
  sourceType?: 'upload' | 'live'
  speakers?: string[]
  durationSeconds?: number | null
  isActive?: boolean
  onSetActive?: () => void
}

function formatDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) return null
  const rounded = Math.round(seconds)
  const hours = Math.floor(rounded / 3600)
  const minutes = Math.floor((rounded % 3600) / 60)
  const secs = rounded % 60
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`
  }
  return `${secs}s`
}

export default function SummaryCard({
  meetingId,
  summary,
  sourceType,
  speakers,
  durationSeconds,
  isActive,
  onSetActive,
}: Props) {
  const metadataBadges = [
    sourceType === 'live' ? 'Live recording' : null,
    speakers?.length ? `${speakers.length} speaker${speakers.length === 1 ? '' : 's'}` : null,
    formatDuration(durationSeconds),
  ].filter((badge): badge is string => Boolean(badge))

  return (
    <div className="section animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
      <div className="section-header">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <div className="p-2 bg-gray-100 text-black rounded-xl">
            <Sparkles size={18} />
          </div>
          <h2 className="text-base font-bold text-black tracking-tight">AI Summary</h2>
          {metadataBadges.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {metadataBadges.map((badge) => (
                <span key={badge} className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 border border-gray-200 text-[11px] font-semibold text-gray-600">
                  {badge}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* NEW: active-context control */}
        <div className="ml-auto flex items-center gap-2">
          {isActive ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 border border-gray-200/50 text-xs font-semibold text-black">
              <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse"></span>
              Active context
            </span>
          ) : (
            <button
              onClick={onSetActive}
              className="text-xs font-semibold px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 hover:border-black/50 text-gray-600 hover:text-black transition-all shadow-sm"
              title="Set this record as chat context"
            >
              Set as chat context
            </button>
          )}
        </div>
      </div>

      <div className="section-body">
        <article className="prose max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-black">
          <pre className="whitespace-pre-wrap text-black/90 font-sans leading-relaxed text-[15px]">{summary}</pre>
        </article>

        <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end">
          <a
            href={downloadPdfUrl(meetingId)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-black text-white font-medium hover:bg-gray-800 hover:shadow-lg hover:-translate-y-0.5 transition-all focus:ring-4 focus:ring-gray-300 shrink-0 nowrap"
          >
            <Download size={18} /> Export as PDF
          </a>
        </div>
      </div>
    </div>
  )
}
