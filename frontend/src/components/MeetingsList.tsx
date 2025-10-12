import React from 'react'
import { listMeetings, downloadPdfUrl } from '../lib/api'
import type { MeetingListItem } from '../types'
import { FileDown, ExternalLink, Circle } from 'lucide-react'
import { format } from 'date-fns'

export default function MeetingsList({
  onOpen,
  activeId,
}: {
  onOpen: (meeting_id: string) => void
  activeId?: string | null
}) {
  const [items, setItems] = React.useState<MeetingListItem[]>([])
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    let ignore = false
    setLoading(true)
    listMeetings()
      .then((data) => {
        if (!ignore) setItems(data || [])
      })
      .catch((e: any) => setError(e?.message || 'Failed to load history'))
      .finally(() => setLoading(false))
    return () => {
      ignore = true
    }
  }, [])

  return (
    <div className="section">
      <div className="section-header">
        <h2 className="text-sm font-semibold">History</h2>
        <span className="ml-auto text-xs text-slate-500">
          {loading ? 'Loading…' : `${items.length} items`}
        </span>
      </div>

      {/* Fixed-height scrollable area — shows ~3 records visibly */}
      <div className="section-body p-0 overflow-y-auto max-h-[220px]">
        <ul className="divide-y divide-slate-200">
          {items.map((m) => {
            const isActive = m.meeting_id === activeId
            return (
              <li
                key={m.meeting_id}
                className={`px-4 py-3 transition ${
                  isActive ? 'bg-green-50/70' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Active indicator */}
                  <div className="w-3">
                    {isActive && (
                      <Circle
                        size={10}
                        className="text-green-600 fill-green-600"
                      />
                    )}
                  </div>

                  {/* Main file button */}
                  <button
                    onClick={() => onOpen(m.meeting_id)}
                    className="text-left flex-1 min-w-0"
                    title="Open in app"
                  >
                    <div
                      className={`text-sm font-medium truncate ${
                        isActive ? 'text-green-700' : ''
                      }`}
                    >
                      {m.source_filename || 'Untitled'}
                    </div>
                    <div className="text-xs text-slate-500">
                      {format(new Date(m.created_at), 'PP • p')}
                    </div>
                  </button>

                  <a
                    href={downloadPdfUrl(m.meeting_id)}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-1 shrink-0 nowrap"
                    title="Download PDF"
                  >
                    <FileDown size={14} /> PDF
                  </a>

                  <button
                    onClick={() => onOpen(m.meeting_id)}
                    className={`px-2 py-1.5 rounded-lg border flex items-center gap-1 shrink-0 ${
                      isActive
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                    title="Open"
                  >
                    <ExternalLink size={14} />
                  </button>
                </div>
              </li>
            )
          })}

          {items.length === 0 && !loading && (
            <li className="py-8 text-sm text-slate-500 text-center">
              No meetings yet.
            </li>
          )}
          {error && (
            <li className="py-3 text-sm text-red-600 text-center">{error}</li>
          )}
        </ul>
      </div>
    </div>
  )
}
