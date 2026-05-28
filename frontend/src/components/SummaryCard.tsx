import React from 'react'
import { downloadPdfUrl } from '../lib/api'
import { Download, Sparkles } from 'lucide-react'
import Tooltip from './Tooltip'

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
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${secs}s`
  return `${secs}s`
}

/**
 * Renders plain-text summary output from the LLM into structured HTML.
 *
 * Heuristics:
 *   - Blank lines separate blocks.
 *   - A block whose first (or only) line is ≤ 72 chars, doesn't end with
 *     a period/comma/colon, and is followed by non-bullet content is treated
 *     as a section heading.
 *   - Lines starting with "- " or "• " inside a block are rendered as a
 *     styled bullet list.
 *   - Everything else is a paragraph.
 */
function renderSummary(text: string): React.ReactNode[] {
  const blocks = text.trim().split(/\n{2,}/)
  const nodes: React.ReactNode[] = []

  blocks.forEach((block, bi) => {
    const lines = block.trim().split('\n').map((l) => l.trim()).filter(Boolean)
    if (!lines.length) return

    const firstLine = lines[0]
    const restLines = lines.slice(1)

    const looksLikeHeading =
      firstLine.length <= 72 &&
      !firstLine.startsWith('-') &&
      !firstLine.startsWith('•') &&
      !/[.,]$/.test(firstLine) &&
      // not a sentence (few lowercase words after an uppercase start)
      !/^[a-z]/.test(firstLine) &&
      restLines.length > 0

    const allBullets =
      lines.length > 0 && lines.every((l) => l.startsWith('- ') || l.startsWith('• '))

    if (allBullets) {
      nodes.push(
        <ul key={bi} className="space-y-2 pl-0">
          {lines.map((l, li) => (
            <li key={li} className="flex gap-3 text-[15px] text-black/80 leading-relaxed">
              <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-gray-400 shrink-0" />
              <span>{l.replace(/^[-•]\s/, '')}</span>
            </li>
          ))}
        </ul>,
      )
      return
    }

    if (looksLikeHeading) {
      // Heading + its body lines
      const bodyLines = restLines
      const bodyBullets = bodyLines.every((l) => l.startsWith('- ') || l.startsWith('• '))

      nodes.push(
        <div key={bi} className="space-y-2">
          <h3 className="text-[13px] font-bold uppercase tracking-[0.15em] text-gray-500">
            {firstLine}
          </h3>
          {bodyBullets ? (
            <ul className="space-y-2 pl-0">
              {bodyLines.map((l, li) => (
                <li key={li} className="flex gap-3 text-[15px] text-black/80 leading-relaxed">
                  <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-gray-400 shrink-0" />
                  <span>{l.replace(/^[-•]\s/, '')}</span>
                </li>
              ))}
            </ul>
          ) : (
            bodyLines.map((l, li) => (
              <p key={li} className="text-[15px] text-black/80 leading-relaxed">
                {l}
              </p>
            ))
          )}
        </div>,
      )
      return
    }

    // Regular paragraph(s)
    nodes.push(
      <div key={bi} className="space-y-1">
        {lines.map((l, li) => (
          <p key={li} className="text-[15px] text-black/80 leading-relaxed">
            {l}
          </p>
        ))}
      </div>,
    )
  })

  return nodes
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
                <span
                  key={badge}
                  className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 border border-gray-200 text-[11px] font-semibold text-gray-600"
                >
                  {badge}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {isActive ? (
            <Tooltip content="This meeting is active in the Q&A chat" side="left">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 border border-gray-200/50 text-xs font-semibold text-black cursor-default">
                <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
                Active context
              </span>
            </Tooltip>
          ) : (
            <Tooltip content="Use this meeting for Q&A in the chat panel" side="left">
              <button
                onClick={onSetActive}
                className="text-xs font-semibold px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 hover:border-black/50 text-gray-600 hover:text-black transition-all shadow-sm"
              >
                Set as chat context
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      <div className="section-body">
        {/* Structured summary rendering — no more raw <pre> */}
        <div className="space-y-5">
          {renderSummary(summary)}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end">
          <Tooltip content="Download a formatted PDF of this summary" side="left">
            <a
              href={downloadPdfUrl(meetingId)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-black text-white font-medium hover:bg-gray-800 hover:shadow-lg hover:-translate-y-0.5 transition-all focus:ring-4 focus:ring-gray-300 shrink-0"
            >
              <Download size={18} /> Export as PDF
            </a>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}
