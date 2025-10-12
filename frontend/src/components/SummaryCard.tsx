import { downloadPdfUrl } from '../lib/api'
import { Download, FileText } from 'lucide-react'

type Props = { meetingId: string; summary: string }

export default function SummaryCard({ meetingId, summary }: Props) {
  return (
    <div className="section">
      <div className="section-header">
        <FileText className="text-slate-700" />
        <h2 className="text-sm font-semibold">Summary</h2>
        <span className="ml-auto text-xs text-slate-500">ID: {meetingId}</span>
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
