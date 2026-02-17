import { createClient } from './supabase/client'

export interface DashboardStats {
    overview: {
        totalSubscribers: number
        growthThisWeek: number
        avgOpenRate: number
        avgClickRate: number
        newslettersSent: number
    }
    segments: {
        name: string
        subscribers: number
        openRate: number
        clickRate: number
        engagement: number
    }[]
    topArticles: {
        title: string
        url: string
        clicks: number
        source: string
        segment: string
        date: string
    }[]
    topSources: {
        domain: string
        articles: number
        clicks: number
        avgClickRate: number
    }[]
    growth: {
        date: string
        total: number
        new: number
        unsubscribed: number
    }[]
}

export async function getAnalyticsDashboardData(): Promise<DashboardStats> {
    const supabase = createClient()

    // ── Overview: subscribers ─────────────────────────────────
    const { count: totalSubscribers } = await supabase
        .from('subscribers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'confirmed')

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const { count: newThisWeek } = await supabase
        .from('subscribers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'confirmed')
        .gte('confirmed_at', oneWeekAgo)

    // ── Segment counts ───────────────────────────────────────
    const segments = await Promise.all(
        ['builders', 'innovators', 'leaders'].map(async (segment) => {
            const { count: subscribers } = await supabase
                .from('subscribers')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'confirmed')
                .eq('segment', segment)

            return {
                name: segment,
                subscribers: subscribers || 0,
                openRate: 0,  // Populated when email_events table has data
                clickRate: 0,
                engagement: 0,
            }
        })
    )

    // ── Top articles (from article_clicks if any) ────────────
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const { data: clickData } = await supabase
        .from('article_clicks')
        .select('article_title, article_url, source_domain, segment, newsletter_date')
        .gte('newsletter_date', sevenDaysAgo)
        .order('clicked_at', { ascending: false })
        .limit(200)

    // Aggregate
    const articleCounts: Record<string, any> = {}
    clickData?.forEach((c: any) => {
        if (!articleCounts[c.article_url]) {
            articleCounts[c.article_url] = {
                title: c.article_title || 'Untitled',
                url: c.article_url,
                clicks: 0,
                source: c.source_domain,
                segment: c.segment,
                date: c.newsletter_date,
            }
        }
        articleCounts[c.article_url].clicks++
    })

    const topArticles = Object.values(articleCounts)
        .sort((a: any, b: any) => b.clicks - a.clicks)
        .slice(0, 10)

    // ── Top sources ──────────────────────────────────────────
    const sourceCounts: Record<string, number> = {}
    clickData?.forEach((c: any) => {
        sourceCounts[c.source_domain] = (sourceCounts[c.source_domain] || 0) + 1
    })

    const topSources = Object.entries(sourceCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([domain, clicks]) => ({
            domain,
            articles: 0,
            clicks,
            avgClickRate: 0,
        }))

    // ── Growth data (from subscriber_growth if it exists, else approximate) ──
    const { data: growthData } = await supabase
        .from('subscriber_growth')
        .select('*')
        .order('date', { ascending: false })
        .limit(30)

    const growth = growthData?.reverse().map((g: any) => ({
        date: g.date,
        total: g.total_subscribers,
        new: g.new_today || 0,
        unsubscribed: g.unsubscribed_today || 0,
    })) || []

    return {
        overview: {
            totalSubscribers: totalSubscribers || 0,
            growthThisWeek: newThisWeek || 0,
            avgOpenRate: 0,   // Populated when open tracking is wired
            avgClickRate: 0,  // Populated when click tracking is wired
            newslettersSent: 0,
        },
        segments,
        topArticles: topArticles as any,
        topSources,
        growth,
    }
}
