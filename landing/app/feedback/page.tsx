'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

const RATING_CONFIG: Record<string, { emoji: string; label: string; color: string }> = {
    loved: { emoji: '🔥', label: 'Loved it!', color: '#ef4444' },
    good: { emoji: '👍', label: 'Good read!', color: '#3b82f6' },
    meh: { emoji: '😐', label: 'Could be better', color: '#9ca3af' },
};

function FeedbackContent() {
    const searchParams = useSearchParams();
    const rating = searchParams.get('rating') || '';
    const date = searchParams.get('date') || '';
    const segment = searchParams.get('segment') || '';

    const [feedbackId, setFeedbackId] = useState<string | null>(null);
    const [comment, setComment] = useState('');
    const [commentSent, setCommentSent] = useState(false);
    const [sending, setSending] = useState(false);
    const [recorded, setRecorded] = useState(false);

    const config = RATING_CONFIG[rating] || RATING_CONFIG.good;

    // Record the rating immediately on page load
    const recordRating = useCallback(async () => {
        if (!rating || !date || !segment || recorded) return;
        setRecorded(true);

        try {
            const res = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rating, date, segment }),
            });
            const data = await res.json();
            if (data.id) setFeedbackId(data.id);
        } catch (err) {
            console.error('Failed to record feedback:', err);
        }
    }, [rating, date, segment, recorded]);

    useEffect(() => {
        recordRating();
    }, [recordRating]);

    async function submitComment() {
        if (!feedbackId || !comment.trim() || sending) return;
        setSending(true);

        try {
            await fetch('/api/feedback', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: feedbackId, comment: comment.trim() }),
            });
            setCommentSent(true);
        } catch (err) {
            console.error('Failed to submit comment:', err);
        } finally {
            setSending(false);
        }
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: '#FAF8F5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            padding: '20px',
        }}>
            <div style={{
                maxWidth: '480px',
                width: '100%',
                background: '#ffffff',
                borderRadius: '24px',
                padding: '48px 40px',
                textAlign: 'center',
                boxShadow: '0 10px 40px rgba(0,0,0,0.06)',
                border: '1px solid rgba(18,18,18,0.1)',
            }}>
                {/* Logo & Seal */}
                <div style={{ marginBottom: '32px' }}>
                    <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '16px',
                        background: 'rgba(88,17,26,0.1)',
                        border: '1px solid rgba(88,17,26,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px auto',
                        padding: '6px'
                    }}>
                        <img src="/bd_seal_logo.png" alt="Brief Delights Seal" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
                    </div>
                    <div style={{
                        fontSize: '28px',
                        fontFamily: 'Georgia, serif',
                        fontWeight: 700,
                        letterSpacing: '-0.5px',
                        color: '#121212',
                    }}>Brief Delights</div>
                    <div style={{
                        fontSize: '11px',
                        color: '#8C6D2B',
                        letterSpacing: '2px',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                        marginTop: '4px'
                    }}>Knowledge, Refined</div>
                </div>

                {/* Rating emoji */}
                <div style={{
                    fontSize: '64px',
                    lineHeight: 1,
                    marginBottom: '16px',
                }}>{config.emoji}</div>

                {/* Thank you message */}
                <h1 style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    color: '#000',
                    margin: '0 0 8px 0',
                }}>Thanks for your feedback!</h1>
                <p style={{
                    fontSize: '16px',
                    color: '#666',
                    margin: '0 0 36px 0',
                    lineHeight: 1.5,
                }}>
                    You rated today&apos;s edition: <strong style={{ color: config.color }}>{config.label}</strong>
                </p>

                {/* Optional comment */}
                {!commentSent ? (
                    <div style={{
                        borderTop: '1px solid #e8e8e8',
                        paddingTop: '28px',
                    }}>
                        <p style={{
                            fontSize: '15px',
                            color: '#444',
                            margin: '0 0 16px 0',
                            fontWeight: 500,
                        }}>
                            What topic would make tomorrow&apos;s Brief unmissable?
                        </p>
                        <p style={{
                            fontSize: '12px',
                            color: '#999',
                            margin: '0 0 12px 0',
                        }}>
                            Totally optional — but we read every single one ✨
                        </p>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="e.g. More on open-source AI models…"
                            rows={3}
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                border: '1px solid #e0e0e0',
                                borderRadius: '8px',
                                fontSize: '15px',
                                fontFamily: 'inherit',
                                resize: 'vertical',
                                outline: 'none',
                                boxSizing: 'border-box',
                                transition: 'border-color 0.2s',
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#4f46e5'}
                            onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                        />
                        <button
                            onClick={submitComment}
                            disabled={!comment.trim() || sending || !feedbackId}
                            style={{
                                marginTop: '12px',
                                padding: '10px 28px',
                                background: comment.trim() && feedbackId ? '#4f46e5' : '#e0e0e0',
                                color: comment.trim() && feedbackId ? '#fff' : '#999',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: comment.trim() && feedbackId ? 'pointer' : 'default',
                                transition: 'all 0.2s',
                            }}
                        >
                            {sending ? 'Sending…' : 'Send'}
                        </button>
                    </div>
                ) : (
                    <div style={{
                        borderTop: '1px solid #e8e8e8',
                        paddingTop: '28px',
                    }}>
                        <p style={{
                            fontSize: '16px',
                            color: '#22c55e',
                            fontWeight: 600,
                        }}>
                            ✅ Thanks! Your suggestion is noted.
                        </p>
                    </div>
                )}

                {/* Back link */}
                <div style={{ marginTop: '32px' }}>
                    <a
                        href="https://brief.delights.pro"
                        style={{
                            fontSize: '13px',
                            color: '#999',
                            textDecoration: 'none',
                        }}
                    >
                        ← Back to Brief Delights
                    </a>
                </div>
            </div>
        </div>
    );
}

export default function FeedbackPage() {
    return (
        <Suspense fallback={
            <div style={{
                minHeight: '100vh',
                background: '#f8f9fa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <p style={{ color: '#999' }}>Loading…</p>
            </div>
        }>
            <FeedbackContent />
        </Suspense>
    );
}
