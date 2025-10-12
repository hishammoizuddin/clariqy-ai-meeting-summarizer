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

  function onUploaded(data: UploadResponse) {
    setMeeting(data)
    setMeetingId(data.meeting_id)
    // keep focus near the top after upload
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function openExisting(id: string) {
    setMeeting(null)
    setMeetingId(id)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />

      {/* Main content */}
      <main className="mx-auto w-full max-w-[1300px] px-3 sm:px-4 py-5 sm:py-6 grid grid-cols-12 gap-4 sm:gap-6">
        {/* Left: History (row 1) */}
        <aside className="order-1 col-span-12 md:col-span-4">
          <div className="sticky top-[76px] space-y-4 sm:space-y-6">
            <MeetingsList onOpen={openExisting} />
          </div>
        </aside>

        {/* Center: Upload (row 1) */}
        <section className="order-2 col-span-12 md:col-span-4">
          <div className="space-y-4 sm:space-y-6">
            <UploadCard onUploaded={onUploaded} />
            {/* results moved below; keep this section upload-only */}
          </div>
        </section>

        {/* Right: Chat (spans both rows) */}
        <aside className="order-3 col-span-12 md:col-span-4 md:row-span-2">
          <div className="sticky top-[76px]">
            <div className="h-[calc(100vh-120px)] min-h-[420px]">
              <QAPanel meetingId={meetingId} />
            </div>
          </div>
        </aside>

        {/* Bottom wide area: Summary + Transcript (row 2, spans under History + Upload) */}
        {meeting && (
          <section className="order-4 col-span-12 md:col-span-8">
            {/* Scrollable results container; height tuned to viewport */}
            <div className="section h-[calc(100vh-220px)] min-h-[360px] overflow-y-auto p-4 sm:p-5 space-y-6">
              <SummaryCard meetingId={meeting.meeting_id} summary={meeting.summary} />
              <TranscriptPanel transcript={meeting.transcript} />
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
