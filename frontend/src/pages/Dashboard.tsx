import React from 'react'
import TopBar from '../components/TopBar'
import Footer from '../components/Footer'
import UploadCard from '../components/UploadCard'
import SummaryCard from '../components/SummaryCard'
import TranscriptPanel from '../components/TranscriptPanel'
import QAPanel from '../components/QAPanel'
import MeetingsList from '../components/MeetingsList'
import type { UploadResponse } from '../types'
import { getRecord } from '../lib/api'

export default function Dashboard() {
  const [meeting, setMeeting] = React.useState<UploadResponse | null>(null)

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

      <main className="container mx-auto px-4 py-8 grid grid-cols-12 gap-6 md:gap-8 flex-grow">
        {/* Left: History */}
        <aside className="order-1 col-span-12 md:col-span-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="sticky top-[90px] space-y-6">
            <MeetingsList 
              onOpen={openExisting} 
              onDelete={(id: string) => {
                if (id === activeId) {
                  setActiveId(null)
                  setActiveTitle(null)
                  setMeeting(null)
                }
              }}
              activeId={activeId} 
              reloadSignal={historyReload} 
            />
          </div>
        </aside>

        {/* Center: Upload */}
        <section className="order-2 col-span-12 md:col-span-4 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="space-y-6">
            <UploadCard onUploaded={onUploaded} />
          </div>
        </section>

        {/* Right: Chat (spans two rows) */}
        <aside ref={chatSectionRef} className="order-3 col-span-12 md:col-span-4 md:row-span-2 animate-fade-in-up scroll-mt-[90px]" style={{ animationDelay: '0.3s' }}>
          <div className="sticky top-[90px]">
            <div className="h-[calc(100vh-140px)] min-h-[500px]">
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
          <section ref={summarySectionRef} className="order-4 col-span-12 md:col-span-8 animate-fade-in-up scroll-mt-[90px]" style={{ animationDelay: '0.4s' }}>
            <div className="section h-[calc(100vh-240px)] min-h-[400px] overflow-y-auto p-5 sm:p-6 space-y-8">
              <SummaryCard
                meetingId={meeting.meeting_id}
                summary={meeting.summary}
                isActive={activeId === meeting.meeting_id}
                onSetActive={() => {
                  setActiveId(meeting.meeting_id)
                  setActiveTitle(meeting.source_filename)
                  setTimeout(() => chatSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
                }}
              />
              <TranscriptPanel transcript={meeting.transcript} />
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  )
}
