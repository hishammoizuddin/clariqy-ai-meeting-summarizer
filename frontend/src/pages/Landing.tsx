import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Radio,
  FileAudio,
  Users,
  FileText,
  MessageCircle,
  FolderOpen,
  Layers,
  Download,
  Sparkles,
} from 'lucide-react';
import TopBar from '../components/TopBar';
import Footer from '../components/Footer';
import TryStudio from '../components/TryStudio';

const features = [
  {
    icon: <Radio size={22} />,
    title: 'Record Live Conversations',
    description:
      'Hit record before your next session. ClarIQy listens in real-time and builds a live transcript as the conversation unfolds — lecture, meeting, or interview.',
  },
  {
    icon: <FileAudio size={22} />,
    title: 'Import Any Recording',
    description:
      'Already have a file? Upload audio or video from any source. ClarIQy processes it automatically — no extra steps.',
  },
  {
    icon: <Users size={22} />,
    title: 'Speaker-Level Intelligence',
    description:
      'ClarIQy identifies every distinct voice and labels each speaker clearly. Follow who said what across every session.',
  },
  {
    icon: <FolderOpen size={22} />,
    title: 'Organize into Collections',
    description:
      'Group related sessions into collections — a course, a project, a client. All transcripts, summaries, and knowledge stay together in one place.',
  },
  {
    icon: <Layers size={22} />,
    title: 'Chat Across Multiple Sessions',
    description:
      'Ask a question that spans every recording in a collection. ClarIQy searches your entire knowledge base and synthesizes the answer — not just one session.',
  },
  {
    icon: <FileText size={22} />,
    title: 'Structured Summaries',
    description:
      'Get key discussion points, decisions made, and clear next steps — ready the moment a session ends.',
  },
  {
    icon: <MessageCircle size={22} />,
    title: 'Ask Anything',
    description:
      '"What did the professor say about recursion in lecture 3?" Just ask. ClarIQy retrieves the exact answer from your transcripts.',
  },
  {
    icon: <Download size={22} />,
    title: 'Export to PDF',
    description:
      'Share a polished summary PDF with your team or classmates in one click. Clean formatting, speaker labels included.',
  },
  {
    icon: <Sparkles size={22} />,
    title: 'State-of-the-Art AI',
    description:
      'ClarIQy combines best-in-class AI models for transcription, speaker diarization, summarization, and semantic search — giving you accurate, context-aware answers.',
  },
];

const useCases = [
  {
    emoji: '🎓',
    title: 'Students & Educators',
    body: 'Capture every lecture in a course collection. Review all class notes and ask questions across the entire semester — never miss a concept covered weeks ago.',
  },
  {
    emoji: '💼',
    title: 'Teams & Professionals',
    body: 'Organize project meetings, sprint reviews, and client calls into folders. Search across months of conversations to recall decisions and action items instantly.',
  },
  {
    emoji: '🎙️',
    title: 'Researchers & Interviewers',
    body: 'Run a series of interviews? Group them together and ask cross-cutting questions across all your subjects at once — surface patterns you would never find manually.',
  },
];

function scrollToTry() {
  document.getElementById('try')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col font-sans bg-gray-50/50">
      <TopBar />

      <main className="flex-grow flex flex-col items-center px-6 sm:px-12 pt-5 sm:pt-7 pb-6 sm:pb-12 relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-[-8%] left-[-8%] w-[45%] h-[45%] bg-blue-300/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-8%] w-[40%] h-[40%] bg-purple-300/15 rounded-full blur-[140px] pointer-events-none" />

        <div className="w-full max-w-5xl mx-auto z-10">

          {/* Hero — tight headline + the live Try Studio right below it */}
          <div id="try" className="text-center space-y-4 mb-10 mt-2 sm:mt-4 animate-fade-in-up scroll-mt-24">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/5 border border-black/8 text-[11px] font-semibold tracking-widest uppercase text-gray-600">
              <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
              No sign-up needed to try
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-black tracking-tight leading-[1.12]">
              Turn any conversation into{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-br from-gray-900 via-gray-700 to-gray-400">
                searchable, speaker-aware intelligence.
              </span>
            </h1>

            <p className="text-sm md:text-base text-gray-500 font-medium max-w-xl mx-auto leading-relaxed">
              Record or upload — get instant transcripts, speaker labels, and an AI summary
              you can chat with. No notes, no sign-up.
            </p>
          </div>

          {/* The frictionless try surface */}
          <div className="mb-24 animate-fade-in-up" style={{ animationDelay: '0.08s' }}>
            <TryStudio />
          </div>

          {/* How it works */}
          <div className="mb-20 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <p className="text-center text-[11px] font-bold uppercase tracking-[0.25em] text-gray-400 mb-8">
              How it works
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-0 sm:gap-0 divide-y sm:divide-y-0 sm:divide-x divide-gray-200/70 bg-white/60 backdrop-blur-xl border border-gray-200/60 rounded-3xl shadow-glass overflow-hidden">
              {[
                { step: '01', label: 'Record live or upload a file' },
                { step: '02', label: 'ClarIQy transcribes & identifies speakers' },
                { step: '03', label: 'Organize sessions into collections' },
                { step: '04', label: 'Chat across your entire knowledge base' },
              ].map(({ step, label }) => (
                <div key={step} className="flex items-center gap-4 px-6 py-6">
                  <span className="text-3xl font-black text-gray-100 tracking-tighter select-none shrink-0">
                    {step}
                  </span>
                  <p className="text-sm font-semibold text-gray-700 leading-snug">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Use cases */}
          <div className="mb-20 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
            <p className="text-center text-[11px] font-bold uppercase tracking-[0.25em] text-gray-400 mb-8">
              Built for every use case
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {useCases.map(({ emoji, title, body }) => (
                <div key={title} className="bg-white/60 backdrop-blur-xl border border-gray-200/60 p-7 rounded-3xl shadow-soft hover:shadow-glass hover:-translate-y-1 transition-all duration-200">
                  <div className="text-3xl mb-4">{emoji}</div>
                  <h3 className="text-base font-bold text-black mb-2">{title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Features grid */}
          <div className="mb-20 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <p className="text-center text-[11px] font-bold uppercase tracking-[0.25em] text-gray-400 mb-8">
              Everything you need
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {features.map(({ icon, title, description }) => (
                <div
                  key={title}
                  className="group bg-white/60 backdrop-blur-xl border border-gray-200/60 p-7 rounded-3xl shadow-soft hover:shadow-glass hover:-translate-y-1 transition-all duration-200"
                >
                  <div className="h-11 w-11 bg-black/5 rounded-2xl flex items-center justify-center mb-5 text-black group-hover:bg-black group-hover:text-white transition-all duration-200">
                    {icon}
                  </div>
                  <h3 className="text-base font-bold text-black mb-2">{title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA strip */}
          <div className="text-center animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <div className="bg-black rounded-3xl px-8 py-12 shadow-2xl shadow-black/20 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.06),transparent_50%)] pointer-events-none" />
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3 tracking-tight">
                Stop searching your notes. Start asking questions.
              </h2>
              <p className="text-gray-400 text-sm sm:text-base mb-8 max-w-lg mx-auto">
                Build a searchable knowledge base from every conversation you have —
                meetings, lectures, interviews. ClarIQy makes it all instantly findable.
              </p>
              <button
                onClick={scrollToTry}
                className="group inline-flex items-center gap-2 px-8 py-4 bg-white text-black rounded-2xl font-bold hover:bg-gray-100 transition-all hover:scale-[1.03] active:scale-95 shadow-lg"
              >
                Try it free — no sign-up
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
