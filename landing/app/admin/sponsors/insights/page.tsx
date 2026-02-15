'use client';

import { useEffect, useState } from 'react';
import AdminNav from '../components/AdminNav';

interface ArticleInsight {
    article_title: string;
    article_url: string;
    source_domain: string;
    total_clicks: number;
    segment: string;
    competitor_detected: string | null;
    matched_sponsors: Array<{
        company_name: string;
        match_score: number;
        status: string;
    }>;
}

export default function InsightsPage() {
    const [insights, setInsights] = useState<ArticleInsight[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadInsights();
    }, []);

    async function loadInsights() {
        try {
            const res = await fetch('/api/admin/sponsors/insights');
            const data = await res.json();
            setInsights(data.articles || []);
        } catch (error) {
            console.error('Failed to load insights:', error);
        } finally {
            setLoading(false);
        }
    }

    function getSegmentColor(segment: string): string {
        switch (segment) {
            case 'builders': return 'bg-blue-100 text-blue-800';
            case 'innovators': return 'bg-purple-100 text-purple-800';
            case 'leaders': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }

    function getStatusColor(status: string): string {
        switch (status) {
            case 'booked': return 'bg-green-100 text-green-800';
            case 'responded': return 'bg-purple-100 text-purple-800';
            case 'outreach_sent': return 'bg-blue-100 text-blue-800';
            case 'matched': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }

    if (loading) {
        return (
            <>
                <AdminNav />
                <div className="min-h-screen bg-gray-50 p-8">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="mt-4 text-gray-600">Loading insights...</p>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <AdminNav />
            <div className="min-h-screen bg-gray-50 p-8">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            🎯 Article Performance → Sponsor Insights
                        </h1>
                        <p className="text-gray-600">
                            See which articles drive engagement and how we match sponsors to content performance
                        </p>
                    </div>

                    {/* Insights Grid */}
                    {insights.length === 0 ? (
                        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                            <p className="text-gray-600 text-lg">
                                No article data yet
                            </p>
                            <p className="text-gray-500 mt-2">
                                Articles will appear here after newsletter sends
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {insights.map((insight, index) => (
                                <div
                                    key={index}
                                    className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition"
                                >
                                    {/* Article Info */}
                                    <div className="mb-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h3 className="text-xl font-bold text-gray-900 mb-2">
                                                    📰 {insight.article_title}
                                                </h3>
                                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                                    <span>🌐 {insight.source_domain}</span>
                                                    <span>•</span>
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${getSegmentColor(insight.segment)}`}>
                                                        {insight.segment}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-3xl font-bold text-blue-600">
                                                    {insight.total_clicks}
                                                </p>
                                                <p className="text-sm text-gray-600">clicks</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Competitor Detection */}
                                    {insight.competitor_detected && (
                                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">⚡</span>
                                                <div>
                                                    <p className="font-medium text-gray-900">
                                                        Competitor Opportunity Detected
                                                    </p>
                                                    <p className="text-sm text-gray-600">
                                                        Article mentions <strong>{insight.competitor_detected}</strong> - pitched to their challengers
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Sponsor Matches */}
                                    {insight.matched_sponsors && insight.matched_sponsors.length > 0 && (
                                        <div>
                                            <h4 className="font-semibold text-gray-900 mb-3">
                                                🎯 Sponsors Matched from This Article
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {insight.matched_sponsors.map((sponsor, i) => (
                                                    <div
                                                        key={i}
                                                        className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 transition"
                                                    >
                                                        <div className="flex items-center justify-between mb-2">
                                                            <p className="font-medium text-gray-900">
                                                                {sponsor.company_name}
                                                            </p>
                                                            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(sponsor.status)}`}>
                                                                {sponsor.status.replace('_', ' ')}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                                            <span>Match Score: {sponsor.match_score}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* No matches */}
                                    {(!insight.matched_sponsors || insight.matched_sponsors.length === 0) && (
                                        <div className="text-sm text-gray-500 italic">
                                            No sponsors matched yet for this article
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Back Link */}
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
        </>
    );
}
