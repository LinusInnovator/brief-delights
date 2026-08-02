'use client';

import { useState, useEffect } from 'react';

interface ArticleResult {
  id: string | number;
  title: string;
  summary: string;
  key_takeaway: string;
  why_it_matters?: string;
  source: string;
  segment: string;
  url: string;
  is_blurred: boolean;
}

export default function AISearchSection() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchAttempt, setSearchAttempt] = useState(1);
  const [email, setEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);

  const [aiSynthesis, setAiSynthesis] = useState<string | null>(null);
  const [articles, setArticles] = useState<ArticleResult[]>([]);
  const [expandedId, setExpandedId] = useState<string | number | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [limitReason, setLimitReason] = useState<'email_required' | 'upgrade_pro_required' | null>(null);
  const [creditsRemaining, setCreditsRemaining] = useState<number>(5);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    try {
      const storedAttempt = localStorage.getItem('bd_search_count');
      if (storedAttempt) {
        setSearchAttempt(parseInt(storedAttempt, 10));
      }
      const savedEmail = localStorage.getItem('bd_subscriber_email');
      if (savedEmail) {
        setEmail(savedEmail);
      }
    } catch {}
  }, []);

  async function handleSearch(searchQuery?: string) {
    const activeQuery = searchQuery || query;
    if (!activeQuery || activeQuery.trim().length === 0) return;

    setLoading(true);
    setLimitReached(false);
    setLimitReason(null);
    setHasSearched(true);
    setExpandedId(null);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: activeQuery,
          email,
          search_attempt: searchAttempt,
        }),
      });

      const data = await res.json();

      if (data.limit_reached) {
        setLimitReached(true);
        setLimitReason(data.reason);
      } else if (data.success) {
        setAiSynthesis(data.ai_synthesis);
        setArticles(data.articles || []);
        if (typeof data.credits_remaining === 'number') {
          setCreditsRemaining(data.credits_remaining);
        }

        const nextAttempt = searchAttempt + 1;
        setSearchAttempt(nextAttempt);
        try {
          localStorage.setItem('bd_search_count', nextAttempt.toString());
        } catch {}
      }
    } catch (e) {
      console.error('Search request error:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubscribeUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;

    setSubscribing(true);
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, segment: 'innovators' }),
      });

      if (res.ok) {
        try {
          localStorage.setItem('bd_subscriber_active', 'true');
          localStorage.setItem('bd_subscriber_email', email);
        } catch {}
        setLimitReached(false);
        setCreditsRemaining(5);
        handleSearch();
      }
    } catch (err) {
      console.error('Subscribe error:', err);
    } finally {
      setSubscribing(false);
    }
  }

  return (
    <div className="w-full bg-[#3D0A11] text-white border-b border-[#C5A059]/30 py-10 px-4 sm:px-6 shadow-2xl">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Ticker */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#C5A059]/20 border border-[#C5A059]/40 flex items-center justify-center p-1">
              <img src="/bd_seal_logo.png" alt="Seal" className="w-full h-full object-contain" />
            </div>
            <span className="text-xs font-serif font-bold text-white tracking-wide">
              Ask Brief Delights AI
            </span>
            <span className="text-[10px] font-mono text-[#C5A059] uppercase bg-black/40 px-2 py-0.5 rounded border border-[#C5A059]/30">
              DeepSeek-V4 RAG Engine
            </span>
          </div>

          {/* 5/5 Credit Ticker Pill */}
          <div className="flex items-center gap-2">
            {email ? (
              <div className="bg-[#2D070C] border border-[#C5A059]/40 px-3 py-1 rounded-full text-[11px] font-mono flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${creditsRemaining > 2 ? 'bg-emerald-400' : creditsRemaining > 0 ? 'bg-amber-400' : 'bg-red-400 animate-pulse'}`}></span>
                <span className="text-[#C5A059] font-bold">{creditsRemaining} / 5</span>
                <span className="text-white/70">AI Search Credits Remaining</span>
              </div>
            ) : (
              <span className="text-[11px] font-mono text-[#C5A059]">
                ⚡ 1 Free Guest Search Teaser
              </span>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="relative flex items-center"
        >
          <input
            type="text"
            placeholder="Ask Brief Delights AI: Search 10,000+ tech & AI insights..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-5 pr-32 py-4 bg-white/10 border-2 border-[#C5A059]/40 focus:border-[#C5A059] rounded-2xl text-sm text-white placeholder:text-white/40 focus:outline-none backdrop-blur-md shadow-inner transition"
          />
          <button
            type="submit"
            disabled={loading}
            className="absolute right-2 px-6 py-2.5 bg-[#C5A059] hover:bg-[#D4AF66] text-[#121212] text-xs font-bold rounded-xl shadow-md transition flex items-center gap-2"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-[#121212] border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                <span>Search</span>
              </>
            )}
          </button>
        </form>

        {/* Prompt Chips */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-white/50 font-mono text-[10px] uppercase">Try:</span>
          {[
            '🚀 DeepSeek V4 Benchmark',
            '🎨 The best image gen model',
            '🤖 OpenAI Reasoning Updates',
            '🛡️ Kimwolf Botnet Threat',
            '⚡ Next.js vs Vite Latency',
          ].map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => {
                const clean = chip.replace(/^[^\s]+\s+/, '');
                setQuery(clean);
                handleSearch(clean);
              }}
              className="px-3 py-1 bg-white/5 hover:bg-white/15 border border-white/10 rounded-full text-white/80 hover:text-white text-[11px] transition"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Results Container */}
        {hasSearched && (
          <div className="pt-4 space-y-6">
            {/* Limit Reached - Email Required */}
            {limitReached && limitReason === 'email_required' && (
              <div className="p-8 bg-[#2D070C] border-2 border-[#C5A059]/50 rounded-2xl text-center space-y-4 shadow-xl">
                <div className="w-12 h-12 rounded-xl bg-[#C5A059]/20 border border-[#C5A059]/40 flex items-center justify-center mx-auto text-[#C5A059]">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                </div>
                <h3 className="font-serif text-xl font-bold text-white">
                  Unlock 5 Free Monthly AI Searches
                </h3>
                <p className="text-xs text-white/70 max-w-md mx-auto">
                  Guest search limit reached. Enter your work email below to unlock 5 free monthly AI search credits across our 10,000+ story archive.
                </p>
                <form onSubmit={handleSubscribeUnlock} className="max-w-sm mx-auto flex gap-2">
                  <input
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-xs text-white placeholder:text-white/40 focus:outline-none"
                    required
                  />
                  <button
                    type="submit"
                    disabled={subscribing}
                    className="px-5 py-2.5 bg-[#C5A059] hover:bg-[#D4AF66] text-[#121212] font-bold text-xs rounded-xl shadow"
                  >
                    {subscribing ? 'Unlocking...' : 'Unlock 5 Free Credits'}
                  </button>
                </form>
              </div>
            )}

            {/* Limit Reached - Studio Pro Required */}
            {limitReached && limitReason === 'upgrade_pro_required' && (
              <div className="p-8 bg-[#2D070C] border-2 border-[#C5A059] rounded-2xl text-center space-y-4 shadow-2xl">
                <div className="w-12 h-12 rounded-full bg-[#C5A059] text-[#121212] flex items-center justify-center mx-auto text-xl font-bold">
                  💎
                </div>
                <h3 className="font-serif text-2xl font-bold text-white">
                  0 / 5 Credits Remaining — Upgrade to Studio Pro
                </h3>
                <p className="text-xs text-white/80 max-w-md mx-auto leading-relaxed">
                  You've used all 5 free monthly AI search credits. Upgrade to **Brief Delights Studio Pro** for unlimited AI semantic search, full 128k DeepSeek synthesis, and exportable executive intelligence.
                </p>

                <div className="flex justify-center gap-4 py-2">
                  <div className="p-4 bg-white/10 border border-[#C5A059]/40 rounded-xl text-center">
                    <span className="text-2xl font-bold font-serif text-[#C5A059]">$9.00</span>
                    <span className="text-[10px] font-mono text-white/60 block">/ Month</span>
                  </div>
                  <div className="p-4 bg-white/10 border border-[#C5A059] rounded-xl text-center relative">
                    <span className="absolute -top-2.5 right-2 bg-[#C5A059] text-[#121212] text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">Save 27%</span>
                    <span className="text-2xl font-bold font-serif text-white">$79.00</span>
                    <span className="text-[10px] font-mono text-white/60 block">/ Year</span>
                  </div>
                </div>

                <a
                  href="/preferences?upgrade=pro"
                  className="inline-block px-8 py-3.5 bg-[#C5A059] hover:bg-[#D4AF66] text-[#121212] font-bold text-xs rounded-xl shadow-lg transition"
                >
                  ⚡ Upgrade to Studio Pro Now &rarr;
                </a>
              </div>
            )}

            {/* Empowering AI Synthesis Card */}
            {!limitReached && aiSynthesis && (
              <div className="p-6 bg-[#2D070C] border border-[#C5A059]/40 rounded-2xl shadow-xl space-y-3">
                <div className="flex items-center justify-between border-b border-[#C5A059]/20 pb-3">
                  <div className="flex items-center gap-2 text-[#C5A059] text-xs font-mono tracking-wider uppercase font-bold">
                    <span>✨ DeepSeek-V4 Executive Synthesis</span>
                  </div>
                  <span className="text-[10px] font-mono text-white/50">Verified Analysis</span>
                </div>
                <div className="text-sm text-white/95 leading-relaxed font-sans whitespace-pre-line space-y-3">
                  {aiSynthesis}
                </div>
              </div>
            )}

            {/* Expandable Story Dispatches */}
            {!limitReached && articles.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono text-[#C5A059] uppercase tracking-wider font-bold">
                    Relevant Knowledge Base Dispatches ({articles.length})
                  </h4>
                  <span className="text-[10px] font-mono text-white/50">Click to expand takeaway & why it matters</span>
                </div>

                <div className="grid gap-3">
                  {articles.map((art) => {
                    const isExpanded = expandedId === art.id;
                    return (
                      <div
                        key={art.id}
                        className={`p-5 rounded-2xl border transition ${
                          art.is_blurred
                            ? 'bg-white/5 border-white/10 blur-[2px] opacity-40 pointer-events-none'
                            : 'bg-white/10 border-white/20 hover:border-[#C5A059] shadow-md cursor-pointer'
                        }`}
                        onClick={() => !art.is_blurred && setExpandedId(isExpanded ? null : art.id)}
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono text-[#C5A059] uppercase mb-1.5">
                          <span className="bg-[#C5A059]/10 px-2 py-0.5 rounded border border-[#C5A059]/30">
                            {art.segment} Edition
                          </span>
                          <span>{art.source}</span>
                        </div>

                        <h5 className="font-serif font-bold text-base text-white mb-2 flex items-center justify-between">
                          <span>{art.title}</span>
                          <span className="text-[#C5A059] text-sm">{isExpanded ? '▲' : '▼'}</span>
                        </h5>

                        <p className="text-xs text-white/80 leading-relaxed">
                          {art.summary}
                        </p>

                        {/* Expandable Accordion Body */}
                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-white/15 space-y-3 animate-fade-in text-xs">
                            <div className="bg-black/30 p-3 rounded-xl border border-[#C5A059]/30">
                              <span className="text-[10px] font-mono text-[#C5A059] uppercase block mb-1">💡 Key Takeaway:</span>
                              <p className="text-white/90 font-medium">{art.key_takeaway}</p>
                            </div>

                            {art.why_it_matters && (
                              <div className="bg-black/30 p-3 rounded-xl border border-white/10">
                                <span className="text-[10px] font-mono text-white/60 uppercase block mb-1">🎯 Why It Matters:</span>
                                <p className="text-white/80">{art.why_it_matters}</p>
                              </div>
                            )}

                            <div className="pt-1 flex justify-end">
                              <a
                                href={art.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] font-bold text-[#C5A059] hover:underline flex items-center gap-1"
                              >
                                Read Full Dispatch in Archive &rarr;
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
