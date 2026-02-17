'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';

const SEGMENT_META: Record<string, { emoji: string; label: string; description: string }> = {
    builders: {
        emoji: '🛠️',
        label: 'Builders',
        description: 'engineering leaders and developers',
    },
    leaders: {
        emoji: '💼',
        label: 'Leaders',
        description: 'tech executives and decision-makers',
    },
    innovators: {
        emoji: '🚀',
        label: 'Innovators',
        description: 'founders and product thinkers',
    },
};

/* ── Recommended newsletters for cross-promotion ── */
const RECOMMENDATIONS = [
    {
        name: 'TLDR',
        description: 'Byte-sized tech news, 5 min daily',
        url: 'https://tldr.tech',
        emoji: '📧',
    },
    {
        name: 'The Rundown AI',
        description: 'AI news and how to apply it, 5 min daily',
        url: 'https://www.therundown.ai',
        emoji: '🤖',
    },
    {
        name: 'Pragmatic Engineer',
        description: 'Big Tech and high-growth startup insights',
        url: 'https://newsletter.pragmaticengineer.com',
        emoji: '⚙️',
    },
];

function WelcomeContent() {
    const searchParams = useSearchParams();
    const segment = searchParams.get('segment') || 'builders';
    const referralCode = searchParams.get('ref') || '';
    const [copied, setCopied] = useState(false);
    const [shareUrl, setShareUrl] = useState('');

    const meta = SEGMENT_META[segment] || SEGMENT_META.builders;

    useEffect(() => {
        if (referralCode) {
            setShareUrl(`${window.location.origin}?ref=${referralCode}`);
        }
    }, [referralCode]);

    const copyReferralLink = () => {
        if (shareUrl) {
            navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const shareOnTwitter = () => {
        const text = encodeURIComponent(
            `Just subscribed to Brief Delights — an AI-curated daily newsletter for ${meta.description}. 1,340+ articles scanned, best 14 picked. Try it:`
        );
        window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(shareUrl)}`, '_blank');
    };

    const shareOnLinkedIn = () => {
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank');
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #fafafa 0%, #f0f4f8 50%, #e8ecf0 100%)',
            fontFamily: 'var(--font-geist-sans), -apple-system, BlinkMacSystemFont, sans-serif',
        }}>
            {/* Confetti-style header accent */}
            <div style={{
                height: '4px',
                background: 'linear-gradient(90deg, #10b981, #3b82f6, #8b5cf6, #ec4899)',
            }} />

            <div style={{
                maxWidth: '640px',
                margin: '0 auto',
                padding: '48px 24px 64px',
            }}>
                {/* ── Hero ── */}
                <div style={{ textAlign: 'center', marginBottom: '48px' }}>
                    <div style={{
                        fontSize: '64px',
                        marginBottom: '16px',
                        animation: 'bounce 0.6s ease-out',
                    }}>
                        🎉
                    </div>
                    <h1 style={{
                        fontSize: '36px',
                        fontWeight: 800,
                        letterSpacing: '-0.03em',
                        color: '#111',
                        marginBottom: '8px',
                        lineHeight: 1.2,
                    }}>
                        You&apos;re in!
                    </h1>
                    <p style={{
                        fontSize: '18px',
                        color: '#6b7280',
                        lineHeight: 1.6,
                    }}>
                        Welcome to <strong style={{ color: '#111' }}>Brief Delights</strong> for {meta.emoji} {meta.label}.
                        <br />
                        Your first brief arrives at <strong style={{ color: '#111' }}>6 AM UTC</strong> tomorrow.
                    </p>
                </div>

                {/* ── What you'll get ── */}
                <div style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '32px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04)',
                    marginBottom: '24px',
                }}>
                    <h2 style={{
                        fontSize: '14px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        color: '#9ca3af',
                        marginBottom: '20px',
                    }}>
                        What you'll receive
                    </h2>
                    <div style={{ display: 'grid', gap: '16px' }}>
                        {[
                            { icon: '📊', title: 'Daily Brief', desc: '14 hand-picked stories from 1,340+ scanned' },
                            { icon: '🧠', title: 'Why This Matters', desc: 'Strategic context on every article' },
                            { icon: '🤔', title: 'The Other Side', desc: 'Contrarian signals when the herd agrees' },
                            { icon: '📡', title: 'Sunday Synthesis', desc: 'Weekly trend analysis and developing arcs' },
                        ].map((item) => (
                            <div key={item.title} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                <span style={{ fontSize: '24px', lineHeight: 1 }}>{item.icon}</span>
                                <div>
                                    <strong style={{ fontSize: '15px', color: '#111' }}>{item.title}</strong>
                                    <p style={{ fontSize: '14px', color: '#6b7280', margin: '2px 0 0' }}>{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Referral Ask: 1-reward system ── */}
                {referralCode && (
                    <div style={{
                        background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
                        borderRadius: '16px',
                        padding: '32px',
                        color: 'white',
                        marginBottom: '24px',
                    }}>
                        <h2 style={{
                            fontSize: '20px',
                            fontWeight: 700,
                            marginBottom: '8px',
                        }}>
                            🎁 Share with 1 friend, unlock our toolkit
                        </h2>
                        <p style={{
                            fontSize: '15px',
                            opacity: 0.85,
                            lineHeight: 1.6,
                            marginBottom: '20px',
                        }}>
                            Refer just <strong>1 person</strong> and get instant access to our{' '}
                            <strong>200-source curated RSS feed list</strong> — the exact sources our AI scans daily.
                        </p>

                        {/* Copy link button */}
                        <div style={{
                            display: 'flex',
                            gap: '8px',
                            marginBottom: '16px',
                        }}>
                            <div style={{
                                flex: 1,
                                background: 'rgba(255,255,255,0.1)',
                                borderRadius: '10px',
                                padding: '12px 16px',
                                fontSize: '14px',
                                fontFamily: 'var(--font-geist-mono), monospace',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                border: '1px solid rgba(255,255,255,0.15)',
                            }}>
                                {shareUrl}
                            </div>
                            <button
                                onClick={copyReferralLink}
                                style={{
                                    background: copied ? '#10b981' : 'white',
                                    color: copied ? 'white' : '#1e1b4b',
                                    border: 'none',
                                    borderRadius: '10px',
                                    padding: '12px 20px',
                                    fontWeight: 700,
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {copied ? '✓ Copied' : 'Copy'}
                            </button>
                        </div>

                        {/* Social share buttons */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={shareOnTwitter}
                                style={{
                                    flex: 1,
                                    background: 'rgba(255,255,255,0.1)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: '10px',
                                    padding: '12px',
                                    color: 'white',
                                    fontWeight: 600,
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                𝕏 Share on Twitter
                            </button>
                            <button
                                onClick={shareOnLinkedIn}
                                style={{
                                    flex: 1,
                                    background: 'rgba(255,255,255,0.1)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: '10px',
                                    padding: '12px',
                                    color: 'white',
                                    fontWeight: 600,
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                💼 Share on LinkedIn
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Recommended newsletters (SparkLoop-ready) ── */}
                <div style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '32px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04)',
                    marginBottom: '24px',
                }}>
                    <h2 style={{
                        fontSize: '14px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        color: '#9ca3af',
                        marginBottom: '8px',
                    }}>
                        You might also enjoy
                    </h2>
                    <p style={{
                        fontSize: '14px',
                        color: '#9ca3af',
                        marginBottom: '20px',
                    }}>
                        Newsletters our readers also subscribe to:
                    </p>
                    <div style={{ display: 'grid', gap: '12px' }}>
                        {RECOMMENDATIONS.map((rec) => (
                            <a
                                key={rec.name}
                                href={rec.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                id={`rec-${rec.name.toLowerCase().replace(/\s+/g, '-')}`}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '14px 16px',
                                    borderRadius: '12px',
                                    border: '1px solid #f0f0f0',
                                    textDecoration: 'none',
                                    color: '#111',
                                    transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={(e) => {
                                    (e.currentTarget as HTMLElement).style.borderColor = '#3b82f6';
                                    (e.currentTarget as HTMLElement).style.background = '#f8fafc';
                                }}
                                onMouseLeave={(e) => {
                                    (e.currentTarget as HTMLElement).style.borderColor = '#f0f0f0';
                                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                                }}
                            >
                                <span style={{ fontSize: '28px' }}>{rec.emoji}</span>
                                <div style={{ flex: 1 }}>
                                    <strong style={{ fontSize: '15px' }}>{rec.name}</strong>
                                    <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0' }}>{rec.description}</p>
                                </div>
                                <span style={{ fontSize: '18px', color: '#d1d5db' }}>→</span>
                            </a>
                        ))}
                    </div>

                    {/* SparkLoop integration point */}
                    {/* 
            To enable paid recommendations via SparkLoop:
            1. Sign up at sparkloop.app
            2. Add <script src="https://sparkloop.app/widget.js" data-sparkloop-key="YOUR_KEY" />
            3. Replace the static RECOMMENDATIONS above with SparkLoop's dynamic widget
            Revenue: $1-3 per new subscriber
          */}
                </div>

                {/* ── Footer ── */}
                <div style={{ textAlign: 'center', marginTop: '48px' }}>
                    <p style={{
                        fontSize: '32px',
                        fontWeight: 800,
                        letterSpacing: '-0.03em',
                        color: '#111',
                        margin: '0 0 4px',
                    }}>
                        Brief
                    </p>
                    <p style={{
                        fontSize: '14px',
                        color: '#9ca3af',
                        letterSpacing: '0.2em',
                    }}>
                        delights
                    </p>
                    <p style={{
                        fontSize: '13px',
                        color: '#d1d5db',
                        marginTop: '16px',
                    }}>
                        © 2026 Brief Delights · A DreamValidator brand
                    </p>
                </div>
            </div>

            <style>{`
        @keyframes bounce {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.1); }
          70% { transform: scale(0.95); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
        </div>
    );
}

export default function WelcomePage() {
    return (
        <Suspense fallback={
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#fafafa',
                fontFamily: 'system-ui, sans-serif',
                fontSize: '18px',
                color: '#666',
            }}>
                Loading...
            </div>
        }>
            <WelcomeContent />
        </Suspense>
    );
}
