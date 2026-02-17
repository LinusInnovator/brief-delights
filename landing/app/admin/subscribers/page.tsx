'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Subscriber {
    id: string;
    email: string;
    segment: string;
    status: string;
    referral_code: string | null;
    referral_count: number;
    referred_by: string | null;
    timezone: string | null;
    confirmed_at: string | null;
    created_at: string;
    unsubscribed_at: string | null;
}

type SortField = 'email' | 'segment' | 'referral_count' | 'created_at' | 'status';
type SortDir = 'asc' | 'desc';

export default function SubscribersPage() {
    const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [segmentFilter, setSegmentFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('confirmed');
    const [sortField, setSortField] = useState<SortField>('created_at');
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const [error, setError] = useState<string | null>(null);

    // ── Stats ────────────────────────────────────────────
    const total = subscribers.length;
    const confirmed = subscribers.filter(s => s.status === 'confirmed').length;
    const referrals = subscribers.reduce((sum, s) => sum + (s.referral_count || 0), 0);
    const topReferrers = [...subscribers]
        .filter(s => (s.referral_count || 0) > 0)
        .sort((a, b) => (b.referral_count || 0) - (a.referral_count || 0))
        .slice(0, 5);

    const segmentCounts: Record<string, number> = {};
    subscribers.filter(s => s.status === 'confirmed').forEach(s => {
        segmentCounts[s.segment] = (segmentCounts[s.segment] || 0) + 1;
    });

    // ── Load ─────────────────────────────────────────────
    const loadSubscribers = useCallback(async () => {
        try {
            setError(null);
            const supabase = createClient();
            const { data, error: fetchError } = await supabase
                .from('subscribers')
                .select('id, email, segment, status, referral_code, referral_count, referred_by, timezone, confirmed_at, created_at, unsubscribed_at')
                .order(sortField, { ascending: sortDir === 'asc' });

            if (fetchError) throw fetchError;
            setSubscribers(data || []);
        } catch (err: any) {
            setError(err.message || 'Failed to load subscribers');
        } finally {
            setLoading(false);
        }
    }, [sortField, sortDir]);

    useEffect(() => { loadSubscribers(); }, [loadSubscribers]);

    // ── Filter/search ────────────────────────────────────
    const filtered = subscribers.filter(s => {
        if (segmentFilter !== 'all' && s.segment !== segmentFilter) return false;
        if (statusFilter !== 'all' && s.status !== statusFilter) return false;
        if (search && !s.email.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    // ── Sort toggle ──────────────────────────────────────
    function toggleSort(field: SortField) {
        if (sortField === field) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('desc');
        }
    }

    const sortIcon = (field: SortField) =>
        sortField === field ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

    function formatDate(d: string | null) {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function getSegmentStyle(seg: string) {
        const styles: Record<string, string> = {
            builders: 'bg-blue-100 text-blue-800',
            innovators: 'bg-purple-100 text-purple-800',
            leaders: 'bg-amber-100 text-amber-800',
        };
        return styles[seg] || 'bg-gray-100 text-gray-800';
    }

    function getStatusStyle(status: string) {
        const styles: Record<string, string> = {
            confirmed: 'bg-green-100 text-green-700',
            pending: 'bg-yellow-100 text-yellow-700',
            unsubscribed: 'bg-red-100 text-red-700',
        };
        return styles[status] || 'bg-gray-100 text-gray-700';
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-7xl mx-auto p-8 text-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
                    <p className="mt-4 text-gray-600">Loading subscribers...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">👥 Subscribers</h1>
                        <p className="text-gray-600 mt-1">Manage your audience and track referrals</p>
                    </div>
                    <button
                        onClick={() => { setLoading(true); loadSubscribers(); }}
                        className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-100 transition"
                    >
                        ↻ Refresh
                    </button>
                </div>

                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
                        ⚠️ {error}
                    </div>
                )}

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                        <p className="text-sm text-gray-500 mb-1">Confirmed</p>
                        <p className="text-3xl font-bold text-gray-900">{confirmed}</p>
                    </div>
                    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                        <p className="text-sm text-gray-500 mb-1">Total Referrals</p>
                        <p className="text-3xl font-bold text-purple-600">{referrals}</p>
                    </div>
                    {Object.entries(segmentCounts).map(([seg, count]) => (
                        <div key={seg} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                            <p className="text-sm text-gray-500 mb-1 capitalize">{seg}</p>
                            <p className="text-3xl font-bold text-gray-900">{count}</p>
                        </div>
                    ))}
                </div>

                {/* Top Referrers */}
                {topReferrers.length > 0 && (
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 mb-8 border border-purple-100">
                        <h3 className="text-lg font-bold text-gray-900 mb-3">🏆 Top Referrers</h3>
                        <div className="flex flex-wrap gap-3">
                            {topReferrers.map((s, i) => (
                                <div key={s.id} className="flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm border border-purple-100">
                                    <span className="text-sm font-bold text-purple-600">#{i + 1}</span>
                                    <span className="text-sm text-gray-700 truncate max-w-[200px]">{s.email}</span>
                                    <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                        {s.referral_count} refs
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Filters */}
                <div className="flex flex-wrap gap-3 mb-6 items-center">
                    <div className="flex-1 min-w-[240px]">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by email..."
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 bg-white"
                        />
                    </div>
                    <select
                        value={segmentFilter}
                        onChange={(e) => setSegmentFilter(e.target.value)}
                        className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white"
                    >
                        <option value="all">All Segments</option>
                        <option value="builders">Builders</option>
                        <option value="innovators">Innovators</option>
                        <option value="leaders">Leaders</option>
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white"
                    >
                        <option value="all">All Status</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="pending">Pending</option>
                        <option value="unsubscribed">Unsubscribed</option>
                    </select>
                    <span className="text-sm text-gray-500">
                        {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                    </span>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50/50">
                                    <th
                                        className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3 cursor-pointer hover:text-gray-700"
                                        onClick={() => toggleSort('email')}
                                    >
                                        Email{sortIcon('email')}
                                    </th>
                                    <th
                                        className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3 cursor-pointer hover:text-gray-700"
                                        onClick={() => toggleSort('segment')}
                                    >
                                        Segment{sortIcon('segment')}
                                    </th>
                                    <th
                                        className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3 cursor-pointer hover:text-gray-700"
                                        onClick={() => toggleSort('status')}
                                    >
                                        Status{sortIcon('status')}
                                    </th>
                                    <th
                                        className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3 cursor-pointer hover:text-gray-700"
                                        onClick={() => toggleSort('referral_count')}
                                    >
                                        Referrals{sortIcon('referral_count')}
                                    </th>
                                    <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">
                                        Timezone
                                    </th>
                                    <th
                                        className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3 cursor-pointer hover:text-gray-700"
                                        onClick={() => toggleSort('created_at')}
                                    >
                                        Joined{sortIcon('created_at')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((s) => (
                                    <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-gray-900">{s.email}</span>
                                                {s.referred_by && (
                                                    <span className="text-xs text-gray-400" title={`Referred by: ${s.referred_by}`}>
                                                        🔗
                                                    </span>
                                                )}
                                            </div>
                                            {s.referral_code && (
                                                <p className="text-xs text-gray-400 mt-0.5 font-mono">{s.referral_code}</p>
                                            )}
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${getSegmentStyle(s.segment)}`}>
                                                {s.segment}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${getStatusStyle(s.status)}`}>
                                                {s.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            {(s.referral_count || 0) > 0 ? (
                                                <span className="inline-flex items-center gap-1 text-sm font-bold text-purple-600">
                                                    {s.referral_count}
                                                    {(s.referral_count || 0) >= 3 && <span title="Deep Dive unlocked">🔓</span>}
                                                </span>
                                            ) : (
                                                <span className="text-sm text-gray-300">0</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="text-xs text-gray-500">
                                                {s.timezone || '—'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="text-sm text-gray-500">{formatDate(s.created_at)}</span>
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center">
                                            <div className="text-4xl mb-2">🔍</div>
                                            <p className="text-gray-500">No subscribers match your filters</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
