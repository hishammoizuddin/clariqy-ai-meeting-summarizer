import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Radio,
  FileAudio,
  Users,
  FileText,
  MessageCircle,
  Download,
} from 'lucide-react';
import TopBar from '../components/TopBar';
import Footer from '../components/Footer';

const features = [
  {
    icon: <Radio size={22} />,
    title: 'Record Live Conversations',
    description:
      'Hit record before your next meeting. ClarIQy listens in real-time and builds a live transcript as the conversation unfolds.',
  },
  {
    icon: <FileAudio size={22} />,
    title: 'Import Any Recording',
    description:
      'Already have a file? Upload audio or video from any device. ClarIQy handles the rest automatically.',
  },
  {
    icon: <Users size={22} />,
    title: 'Know Who Said What',
    description:
      'ClarIQy identifies every distinct voice in the room and labels each speaker clearly — so nothing gets lost in the noise.',
  },
  {
    icon: <FileText size={22} />,
    title: 'Instant Meeting Summaries',
    description:
      'Get a structured summary with key discussion points, decisions made, and clear next steps — ready the moment the call ends.',
  },
  {
    icon: <MessageCircle size={22} />,
    title: 'Ask Anything About the Meeting',
    description:
      '"What did Alex say about the budget?" Just ask. ClarIQy finds and surfaces the exact answer from your transcript.',
  },
  {
    icon: <Download size={22} />,
    title: 'Export to PDF',
    description:
      'Share a polished summary PDF with your team in one click. Clean formatting, speaker labels included.',
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col font-sans bg-gray-50/50">
      <TopBar />

      <main className="flex-grow flex flex-col items-center p-6 sm:p-12 relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-[-8%] left-[-8%] w-[45%] h-[45%] bg-blue-300/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-8%] w-[40%] h-[40%] bg-purple-300/15 rounded-full blur-[140px] pointer-events-none" />

        <div className="w-full max-w-5xl mx-auto z-10">

          {/* Hero */}
          <div className="text-center space-y-6 mb-20 mt-10 sm:mt-20 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/5 border border-black/8 text-xs font-semibold tracking-widest uppercase text-gray-600 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
              AI-Powered Meeting Intelligence
            </div>

            <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-black tracking-tight leading-[1.1]">
              Stop taking notes.{' '}
              <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-br from-gray-900 via-gray-700 to-gray-400">
                Start having better meetings.
              </span>
            </h1>

            <p className="text-lg md:text-xl text-gray-500 font-medium max-w-xl mx-auto leading-relaxed">
              ClarIQy captures every conversation, identifies every speaker, and
              turns your meetings into clear summaries you can actually act on.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link
                to="/signup"
                className="group w-full sm:w-auto flex items-center justify-center px-8 py-4 bg-black text-white rounded-2xl font-bold tracking-wide hover:bg-gray-900 transition-all hover:scale-[1.03] active:scale-95 shadow-lg shadow-black/15"
              >
                Get Started — It's Free
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto flex items-center justify-center px-8 py-4 bg-white text-black border border-gray-200/80 rounded-2xl font-bold tracking-wide hover:bg-gray-50 transition-all hover:shadow-md"
              >
                Sign In
              </Link>
            </div>
          </div>

          {/* How it works — 3-step strip */}
          <div
            className="mb-20 animate-fade-in-up"
            style={{ animationDelay: '0.1s' }}
          >
            <p className="text-center text-[11px] font-bold uppercase tracking-[0.25em] text-gray-400 mb-8">
              How it works
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 sm:gap-0 divide-y sm:divide-y-0 sm:divide-x divide-gray-200/70 bg-white/60 backdrop-blur-xl border border-gray-200/60 rounded-3xl shadow-glass overflow-hidden">
              {[
                { step: '01', label: 'Record or upload your meeting' },
                { step: '02', label: 'ClarIQy transcribes & identifies speakers' },
                { step: '03', label: 'Get your summary, then ask questions' },
              ].map(({ step, label }) => (
                <div key={step} className="flex items-center gap-4 px-7 py-6">
                  <span className="text-3xl font-black text-gray-100 tracking-tighter select-none shrink-0">
                    {step}
                  </span>
                  <p className="text-sm font-semibold text-gray-700 leading-snug">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Features grid */}
          <div
            className="mb-20 animate-fade-in-up"
            style={{ animationDelay: '0.2s' }}
          >
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
          <div
            className="text-center animate-fade-in-up"
            style={{ animationDelay: '0.3s' }}
          >
            <div className="bg-black rounded-3xl px-8 py-12 shadow-2xl shadow-black/20 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.06),transparent_50%)] pointer-events-none" />
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3 tracking-tight">
                Your next meeting is worth remembering.
              </h2>
              <p className="text-gray-400 text-sm sm:text-base mb-8 max-w-md mx-auto">
                Start using ClarIQy for free. No credit card required.
              </p>
              <Link
                to="/signup"
                className="group inline-flex items-center gap-2 px-8 py-4 bg-white text-black rounded-2xl font-bold hover:bg-gray-100 transition-all hover:scale-[1.03] active:scale-95 shadow-lg"
              >
                Create a free account
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
