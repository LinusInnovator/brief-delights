'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface GrowthData {
    referralStats: {
        totalReferrals: number;
        avgPerSubscriber: number;
        unlocked: number; // subscribers with ≥3 referrals
        locked: number;
    };
    referralDistribution: Record<number, number>; // count -> # of subscribers
    timezones: Record<string, number>;
    recentSignups: Array<{
        email: string;
        segment: string;
        referred_by: string | null;
        timezone: string | null;
        confirmed_at: string;
    }>;
}

export default function GrowthPage() {
    const [data, setData] = useState<GrowthData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => { loadData(); }, []);

    async function loadData() {
        try {
            setError(null);
            const supabase = createClient();

            const { data: subs, error: subError } = await supabase
                .from('subscribers')
                .select('email, segment, referral_count, referred_by, timezone, confirmed_at, status')
                .eq('status', 'confirmed')
                .order('confirmed_at', { ascending: false });

            if (subError) throw subError;

            const allSubs = subs || [];
            const totalReferrals = allSubs.reduce((s, sub) => s + (sub.referral_count || 0), 0);
            const unlocked = allSubs.filter(s => (s.referral_count || 0) >= 3).length;

            // Distribution of referral counts
            const distribution: Record<number, number> = {};
            allSubs.forEach(s => {
                const c = s.referral_count || 0;
                distribution[c] = (distribution[c] || 0) + 1;
            });

            // Timezone distribution
            const tzCounts: Record<string, number> = {};
            allSubs.forEach(s => {
                const tz = s.timezone || 'Unknown';
                tzCounts[tz] = (tzCounts[tz] || 0) + 1;
            });

            setData({
                referralStats: {
                    totalReferrals,
                    avgPerSubscriber: allSubs.length > 0 ? totalReferrals / allSubs.length : 0,
                    unlocked,
                    locked: allSubs.length - unlocked,
                },
                referralDistribution: distribution,
                timezones: tzCounts,
                recentSignups: allSubs.slice(0, 15).map(s => ({
                    email: s.email,
                    segment: s.segment,
                    referred_by: s.referred_by,
                    timezone: s.timezone,
                    confirmed_at: s.confirmed_at,
                })),
            });
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
                    <p className="mt-4 text-gray-600">Loading growth data...</p>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-7xl mx-auto p-8 text-center py-20">
                    <p className="text-red-600">⚠️ {error || 'Failed to load'}</p>
                    <button onClick={() => { setLoading(true); loadData(); }} className="mt-3 text-sm text-blue-600 underline">Retry</button>
                </div>
            </div>
        );
    }

    const maxTzCount = Math.max(...Object.values(data.timezones), 1);

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto p-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">🚀 Growth</h1>
                    <p className="text-gray-600 mt-1">Referral program, timezone coverage, and recent activity</p>
                </div>

                {/* Referral Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <StatCard label="Total Referrals" value={data.referralStats.totalReferrals} color="purple" />
                    <StatCard label="Avg per Subscriber" value={data.referralStats.avgPerSubscriber.toFixed(1)} color="blue" />
                    <StatCard
                        label="Deep Dive Unlocked"
                        value={data.referralStats.unlocked}
                        subtitle={`${data.referralStats.locked} locked`}
                        color="green"
                    />
                    <StatCard
                        label="Referred Signups"
                        value={data.recentSignups.filter(s => s.referred_by).length}
                        subtitle="of last 15"
                        color="amber"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Referral Distribution */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">📊 Referral Distribution</h3>
                        <div className="space-y-2">
                            {Object.entries(data.referralDistribution)
                                .sort(([a], [b]) => Number(a) - Number(b))
                                .map(([count, subscribers]) => {
                                    const maxVal = Math.max(...Object.values(data.referralDistribution));
                                    const pct = (subscribers / maxVal) * 100;
                                    const isUnlocked = Number(count) >= 3;

                                    return (
                                        <div key={count} className="flex items-center gap-3">
                                            <span className="w-24 text-sm text-gray-600 text-right">
                                                {count} referral{Number(count) !== 1 ? 's' : ''}
                                            </span>
                                            <div className="flex-1 bg-gray-100 rounded-full h-6 relative">
                                                <div
                                                    className={`h-6 rounded-full flex items-center justify-end pr-2 text-white text-xs font-medium transition-all ${isUnlocked ? 'bg-green-500' : 'bg-gray-400'
                                                        }`}
                                                    style={{ width: `${Math.max(pct, 8)}%` }}
                                                >
                                                    {subscribers}
                                                </div>
                                            </div>
                                            {isUnlocked && <span className="text-xs">🔓</span>}
                                        </div>
                                    );
                                })}
                        </div>
                    </div>

                    {/* Timezone Distribution */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">🌍 Timezone Coverage</h3>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {Object.entries(data.timezones)
                                .sort(([, a], [, b]) => b - a)
                                .map(([tz, count]) => (
                                    <div key={tz} className="flex items-center gap-3">
                                        <span className="w-40 text-sm text-gray-600 truncate text-right" title={tz}>
                                            {tz.replace('_', ' ')}
                                        </span>
                                        <div className="flex-1 bg-gray-100 rounded-full h-5">
                                            <div
                                                className="h-5 rounded-full bg-blue-500 flex items-center justify-end pr-2 text-white text-xs font-medium"
                                                style={{ width: `${Math.max((count / maxTzCount) * 100, 8)}%` }}
                                            >
                                                {count}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>

                {/* Recent Signups */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">📋 Recent Signups</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left text-xs font-semibold text-gray-500 uppercase border-b border-gray-100">
                                    <th className="px-4 py-2">Email</th>
                                    <th className="px-4 py-2">Segment</th>
                                    <th className="px-4 py-2">Referred By</th>
                                    <th className="px-4 py-2">Timezone</th>
                                    <th className="px-4 py-2">Joined</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.recentSignups.map((s, i) => (
                                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                                        <td className="px-4 py-3 text-sm text-gray-900">{s.email}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${s.segment === 'builders' ? 'bg-blue-100 text-blue-800' :
                                                s.segment === 'innovators' ? 'bg-purple-100 text-purple-800' :
                                                    'bg-amber-100 text-amber-800'
                                                }`}>
                                                {s.segment}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500">
                                            {s.referred_by ? (
                                                <span className="text-purple-600">🔗 {s.referred_by}</span>
                                            ) : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-500">{s.timezone || '—'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-500">
                                            {s.confirmed_at
                                                ? new Date(s.confirmed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                                : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, subtitle, color }: { label: string; value: string | number; subtitle?: string; color: string }) {
    const colorMap: Record<string, string> = {
        purple: 'text-purple-600',
        blue: 'text-blue-600',
        green: 'text-green-600',
        amber: 'text-amber-600',
    };

    return (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 mb-1">{label}</p>
            <p className={`text-3xl font-bold ${colorMap[color] || 'text-gray-900'}`}>{value}</p>
            {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
    );
}
