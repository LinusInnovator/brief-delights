'use client';

import { useState, useEffect, useRef } from 'react';

interface ArticleResult {
  id: string | number;
  date?: string;
  title: string;
  summary: string;
  key_takeaway: string;
  why_it_matters?: string;
  verbatim_quote?: string;
  source: string;
  segment: string;
  url: string;
  is_blurred: boolean;
}

export default function AISearchSection() {
  const [isExpanded, setIsExpanded] = useState(false);
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

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const storedAttempt = localStorage.getItem('bd_search_count');
      let currentAttempt = 1;
      if (storedAttempt) {
        currentAttempt = parseInt(storedAttempt, 10);
        setSearchAttempt(currentAttempt);
      }

      const savedEmail = localStorage.getItem('bd_subscriber_email');
      if (savedEmail) {
        setEmail(savedEmail);
        const computedCredits = Math.max(0, 5 - (currentAttempt - 1));
        setCreditsRemaining(computedCredits);
      }
    } catch {}
  }, []);

  // Keyboard shortcut: Cmd+K / Ctrl+K to toggle or expand search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsExpanded((prev) => {
          const next = !prev;
          if (next) {
            setTimeout(() => searchInputRef.current?.focus(), 150);
          }
          return next;
        });
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  function handleOpenSearch() {
    setIsExpanded(true);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 150);
  }

  async function handleSearch(searchQuery?: string) {
    const activeQuery = searchQuery || query;
    if (!activeQuery || activeQuery.trim().length === 0) return;

    if (!isExpanded) {
      setIsExpanded(true);
    }

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
          try {
            localStorage.setItem('bd_search_credits_remaining', data.credits_remaining.toString());
          } catch {}
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

  function handleResetBeta() {
    try {
      localStorage.setItem('bd_search_count', '1');
      localStorage.setItem('bd_subscriber_email', 'beta@delights.pro');
      localStorage.setItem('bd_subscriber_active', 'true');
    } catch {}
    setEmail('beta@delights.pro');
    setSearchAttempt(1);
    setCreditsRemaining(10);
    setLimitReached(false);
    setLimitReason(null);
  }

  // ─────────────────────────────────────────────────────────────
  // 1. COLLAPSED BAR (DEFAULT)
  // ─────────────────────────────────────────────────────────────
  if (!isExpanded) {
    return (
      <div className="w-full bg-[#3D0A11]/95 text-white border-b border-[#C5A059]/25 py-2.5 px-4 sm:px-6 shadow-md backdrop-blur-md transition-all duration-300">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          {/* Left: Brand + Discreet Beta Tag */}
          <button
            type="button"
            onClick={handleOpenSearch}
            className="flex items-center gap-2 group text-left"
          >
            <div className="w-5 h-5 rounded bg-[#C5A059]/20 border border-[#C5A059]/40 flex items-center justify-center p-0.5 group-hover:scale-105 transition">
              <img src="/bd_seal_logo.png" alt="Seal" className="w-full h-full object-contain" />
            </div>
            <span className="text-xs font-serif font-bold text-white group-hover:text-[#C5A059] transition tracking-wide">
              Ask Brief Delights AI
            </span>
            <span className="text-[9px] font-mono tracking-wider font-semibold text-[#C5A059] uppercase bg-[#C5A059]/10 px-1.5 py-0.5 rounded border border-[#C5A059]/30">
              BETA
            </span>
          </button>

          {/* Center: Search Trigger Pill */}
          <div
            onClick={handleOpenSearch}
            className="flex-1 max-w-md hidden sm:flex items-center justify-between gap-2 px-3.5 py-1.5 bg-white/5 hover:bg-white/10 border border-[#C5A059]/30 hover:border-[#C5A059]/60 rounded-full cursor-pointer transition text-xs text-white/50 shadow-inner group"
          >
            <div className="flex items-center gap-2 truncate">
              <svg className="w-3.5 h-3.5 text-[#C5A059] group-hover:scale-110 transition shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="truncate">Search 10,000+ tech & AI insights...</span>
            </div>
            <kbd className="text-[10px] font-mono bg-black/40 text-[#C5A059]/80 px-1.5 py-0.5 rounded border border-[#C5A059]/20 shrink-0">
              ⌘K
            </kbd>
          </div>

          {/* Right: Credits & Expand CTA Button */}
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1.5 text-[11px] font-mono text-white/70">
              <span className={`w-1.5 h-1.5 rounded-full ${creditsRemaining > 2 ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span className="text-[#C5A059] font-semibold">{creditsRemaining}/5</span>
              <span>Credits</span>
            </div>

            <button
              type="button"
              onClick={handleOpenSearch}
              className="px-3 py-1 bg-[#C5A059]/20 hover:bg-[#C5A059]/35 border border-[#C5A059]/40 text-[#C5A059] hover:text-white text-xs font-medium rounded-full transition flex items-center gap-1.5 shadow-sm"
            >
              <span>Explore AI Search</span>
              <svg className="w-3.5 h-3.5 text-[#C5A059]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. EXPANDED FOLD-OUT SEARCH (WITH DISCREET BETA & COLLAPSE)
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="w-full bg-[#3D0A11] text-white border-b border-[#C5A059]/30 py-8 px-4 sm:px-6 shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-top-2">
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header Ticker */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#C5A059]/20 border border-[#C5A059]/40 flex items-center justify-center p-1">
              <img src="/bd_seal_logo.png" alt="Seal" className="w-full h-full object-contain" />
            </div>
            <span className="text-xs font-serif font-bold text-white tracking-wide">
              Ask Brief Delights AI
            </span>
            <span className="text-[9px] font-mono font-semibold tracking-wider text-[#C5A059] uppercase bg-[#C5A059]/15 px-1.5 py-0.5 rounded border border-[#C5A059]/30">
              BETA
            </span>
            <span className="text-[10px] font-mono text-[#C5A059] uppercase bg-black/40 px-2 py-0.5 rounded border border-[#C5A059]/30">
              DeepSeek-V4 RAG Engine
            </span>
          </div>

          {/* 5/5 Credit Ticker Pill & Reset Beta & Collapse */}
          <div className="flex items-center gap-2 flex-wrap">
            {email ? (
              <div className="bg-[#2D070C] border border-[#C5A059]/40 px-3 py-1 rounded-full text-[11px] font-mono flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${creditsRemaining > 2 ? 'bg-emerald-400' : creditsRemaining > 0 ? 'bg-amber-400' : 'bg-red-400 animate-pulse'}`}></span>
                <span className="text-[#C5A059] font-bold">{creditsRemaining} / {creditsRemaining > 5 ? creditsRemaining : 5}</span>
                <span className="text-white/70">AI Search Credits</span>
              </div>
            ) : (
              <span className="text-[11px] font-mono text-[#C5A059] flex items-center gap-1">
                <svg className="w-3 h-3 text-[#C5A059]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                <span>1 Free Guest Search Teaser</span>
              </span>
            )}

            {/* Reset Beta Testing Button */}
            <button
              type="button"
              onClick={handleResetBeta}
              className="px-2.5 py-1 bg-[#C5A059]/20 hover:bg-[#C5A059]/30 border border-[#C5A059]/40 text-[#C5A059] hover:text-white text-[10px] font-mono rounded-full transition flex items-center gap-1 shadow-sm"
              title="Reset Beta Tester Credits to 10/10"
            >
              <svg className="w-3 h-3 text-[#C5A059]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              <span>Reset (10/10)</span>
            </button>

            {/* Fold / Collapse Button */}
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 border border-white/20 text-white/80 hover:text-white text-[10px] font-mono rounded-full transition flex items-center gap-1 shadow-sm"
              title="Collapse Search Bar"
            >
              <svg className="w-3 h-3 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
              </svg>
              <span>Collapse</span>
            </button>
          </div>
        </div>

        {/* Search Bar Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="relative flex items-center"
        >
          <input
            ref={searchInputRef}
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

        {/* Vector SVG Prompt Chips */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-white/50 font-mono text-[10px] uppercase">Try:</span>

          {[
            { label: 'DeepSeek V4 Benchmark', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
            { label: 'The best image gen model', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
            { label: 'OpenAI Reasoning Updates', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
            { label: 'Kimwolf Botnet Threat', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
            { label: 'Next.js vs Vite Latency', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
          ].map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => {
                setQuery(chip.label);
                handleSearch(chip.label);
              }}
              className="px-3 py-1 bg-white/5 hover:bg-white/15 border border-white/10 rounded-full text-white/80 hover:text-white text-[11px] transition flex items-center gap-1.5"
            >
              <svg className="w-3 h-3 text-[#C5A059]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d={chip.icon}/></svg>
              <span>{chip.label}</span>
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
                {/* Clean Vector Crown Icon */}
                <div className="w-12 h-12 rounded-full bg-[#C5A059]/20 border border-[#C5A059] text-[#C5A059] flex items-center justify-center mx-auto">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>
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
                  className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#C5A059] hover:bg-[#D4AF66] text-[#121212] font-bold text-xs rounded-xl shadow-lg transition"
                >
                  <svg className="w-4 h-4 text-[#121212]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                  <span>Upgrade to Studio Pro Now</span>
                  <span>&rarr;</span>
                </a>
              </div>
            )}

            {/* Empowering AI Synthesis Card */}
            {!limitReached && aiSynthesis && (
              <div className="p-6 bg-[#2D070C] border border-[#C5A059]/40 rounded-2xl shadow-xl space-y-3">
                <div className="flex items-center justify-between border-b border-[#C5A059]/20 pb-3">
                  <div className="flex items-center gap-2 text-[#C5A059] text-xs font-mono tracking-wider uppercase font-bold">
                    <svg className="w-4 h-4 text-[#C5A059]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>
                    <span>DeepSeek-V4 Executive Synthesis</span>
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
                              <span className="text-[10px] font-mono text-[#C5A059] uppercase block mb-1 flex items-center gap-1">
                                <svg className="w-3 h-3 text-[#C5A059]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
                                <span>Key Takeaway:</span>
                              </span>
                              <p className="text-white/90 font-medium">{art.key_takeaway}</p>
                            </div>

                            {art.why_it_matters && (
                              <div className="bg-black/30 p-3 rounded-xl border border-white/10">
                                <span className="text-[10px] font-mono text-white/60 uppercase block mb-1 flex items-center gap-1">
                                  <svg className="w-3 h-3 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                                  <span>Why It Matters:</span>
                                </span>
                                <p className="text-white/80">{art.why_it_matters}</p>
                              </div>
                            )}

                            {art.verbatim_quote && (
                              <div className="bg-[#2D070C] p-3 rounded-xl border border-[#C5A059]/40 italic text-white/90">
                                <span className="text-[10px] font-mono text-[#C5A059] not-italic uppercase block mb-1 flex items-center gap-1 font-bold">
                                  <svg className="w-3 h-3 text-[#C5A059]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/></svg>
                                  <span>Verbatim Quote Citation:</span>
                                </span>
                                <p className="text-white/95">"{art.verbatim_quote}"</p>
                              </div>
                            )}

                            <div className="pt-2 flex justify-end">
                              <a
                                href={art.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] font-bold text-[#C5A059] hover:underline flex items-center gap-1.5 bg-[#C5A059]/10 px-3 py-1.5 rounded-lg border border-[#C5A059]/30 hover:bg-[#C5A059]/20 transition"
                              >
                                <span>Read Full Dispatch in Archive ({art.date})</span>
                                <svg className="w-3 h-3 text-[#C5A059]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
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
