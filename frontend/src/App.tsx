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
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function openExisting(id: string) {
    setMeeting(null)
    setMeetingId(id)
    // (Optional) add a fetch-by-id to prefill summary/transcript later
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <main className="mx-auto max-w-7xl w-full px-4 py-6 grid gap-6 md:grid-cols-3">
        {/* Left: History */}
        <aside className="md:col-span-1 order-3 md:order-1">
          <div className="sticky top-[76px] space-y-6">
            <MeetingsList onOpen={openExisting} />
          </div>
        </aside>

        {/* Center: Upload + Results */}
        <section className="md:col-span-1 md:col-span-2 order-1 md:order-2">
          <div className="space-y-6">
            <UploadCard onUploaded={onUploaded} />
            {meeting && (
              <>
                <SummaryCard meetingId={meeting.meeting_id} summary={meeting.summary} />
                <TranscriptPanel transcript={meeting.transcript} />
              </>
            )}
          </div>
        </section>

        {/* Right: Chat */}
        <aside className="md:col-span-1 order-2 md:order-3">
          <div className="sticky top-[76px]">
            <div className="h-[calc(100vh-120px)]">
              <QAPanel meetingId={meetingId} />
            </div>
          </div>
        </aside>
      </main>
    </div>
  )
}
