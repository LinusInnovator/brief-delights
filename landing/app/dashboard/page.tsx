'use client';

import { useEffect, useState } from 'react';
import { getAnalyticsDashboardData, DashboardStats } from '../../lib/analytics';

export default function DashboardPage() {
    const [data, setData] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const stats = await getAnalyticsDashboardData();
            setData(stats);
            setLastUpdated(new Date().toLocaleTimeString());
        } catch (err) {
            console.error('Failed to load dashboard data:', err);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
                <div className="max-w-7xl mx-auto px-6 py-20 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-slate-600">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
                <div className="max-w-7xl mx-auto px-6 py-20 text-center">
                    <p className="text-red-600">Failed to load dashboard data</p>
                    <button
                        onClick={() => { setLoading(true); loadData(); }}
                        className="mt-3 text-sm text-blue-600 hover:text-blue-700 underline"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Analytics Dashboard</h1>
                        <p className="text-slate-600 mt-1">Real-time newsletter performance metrics</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => { setLoading(true); loadData(); }}
                            className="text-sm text-slate-500 hover:text-slate-700 transition"
                        >
                            ↻ Refresh
                        </button>
                        <span className="text-sm text-slate-500">Last updated: {lastUpdated}</span>
                        <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                    </div>
                </div>

                {/* Overview Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                    <MetricCard
                        title="Total Subscribers"
                        value={data.overview.totalSubscribers.toLocaleString()}
                        change={data.overview.growthThisWeek > 0 ? `+${data.overview.growthThisWeek}` : String(data.overview.growthThisWeek)}
                        changeLabel="this week"
                        trend={data.overview.growthThisWeek >= 0 ? 'up' : 'down'}
                        icon="👥"
                    />
                    <MetricCard
                        title="Avg Open Rate"
                        value={`${data.overview.avgOpenRate.toFixed(1)}%`}
                        subtitle="Industry avg: 21%"
                        trend={data.overview.avgOpenRate > 21 ? 'up' : 'down'}
                        highlight={data.overview.avgOpenRate > 30}
                        icon="📬"
                    />
                    <MetricCard
                        title="Avg Click Rate"
                        value={`${data.overview.avgClickRate.toFixed(1)}%`}
                        subtitle="Industry avg: 2.6%"
                        trend={data.overview.avgClickRate > 2.6 ? 'up' : 'down'}
                        highlight={data.overview.avgClickRate > 5}
                        icon="🖱️"
                    />
                    <MetricCard
                        title="Engagement Score"
                        value={((data.overview.avgOpenRate + data.overview.avgClickRate * 2) / 3).toFixed(1)}
                        subtitle="Sponsor-ready"
                        trend="up"
                        highlight={true}
                        icon="⚡"
                    />
                    <MetricCard
                        title="Newsletters Sent"
                        value={data.overview.newslettersSent.toLocaleString()}
                        subtitle="Last 30 days"
                        icon="📨"
                    />
                </div>

                {/* Segment Performance */}
                <section className="mb-8">
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">Segment Performance</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {data.segments.map((segment) => (
                            <SegmentCard key={segment.name} segment={segment} />
                        ))}
                    </div>
                </section>

                {/* Top Articles */}
                <section className="mb-8">
                    <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">🔥 Top Performing Articles</h2>
                        <p className="text-slate-600 mb-6">Most engaged content this week - perfect for sponsor alignment</p>
                        {data.topArticles.length > 0 ? (
                            <div className="space-y-3">
                                {data.topArticles.map((article, index) => (
                                    <ArticleRow key={index} article={article} rank={index + 1} />
                                ))}
                            </div>
                        ) : (
                            <p className="text-slate-400 text-center py-8">No article click data this week</p>
                        )}
                    </div>
                </section>

                {/* Top Sources */}
                <section className="mb-8">
                    <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">📰 Top Content Sources</h2>
                        <p className="text-slate-600 mb-6">Which publications drive the most engagement</p>
                        {data.topSources.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {data.topSources.map((source, index) => (
                                    <SourceCard key={index} source={source} rank={index + 1} />
                                ))}
                            </div>
                        ) : (
                            <p className="text-slate-400 text-center py-8">No content source data yet</p>
                        )}
                    </div>
                </section>

                {/* Growth Chart */}
                <section>
                    <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">📈 Growth Trend</h2>
                        <p className="text-slate-600 mb-6">30-day subscriber growth trajectory</p>
                        <SimpleGrowthChart data={data.growth} />
                    </div>
                </section>

                {/* Sponsor-Ready Badge */}
                <div className="mt-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-6 text-white text-center">
                    <h3 className="text-2xl font-bold mb-2">🎯 Sponsor-Ready Metrics</h3>
                    <p className="text-white/90 mb-4">
                        Your newsletter shows strong engagement • Perfect for premium partnerships
                    </p>
                    <div className="flex items-center justify-center gap-8 text-sm">
                        <div><span className="font-bold">{data.overview.avgOpenRate > 30 ? '✅' : '⏳'}</span> High Open Rate ({data.overview.avgOpenRate.toFixed(1)}%)</div>
                        <div><span className="font-bold">{data.overview.avgClickRate > 5 ? '✅' : '⏳'}</span> Strong Click Rate ({data.overview.avgClickRate.toFixed(1)}%)</div>
                        <div><span className="font-bold">{data.overview.totalSubscribers > 100 ? '✅' : '⏳'}</span> Quality Audience ({data.overview.totalSubscribers})</div>
                    </div>
                </div>
            </main>
        </div>
    )
}

// Component: Metric Card
function MetricCard({
    title,
    value,
    change,
    changeLabel,
    subtitle,
    trend,
    highlight = false,
    icon
}: any) {
    return (
        <div className={`bg-white rounded-xl p-6 shadow-lg border transition-all hover:shadow-xl ${highlight ? 'border-purple-300 ring-2 ring-purple-100' : 'border-slate-200'
            }`}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-slate-600 text-sm font-medium">{title}</span>
                <span className="text-2xl">{icon}</span>
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">{value}</div>
            {change && (
                <div className={`text-sm font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                    {trend === 'up' ? '↑' : '↓'} {change} {changeLabel}
                </div>
            )}
            {subtitle && (
                <div className="text-sm text-slate-500 mt-1">{subtitle}</div>
            )}
        </div>
    )
}

// Component: Segment Card
function SegmentCard({ segment }: any) {
    const emoji = segment.name === 'builders' ? '🔧' : segment.name === 'innovators' ? '🚀' : '💼'

    return (
        <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200 hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold capitalize text-slate-900">{emoji} {segment.name}</h3>
                <span className="bg-slate-100 px-3 py-1 rounded-full text-sm font-medium text-slate-700">
                    {segment.subscribers} subs
                </span>
            </div>

            <div className="space-y-3">
                <div>
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600">Open Rate</span>
                        <span className="font-semibold text-slate-900">{segment.openRate.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-500 rounded-full transition-all"
                            style={{ width: `${Math.min(segment.openRate, 100)}%` }}
                        />
                    </div>
                </div>

                <div>
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600">Click Rate</span>
                        <span className="font-semibold text-slate-900">{segment.clickRate.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-purple-500 rounded-full transition-all"
                            style={{ width: `${Math.min(segment.clickRate * 10, 100)}%` }}
                        />
                    </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Engagement Score</span>
                        <span className="font-bold text-purple-600">{segment.engagement.toFixed(1)}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

// Component: Article Row
function ArticleRow({ article, rank }: any) {
    return (
        <div className="flex items-center gap-4 p-4 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100">
            <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                {rank}
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-slate-900 truncate">{article.title}</h4>
                <div className="flex items-center gap-3 mt-1 text-sm text-slate-600">
                    <span>📰 {article.source}</span>
                    <span>•</span>
                    <span className="capitalize">{article.segment}</span>
                    <span>•</span>
                    <span>{new Date(article.date).toLocaleDateString()}</span>
                </div>
            </div>
            <div className="flex-shrink-0 text-right">
                <div className="text-2xl font-bold text-purple-600">{article.clicks}</div>
                <div className="text-xs text-slate-500">clicks</div>
            </div>
        </div>
    )
}

// Component: Source Card
function SourceCard({ source, rank }: any) {
    return (
        <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center text-white font-bold">
                #{rank}
            </div>
            <div className="flex-1">
                <h4 className="font-semibold text-slate-900">{source.domain}</h4>
                <div className="text-sm text-slate-600">{source.clicks} clicks</div>
            </div>
        </div>
    )
}

// Component: Simple Growth Chart (SVG-based)
function SimpleGrowthChart({ data }: any) {
    if (!data || data.length === 0) {
        return <div className="text-center text-slate-500 py-12">No growth data available yet</div>
    }

    const maxTotal = Math.max(...data.map((d: any) => d.total))
    const points = data.map((d: any, i: number) => {
        const x = (i / (data.length - 1)) * 100
        const y = 100 - (d.total / maxTotal) * 80
        return `${x},${y}`
    }).join(' ')

    return (
        <div className="relative h-64">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* Grid lines */}
                {[0, 25, 50, 75, 100].map(y => (
                    <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#e2e8f0" strokeWidth="0.2" />
                ))}

                {/* Area under curve */}
                <polygon
                    points={`0,100 ${points} 100,100`}
                    fill="url(#gradient)"
                    opacity="0.3"
                />

                {/* Line */}
                <polyline
                    points={points}
                    fill="none"
                    stroke="#8b5cf6"
                    strokeWidth="0.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                    </linearGradient>
                </defs>
            </svg>

            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-slate-500 -translate-x-12">
                <span>{maxTotal}</span>
                <span>{Math.round(maxTotal * 0.5)}</span>
                <span>0</span>
            </div>

            {/* X-axis labels */}
            <div className="flex justify-between mt-2 text-xs text-slate-500">
                <span>{new Date(data[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                <span>{new Date(data[Math.floor(data.length / 2)].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                <span>{new Date(data[data.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            </div>
        </div>
    )
}
