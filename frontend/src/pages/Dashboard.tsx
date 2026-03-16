import React from 'react'
import { Radio, UploadCloud } from 'lucide-react'
import TopBar from '../components/TopBar'
import Footer from '../components/Footer'
import UploadCard from '../components/UploadCard'
import LiveRecordingCard from '../components/LiveRecordingCard'
import RecordingReviewCard from '../components/RecordingReviewCard'
import SpeakerAssignmentCard from '../components/SpeakerAssignmentCard'
import SummaryCard from '../components/SummaryCard'
import TranscriptPanel from '../components/TranscriptPanel'
import QAPanel from '../components/QAPanel'
import MeetingsList from '../components/MeetingsList'
import type { UploadResponse } from '../types'
import { getRecord } from '../lib/api'

export default function Dashboard() {
  const [meeting, setMeeting] = React.useState<UploadResponse | null>(null)
  const [captureMode, setCaptureMode] = React.useState<'live' | 'upload'>('live')
  const [selectedSpeakerId, setSelectedSpeakerId] = React.useState<string | null>(null)

  // Active chat context (can be from history OR the current session)
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [activeTitle, setActiveTitle] = React.useState<string | null>(null)

  // Ref tracking the QA Panel to allow auto-scrolling
  const chatSectionRef = React.useRef<HTMLElement>(null)

  // 🔁 when uploads complete, MeetingsList re-fetches using this tick
  const [historyReload, setHistoryReload] = React.useState(0)
  
  // Ref tracking bottom summary area for auto-scroll on view-past
  const summarySectionRef = React.useRef<HTMLElement>(null)
  const [isLoadingPast, setIsLoadingPast] = React.useState(false)

  function onUploaded(payload: UploadResponse) {
    setMeeting(payload)
    setSelectedSpeakerId(payload.speaker_profiles?.[0]?.speaker_id || null)
    // set the active chat context to the latest upload
    setActiveId(payload.meeting_id)
    setActiveTitle(payload.source_filename)
    // nudge history list to refresh
    setHistoryReload((n) => n + 1)

    // Auto-scroll to chat on mobile/smaller screens after a slight delay for render
    setTimeout(() => {
      chatSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  async function openExisting(id: string, title: string) {
    // switch the active chat context to an older meeting from history
    setActiveId(id)
    setActiveTitle(title)

    // Automatically fetch and load the Transcript and Summary for this item
    setIsLoadingPast(true)
    try {
      const pastRecord = await getRecord(id)
      setMeeting(pastRecord)
      setSelectedSpeakerId(pastRecord.speaker_profiles?.[0]?.speaker_id || null)
      
      // Auto-scroll to transcript so user notices old data visually loaded
      setTimeout(() => {
        summarySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 50)
    } catch (e: any) {
      console.error("Failed to fetch past record:", e)
    } finally {
      setIsLoadingPast(false)
    }

    // Auto-scroll to chat so user knows context changed
    setTimeout(() => {
      chatSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <TopBar />

      <main className="mx-auto w-full max-w-[1680px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8 grid grid-cols-1 gap-6 lg:grid-cols-12 xl:gap-7 flex-grow">
        {/* Left: History */}
        <aside className="order-1 lg:col-span-4 xl:col-span-3 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="xl:sticky xl:top-[96px] space-y-6">
            <MeetingsList 
              onOpen={openExisting} 
              onDelete={(id: string) => {
                if (id === activeId) {
                  setActiveId(null)
                  setActiveTitle(null)
                  setMeeting(null)
                  setSelectedSpeakerId(null)
                }
              }}
              activeId={activeId} 
              reloadSignal={historyReload} 
            />
          </div>
        </aside>

        {/* Center: Upload */}
        <section className="order-2 lg:col-span-8 xl:col-span-5 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="space-y-5">
            <div className="rounded-[28px] border border-gray-200/80 bg-white/70 p-2.5 shadow-glass backdrop-blur-xl">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCaptureMode('live')}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                    captureMode === 'live'
                      ? 'bg-black text-white shadow-md'
                      : 'bg-white/80 text-gray-600 border border-gray-200 hover:text-black hover:border-black/20'
                  }`}
                >
                  <Radio size={16} />
                  Live capture
                </button>
                <button
                  type="button"
                  onClick={() => setCaptureMode('upload')}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                    captureMode === 'upload'
                      ? 'bg-black text-white shadow-md'
                      : 'bg-white/80 text-gray-600 border border-gray-200 hover:text-black hover:border-black/20'
                  }`}
                >
                  <UploadCloud size={16} />
                  Import file
                </button>
              </div>
            </div>

            {captureMode === 'live' ? (
              <LiveRecordingCard onUploaded={onUploaded} />
            ) : (
              <UploadCard onUploaded={onUploaded} />
            )}

            <div className="rounded-[24px] border border-gray-200/80 bg-white/70 px-4 py-3.5 text-sm leading-relaxed text-gray-600 shadow-sm">
              {captureMode === 'live'
                ? 'Live capture gives you immediate transcript turns during the conversation, then generates the polished speaker-labeled summary after you stop.'
                : 'Import mode is best for existing calls, screen recordings, and voice notes you already have saved.'}
            </div>
          </div>
        </section>

        {/* Right: Chat */}
        <aside ref={chatSectionRef} className="order-3 lg:col-span-12 xl:col-span-4 animate-fade-in-up scroll-mt-[90px]" style={{ animationDelay: '0.3s' }}>
          <div className="xl:sticky xl:top-[96px]">
            <div className="h-[560px] md:h-[620px] xl:h-[calc(100vh-160px)] min-h-[500px]">
              {/* 👇 key forces remount => chat resets when activeId changes */}
              <QAPanel key={activeId || "none"} meetingId={activeId || ""} meetingTitle={activeTitle} />
            </div>
          </div>
        </aside>

        {/* Bottom wide: Summary + Transcript for the CURRENT session stays visible */}
        {isLoadingPast && (
          <section className="order-4 col-span-12 animate-fade-in-up flex items-center justify-center p-12">
            <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
          </section>
        )}
        
        {!isLoadingPast && meeting && (
          <section ref={summarySectionRef} className="order-4 col-span-12 animate-fade-in-up scroll-mt-[90px]" style={{ animationDelay: '0.4s' }}>
            <div className="section min-h-[400px] overflow-y-auto p-5 sm:p-6 space-y-8">
              <RecordingReviewCard
                meetingId={meeting.meeting_id}
                mediaKind={meeting.media_kind}
                mediaAvailable={meeting.media_available}
                profiles={meeting.speaker_profiles}
                selectedSpeakerId={selectedSpeakerId}
                onSelectSpeaker={setSelectedSpeakerId}
              />
              <SpeakerAssignmentCard
                meetingId={meeting.meeting_id}
                profiles={meeting.speaker_profiles}
                assignments={meeting.speaker_assignments}
                selectedSpeakerId={selectedSpeakerId}
                onSelectSpeaker={setSelectedSpeakerId}
                onUpdated={(updatedMeeting) => {
                  setMeeting(updatedMeeting)
                  setSelectedSpeakerId((current) => current || updatedMeeting.speaker_profiles?.[0]?.speaker_id || null)
                }}
              />
              <SummaryCard
                meetingId={meeting.meeting_id}
                summary={meeting.summary}
                sourceType={meeting.source_type}
                speakers={meeting.speakers}
                durationSeconds={meeting.duration_seconds}
                isActive={activeId === meeting.meeting_id}
                onSetActive={() => {
                  setActiveId(meeting.meeting_id)
                  setActiveTitle(meeting.source_filename)
                  setTimeout(() => chatSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
                }}
              />
              <TranscriptPanel
                transcript={meeting.transcript}
                transcriptSegments={meeting.transcript_segments}
                selectedSpeakerId={selectedSpeakerId}
                onClearSpeakerFocus={() => setSelectedSpeakerId(null)}
              />
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  )
}
