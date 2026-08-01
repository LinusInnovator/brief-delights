'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { IconStreamBuilders, IconStreamLeaders, IconStreamInnovators, IconEditoriallyCurated } from '../../components/EditorialIcons';

function WelcomeContent() {
    const searchParams = useSearchParams();
    const segment = searchParams.get('segment') || 'innovators';
    const refCode = searchParams.get('ref') || '';
    const [copied, setCopied] = useState(false);

    const shareUrl = typeof window !== 'undefined'
        ? `${window.location.origin}?ref=${refCode}`
        : `https://brief.delights.pro?ref=${refCode}`;

    const handleCopyRef = () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        }
    };

    function getSegmentTitle(seg: string) {
        switch (seg) {
            case 'builders': return 'Builders Brief (Technical Stream)';
            case 'leaders': return 'Leaders Brief (Strategy Stream)';
            case 'innovators': return 'Innovators Brief (Frontier Stream)';
            default: return 'Daily Intelligence Brief';
        }
    }

    function renderStreamIcon(seg: string) {
        switch (seg) {
            case 'builders': return <IconStreamBuilders className="w-8 h-8 text-[#58111A]" />;
            case 'leaders': return <IconStreamLeaders className="w-4 h-4 text-[#58111A]" />;
            case 'innovators': return <IconStreamInnovators className="w-8 h-8 text-[#58111A]" />;
            default: return <IconEditoriallyCurated className="w-8 h-8 text-[#58111A]" />;
        }
    }

    return (
        <div className="min-h-screen bg-[#FAF8F5] text-[#121212] py-16 px-4 flex flex-col items-center justify-center">
            <div className="max-w-2xl w-full bg-white border border-[#121212]/10 rounded-3xl p-8 md:p-12 shadow-xl text-center">
                
                {/* BD Wax Seal Monogram */}
                <div className="w-20 h-20 bg-[#58111A]/10 border border-[#58111A]/20 rounded-2xl flex items-center justify-center mx-auto mb-6 p-2 shadow-sm">
                    <img src="/bd_seal_logo.png" alt="Brief Delights Seal" className="w-12 h-12 object-contain" />
                </div>

                <div className="inline-flex items-center gap-2 bg-[#58111A]/10 border border-[#58111A]/20 px-3.5 py-1 rounded-full text-xs font-bold text-[#58111A] uppercase tracking-wider mb-4">
                    {renderStreamIcon(segment)}
                    <span>{segment} EDITION CONFIRMED</span>
                </div>

                <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#121212] mb-3">
                    Subscription Confirmed!
                </h1>

                <p className="text-gray-600 text-base leading-relaxed max-w-lg mx-auto mb-8">
                    Your email has been verified. You will receive the <strong>{getSegmentTitle(segment)}</strong> directly in your inbox every morning at 6:00 AM.
                </p>

                {/* SparkLoop Widget Container */}
                <div className="my-8 p-6 bg-[#FAF8F5] border border-[#121212]/10 rounded-2xl text-left">
                    <div className="text-xs font-bold text-[#58111A] uppercase tracking-widest mb-2">
                        RECOMMENDED BY BRIEF DELIGHTS
                    </div>
                    <h3 className="text-lg font-serif font-bold text-[#121212] mb-1">
                        Hand-Picked Executive Newsletters
                    </h3>
                    <p className="text-xs text-gray-500 mb-4">
                        Discover trusted publications read by founders, VCs, and engineers.
                    </p>

                    {/* SparkLoop Script Embed */}
                    <div id="sparkloop-widget-container" className="min-h-[120px] flex items-center justify-center">
                        <script
                            src="https://dash.sparkloop.app/widget/b3b25cc980/embed.js"
                            data-sparkloop-widget="b3b25cc980"
                            async
                        />
                        <a
                            href="https://upscribe.page/b3b25cc980"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block w-full bg-[#58111A] text-white text-center font-bold py-3.5 px-6 rounded-xl hover:bg-[#3D0A11] transition text-sm shadow-md"
                        >
                            Explore Recommended Partner Digests &rarr;
                        </a>
                    </div>
                </div>

                {/* Referral Link Container */}
                {refCode && (
                    <div className="mb-8 p-6 bg-white border border-[#C5A059]/40 rounded-2xl text-left shadow-sm">
                        <div className="text-xs font-bold text-[#8C6D2B] uppercase tracking-widest mb-1">
                            YOUR PERSONAL REFERRAL LINK
                        </div>
                        <p className="text-xs text-gray-600 mb-3">
                            Invite colleagues and earn exclusive executive perks and research reports.
                        </p>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                readOnly
                                value={shareUrl}
                                className="flex-1 bg-[#FAF8F5] border border-gray-200 px-4 py-2.5 rounded-xl text-xs font-mono text-gray-800"
                            />
                            <button
                                onClick={handleCopyRef}
                                className="bg-[#121212] text-white px-4 py-2.5 rounded-xl font-bold text-xs hover:bg-[#58111A] transition"
                            >
                                {copied ? 'Copied!' : 'Copy Link'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                        href="/archive"
                        className="bg-[#121212] text-white font-bold py-3.5 px-8 rounded-xl hover:bg-[#58111A] transition text-sm shadow-md"
                    >
                        Browse Today&apos;s Issue Archive &rarr;
                    </Link>
                    <Link
                        href="/"
                        className="bg-white text-gray-700 font-bold py-3.5 px-6 rounded-xl border border-gray-200 hover:border-gray-400 transition text-sm"
                    >
                        Back to Homepage
                    </Link>
                </div>

            </div>
        </div>
    );
}

export default function WelcomePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-6">
                <div className="w-12 h-12 rounded-full border-4 border-[#58111A] border-t-transparent animate-spin" />
            </div>
        }>
            <WelcomeContent />
        </Suspense>
    );
}
