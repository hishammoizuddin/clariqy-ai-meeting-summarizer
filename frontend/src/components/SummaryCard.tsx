import { downloadPdfUrl } from '../lib/api'
import { Download, FileText, CheckCircle2 } from 'lucide-react'

type Props = {
  meetingId: string
  summary: string
  isActive?: boolean
  onSetActive?: () => void
}

export default function SummaryCard({ meetingId, summary, isActive, onSetActive }: Props) {
  return (
    <div className="section">
      <div className="section-header">
        <FileText className="text-slate-700" />
        <h2 className="text-sm font-semibold">Summary</h2>

        {/* NEW: active-context control */}
        <div className="ml-auto flex items-center gap-2">
          {isActive ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
              <CheckCircle2 size={14} /> Active context
            </span>
          ) : (
            <button
              onClick={onSetActive}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
              title="Set this meeting as chat context"
            >
              Set as chat context
            </button>
          )}
        </div>
      </div>

      <div className="section-body">
        <article className="prose max-w-none prose-slate">
          <pre className="whitespace-pre-wrap text-slate-800">{summary}</pre>
        </article>

        <a
          href={downloadPdfUrl(meetingId)}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition shrink-0 nowrap"
        >
          <Download size={16} /> Download PDF
        </a>
      </div>
    </div>
  )
}
