import React from 'react'
import TopBar from './components/TopBar'
import UploadCard from './components/UploadCard'
import SummaryCard from './components/SummaryCard'
import TranscriptPanel from './components/TranscriptPanel'
import QAPanel from './components/QAPanel'
import MeetingsList from './components/MeetingsList'
import type { UploadResponse } from './types'

export default function App() {
  const [meeting, setMeeting] = React.useState<UploadResponse | null>(null)
  const [meetingId, setMeetingId] = React.useState<string>('')

  // Active chat context (can be from history OR the current session)
  const [activeId, setActiveId] = React.useState<string | null>(null)

  // 🔁 when uploads complete, MeetingsList re-fetches using this tick
  const [historyReload, setHistoryReload] = React.useState(0)

  function onUploaded(payload: UploadResponse) {
    setMeeting(payload)
    setMeetingId(payload.meeting_id)
    // set the active chat context to the latest upload
    setActiveId(payload.meeting_id)
    // nudge history list to refresh
    setHistoryReload((n) => n + 1)
  }

  function openExisting(id: string) {
    // switch the active chat context to an older meeting from history
    setActiveId(id)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar />

      <main className="container mx-auto px-4 py-6 grid grid-cols-12 gap-4 md:gap-6">
        {/* Left: History */}
        <aside className="order-1 col-span-12 md:col-span-4">
          <div className="sticky top-[76px] space-y-4 sm:space-y-6">
            <MeetingsList onOpen={openExisting} activeId={activeId} reloadSignal={historyReload} />
          </div>
        </aside>

        {/* Center: Upload */}
        <section className="order-2 col-span-12 md:col-span-4">
          <div className="space-y-4 sm:space-y-6">
            <UploadCard onUploaded={onUploaded} />
          </div>
        </section>

        {/* Right: Chat (spans two rows) */}
        <aside className="order-3 col-span-12 md:col-span-4 md:row-span-2">
          <div className="sticky top-[76px]">
            <div className="h-[calc(100vh-120px)] min-h-[420px]">
              {/* 👇 key forces remount => chat resets when activeId changes */}
              <QAPanel key={activeId || "none"} meetingId={activeId || ""} />
            </div>
          </div>
        </aside>

        {/* Bottom wide: Summary + Transcript for the CURRENT session stays visible */}
        {meeting && (
          <section className="order-4 col-span-12 md:col-span-8">
            <div className="section h-[calc(100vh-220px)] min-h-[360px] overflow-y-auto p-4 sm:p-5 space-y-6">
              <SummaryCard
                meetingId={meeting.meeting_id}
                summary={meeting.summary}
                isActive={activeId === meeting.meeting_id}
                onSetActive={() => setActiveId(meeting.meeting_id)} // switch chat context back to current
              />
              <TranscriptPanel transcript={meeting.transcript} />
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
