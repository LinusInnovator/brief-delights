'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface FeedbackRow {
    id: string;
    edition_date: string;
    segment: string;
    rating: 'loved' | 'good' | 'meh';
    comment: string | null;
    created_at: string;
}

interface EditionStats {
    date: string;
    segment: string;
    loved: number;
    good: number;
    meh: number;
    total: number;
}

const RATING_EMOJI: Record<string, string> = {
    loved: '🔥',
    good: '👍',
    meh: '😐',
};

const RATING_COLORS: Record<string, string> = {
    loved: 'bg-red-100 text-red-700',
    good: 'bg-blue-100 text-blue-700',
    meh: 'bg-gray-100 text-gray-600',
};

export default function AdminFeedbackPage() {
    const [stats, setStats] = useState<EditionStats[]>([]);
    const [comments, setComments] = useState<FeedbackRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [totals, setTotals] = useState({ loved: 0, good: 0, meh: 0, total: 0 });

    useEffect(() => { loadFeedback(); }, []);

    async function loadFeedback() {
        try {
            setError(null);
            const supabase = createClient();

            // Fetch all feedback, ordered by recency
            const { data, error: fetchError } = await supabase
                .from('newsletter_feedback')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(500);

            if (fetchError) throw fetchError;

            const rows = (data || []) as FeedbackRow[];

            // Compute per-edition stats
            const editionMap = new Map<string, EditionStats>();
            let totalLoved = 0, totalGood = 0, totalMeh = 0;

            rows.forEach(r => {
                const key = `${r.edition_date}|${r.segment}`;
                if (!editionMap.has(key)) {
                    editionMap.set(key, {
                        date: r.edition_date,
                        segment: r.segment,
                        loved: 0, good: 0, meh: 0, total: 0,
                    });
                }
                const s = editionMap.get(key)!;
                s[r.rating]++;
                s.total++;

                if (r.rating === 'loved') totalLoved++;
                else if (r.rating === 'good') totalGood++;
                else totalMeh++;
            });

            const sortedStats = Array.from(editionMap.values())
                .sort((a, b) => b.date.localeCompare(a.date));

            setStats(sortedStats);
            setTotals({ loved: totalLoved, good: totalGood, meh: totalMeh, total: rows.length });
            setComments(rows.filter(r => r.comment));
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-7xl mx-auto p-8 text-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto" />
                    <p className="mt-4 text-gray-600">Loading feedback…</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-7xl mx-auto p-8 text-center py-20">
                    <p className="text-red-600">⚠️ {error}</p>
                    <button onClick={() => { setLoading(true); loadFeedback(); }} className="mt-3 text-sm text-blue-600 underline">Retry</button>
                </div>
            </div>
        );
    }

    const sentimentScore = totals.total > 0
        ? Math.round(((totals.loved * 2 + totals.good * 1 + totals.meh * 0) / (totals.total * 2)) * 100)
        : 0;

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto p-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">💬 Reader Feedback</h1>
                    <p className="text-gray-600 mt-1">Ratings and suggestions from newsletter readers</p>
                </div>

                {/* Overview Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                    <StatCard label="Total Ratings" value={totals.total} color="gray" />
                    <StatCard label="🔥 Loved" value={totals.loved} color="red" />
                    <StatCard label="👍 Good" value={totals.good} color="blue" />
                    <StatCard label="😐 Meh" value={totals.meh} color="gray" />
                    <StatCard
                        label="Sentiment Score"
                        value={`${sentimentScore}%`}
                        subtitle={sentimentScore >= 70 ? '🎯 Great' : sentimentScore >= 40 ? '📈 Improving' : '⚠️ Needs work'}
                        color={sentimentScore >= 70 ? 'green' : sentimentScore >= 40 ? 'amber' : 'red'}
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Per-Edition Breakdown */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">📊 Edition Breakdown</h3>
                        {stats.length === 0 ? (
                            <p className="text-gray-400 text-sm">No feedback received yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {stats.slice(0, 15).map((s) => {
                                    const lovedPct = s.total > 0 ? (s.loved / s.total) * 100 : 0;
                                    const goodPct = s.total > 0 ? (s.good / s.total) * 100 : 0;
                                    const mehPct = s.total > 0 ? (s.meh / s.total) * 100 : 0;

                                    return (
                                        <div key={`${s.date}-${s.segment}`}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm font-medium text-gray-700">
                                                    {s.date} · <span className="capitalize">{s.segment}</span>
                                                </span>
                                                <span className="text-xs text-gray-400">{s.total} ratings</span>
                                            </div>
                                            <div className="flex h-5 rounded-full overflow-hidden bg-gray-100">
                                                {lovedPct > 0 && (
                                                    <div
                                                        className="bg-red-400 flex items-center justify-center text-white text-[10px] font-medium"
                                                        style={{ width: `${Math.max(lovedPct, 8)}%` }}
                                                        title={`Loved: ${s.loved}`}
                                                    >🔥 {s.loved}</div>
                                                )}
                                                {goodPct > 0 && (
                                                    <div
                                                        className="bg-blue-400 flex items-center justify-center text-white text-[10px] font-medium"
                                                        style={{ width: `${Math.max(goodPct, 8)}%` }}
                                                        title={`Good: ${s.good}`}
                                                    >👍 {s.good}</div>
                                                )}
                                                {mehPct > 0 && (
                                                    <div
                                                        className="bg-gray-300 flex items-center justify-center text-gray-600 text-[10px] font-medium"
                                                        style={{ width: `${Math.max(mehPct, 8)}%` }}
                                                        title={`Meh: ${s.meh}`}
                                                    >😐 {s.meh}</div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Reader Comments */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">
                            💡 Reader Suggestions
                            {comments.length > 0 && (
                                <span className="ml-2 text-sm font-normal text-gray-400">({comments.length})</span>
                            )}
                        </h3>
                        {comments.length === 0 ? (
                            <p className="text-gray-400 text-sm">No comments yet. They&apos;ll appear here when readers leave suggestions.</p>
                        ) : (
                            <div className="space-y-3 max-h-[500px] overflow-y-auto">
                                {comments.slice(0, 30).map((c) => (
                                    <div
                                        key={c.id}
                                        className="border border-gray-100 rounded-lg p-4 hover:bg-gray-50/50 transition"
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${RATING_COLORS[c.rating]}`}>
                                                {RATING_EMOJI[c.rating]} {c.rating}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                {c.edition_date} · <span className="capitalize">{c.segment}</span>
                                            </span>
                                            <span className="text-xs text-gray-300 ml-auto">
                                                {new Date(c.created_at).toLocaleDateString('en-US', {
                                                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                                                })}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-700 leading-relaxed">{c.comment}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, subtitle, color }: { label: string; value: string | number; subtitle?: string; color: string }) {
    const colorMap: Record<string, string> = {
        red: 'text-red-600',
        blue: 'text-blue-600',
        green: 'text-green-600',
        amber: 'text-amber-600',
        gray: 'text-gray-700',
    };

    return (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 mb-1">{label}</p>
            <p className={`text-3xl font-bold ${colorMap[color] || 'text-gray-900'}`}>{value}</p>
            {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
    );
}
