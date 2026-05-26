import React, { useState } from 'react'
import { Mail, Globe } from 'lucide-react'
import PolicyModal, { type PolicyType } from './PolicyModal'

export default function Footer() {
  const [openPolicy, setOpenPolicy] = useState<PolicyType | null>(null)

  return (
    <>
      <footer className="w-full mt-auto py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-t border-gray-200/50 pt-8">

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">

              {/* Left — brand + contact */}
              <div className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-gray-700 tracking-tight">Aisynch Labs</span>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <a
                    href="mailto:hello@aisynchlabs.com"
                    className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-black transition-colors group"
                  >
                    <Mail size={12} className="shrink-0 group-hover:text-black transition-colors" />
                    hello@aisynchlabs.com
                  </a>
                  <span className="hidden sm:block w-px h-3 bg-gray-200" />
                  <a
                    href="https://www.aisynchlabs.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-black transition-colors group"
                  >
                    <Globe size={12} className="shrink-0 group-hover:text-black transition-colors" />
                    www.aisynchlabs.com
                  </a>
                </div>
              </div>

              {/* Right — copyright + policy links */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                <p className="text-[11px] text-gray-400 font-medium tracking-wide">
                  &copy; 2026 <span className="text-gray-500">Aisynch Labs</span>. All rights reserved.
                </p>
                <div className="flex items-center gap-4 text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
                  <button
                    onClick={() => setOpenPolicy('privacy')}
                    className="hover:text-black transition-colors"
                  >
                    Privacy
                  </button>
                  <button
                    onClick={() => setOpenPolicy('terms')}
                    className="hover:text-black transition-colors"
                  >
                    Terms
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </footer>

      <PolicyModal open={openPolicy} onClose={() => setOpenPolicy(null)} />
    </>
  )
}
