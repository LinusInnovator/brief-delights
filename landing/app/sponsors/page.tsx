'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function SponsorsPage() {
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('partners@brief.delights.pro');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#121212]">
      {/* Top Header Navigation */}
      <header className="border-b border-[#121212]/10 bg-white/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-[#3D0A11] p-1 flex items-center justify-center shadow-md">
              <img src="/bd_seal_logo.png" alt="Seal" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="font-serif font-bold text-base tracking-tight text-[#121212]">Brief <span className="italic text-[#58111A]">Delights</span></span>
              <span className="text-[10px] font-mono tracking-widest text-[#8C6D2B] uppercase block -mt-1">Partnerships & Media Kit</span>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <Link href="/archive" className="text-xs font-medium text-gray-600 hover:text-[#58111A] transition">
              Archive
            </Link>
            <a
              href="mailto:partners@brief.delights.pro?subject=Partner%20Spotlight%20Reservation%20Inquiry"
              className="bg-[#58111A] hover:bg-[#3D0A11] text-white text-xs font-bold px-4 py-2 rounded-lg transition shadow-sm"
            >
              Book Placement &rarr;
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 bg-[#58111A]/10 border border-[#58111A]/20 px-4 py-1 rounded-full text-xs font-bold tracking-widest text-[#58111A] uppercase">
            📢 PARTNER SPOTLIGHT & SPONSORSHIPS
          </div>
          <h1 className="text-4xl md:text-6xl font-serif text-[#121212] tracking-tight leading-tight">
            Put Your Product in Front of <br />
            <span className="italic text-[#58111A]">5,000+ AI Leaders & Engineers</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Brief Delights reaches founders, VP Engineering, CTOs, and AI practitioners who make purchasing and architectural decisions daily.
          </p>
        </div>

        {/* Audience Stats Bento */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="bg-white p-6 rounded-2xl border border-[#121212]/10 shadow-sm text-center">
            <div className="text-3xl font-serif font-bold text-[#58111A] mb-1">5,000+</div>
            <div className="text-xs font-mono uppercase tracking-wider text-gray-500">Verified Decision-Makers</div>
            <p className="text-xs text-gray-600 mt-2">Founders, Staff Engineers & Execs across 3 curated streams.</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#121212]/10 shadow-sm text-center">
            <div className="text-3xl font-serif font-bold text-[#58111A] mb-1">48.6%</div>
            <div className="text-xs font-mono uppercase tracking-wider text-gray-500">Average Open Rate</div>
            <p className="text-xs text-gray-600 mt-2">Ultra-engaged daily readership with high trust in recommendations.</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#121212]/10 shadow-sm text-center">
            <div className="text-3xl font-serif font-bold text-[#58111A] mb-1">1 Slot</div>
            <div className="text-xs font-mono uppercase tracking-wider text-gray-500">Per Edition Max</div>
            <p className="text-xs text-gray-600 mt-2">Strict exclusivity. Your brand never gets lost in a wall of ads.</p>
          </div>
        </div>

        {/* Placement Options */}
        <div className="space-y-6 mb-16">
          <h2 className="text-2xl font-serif font-bold text-[#121212]">Placement Formats</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Primary Spotlight */}
            <div className="bg-white p-8 rounded-2xl border-2 border-[#C5A059]/40 shadow-md flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-[#C5A059] text-[#121212] text-[10px] font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-bl-lg">
                MOST POPULAR
              </div>
              <div>
                <span className="text-xs font-mono text-[#8C6D2B] uppercase tracking-wider font-bold block mb-1">Primary Placement</span>
                <h3 className="text-xl font-serif font-bold text-[#121212] mb-3">Dedicated Partner Spotlight</h3>
                <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                  Featured prominently above the editorial dispatches. Includes logo, punchy 35-word endorsement, and direct tracked CTA link.
                </p>
                <ul className="text-xs text-gray-700 space-y-2 mb-6">
                  <li className="flex items-center gap-2">✓ 100% exclusive sponsorship in selected stream</li>
                  <li className="flex items-center gap-2">✓ Included in email dispatch & web archive permanently</li>
                  <li className="flex items-center gap-2">✓ Click & conversion tracking report included</li>
                </ul>
              </div>
              <div>
                <div className="text-2xl font-bold font-serif text-[#58111A] mb-4">$250 <span className="text-xs font-sans font-normal text-gray-500">/ edition</span></div>
                <a
                  href="mailto:partners@brief.delights.pro?subject=Reserve%20Primary%20Partner%20Spotlight"
                  className="block w-full text-center bg-[#58111A] hover:bg-[#3D0A11] text-white text-xs font-bold py-3 rounded-xl transition shadow-sm"
                >
                  Reserve Primary Spotlight &rarr;
                </a>
              </div>
            </div>

            {/* Weekly Takeover */}
            <div className="bg-white p-8 rounded-2xl border border-[#121212]/10 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono text-gray-500 uppercase tracking-wider font-bold block mb-1">Full Campaign</span>
                <h3 className="text-xl font-serif font-bold text-[#121212] mb-3">Weekly Stream Takeover</h3>
                <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                  Own all editions for an entire week (Mon–Fri + Sunday Synthesis) across Leaders, Builders, or Innovators streams.
                </p>
                <ul className="text-xs text-gray-700 space-y-2 mb-6">
                  <li className="flex items-center gap-2">✓ 6 consecutive editions in chosen vertical</li>
                  <li className="flex items-center gap-2">✓ Native editorial shoutout in Sunday Synthesis</li>
                  <li className="flex items-center gap-2">✓ A/B tested copy variations supported</li>
                </ul>
              </div>
              <div>
                <div className="text-2xl font-bold font-serif text-[#58111A] mb-4">$850 <span className="text-xs font-sans font-normal text-gray-500">/ full week</span></div>
                <a
                  href="mailto:partners@brief.delights.pro?subject=Reserve%20Weekly%20Stream%20Takeover"
                  className="block w-full text-center bg-[#121212] hover:bg-[#58111A] text-white text-xs font-bold py-3 rounded-xl transition shadow-sm"
                >
                  Reserve Weekly Takeover &rarr;
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Direct Booking & Contact Box */}
        <div className="bg-[#3D0A11] text-white p-8 md:p-12 rounded-3xl text-center space-y-6 shadow-xl border border-[#C5A059]/30">
          <div className="w-12 h-12 rounded-xl bg-[#C5A059]/20 border border-[#C5A059]/40 flex items-center justify-center mx-auto">
            <img src="/bd_seal_logo.png" alt="Seal" className="w-8 h-8 object-contain" />
          </div>
          <h2 className="text-2xl md:text-3xl font-serif font-bold tracking-tight">
            Ready to reach the highest-signal AI audience?
          </h2>
          <p className="text-sm text-gray-300 max-w-xl mx-auto leading-relaxed">
            Send us your target date, URL, and copy. We review every partner to ensure alignment with our executive readers.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <a
              href="mailto:partners@brief.delights.pro?subject=Partner%20Spotlight%20Inquiry"
              className="w-full sm:w-auto px-8 py-3.5 bg-[#C5A059] hover:bg-[#D4AF66] text-[#121212] font-bold text-xs rounded-xl transition shadow-md"
            >
              Email partners@brief.delights.pro &rarr;
            </a>
            <button
              onClick={handleCopyEmail}
              className="w-full sm:w-auto px-5 py-3.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-mono text-xs rounded-xl transition"
            >
              {copied ? '✓ Copied Email' : 'Copy Email Address'}
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#121212]/10 py-8 text-center text-xs text-gray-500">
        <p>&copy; {new Date().getFullYear()} Brief Delights &bull; Knowledge, Refined.</p>
      </footer>
    </div>
  );
}
