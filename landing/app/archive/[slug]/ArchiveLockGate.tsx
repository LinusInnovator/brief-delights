'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { IconStreamBuilders, IconStreamLeaders, IconStreamInnovators } from '../../../components/EditorialIcons';

interface ArchiveLockGateProps {
  fullHtml: string;
  bodyContent: string;
  segment: string;
  date: string;
}

export default function ArchiveLockGate({
  fullHtml,
  bodyContent,
  segment,
  date,
}: ArchiveLockGateProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'unlocked' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    // Check if user is already verified subscriber in localStorage
    try {
      const savedSubscriber = localStorage.getItem('bd_subscriber_active');
      if (savedSubscriber === 'true') {
        setUnlocked(true);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const handleSubscribeAndUnlock = async (e: React.FormEvent) => {
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
        body: JSON.stringify({ email, segment }),
      });

      const data = await res.json();

      if (res.ok) {
        // Unlock content immediately!
        setUnlocked(true);
        setStatus('unlocked');
        setMessage(data.message || 'Access granted! Welcome to Brief Delights.');
        try {
          localStorage.setItem('bd_subscriber_active', 'true');
          localStorage.setItem('bd_subscriber_email', email);
        } catch {}
      } else {
        // If already subscribed, unlock anyway!
        if (res.status === 409 || data.error?.toLowerCase().includes('already')) {
          setUnlocked(true);
          setStatus('unlocked');
          setMessage('Welcome back! Issue unlocked.');
          try {
            localStorage.setItem('bd_subscriber_active', 'true');
          } catch {}
        } else {
          setStatus('error');
          setMessage(data.error || 'Unable to verify subscription. Please try again.');
        }
      }
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  };

  if (unlocked) {
    return (
      <div className="space-y-4">
        {status === 'unlocked' && (
          <div className="bg-[#58111A] text-white p-4 rounded-2xl text-center text-sm font-bold shadow-lg animate-fade-in flex items-center justify-center gap-3">
            <span>✨ {message || 'Issue Unlocked for Active Subscriber'}</span>
          </div>
        )}
        <div
          className="bg-white rounded-2xl shadow-sm border border-[#121212]/10 p-4 md:p-8 overflow-hidden"
          dangerouslySetInnerHTML={{ __html: fullHtml }}
        />
      </div>
    );
  }

  return (
    <div className="relative bg-white rounded-3xl shadow-sm border border-[#121212]/10 p-4 md:p-8 overflow-hidden min-h-[550px]">
      {/* Blurred Preview Content */}
      <div
        className="select-none pointer-events-none opacity-40 blur-[3px]"
        dangerouslySetInnerHTML={{ __html: bodyContent }}
      />

      {/* Lock Glassmorphism Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-white/95 to-white flex flex-col items-center justify-center p-6 text-center z-10 backdrop-blur-md">
        <div className="w-20 h-20 bg-[#58111A]/10 border border-[#58111A]/20 rounded-2xl flex items-center justify-center shadow-sm mb-5">
          <img src="/bd_seal_logo.png" alt="Brief Delights Seal" className="w-12 h-12 object-contain" />
        </div>

        <h1 className="text-2xl md:text-3xl font-serif font-bold text-[#121212] mb-2">
          Subscriber-Only Intelligence
        </h1>
        <p className="text-gray-600 max-w-md mb-6 text-sm leading-relaxed">
          Today&apos;s and yesterday&apos;s editions are reserved for active subscribers.
          Enter your email to unlock this issue immediately and receive future letters daily.
        </p>

        <form onSubmit={handleSubscribeAndUnlock} className="w-full max-w-sm flex flex-col gap-3">
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-5 py-3.5 border-2 border-gray-200 rounded-xl focus:border-[#58111A] focus:outline-none text-sm text-gray-900 bg-white"
            disabled={status === 'loading'}
            required
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full bg-[#121212] text-white font-bold py-4 px-6 rounded-xl hover:bg-[#58111A] transition text-sm shadow-lg shadow-[#58111A]/10 disabled:bg-gray-400"
          >
            {status === 'loading' ? 'Verifying Subscriber Access...' : 'Unlock & Read Issue Now \u2192'}
          </button>
        </form>

        {status === 'error' && (
          <p className="text-xs text-red-600 mt-3 font-semibold">{message}</p>
        )}

        <p className="text-xs text-gray-400 mt-4 font-mono">
          Editions older than 2 days automatically unlock for public archive browsing.
        </p>
      </div>
    </div>
  );
}
