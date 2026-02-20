import { downloadPdfUrl } from '../lib/api'
import { Download, FileText, CheckCircle2, Sparkles } from 'lucide-react'

type Props = {
  meetingId: string
  summary: string
  isActive?: boolean
  onSetActive?: () => void
}

export default function SummaryCard({ meetingId, summary, isActive, onSetActive }: Props) {
  return (
    <div className="section animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
      <div className="section-header">
        <div className="p-2 bg-gray-100 text-black rounded-xl mr-1">
          <Sparkles size={18} />
        </div>
        <h2 className="text-base font-bold text-black tracking-tight">AI Summary</h2>

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
              title="Set this meeting as chat context"
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
