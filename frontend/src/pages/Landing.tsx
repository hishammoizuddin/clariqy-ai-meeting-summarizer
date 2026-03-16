import React from 'react';
import { Link } from 'react-router-dom';
import { Brain, Mic, FileText, Search, ArrowRight, Zap, Shield, Sparkles } from 'lucide-react';
import TopBar from '../components/TopBar';
import Footer from '../components/Footer';

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col font-sans bg-gray-50/50">
      <TopBar />
      
      <main className="flex-grow flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden">
        {/* Abstract Background Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/20 rounded-full blur-[120px] pointer-events-none mix-blend-multiply"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-400/20 rounded-full blur-[120px] pointer-events-none mix-blend-multiply"></div>
        
        <div className="w-full max-w-6xl mx-auto z-10 animate-fade-in-up">
          <div className="text-center space-y-6 md:space-y-8 mb-16 max-w-4xl mx-auto mt-10 sm:mt-20">
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-black tracking-tight leading-tight">
              Every detail, captured. <br className="hidden md:block"/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-500">
                Every insight, unlocked.
              </span>
            </h1>
            <p className="text-lg md:text-2xl text-gray-600 font-medium max-w-2xl mx-auto">
              ClarIQy is your AI-powered second brain for meetings. AI summaries, smart search, and flawless recall in a beautifully unified workspace.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link to="/signup" className="group relative w-full sm:w-auto flex items-center justify-center px-8 py-4 bg-black text-white rounded-2xl font-bold tracking-wide hover:bg-gray-900 transition-all hover:scale-105 active:scale-95 shadow-glass shadow-black/20">
                Get Started for Free
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/login" className="w-full sm:w-auto flex items-center justify-center px-8 py-4 bg-white text-black border border-gray-200/60 rounded-2xl font-bold tracking-wide hover:bg-gray-50 transition-all hover:shadow-soft">
                Sign In
              </Link>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-20">
            <div className="bg-white/60 backdrop-blur-xl border border-gray-200/60 p-8 rounded-3xl shadow-soft hover:shadow-glass hover:-translate-y-1 transition-all">
              <div className="h-12 w-12 bg-black/5 rounded-2xl flex items-center justify-center mb-6 text-black">
                <Mic size={24} />
              </div>
              <h3 className="text-xl font-bold text-black mb-3">Flawless Transcription</h3>
              <p className="text-gray-600 leading-relaxed">
                Upload audio or video and let ClarIQy instantly generate high-fidelity transcripts with speaker attribution.
              </p>
            </div>

            <div className="bg-white/60 backdrop-blur-xl border border-gray-200/60 p-8 rounded-3xl shadow-soft hover:shadow-glass hover:-translate-y-1 transition-all">
              <div className="h-12 w-12 bg-black/5 rounded-2xl flex items-center justify-center mb-6 text-black">
                <FileText size={24} />
              </div>
              <h3 className="text-xl font-bold text-black mb-3">Smart Summaries</h3>
              <p className="text-gray-600 leading-relaxed">
                Automatically distill hours of discussion into concise, actionable summaries with critical takeaways highlighted.
              </p>
            </div>

            <div className="bg-white/60 backdrop-blur-xl border border-gray-200/60 p-8 rounded-3xl shadow-soft hover:shadow-glass hover:-translate-y-1 transition-all">
              <div className="h-12 w-12 bg-black/5 rounded-2xl flex items-center justify-center mb-6 text-black">
                <Search size={24} />
              </div>
              <h3 className="text-xl font-bold text-black mb-3">Instant Recall (RAG)</h3>
              <p className="text-gray-600 leading-relaxed">
                Chat directly with your meetings. Ask complex questions and instantly retrieve the exact context you need.
              </p>
            </div>
          </div>
          
        </div>
      </main>

      <Footer />
    </div>
  );
}
