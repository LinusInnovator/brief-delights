'use client';

import { useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
    IconDailyRead, 
    IconPersonalizedRole, 
    IconDataDriven, 
    IconSundaySynthesis, 
    IconFreeForever, 
    IconEditoriallyCurated,
    IconStreamBuilders,
    IconStreamLeaders,
    IconStreamInnovators
} from './EditorialIcons';
import SignupForm, { SignupFormRef } from './SignupForm';

type Segment = 'builders' | 'leaders' | 'innovators';

interface ABVariantContent {
    banner_text?: string;
    banner_cta?: string;
    badge_text?: string;
    headline?: string;
    headline_accent?: string;
    subheadline?: string;
    cta_primary?: string;
    cta_secondary?: string;
}

export default function ClientPage({
    subscriberCount,
    referrer,
    abVariant,
    abVariantId,
    abExperimentId,
}: {
    subscriberCount: number;
    referrer?: string | null;
    abVariant?: ABVariantContent | null;
    abVariantId?: string | null;
    abExperimentId?: string | null;
}) {
    // Track impression on mount
    useEffect(() => {
        if (abVariantId && abExperimentId) {
            fetch('/api/ab-impression', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ variant_id: abVariantId, experiment_id: abExperimentId }),
            }).catch(() => { }); // Non-blocking
        }
    }, [abVariantId, abExperimentId]);

    // A/B content with fallbacks to current defaults
    const content = {
        banner_text: abVariant?.banner_text || 'Just launched — Be among the first subscribers',
        banner_cta: abVariant?.banner_cta || 'Join free →',
        badge_text: abVariant?.badge_text || 'Tech Intelligence, Curated for Your Role',
        headline: abVariant?.headline || 'Brief',
        headline_accent: abVariant?.headline_accent || 'delights',
        subheadline: abVariant?.subheadline || "Get the top 14 stories that matter to your role. Daily. Plus weekly strategic insights that connect the dots. We read 1,340+ articles so you don't have to.",
        cta_primary: abVariant?.cta_primary || 'Subscribe Free',
        cta_secondary: abVariant?.cta_secondary || 'See Archive',
    };
    const signupFormRef = useRef<SignupFormRef>(null);

    const handleSegmentClick = (segment: Segment) => {
        // Scroll to signup section smoothly
        const signupSection = document.getElementById('signup');
        if (signupSection) {
            signupSection.scrollIntoView({ behavior: 'smooth' });
        }

        // After a brief delay, select segment and focus email
        setTimeout(() => {
            signupFormRef.current?.selectSegmentAndFocus(segment);
        }, 300); // Wait for scroll to mostly complete
    };

    const scrollToSignup = () => {
        const signupSection = document.getElementById('signup');
        if (signupSection) {
            signupSection.scrollIntoView({ behavior: 'smooth' });
        }
        setTimeout(() => {
            signupFormRef.current?.selectSegmentAndFocus('innovators');
        }, 300);
    };

    return (
        <>
            {/* Launch Banner - Midnight Oxide & Gold Dust */}
            <div className="bg-[#4A0E17] text-white py-2.5 text-center text-sm border-b border-[#C5A059]/30">
                <span className="inline-flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C5A059] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C5A059]"></span>
                    </span>
                    <span className="font-medium tracking-wide text-gray-200">{content.banner_text}</span>
                    <button onClick={scrollToSignup} className="underline font-bold text-[#C5A059] hover:text-white transition ml-1">
                        {content.banner_cta}
                    </button>
                </span>
            </div>

            {/* Hero Section - Alabaster & Editorial Serif */}
            <section className="bg-[#FAF8F5] py-24 border-b border-[#121212]/10">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    
                    {/* Official Crimson BD Wax Seal Monogram Badge */}
                    <div className="w-20 h-20 rounded-2xl bg-white border border-[#4A0E17]/20 shadow-xl flex items-center justify-center mx-auto mb-8 p-2">
                        <img src="/bd_seal_logo.png" alt="Brief Delights Wax Seal" className="w-14 h-14 object-contain" />
                    </div>

                    <div className="inline-block bg-[#4A0E17]/10 border border-[#4A0E17]/20 px-5 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest text-[#4A0E17] mb-6">
                        {content.badge_text}
                    </div>

                    <h1 className="text-5xl md:text-7xl font-serif text-[#121212] mb-6 leading-[1.15] tracking-tight">
                        Brief <span className="italic text-[#58111A]">Delights</span>
                    </h1>

                    <p className="text-[#58111A] text-xs font-bold tracking-[0.25em] uppercase mb-8">
                        KNOWLEDGE, REFINED • EST. 2026
                    </p>

                    <p className="text-lg md:text-xl text-gray-700 mb-10 max-w-2xl mx-auto leading-relaxed font-sans">
                        {content.subheadline}
                    </p>

                    <div className="flex gap-4 justify-center">
                        <button
                            onClick={scrollToSignup}
                            className="bg-[#58111A] text-white px-8 py-4 rounded-xl font-bold tracking-wide hover:bg-[#3D0A11] transition shadow-lg shadow-[#58111A]/20"
                        >
                            {content.cta_primary}
                        </button>
                        <a
                            href="/archive"
                            className="bg-white border-2 border-[#121212]/20 text-[#121212] px-8 py-4 rounded-xl font-bold tracking-wide hover:border-[#58111A] transition shadow-sm"
                        >
                            {content.cta_secondary}
                        </a>
                    </div>

                    <div className="mt-14 bg-white border border-[#121212]/10 rounded-2xl p-6 inline-block shadow-sm">
                        <p className="text-gray-600 font-mono text-xs tracking-wider">
                            1,340+ ENGINES SCANNED • ~400 SYNTHESIZED • 14 REFINED DAILY
                        </p>
                    </div>
                </div>
            </section>

            {/* Segment Selector - Editorial Cards */}
            <section className="bg-[#FAF8F5] py-20 border-b border-[#121212]/10">
                <div className="max-w-6xl mx-auto px-6">
                    <h3 className="text-3xl md:text-4xl font-serif text-center mb-4 text-[#121212]">
                        Select Your Curated Edition
                    </h3>
                    <p className="text-center text-gray-600 mb-12 max-w-xl mx-auto text-sm">
                        Role-tailored intelligence streams designed for high-density reading efficiency.
                    </p>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Builders Card */}
                        <div className="bg-white border border-[#121212]/10 rounded-2xl p-8 hover:border-[#58111A] hover:shadow-xl transition cursor-pointer group flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-6">
                                    <div className="w-16 h-16 rounded-2xl bg-[#58111A]/10 border border-[#58111A]/20 flex items-center justify-center shadow-sm">
                                        <IconStreamBuilders className="w-9 h-9 text-[#58111A]" />
                                    </div>
                                    <span className="bg-[#C5A059]/15 text-[#8C6D2B] border border-[#C5A059]/30 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">TECHNICAL STREAM</span>
                                </div>
                                <h4 className="text-2xl font-serif font-bold mb-2 text-[#121212] group-hover:text-[#58111A] transition">Builders</h4>
                                <p className="text-gray-600 text-sm mb-4 leading-relaxed">For engineers, architects, technical founders & developers.</p>
                                <p className="text-xs text-gray-400 mb-6 font-mono">
                                    Developer tools • Infrastructure • Open source
                                </p>
                            </div>
                            <button
                                onClick={() => handleSegmentClick('builders')}
                                className="w-full bg-[#121212] text-white py-3.5 rounded-xl font-bold tracking-wide hover:bg-[#58111A] transition"
                            >
                                Subscribe Builder Brief
                            </button>
                        </div>

                        {/* Leaders Card */}
                        <div className="bg-white border-2 border-[#58111A]/30 rounded-2xl p-8 shadow-md hover:border-[#58111A] hover:shadow-xl transition cursor-pointer group flex flex-col justify-between relative overflow-hidden">
                            <div className="absolute top-0 right-0 bg-[#58111A] text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-bl-lg">POPULAR</div>
                            <div>
                                <div className="flex items-center justify-between mb-6">
                                    <div className="w-16 h-16 rounded-2xl bg-[#58111A]/10 border border-[#58111A]/20 flex items-center justify-center shadow-sm">
                                        <IconStreamLeaders className="w-9 h-9 text-[#58111A]" />
                                    </div>
                                    <span className="bg-[#58111A]/10 text-[#58111A] border border-[#58111A]/20 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">STRATEGY STREAM</span>
                                </div>
                                <h4 className="text-2xl font-serif font-bold mb-2 text-[#121212] group-hover:text-[#58111A] transition">Leaders</h4>
                                <p className="text-gray-600 text-sm mb-4 leading-relaxed">For executives, product leads, strategists & founders.</p>
                                <p className="text-xs text-gray-400 mb-6 font-mono">
                                    Business strategy • Leadership • Market trends
                                </p>
                            </div>
                            <button
                                onClick={() => handleSegmentClick('leaders')}
                                className="w-full bg-[#58111A] text-white py-3.5 rounded-xl font-bold tracking-wide hover:bg-[#3D0A11] transition shadow-md"
                            >
                                Subscribe Leader Brief
                            </button>
                        </div>

                        {/* Innovators Card */}
                        <div className="bg-white border border-[#121212]/10 rounded-2xl p-8 hover:border-[#58111A] hover:shadow-xl transition cursor-pointer group flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-6">
                                    <div className="w-16 h-16 rounded-2xl bg-[#58111A]/10 border border-[#58111A]/20 flex items-center justify-center shadow-sm">
                                        <IconStreamInnovators className="w-9 h-9 text-[#58111A]" />
                                    </div>
                                    <span className="bg-[#C5A059]/15 text-[#8C6D2B] border border-[#C5A059]/30 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">FRONTIER STREAM</span>
                                </div>
                                <h4 className="text-2xl font-serif font-bold mb-2 text-[#121212] group-hover:text-[#58111A] transition">Innovators</h4>
                                <p className="text-gray-600 text-sm mb-4 leading-relaxed">For AI researchers, early adopters & venture operators.</p>
                                <p className="text-xs text-gray-400 mb-6 font-mono">
                                    Cutting-edge AI • Emerging tech • Frontier research
                                </p>
                            </div>
                            <button
                                onClick={() => handleSegmentClick('innovators')}
                                className="w-full bg-[#121212] text-white py-3.5 rounded-xl font-bold tracking-wide hover:bg-[#58111A] transition"
                            >
                                Subscribe Innovator Brief
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Signup Section - Warm Alabaster Card */}
            <section id="signup" className="bg-[#FAF8F5] py-24 border-b border-[#121212]/10 scroll-mt-8">
                <div className="max-w-4xl mx-auto px-6">
                    <div className="bg-white border border-[#121212]/10 rounded-3xl p-10 md:p-14 shadow-xl text-center">
                        <div className="w-20 h-20 rounded-2xl bg-[#58111A]/10 border border-[#58111A]/20 flex items-center justify-center mx-auto mb-6 shadow-sm">
                            <IconEditoriallyCurated className="w-10 h-10 text-[#58111A]" />
                        </div>

                        <h3 className="text-3xl md:text-4xl font-serif text-[#121212] mb-3">
                            Start Receiving Daily Intelligence
                        </h3>
                        <p className="text-gray-600 mb-8 max-w-xl mx-auto text-sm leading-relaxed">
                            {subscriberCount >= 5000 ? (
                                <span className="font-semibold text-[#121212]">
                                    🔥 {subscriberCount.toLocaleString()} readers strong — join the industry standard
                                </span>
                            ) : subscriberCount >= 1000 ? (
                                <span className="font-semibold text-[#121212]">
                                    Join {subscriberCount.toLocaleString()} executives and engineers getting smarter every morning
                                </span>
                            ) : subscriberCount >= 100 ? (
                                <span className="font-semibold text-[#121212]">
                                    Join {subscriberCount.toLocaleString()} subscribers receiving role-curated intelligence daily
                                </span>
                            ) : (
                                <span className="font-semibold text-[#121212]">
                                    Curated daily intelligence delivered to your inbox every morning
                                </span>
                            )}
                        </p>

                        <SignupForm ref={signupFormRef} referrer={referrer} abVariantId={abVariantId} />
                    </div>
                </div>
            </section>

            {/* Value Props - Monocle Standard Engraved Micro-Vectors */}
            <section className="bg-[#FAF8F5] py-24">
                <div className="max-w-6xl mx-auto px-6">
                    <h3 className="text-3xl md:text-4xl font-serif text-center mb-4 text-[#121212]">
                        Why Brief Delights?
                    </h3>
                    <p className="text-center text-gray-600 mb-16 max-w-lg mx-auto text-sm">
                        Built for leaders and engineers who value signal over noise.
                    </p>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="bg-white border border-[#121212]/10 rounded-2xl p-8 text-center hover:border-[#58111A] hover:shadow-lg transition">
                            <div className="w-14 h-14 rounded-2xl bg-[#58111A]/10 border border-[#58111A]/20 text-[#58111A] flex items-center justify-center mx-auto mb-5 shadow-sm">
                                <IconDailyRead className="w-7 h-7 text-[#58111A]" />
                            </div>
                            <h4 className="text-xl font-serif font-bold mb-2 text-[#121212]">10 min daily read</h4>
                            <p className="text-gray-600 text-sm leading-relaxed">High-density signal. Not 2 hours of feed scrolling.</p>
                        </div>

                        <div className="bg-white border border-[#121212]/10 rounded-2xl p-8 text-center hover:border-[#58111A] hover:shadow-lg transition">
                            <div className="w-14 h-14 rounded-2xl bg-[#58111A]/10 border border-[#58111A]/20 text-[#58111A] flex items-center justify-center mx-auto mb-5 shadow-sm">
                                <IconPersonalizedRole className="w-7 h-7 text-[#58111A]" />
                            </div>
                            <h4 className="text-xl font-serif font-bold mb-2 text-[#121212]">Personalized for your role</h4>
                            <p className="text-gray-600 text-sm leading-relaxed">Dedicated Builder, Leader, or Innovator streams.</p>
                        </div>

                        <div className="bg-white border border-[#121212]/10 rounded-2xl p-8 text-center hover:border-[#58111A] hover:shadow-lg transition">
                            <div className="w-14 h-14 rounded-2xl bg-[#58111A]/10 border border-[#58111A]/20 text-[#58111A] flex items-center justify-center mx-auto mb-5 shadow-sm">
                                <IconDataDriven className="w-7 h-7 text-[#58111A]" />
                            </div>
                            <h4 className="text-xl font-serif font-bold mb-2 text-[#121212]">Data-driven insights</h4>
                            <p className="text-gray-600 text-sm leading-relaxed">Automated trend detection & strategic takeaways.</p>
                        </div>

                        <div className="bg-white border border-[#121212]/10 rounded-2xl p-8 text-center hover:border-[#58111A] hover:shadow-lg transition">
                            <div className="w-14 h-14 rounded-2xl bg-[#58111A]/10 border border-[#58111A]/20 text-[#58111A] flex items-center justify-center mx-auto mb-5 shadow-sm">
                                <IconSundaySynthesis className="w-7 h-7 text-[#58111A]" />
                            </div>
                            <h4 className="text-xl font-serif font-bold mb-2 text-[#121212]">Sunday synthesis</h4>
                            <p className="text-gray-600 text-sm leading-relaxed">Deep strategic macro context for the upcoming week.</p>
                        </div>

                        <div className="bg-white border border-[#121212]/10 rounded-2xl p-8 text-center hover:border-[#58111A] hover:shadow-lg transition">
                            <div className="w-14 h-14 rounded-2xl bg-[#58111A]/10 border border-[#58111A]/20 text-[#58111A] flex items-center justify-center mx-auto mb-5 shadow-sm">
                                <IconFreeForever className="w-7 h-7 text-[#58111A]" />
                            </div>
                            <h4 className="text-xl font-serif font-bold mb-2 text-[#121212]">Free & independent</h4>
                            <p className="text-gray-600 text-sm leading-relaxed">Zero paywalls, zero sponsored noise in core briefs.</p>
                        </div>

                        <div className="bg-white border border-[#121212]/10 rounded-2xl p-8 text-center hover:border-[#58111A] hover:shadow-lg transition">
                            <div className="w-14 h-14 rounded-2xl bg-[#58111A]/10 border border-[#58111A]/20 text-[#58111A] flex items-center justify-center mx-auto mb-5 shadow-sm">
                                <IconEditoriallyCurated className="w-7 h-7 text-[#58111A]" />
                            </div>
                            <h4 className="text-xl font-serif font-bold mb-2 text-[#121212]">Editorially refined</h4>
                            <p className="text-gray-600 text-sm leading-relaxed">Scanned across 1,340+ sources for highest signal.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer - Editorial Masthead Footer */}
            <footer className="bg-[#FAF8F5] border-t border-[#121212]/10 py-12">
                <div className="max-w-6xl mx-auto px-6 text-center text-gray-600 text-sm">
                    <p className="font-serif font-bold text-[#121212] tracking-wider text-base mb-1">BRIEF DELIGHTS</p>
                    <p className="text-xs text-[#58111A] font-medium tracking-widest uppercase mb-4">Knowledge, Refined • A DreamValidator Brand</p>
                    <p className="space-x-6 text-xs font-semibold text-gray-700">
                        <a href="https://sell.delights.pro" className="hover:text-[#58111A] transition">Sell Delights</a>
                        <span className="text-gray-300">·</span>
                        <a href="https://share.delights.pro" className="hover:text-[#58111A] transition">Share Delights</a>
                        <span className="text-gray-300">·</span>
                        <a href="/archive" className="hover:text-[#58111A] transition">Archive</a>
                    </p>
                    <p className="mt-4 text-xs text-gray-400">© 2026 All rights reserved</p>
                </div>
            </footer>
        </>
    );
}
