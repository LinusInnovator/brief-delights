'use client';

import { useEffect, useState } from 'react';

interface Analytics {
    metrics: {
        revenue_display: string;
        deals_closed: number;
        conversion_rate: string;
        avg_deal_size_display: string;
    };
    funnel: {
        discovered: number;
        outreach: number;
        responded: number;
        booked: number;
        paid: number;
    };
    top_performers: Array<{
        company_name: string;
        final_price_cents: number;
        newsletter_date: string;
    }>;
}

export default function AnalyticsPage() {
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAnalytics();
    }, []);

    async function loadAnalytics() {
        try {
            const res = await fetch('/api/admin/sponsors/analytics');
            const data = await res.json();
            setAnalytics(data);
        } catch (error) {
            console.error('Failed to load analytics:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 p-8">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading analytics...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        📈 Sponsorship Analytics
                    </h1>
                    <p className="text-gray-600">
                        Pipeline performance and revenue metrics
                    </p>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <p className="text-sm text-gray-600 mb-1">Revenue (This Month)</p>
                        <p className="text-3xl font-bold text-gray-900">
                            {analytics?.metrics.revenue_display || '$0'}
                        </p>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <p className="text-sm text-gray-600 mb-1">Deals Closed</p>
                        <p className="text-3xl font-bold text-gray-900">
                            {analytics?.metrics.deals_closed || 0}
                        </p>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <p className="text-sm text-gray-600 mb-1">Conversion Rate</p>
                        <p className="text-3xl font-bold text-gray-900">
                            {analytics?.metrics.conversion_rate || '0%'}
                        </p>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <p className="text-sm text-gray-600 mb-1">Avg Deal Size</p>
                        <p className="text-3xl font-bold text-gray-900">
                            {analytics?.metrics.avg_deal_size_display || '$0'}
                        </p>
                    </div>
                </div>

                {/* Funnel */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Pipeline Funnel</h2>

                    <div className="space-y-4">
                        {[
                            { label: 'Discovered', value: analytics?.funnel.discovered || 0, color: 'bg-blue-500' },
                            { label: 'Outreach Sent', value: analytics?.funnel.outreach || 0, color: 'bg-indigo-500' },
                            { label: 'Responded', value: analytics?.funnel.responded || 0, color: 'bg-purple-500' },
                            { label: 'Booked', value: analytics?.funnel.booked || 0, color: 'bg-pink-500' },
                            { label: 'Paid', value: analytics?.funnel.paid || 0, color: 'bg-green-500' }
                        ].map((stage) => {
                            const maxValue = analytics?.funnel.discovered || 100;
                            const percentage = maxValue > 0 ? (stage.value / maxValue) * 100 : 0;

                            return (
                                <div key={stage.label} className="flex items-center gap-4">
                                    <div className="w-32 text-sm font-medium text-gray-700">
                                        {stage.label}
                                    </div>
                                    <div className="flex-1 bg-gray-100 rounded-full h-8 relative">
                                        <div
                                            className={`${stage.color} h-8 rounded-full flex items-center justify-end pr-3 text-white text-sm font-medium transition-all`}
                                            style={{ width: `${Math.max(percentage, 5)}%` }}
                                        >
                                            {stage.value}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Top Performers */}
                {analytics?.top_performers && analytics.top_performers.length > 0 && (
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">Top Performing Sponsors</h2>

                        <div className="space-y-3">
                            {analytics.top_performers.map((sponsor, index) => (
                                <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                                    <div>
                                        <p className="font-medium text-gray-900">{sponsor.company_name}</p>
                                        <p className="text-sm text-gray-600">
                                            Sent: {new Date(sponsor.newsletter_date).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-gray-900">
                                            ${(sponsor.final_price_cents / 100).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Back to Pipeline */}
                <div className="mt-8">
                    <a
                        href="/admin/sponsors"
                        className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
                    >
                        ← Back to Pipeline
                    </a>
                </div>
            </div>
        </div>
    );
}
