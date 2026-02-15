import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_KEY!
        );

        // Get top articles from last 7 days
        const { data: articles, error: articlesError } = await supabase
            .from('article_clicks')
            .select('article_url, article_title, source_domain, segment, newsletter_date')
            .gte('newsletter_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
            .order('clicked_at', { ascending: false });

        if (articlesError) throw articlesError;

        // Aggregate clicks by article
        const articleMap = new Map();
        articles?.forEach(article => {
            const key = article.article_url;
            if (!articleMap.has(key)) {
                articleMap.set(key, {
                    article_title: article.article_title,
                    article_url: article.article_url,
                    source_domain: article.source_domain,
                    segment: article.segment,
                    total_clicks: 0,
                    competitor_detected: null,
                    matched_sponsors: []
                });
            }
            const existing = articleMap.get(key);
            existing.total_clicks += 1;
        });

        // Get sponsor leads to match with articles
        const { data: sponsors, error: sponsorsError } = await supabase
            .from('sponsor_leads')
            .select('company_name, match_score, status, competitor_mentioned')
            .order('match_score', { ascending: false });

        if (sponsorsError) throw sponsorsError;

        // Match sponsors to articles based on competitor detection
        const insights = Array.from(articleMap.values()).map(article => {
            // Detect competitor from source domain
            const competitorMap: { [key: string]: string } = {
                'docker.com': 'Docker',
                'kubernetes.io': 'Kubernetes',
                'aws.amazon.com': 'AWS',
                'microsoft.com': 'Microsoft',
                'openai.com': 'OpenAI',
                'github.com': 'GitHub'
            };

            const competitor = competitorMap[article.source_domain] || null;

            // Find sponsors matched to this competitor
            const matchedSponsors = sponsors?.filter(s =>
                s.competitor_mentioned?.toLowerCase() === competitor?.toLowerCase()
            ) || [];

            return {
                ...article,
                competitor_detected: competitor,
                matched_sponsors: matchedSponsors.map(s => ({
                    company_name: s.company_name,
                    match_score: s.match_score,
                    status: s.status
                }))
            };
        });

        // Sort by total clicks
        insights.sort((a, b) => b.total_clicks - a.total_clicks);

        return NextResponse.json({
            articles: insights.slice(0, 20), // Top 20
            total_articles: insights.length
        });

    } catch (error: any) {
        console.error('Insights API error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
