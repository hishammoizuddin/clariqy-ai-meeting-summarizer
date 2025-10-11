import React from 'react'
import { listMeetings } from '../lib/api'
import type { MeetingListItem } from '../types'
import { FileDown, ExternalLink } from 'lucide-react'
import { downloadPdfUrl } from '../lib/api'
import { format } from 'date-fns'

export default function MeetingsList({ onOpen }: { onOpen: (meeting_id: string) => void }) {
  const [items, setItems] = React.useState<MeetingListItem[]>([])
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    let ignore = false
    setLoading(true)
    listMeetings()
      .then((data) => { if (!ignore) setItems(data || []) })
      .catch((e) => setError(e.message || 'Failed to load history'))
      .finally(() => setLoading(false))
    return () => { ignore = true }
  }, [])

  return (
    <div className="section h-full flex flex-col">
      <div className="section-header">
        <h2 className="text-sm font-semibold">History</h2>
        <span className="ml-auto text-xs text-slate-500">{loading ? 'Loading…' : `${items.length} items`}</span>
      </div>
      <div className="section-body scroll-y maxh p-0">
        <ul className="divide-y divide-slate-200">
          {items.map((m) => (
            <li key={m.meeting_id} className="px-4 py-3 hover:bg-slate-50 transition">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onOpen(m.meeting_id)}
                  className="text-left flex-1"
                  title="Open in app"
                >
                  <div className="text-sm font-medium truncate">{m.source_filename || 'Untitled'}</div>
                  <div className="text-xs text-slate-500">
                    {format(new Date(m.created_at), 'PP • p')}
                  </div>
                </button>
                <a
                  href={downloadPdfUrl(m.meeting_id)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-1"
                  title="Download PDF"
                >
                  <FileDown size={14} /> PDF
                </a>
                <button onClick={() => onOpen(m.meeting_id)} className="px-3 py-1.5 rounded-lg border bg-white hover:bg-slate-50 flex items-center gap-1" title="Open">
                  <ExternalLink size={14} />
                </button>
              </div>
            </li>
          ))}
          {items.length === 0 && !loading && (
            <li className="py-8 text-sm text-slate-500 text-center">No meetings yet.</li>
          )}
          {error && <li className="py-3 text-sm text-red-600 text-center">{error}</li>}
        </ul>
      </div>
    </div>
  )
}
