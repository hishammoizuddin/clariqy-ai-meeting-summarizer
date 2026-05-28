import React from 'react'
import ReactDOM from 'react-dom'
import { Radio, UploadCloud, ChevronLeft, ChevronRight, Layers, MessageCircle, HelpCircle } from 'lucide-react'
import Tooltip from '../components/Tooltip'
import TopBar from '../components/TopBar'
import Footer from '../components/Footer'
import UploadCard from '../components/UploadCard'
import LiveRecordingCard from '../components/LiveRecordingCard'
import RecordingReviewCard from '../components/RecordingReviewCard'
import SpeakerAssignmentCard from '../components/SpeakerAssignmentCard'
import SummaryCard from '../components/SummaryCard'
import TranscriptPanel from '../components/TranscriptPanel'
import QAPanel from '../components/QAPanel'
import KnowledgePanel from '../components/KnowledgePanel'
import CollectionView from '../components/CollectionView'
import ConsentGate from '../components/ConsentGate'
import OnboardingTour from '../components/OnboardingTour'
import type { Collection, UploadResponse } from '../types'
import { getRecord } from '../lib/api'
import { useAuth } from '../context/AuthContext'

function readBool(key: string, fallback: boolean) {
  try { const v = localStorage.getItem(key); return v === null ? fallback : v === 'true' } catch { return fallback }
}

export default function Dashboard() {
  const { user } = useAuth()
  const needsConsent = user && (!user.terms_accepted_at || !user.privacy_accepted_at)

  const [meeting, setMeeting] = React.useState<UploadResponse | null>(null)
  const [captureMode, setCaptureMode] = React.useState<'live' | 'upload'>('live')
  const [selectedSpeakerId, setSelectedSpeakerId] = React.useState<string | null>(null)
  const [activeCollection, setActiveCollection] = React.useState<Collection | null>(null)
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [activeTitle, setActiveTitle] = React.useState<string | null>(null)
  const [historyReload, setHistoryReload] = React.useState(0)
  const [isLoadingPast, setIsLoadingPast] = React.useState(false)
  const [tourSignal, setTourSignal] = React.useState(0)
  const [chatMaximized, setChatMaximized] = React.useState(false)

  // Collapsible panels — persisted
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(() => readBool('clariqy_sidebar_collapsed', false))
  const [chatCollapsed, setChatCollapsed] = React.useState(() => readBool('clariqy_chat_collapsed', false))

  const chatSectionRef = React.useRef<HTMLDivElement>(null)
  const summarySectionRef = React.useRef<HTMLElement>(null)

  const activeMeetingMode = meeting?.source_type === 'upload' ? 'upload' : meeting?.source_type === 'live' ? 'live' : null
  const showMeetingDetails = Boolean(meeting && (!activeMeetingMode || activeMeetingMode === captureMode) && !activeCollection)

  // Persist collapse state
  React.useEffect(() => {
    localStorage.setItem('clariqy_sidebar_collapsed', String(sidebarCollapsed))
  }, [sidebarCollapsed])
  React.useEffect(() => {
    localStorage.setItem('clariqy_chat_collapsed', String(chatCollapsed))
  }, [chatCollapsed])

  // ESC — closes maximized chat first, then collection view
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (chatMaximized) { setChatMaximized(false); return }
        if (activeCollection) setActiveCollection(null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [chatMaximized, activeCollection])

  // Lock body scroll and push sticky header behind overlay while chat is maximized
  React.useEffect(() => {
    if (chatMaximized) {
      document.body.style.overflow = 'hidden'
      document.body.classList.add('modal-open')
    } else {
      document.body.style.overflow = ''
      document.body.classList.remove('modal-open')
    }
    return () => {
      document.body.style.overflow = ''
      document.body.classList.remove('modal-open')
    }
  }, [chatMaximized])

  function onUploaded(payload: UploadResponse) {
    setMeeting(payload)
    setActiveCollection(null)
    if (payload.source_type === 'upload' || payload.source_type === 'live') setCaptureMode(payload.source_type)
    setSelectedSpeakerId(payload.speaker_profiles?.[0]?.speaker_id || null)
    setActiveId(payload.meeting_id)
    setActiveTitle(payload.source_filename)
    setHistoryReload(n => n + 1)
    setTimeout(() => chatSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }

  async function openExisting(id: string, title: string) {
    setActiveCollection(null)
    setActiveId(id)
    setActiveTitle(title)
    setIsLoadingPast(true)
    try {
      const pastRecord = await getRecord(id)
      setMeeting(pastRecord)
      if (pastRecord.source_type === 'upload' || pastRecord.source_type === 'live') setCaptureMode(pastRecord.source_type)
      setSelectedSpeakerId(pastRecord.speaker_profiles?.[0]?.speaker_id || null)
      setTimeout(() => summarySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
    } catch (e: any) { console.error('Failed to fetch record:', e) }
    finally { setIsLoadingPast(false) }
    setTimeout(() => chatSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  function openCollection(col: Collection) {
    setActiveCollection(col)
    setActiveId(null)
    setActiveTitle(null)
    setMeeting(null)
  }

  return (
    <div className="min-h-screen flex flex-col font-sans bg-gray-50/30">
      {needsConsent && <ConsentGate />}
      {!needsConsent && <OnboardingTour restartSignal={tourSignal} />}
      <TopBar />

      {/* Floating Take Tour button — fixed bottom-right, zero layout impact */}
      <Tooltip content="Take a product tour" side="left">
        <button
          onClick={() => setTourSignal(s => s + 1)}
          className="fixed bottom-6 right-6 z-40 w-10 h-10 rounded-full bg-white border border-gray-200 shadow-lg flex items-center justify-center text-gray-400 hover:text-black hover:border-gray-400 hover:shadow-xl transition-all"
        >
          <HelpCircle size={18} />
        </button>
      </Tooltip>

      <div className="flex-grow flex flex-col mx-auto w-full max-w-[1680px] px-4 sm:px-6 lg:px-8 py-6 lg:py-8 gap-6">

        {/* ── 3-column main row ─────────────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row gap-5 lg:items-start">

          {/* LEFT: Knowledge Panel */}
          <aside
            data-tour="sidebar"
            className={`relative lg:shrink-0 transition-all duration-300 ease-in-out animate-fade-in-up`}
            style={{ animationDelay: '0.1s' }}
          >
            {/* Collapse toggle — desktop only */}
            <Tooltip content={sidebarCollapsed ? 'Expand knowledge base' : 'Collapse knowledge base'} side="right">
            <button
              onClick={() => setSidebarCollapsed(v => !v)}
              className="hidden lg:flex absolute -right-3.5 top-5 z-20 w-7 h-7 rounded-full bg-white border border-gray-200 shadow-md items-center justify-center hover:bg-gray-50 hover:border-gray-300 transition-all group"
            >
              {sidebarCollapsed
                ? <ChevronRight size={13} className="text-gray-500 group-hover:text-black transition-colors" />
                : <ChevronLeft size={13} className="text-gray-500 group-hover:text-black transition-colors" />}
            </button>
            </Tooltip>

            {/* Desktop: collapsed strip OR full panel */}
            <div className="hidden lg:block">
              {sidebarCollapsed ? (
                <div
                  className="w-14 flex flex-col items-center gap-3 pt-4 pb-4 bg-white/70 backdrop-blur-xl border border-gray-200/80 rounded-[24px] shadow-glass min-h-[200px] cursor-pointer"
                  onClick={() => setSidebarCollapsed(false)}
                  title="Expand Knowledge Base"
                >
                  <Layers size={20} className="text-gray-500 hover:text-black transition-colors mt-1" />
                </div>
              ) : (
                <div style={{ width: '288px' }}>
                  <KnowledgePanel
                    onOpenMeeting={openExisting}
                    onOpenCollection={openCollection}
                    onDeleteMeeting={(id) => {
                      if (id === activeId) { setActiveId(null); setActiveTitle(null); setMeeting(null); setSelectedSpeakerId(null) }
                    }}
                    activeMeetingId={activeId}
                    activeCollectionId={activeCollection?.id}
                    reloadSignal={historyReload}
                  />
                </div>
              )}
            </div>

            {/* Mobile: always show full panel */}
            <div className="lg:hidden">
              <KnowledgePanel
                onOpenMeeting={openExisting}
                onOpenCollection={openCollection}
                onDeleteMeeting={(id) => {
                  if (id === activeId) { setActiveId(null); setActiveTitle(null); setMeeting(null); setSelectedSpeakerId(null) }
                }}
                activeMeetingId={activeId}
                activeCollectionId={activeCollection?.id}
                reloadSignal={historyReload}
              />
            </div>
          </aside>

          {/* CENTER: Collection view OR upload/live */}
          <section
            data-tour="capture"
            className="flex-1 min-w-0 animate-fade-in-up"
            style={{ animationDelay: '0.2s' }}
          >
            {activeCollection ? (
              <div className="rounded-[28px] border border-gray-200/80 bg-white/70 shadow-glass backdrop-blur-xl overflow-hidden" style={{ minHeight: '420px', maxHeight: 'calc(100vh - 220px)' }}>
                <CollectionView
                  collection={activeCollection}
                  onCollectionUpdated={(updated) => setActiveCollection(updated)}
                  onOpenMeeting={openExisting}
                  activeMeetingId={activeId}
                  reloadSignal={historyReload}
                />
              </div>
            ) : (
              <div className="space-y-5">
                <div className="rounded-[28px] border border-gray-200/80 bg-white/70 p-2.5 shadow-glass backdrop-blur-xl">
                  <div className="grid grid-cols-2 gap-2">
                    <Tooltip content="Record a live conversation in real time" side="bottom">
                      <button
                        type="button"
                        onClick={() => setCaptureMode('live')}
                        className={`w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                          captureMode === 'live'
                            ? 'bg-black text-white shadow-md'
                            : 'bg-white/80 text-gray-600 border border-gray-200 hover:text-black hover:border-black/20'
                        }`}
                      >
                        <Radio size={16} /> Live capture
                      </button>
                    </Tooltip>
                    <Tooltip content="Upload an existing audio or video file" side="bottom">
                      <button
                        type="button"
                        onClick={() => setCaptureMode('upload')}
                        className={`w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                          captureMode === 'upload'
                            ? 'bg-black text-white shadow-md'
                            : 'bg-white/80 text-gray-600 border border-gray-200 hover:text-black hover:border-black/20'
                        }`}
                      >
                        <UploadCloud size={16} /> Import file
                      </button>
                    </Tooltip>
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
            )}
          </section>

          {/* RIGHT: QA Chat Panel */}
          <aside
            data-tour="chat"
            ref={chatSectionRef}
            className="relative lg:shrink-0 scroll-mt-[90px] animate-fade-in-up"
            style={{ animationDelay: '0.3s' }}
          >
            {/* Collapse toggle — desktop only */}
            <Tooltip content={chatCollapsed ? 'Expand chat panel' : 'Collapse chat panel'} side="left">
              <button
                onClick={() => setChatCollapsed(v => !v)}
                className="hidden lg:flex absolute -left-3.5 top-5 z-20 w-7 h-7 rounded-full bg-white border border-gray-200 shadow-md items-center justify-center hover:bg-gray-50 hover:border-gray-300 transition-all group"
              >
                {chatCollapsed
                  ? <ChevronLeft size={13} className="text-gray-500 group-hover:text-black transition-colors" />
                  : <ChevronRight size={13} className="text-gray-500 group-hover:text-black transition-colors" />}
              </button>
            </Tooltip>

            {/* Desktop: collapsed strip OR full panel (original structure, untouched) */}
            <div className="hidden lg:block">
              {chatCollapsed ? (
                <div
                  className="w-14 flex flex-col items-center gap-3 pt-4 pb-4 bg-white/70 backdrop-blur-xl border border-gray-200/80 rounded-[24px] shadow-glass min-h-[200px] cursor-pointer"
                  onClick={() => setChatCollapsed(false)}
                  title="Expand Chat"
                >
                  <MessageCircle size={20} className="text-gray-500 hover:text-black transition-colors mt-1" />
                </div>
              ) : (
                <div style={{ width: '360px' }}>
                  <div className="h-[560px] xl:h-[calc(100vh-160px)] min-h-[500px]">
                    <QAPanel
                      key={activeCollection ? `collection-${activeCollection.id}` : (activeId || 'none')}
                      meetingId={activeId || ''}
                      meetingTitle={activeTitle}
                      collectionId={activeCollection?.id ?? null}
                      collectionName={activeCollection?.name ?? null}
                      onMaximize={() => setChatMaximized(true)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Mobile: always show */}
            <div className="lg:hidden h-[400px]">
              <QAPanel
                key={activeCollection ? `collection-${activeCollection.id}` : (activeId || 'none')}
                meetingId={activeId || ''}
                meetingTitle={activeTitle}
                collectionId={activeCollection?.id ?? null}
                collectionName={activeCollection?.name ?? null}
              />
            </div>
          </aside>

          {/* ── Maximized chat modal — rendered via portal directly on document.body
               so it is never trapped by backdrop-blur or overflow on any ancestor ── */}
          {chatMaximized && ReactDOM.createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 lg:p-10 animate-fade-in">
              {/* Backdrop */}
              <div
                className="absolute inset-0 bg-black/80 backdrop-blur-2xl"
                onClick={() => setChatMaximized(false)}
              />
              {/* Panel */}
              <div
                className="relative z-10 w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl border border-white/10 animate-scale-in"
                style={{ height: '88vh' }}
              >
                <QAPanel
                  key={activeCollection ? `collection-${activeCollection.id}` : (activeId || 'none')}
                  meetingId={activeId || ''}
                  meetingTitle={activeTitle}
                  collectionId={activeCollection?.id ?? null}
                  collectionName={activeCollection?.name ?? null}
                  isMaximized={true}
                  onMinimize={() => setChatMaximized(false)}
                />
              </div>
            </div>,
            document.body
          )}
        </div>

        {/* ── Bottom: Summary + Transcript ────────────────────────────────── */}
        {isLoadingPast && (
          <div className="animate-fade-in space-y-5">
            {/* Skeleton header */}
            <div className="rounded-2xl bg-white/70 border border-gray-200/80 shadow-glass backdrop-blur-xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl shimmer-bg" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 rounded-lg shimmer-bg w-1/3" />
                  <div className="h-3 rounded-lg shimmer-bg w-1/2" />
                </div>
              </div>
              {/* Skeleton summary lines */}
              <div className="space-y-2 pt-2">
                <div className="h-3 rounded-lg shimmer-bg w-full" />
                <div className="h-3 rounded-lg shimmer-bg w-5/6" />
                <div className="h-3 rounded-lg shimmer-bg w-4/6" />
              </div>
              <div className="space-y-2 pt-1">
                <div className="h-3 rounded-lg shimmer-bg w-full" />
                <div className="h-3 rounded-lg shimmer-bg w-3/4" />
              </div>
            </div>
            {/* Skeleton transcript block */}
            <div className="rounded-2xl bg-white/70 border border-gray-200/80 shadow-glass backdrop-blur-xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl shimmer-bg" />
                <div className="h-4 rounded-lg shimmer-bg w-1/4" />
              </div>
              <div className="space-y-2">
                <div className="h-3 rounded-lg shimmer-bg w-full" />
                <div className="h-3 rounded-lg shimmer-bg w-11/12" />
                <div className="h-3 rounded-lg shimmer-bg w-4/5" />
              </div>
            </div>
          </div>
        )}

        {!isLoadingPast && meeting && showMeetingDetails && (
          <section
            ref={summarySectionRef}
            className="animate-fade-in-up scroll-mt-[90px] space-y-5"
            style={{ animationDelay: '0.4s' }}
          >
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
                  setSelectedSpeakerId(current => current || updatedMeeting.speaker_profiles?.[0]?.speaker_id || null)
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
          </section>
        )}
      </div>

      <Footer />
    </div>
  )
}
