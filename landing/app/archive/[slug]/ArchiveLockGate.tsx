'use client';

import { useState } from 'react';
import Link from 'next/link';

interface ArchiveLockGateProps {
  fullHtml: string;
  bodyContent: string;
  segment: string;
  date: string;
}

export default function ArchiveLockGate({
  fullHtml,
  segment,
  date,
}: ArchiveLockGateProps) {
  const [email, setEmail] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'alternate' | 'weekly'>('daily');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [showSubModal, setShowSubModal] = useState(false);

  const capitalizedSegment = segment.charAt(0).toUpperCase() + segment.slice(1);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus('error');
      setMessage('Please enter a valid work email address');
      return;
    }

    setStatus('loading');

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, segment, frequency }),
      });

      const data = await res.json();

      if (res.ok || data.success || data.already_subscribed) {
        setStatus('success');
        setMessage(data.message || `Subscribed to the ${capitalizedSegment} Brief (${frequency})!`);
        setShowSubModal(false);
      } else {
        setStatus('error');
        setMessage(data.error || 'Failed to update subscription');
      }
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-6 px-4">
      {/* Top Explicit Subscription & Frequency Header Bar */}
      <div className="bg-[#3D0A11] text-white rounded-2xl p-5 md:p-6 shadow-md border border-[#C5A059]/30 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 border border-[#C5A059]/30 flex items-center justify-center p-1.5 flex-shrink-0">
            <img src="/bd_seal_logo.png" alt="Brief Delights Seal" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="text-[10px] font-mono tracking-widest text-[#C5A059] uppercase">
              Free Open Archive &bull; {date}
            </div>
            <h2 className="font-serif text-lg font-bold text-white">
              {capitalizedSegment} Edition Brief
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {status === 'success' ? (
            <div className="bg-emerald-900/80 border border-emerald-500/40 text-emerald-200 text-xs px-4 py-2.5 rounded-xl font-medium flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
              <span>{message}</span>
            </div>
          ) : (
            <button
              onClick={() => setShowSubModal(true)}
              className="w-full md:w-auto px-5 py-2.5 bg-[#C5A059] hover:bg-[#D4AF66] text-[#121212] font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2"
            >
              <span>Subscribe to this Edition</span>
              <span className="opacity-60">&rarr;</span>
            </button>
          )}

          <Link
            href="/preferences"
            style={{ color: '#FFFFFF' }}
            className="px-5 py-2.5 bg-white/10 hover:bg-white/20 !text-white text-xs font-bold rounded-xl border border-[#C5A059]/40 transition whitespace-nowrap text-center shadow-sm"
          >
            Manage Frequencies
          </Link>
        </div>
      </div>

      {/* Main Unlocked Issue HTML Reader */}
      <div
        className="bg-white rounded-2xl shadow-sm border border-[#E5DCD3] p-4 md:p-8 overflow-hidden"
        dangerouslySetInnerHTML={{ __html: fullHtml }}
      />

      {/* Modal for Explicit Subscription & Frequency Pick */}
      {showSubModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#FAF8F5] border border-[#E5DCD3] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 relative">
            <button
              onClick={() => setShowSubModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 text-sm p-1"
            >
              ✕
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#3D0A11] p-1.5 flex items-center justify-center">
                <img src="/bd_seal_logo.png" alt="Brief Delights" className="w-full h-full object-contain" />
              </div>
              <div>
                <span className="text-[10px] font-mono tracking-widest text-[#8C6D2B] uppercase">Explicit Opt-In</span>
                <h3 className="font-serif text-xl font-bold text-[#121212]">
                  Subscribe to {capitalizedSegment}
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Choose your preferred delivery frequency. You can adjust your frequency or unsubscribe at any time.
            </p>

            <form onSubmit={handleSubscribe} className="space-y-4">
              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-slate-500 block mb-1">
                  Work Email Address
                </label>
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-[#E5DCD3] rounded-xl focus:border-[#58111A] focus:outline-none text-sm text-[#121212]"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-slate-500 block mb-2">
                  Delivery Frequency
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFrequency('daily')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 ${
                      frequency === 'daily'
                        ? 'bg-[#58111A] text-white border-[#58111A]'
                        : 'bg-white text-slate-700 border-[#E5DCD3] hover:border-[#58111A]'
                    }`}
                  >
                    <span>Daily</span>
                    <span className="text-[9px] opacity-70">Mon-Sun</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFrequency('alternate')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 ${
                      frequency === 'alternate'
                        ? 'bg-[#58111A] text-white border-[#58111A]'
                        : 'bg-white text-slate-700 border-[#E5DCD3] hover:border-[#58111A]'
                    }`}
                  >
                    <span>Every 2nd Day</span>
                    <span className="text-[9px] opacity-70">Alternate</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFrequency('weekly')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 ${
                      frequency === 'weekly'
                        ? 'bg-[#58111A] text-white border-[#58111A]'
                        : 'bg-white text-slate-700 border-[#E5DCD3] hover:border-[#58111A]'
                    }`}
                  >
                    <span>Weekly</span>
                    <span className="text-[9px] opacity-70">Sundays</span>
                  </button>
                </div>
              </div>

              {status === 'error' && (
                <p className="text-xs text-red-600 font-semibold">{message}</p>
              )}

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full py-3.5 bg-[#121212] hover:bg-[#58111A] text-white font-bold rounded-xl text-xs shadow transition disabled:bg-slate-400"
              >
                {status === 'loading' ? 'Confirming Subscription...' : 'Confirm Subscription \u2192'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
