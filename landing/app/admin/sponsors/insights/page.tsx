'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

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
    const [totalArticles, setTotalArticles] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadInsights();
    }, []);

    async function loadInsights() {
        try {
            const supabase = createClient();

            // Get top articles from last 7 days
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split('T')[0];

            const { data: articles, error: articlesError } = await supabase
                .from('article_clicks')
                .select('article_url, article_title, source_domain, segment, newsletter_date')
                .gte('newsletter_date', sevenDaysAgo)
                .order('clicked_at', { ascending: false });

            if (articlesError) throw articlesError;

            // Aggregate clicks by article
            const articleMap = new Map<string, any>();
            articles?.forEach((article: any) => {
                const key = article.article_url;
                if (!articleMap.has(key)) {
                    articleMap.set(key, {
                        article_title: article.article_title,
                        article_url: article.article_url,
                        source_domain: article.source_domain,
                        segment: article.segment,
                        total_clicks: 0,
                        competitor_detected: null,
                        matched_sponsors: [],
                    });
                }
                articleMap.get(key).total_clicks += 1;
            });

            // Get sponsor leads to match with articles
            const { data: sponsors, error: sponsorsError } = await supabase
                .from('sponsor_leads')
                .select('company_name, match_score, status, competitor_mentioned')
                .order('match_score', { ascending: false });

            if (sponsorsError) throw sponsorsError;

            // Match sponsors to articles based on competitor detection
            const competitorMap: { [key: string]: string } = {
                'docker.com': 'Docker',
                'kubernetes.io': 'Kubernetes',
                'aws.amazon.com': 'AWS',
                'microsoft.com': 'Microsoft',
                'openai.com': 'OpenAI',
                'github.com': 'GitHub',
            };

            const result = Array.from(articleMap.values())
                .map((article) => {
                    const competitor = competitorMap[article.source_domain] || null;
                    const matchedSponsors = (sponsors || []).filter(
                        (s: any) =>
                            s.competitor_mentioned?.toLowerCase() === competitor?.toLowerCase()
                    );
                    return {
                        ...article,
                        competitor_detected: competitor,
                        matched_sponsors: matchedSponsors.map((s: any) => ({
                            company_name: s.company_name,
                            match_score: s.match_score,
                            status: s.status,
                        })),
                    };
                })
                .sort((a, b) => b.total_clicks - a.total_clicks);

            setInsights(result.slice(0, 20));
            setTotalArticles(result.length);
        } catch (err: any) {
            console.error('Failed to load insights:', err);
            setError(err.message || 'Failed to load insights');
        } finally {
            setLoading(false);
        }
    }

    function getSegmentColor(segment: string): string {
        const colors: Record<string, string> = {
            builders: 'bg-blue-100 text-blue-800',
            innovators: 'bg-purple-100 text-purple-800',
            leaders: 'bg-amber-100 text-amber-800',
        };
        return colors[segment] || 'bg-gray-100 text-gray-800';
    }

    function getStatusColor(status: string): string {
        const colors: Record<string, string> = {
            discovered: 'bg-gray-100 text-gray-600',
            outreach: 'bg-blue-100 text-blue-600',
            responded: 'bg-green-100 text-green-600',
            booked: 'bg-purple-100 text-purple-600',
            paid: 'bg-emerald-100 text-emerald-600',
        };
        return colors[status] || 'bg-gray-100 text-gray-600';
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-6xl mx-auto p-8">
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading insights...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-6xl mx-auto p-8">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                        <p className="text-red-600 font-medium">⚠️ {error}</p>
                        <button
                            onClick={() => { setLoading(true); setError(null); loadInsights(); }}
                            className="mt-3 text-sm text-red-600 hover:text-red-700 underline"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-6xl mx-auto p-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        🔍 Content Insights
                    </h1>
                    <p className="text-gray-600">
                        Top performing articles and sponsor matching opportunities
                        {totalArticles > 0 && (
                            <span className="ml-2 text-gray-400">
                                ({totalArticles} articles this week)
                            </span>
                        )}
                    </p>
                </div>

                {/* Articles */}
                {insights.length > 0 ? (
                    <div className="space-y-4">
                        {insights.map((article, index) => (
                            <div
                                key={article.article_url}
                                className="bg-white rounded-lg shadow-sm border border-gray-100 p-6"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-lg font-bold text-gray-400">
                                                #{index + 1}
                                            </span>
                                            <a
                                                href={article.article_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition"
                                            >
                                                {article.article_title || article.article_url}
                                            </a>
                                        </div>

                                        <div className="flex items-center gap-3 text-sm">
                                            <span className="text-gray-500">
                                                {article.source_domain}
                                            </span>
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${getSegmentColor(
                                                    article.segment
                                                )}`}
                                            >
                                                {article.segment}
                                            </span>
                                            {article.competitor_detected && (
                                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                                                    🏢 {article.competitor_detected}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <p className="text-2xl font-bold text-gray-900">
                                            {article.total_clicks}
                                        </p>
                                        <p className="text-xs text-gray-500">clicks</p>
                                    </div>
                                </div>

                                {/* Matched Sponsors */}
                                {article.matched_sponsors.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        <p className="text-xs text-gray-500 mb-2">
                                            Matched Sponsors:
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {article.matched_sponsors.map((s, i) => (
                                                <span
                                                    key={i}
                                                    className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                                        s.status
                                                    )}`}
                                                >
                                                    {s.company_name} ({s.match_score}%)
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow-sm p-12 border border-gray-100 text-center">
                        <div className="text-5xl mb-4">🔍</div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No insights yet</h3>
                        <p className="text-gray-600">
                            Article click data will appear here once newsletters are sent
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
