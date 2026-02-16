'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function NewsletterPage() {
    const params = useParams();
    const slug = params.slug as string;

    const [html, setHtml] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [showShareToast, setShowShareToast] = useState(false);

    // Parse segment and date from slug
    const parts = slug?.split('-') || [];
    const datePart = parts.slice(0, 3).join('-');
    const segmentPart = parts.slice(3).join('-');

    const segmentLabel = segmentPart
        ? segmentPart.charAt(0).toUpperCase() + segmentPart.slice(1)
        : '';

    const dateLabel = datePart
        ? new Date(datePart + 'T00:00:00').toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
        })
        : '';

    useEffect(() => {
        async function loadNewsletter() {
            try {
                const response = await fetch(`/api/newsletters/${slug}`);
                if (!response.ok) {
                    setError(true);
                    return;
                }
                const htmlContent = await response.text();
                setHtml(htmlContent);
            } catch (err) {
                console.error('Error loading newsletter:', err);
                setError(true);
            } finally {
                setLoading(false);
            }
        }
        loadNewsletter();
    }, [slug]);

    const shareUrl = typeof window !== 'undefined'
        ? window.location.href
        : `https://brief.delights.pro/archive/${slug}`;

    const shareText = `Check out today's ${segmentLabel} tech brief from Brief Delights`;

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setShowShareToast(true);
            setTimeout(() => setShowShareToast(false), 2000);
        } catch {
            // Fallback for older browsers
        }
    };

    const handleShareTwitter = () => {
        window.open(
            `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
            '_blank'
        );
    };

    const handleShareLinkedIn = () => {
        window.open(
            `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
            '_blank'
        );
    };

    const handleShareEmail = () => {
        window.open(
            `mailto:?subject=${encodeURIComponent(`Brief Delights - ${segmentLabel} ${dateLabel}`)}&body=${encodeURIComponent(`I thought you'd find this useful:\n\n${shareUrl}\n\nBrief Delights curates the top tech stories daily.`)}`,
            '_self'
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white">
                <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                    <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
                        <Link href="/archive" className="text-gray-600 hover:text-black font-semibold">
                            ← Archive
                        </Link>
                        <Link href="/" className="text-gray-600 hover:text-black font-semibold">
                            Subscribe
                        </Link>
                    </div>
                </div>
                <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading newsletter...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-4xl font-bold mb-4">Newsletter Not Found</h1>
                    <p className="text-gray-600 mb-6">This newsletter doesn&apos;t exist or has been removed.</p>
                    <Link href="/archive" className="text-blue-600 hover:underline font-semibold">
                        ← Browse Archive
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 min-h-screen">
            {/* Sticky Navigation Bar */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-6 py-3 flex justify-between items-center">
                    <Link href="/archive" className="text-gray-600 hover:text-black font-semibold text-sm">
                        ← Archive
                    </Link>

                    <div className="flex items-center gap-3">
                        {/* Share Buttons */}
                        <button
                            onClick={handleShareTwitter}
                            className="text-gray-400 hover:text-blue-500 transition p-1"
                            title="Share on Twitter"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                            </svg>
                        </button>
                        <button
                            onClick={handleShareLinkedIn}
                            className="text-gray-400 hover:text-blue-700 transition p-1"
                            title="Share on LinkedIn"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                            </svg>
                        </button>
                        <button
                            onClick={handleShareEmail}
                            className="text-gray-400 hover:text-gray-700 transition p-1"
                            title="Share via email"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </button>
                        <button
                            onClick={handleCopyLink}
                            className="text-gray-400 hover:text-gray-700 transition p-1"
                            title="Copy link"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                        </button>

                        <div className="w-px h-5 bg-gray-200" />

                        <Link
                            href="/"
                            className="bg-black text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-gray-800 transition"
                        >
                            Subscribe Free
                        </Link>
                    </div>
                </div>
            </div>

            {/* Copy Toast */}
            {showShareToast && (
                <div className="fixed top-16 left-1/2 -translate-x-1/2 bg-green-600 text-white py-2 px-4 rounded-lg text-sm font-semibold z-50 animate-pulse shadow-lg">
                    ✓ Link copied!
                </div>
            )}

            {/* Newsletter Content */}
            <div className="max-w-[680px] mx-auto bg-white shadow-sm">
                <div dangerouslySetInnerHTML={{ __html: html }} />
            </div>

            {/* Bottom Subscribe CTA */}
            <div className="max-w-[680px] mx-auto bg-white border-t-2 border-indigo-100">
                <div className="py-10 px-8 text-center">
                    <p className="text-2xl font-bold mb-2">Enjoyed this edition?</p>
                    <p className="text-gray-500 mb-5">
                        Get tomorrow&apos;s top tech stories delivered to your inbox. Free forever.
                    </p>
                    <Link
                        href="/"
                        className="inline-block bg-black text-white font-bold py-3 px-8 rounded-lg hover:bg-gray-800 transition"
                    >
                        Subscribe to Brief Delights →
                    </Link>
                    <p className="text-xs text-gray-400 mt-3">
                        No spam. Unsubscribe anytime.
                    </p>
                </div>
            </div>

            {/* Share Footer */}
            <div className="max-w-[680px] mx-auto py-6 text-center">
                <p className="text-sm text-gray-400">
                    Know someone who&apos;d love this?{' '}
                    <button onClick={handleCopyLink} className="text-indigo-600 font-semibold hover:underline">
                        Copy link to share
                    </button>
                </p>
            </div>
        </div>
    );
}
