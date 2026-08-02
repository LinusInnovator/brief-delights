'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { IconStreamLeaders, IconStreamBuilders, IconStreamInnovators } from '@/components/EditorialIcons';

type StreamFreq = 'daily' | 'alternate' | 'weekly' | 'off';

interface StreamPreferences {
  leaders: StreamFreq;
  builders: StreamFreq;
  innovators: StreamFreq;
}

function PreferenceStudioContent() {
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get('token');
  const emailParam = searchParams.get('email');

  const [email, setEmail] = useState(emailParam || '');
  const [token, setToken] = useState(tokenParam || '');
  const [loadedEmail, setLoadedEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'loaded' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  const [prefs, setPrefs] = useState<StreamPreferences>({
    leaders: 'weekly',
    builders: 'daily',
    innovators: 'alternate',
  });

  const [pauseUntil, setPauseUntil] = useState<string | null>(null);

  useEffect(() => {
    if (tokenParam || emailParam) {
      fetchPreferences(tokenParam, emailParam);
    }
  }, [tokenParam, emailParam]);

  async function fetchPreferences(t?: string | null, e?: string | null) {
    setStatus('loading');
    setErrorMessage('');
    try {
      const url = new URL('/api/preferences', window.location.origin);
      if (t) url.searchParams.set('token', t);
      if (e) url.searchParams.set('email', e);

      const res = await fetch(url.toString());
      const data = await res.json();

      if (res.ok && data.success) {
        setLoadedEmail(data.subscriber.email);
        setEmail(data.subscriber.email);
        if (data.subscriber.verification_token) {
          setToken(data.subscriber.verification_token);
        }
        setPrefs(data.subscriber.stream_preferences || {
          leaders: 'off',
          builders: 'off',
          innovators: 'off',
        });
        setPauseUntil(data.subscriber.pause_until);
        setStatus('loaded');
      } else {
        setStatus('error');
        setErrorMessage(data.error || 'Subscriber profile not found');
      }
    } catch {
      setStatus('error');
      setErrorMessage('Failed to connect. Please check network.');
    }
  }

  function handleLookupSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (email) {
      fetchPreferences(null, email);
    }
  }

  function updateStreamFreq(stream: keyof StreamPreferences, freq: StreamFreq) {
    setPrefs((prev) => ({ ...prev, [stream]: freq }));
  }

  async function handleSavePreferences() {
    setStatus('saving');
    setSaveMessage('');
    try {
      const res = await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loadedEmail || email,
          token,
          stream_preferences: prefs,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatus('saved');
        setSaveMessage('Preferences updated successfully!');
        setTimeout(() => setStatus('loaded'), 3000);
      } else {
        setStatus('error');
        setErrorMessage(data.error || 'Failed to save preferences');
      }
    } catch {
      setStatus('error');
      setErrorMessage('Network error while saving preferences.');
    }
  }

  async function handlePauseAll() {
    setStatus('saving');
    try {
      const res = await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loadedEmail || email,
          token,
          pause_days: 14,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPauseUntil(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString());
        setStatus('saved');
        setSaveMessage('All streams paused for 14 days.');
        setTimeout(() => setStatus('loaded'), 3000);
      }
    } catch {
      setStatus('error');
      setErrorMessage('Failed to pause streams.');
    }
  }

  // Calculate estimated Weekly Delivery Volume
  const getFreqCount = (f: StreamFreq) => {
    if (f === 'daily') return 7;
    if (f === 'alternate') return 3.5;
    if (f === 'weekly') return 1;
    return 0;
  };

  const totalWeeklyBriefs = Math.round(
    getFreqCount(prefs.leaders) + getFreqCount(prefs.builders) + getFreqCount(prefs.innovators)
  );

  const activeStreamCount = Object.values(prefs).filter((v) => v !== 'off').length;

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#121212] font-sans">
      {/* Top Header Navigation */}
      <header className="border-b border-[#E5DCD3] bg-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-[#3D0A11] p-1 flex items-center justify-center border border-[#C5A059]/30">
              <img src="/bd_seal_logo.png" alt="Brief Delights Seal" className="w-6 h-6 object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="font-serif font-bold text-sm tracking-tight text-[#121212] group-hover:text-[#58111A] transition">
                Brief Delights
              </span>
              <span className="text-[9px] font-mono tracking-widest text-[#8C6D2B] uppercase">Preference Studio</span>
            </div>
          </Link>

          <Link
            href="/archive"
            className="text-xs font-semibold text-[#58111A] hover:underline"
          >
            &larr; Back to Open Archive
          </Link>
        </div>
      </header>

      {/* Main Studio Body */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Title Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#58111A]/5 border border-[#58111A]/15 text-[#58111A] text-xs font-mono tracking-wider uppercase mb-3">
            <span>Bespoke Delivery Control</span>
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight text-[#121212] mb-3">
            Your Newsletter Preference Studio
          </h1>
          <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
            Customize frequency independently per edition. Zero dark patterns—read what you want, when you want it.
          </p>
        </div>

        {/* Email Lookup State if Not Logged In */}
        {status !== 'loaded' && status !== 'saving' && status !== 'saved' ? (
          <div className="bg-white border border-[#E5DCD3] rounded-3xl p-8 shadow-sm max-w-md mx-auto">
            <h3 className="font-serif text-lg font-bold text-[#121212] mb-2">Look Up Subscriber Profile</h3>
            <p className="text-xs text-slate-500 mb-6">
              Enter your work email address to manage your stream frequencies and pause settings.
            </p>

            <form onSubmit={handleLookupSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-slate-500 block mb-1">
                  Work Email
                </label>
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#E5DCD3] rounded-xl focus:border-[#58111A] focus:outline-none text-sm text-[#121212]"
                  required
                />
              </div>

              {status === 'error' && (
                <p className="text-xs text-red-600 font-semibold">{errorMessage}</p>
              )}

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full py-3.5 bg-[#121212] hover:bg-[#58111A] text-white font-bold rounded-xl text-xs shadow transition disabled:bg-slate-400"
              >
                {status === 'loading' ? 'Loading Profile...' : 'Open Preference Studio \u2192'}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Subscriber Status Bar */}
            <div className="bg-white border border-[#E5DCD3] rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase block">Active Subscriber</span>
                <span className="font-serif font-bold text-base text-[#121212]">{loadedEmail}</span>
              </div>

              {pauseUntil && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-1.5 rounded-lg font-mono">
                  Paused until {new Date(pauseUntil).toLocaleDateString()}
                </div>
              )}
            </div>

            {/* Email Cadence Summary Digest Box */}
            <div className="bg-[#3D0A11] text-white rounded-3xl p-6 shadow-md border border-[#C5A059]/30 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <div className="text-[10px] font-mono tracking-widest text-[#C5A059] uppercase mb-1">
                  Calculated Delivery Cadence
                </div>
                <h2 className="font-serif text-xl font-bold">
                  {totalWeeklyBriefs} {totalWeeklyBriefs === 1 ? 'Brief' : 'Briefs'} / Week Across {activeStreamCount} {activeStreamCount === 1 ? 'Stream' : 'Streams'}
                </h2>
                <p className="text-xs text-white/70 mt-1">
                  Adjust individual sliders below to tailor your daily & weekly inbox intake.
                </p>
              </div>

              <button
                onClick={handleSavePreferences}
                disabled={status === 'saving'}
                className="px-6 py-3 bg-[#C5A059] hover:bg-[#D4AF66] text-[#121212] font-bold text-xs rounded-xl shadow transition whitespace-nowrap"
              >
                {status === 'saving' ? 'Saving...' : 'Save All Preferences \u2192'}
              </button>
            </div>

            {status === 'saved' && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-center text-xs font-bold animate-fade-in">
                ✨ {saveMessage}
              </div>
            )}

            {/* Stream 1: Leaders & Strategy */}
            <div className="bg-white border border-[#E5DCD3] rounded-3xl p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FAF8F5] border border-[#E5DCD3] flex items-center justify-center p-2">
                    <IconStreamLeaders className="w-6 h-6 text-[#58111A]" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-bold text-[#121212]">Leaders & Strategy Edition</h3>
                    <p className="text-xs text-slate-500">Executive briefings, macro AI market shifts & business impact.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-2">
                {[
                  { id: 'daily', label: 'Daily Briefing', desc: 'Mon - Sun (06:00 UTC)' },
                  { id: 'alternate', label: 'Every 2nd Day', desc: 'Alternate Days' },
                  { id: 'weekly', label: 'Weekly Only', desc: 'Sundays Only' },
                  { id: 'off', label: 'Turn Off', desc: 'Disabled' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => updateStreamFreq('leaders', opt.id as StreamFreq)}
                    className={`p-3 rounded-2xl border text-left transition ${
                      prefs.leaders === opt.id
                        ? 'bg-[#58111A] text-white border-[#58111A] shadow-sm'
                        : 'bg-[#FAF8F5] text-slate-700 border-[#E5DCD3] hover:border-[#58111A]'
                    }`}
                  >
                    <span className="font-bold text-xs block">{opt.label}</span>
                    <span className={`text-[10px] block mt-0.5 ${prefs.leaders === opt.id ? 'text-white/70' : 'text-slate-400'}`}>
                      {opt.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Stream 2: Engineering & Tech Stack */}
            <div className="bg-white border border-[#E5DCD3] rounded-3xl p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FAF8F5] border border-[#E5DCD3] flex items-center justify-center p-2">
                    <IconStreamBuilders className="w-6 h-6 text-[#58111A]" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-bold text-[#121212]">Engineering & Tech Stack Edition</h3>
                    <p className="text-xs text-slate-500">Developer tooling, system architecture benchmarks & code snippets.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-2">
                {[
                  { id: 'daily', label: 'Daily Briefing', desc: 'Mon - Sun (06:00 UTC)' },
                  { id: 'alternate', label: 'Every 2nd Day', desc: 'Alternate Days' },
                  { id: 'weekly', label: 'Weekly Only', desc: 'Sundays Only' },
                  { id: 'off', label: 'Turn Off', desc: 'Disabled' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => updateStreamFreq('builders', opt.id as StreamFreq)}
                    className={`p-3 rounded-2xl border text-left transition ${
                      prefs.builders === opt.id
                        ? 'bg-[#58111A] text-white border-[#58111A] shadow-sm'
                        : 'bg-[#FAF8F5] text-slate-700 border-[#E5DCD3] hover:border-[#58111A]'
                    }`}
                  >
                    <span className="font-bold text-xs block">{opt.label}</span>
                    <span className={`text-[10px] block mt-0.5 ${prefs.builders === opt.id ? 'text-white/70' : 'text-slate-400'}`}>
                      {opt.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Stream 3: AI Research & Signals */}
            <div className="bg-white border border-[#E5DCD3] rounded-3xl p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FAF8F5] border border-[#E5DCD3] flex items-center justify-center p-2">
                    <IconStreamInnovators className="w-6 h-6 text-[#58111A]" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-bold text-[#121212]">AI Research & Signals Edition</h3>
                    <p className="text-xs text-slate-500">Frontier research papers, model releases & algorithm breakdowns.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-2">
                {[
                  { id: 'daily', label: 'Daily Briefing', desc: 'Mon - Sun (06:00 UTC)' },
                  { id: 'alternate', label: 'Every 2nd Day', desc: 'Alternate Days' },
                  { id: 'weekly', label: 'Weekly Only', desc: 'Sundays Only' },
                  { id: 'off', label: 'Turn Off', desc: 'Disabled' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => updateStreamFreq('innovators', opt.id as StreamFreq)}
                    className={`p-3 rounded-2xl border text-left transition ${
                      prefs.innovators === opt.id
                        ? 'bg-[#58111A] text-white border-[#58111A] shadow-sm'
                        : 'bg-[#FAF8F5] text-slate-700 border-[#E5DCD3] hover:border-[#58111A]'
                    }`}
                  >
                    <span className="font-bold text-xs block">{opt.label}</span>
                    <span className={`text-[10px] block mt-0.5 ${prefs.innovators === opt.id ? 'text-white/70' : 'text-slate-400'}`}>
                      {opt.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Zero-Dark-Pattern Pause & Unsubscribe Footer */}
            <div className="pt-6 border-t border-[#E5DCD3] flex flex-col md:flex-row items-center justify-between gap-4">
              <button
                onClick={handlePauseAll}
                className="text-xs font-semibold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-4 py-2.5 rounded-xl transition"
              >
                ⏸️ Pause All Streams for 14 Days
              </button>

              <button
                onClick={() => {
                  setPrefs({ leaders: 'off', builders: 'off', innovators: 'off' });
                  handleSavePreferences();
                }}
                className="text-xs text-slate-400 hover:text-red-600 transition underline"
              >
                Unsubscribe From All Newsletters
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function PreferencesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-8">
        <div className="inline-block w-8 h-8 border-3 border-[#58111A] border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <PreferenceStudioContent />
    </Suspense>
  );
}
