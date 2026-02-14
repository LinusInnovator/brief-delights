import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
)

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
    // Get overview metrics
    const { data: latestGrowth } = await supabase
        .from('subscriber_growth')
        .select('*')
        .order('date', { ascending: false })
        .limit(1)
        .single()

    const { data: weekAgoGrowth } = await supabase
        .from('subscriber_growth')
        .select('*')
        .eq('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .single()

    const growthThisWeek = latestGrowth && weekAgoGrowth
        ? latestGrowth.total_subscribers - weekAgoGrowth.total_subscribers
        : 0

    // Get open/click rates
    const { data: openRates } = await supabase
        .rpc('v_recent_open_rates')

    const avgOpenRate = openRates
        ? openRates.reduce((sum: number, s: any) => sum + (s.open_rate_pct || 0), 0) / openRates.length
        : 0

    // Get click rate (from article_clicks)
    const { count: totalClicks } = await supabase
        .from('article_clicks')
        .select('*', { count: 'exact', head: true })
        .gte('newsletter_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])

    const { data: sends } = await supabase
        .from('newsletter_sends')
        .select('recipient_count')
        .gte('send_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])

    const totalRecipients = sends?.reduce((sum, s) => sum + s.recipient_count, 0) || 1
    const avgClickRate = totalClicks && totalRecipients ? (totalClicks / totalRecipients) * 100 : 0

    const { count: newslettersSent } = await supabase
        .from('newsletter_sends')
        .select('*', { count: 'exact', head: true })
        .gte('send_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])

    // Get segment performance
    const segments = await Promise.all(
        ['builders', 'innovators', 'leaders'].map(async (segment) => {
            const { data: growth } = await supabase
                .from('subscriber_growth')
                .select('*')
                .order('date', { ascending: false })
                .limit(1)
                .single()

            const subscribers = growth?.[`${segment}_count`] || 0

            const { count: opensCount } = await supabase
                .from('email_events')
                .select('*', { count: 'exact', head: true })
                .eq('segment', segment)
                .eq('event_type', 'email.opened')
                .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

            const { count: sentCount } = await supabase
                .from('email_events')
                .select('*', { count: 'exact', head: true })
                .eq('segment', segment)
                .eq('event_type', 'email.sent')
                .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

            const openRate = sentCount && opensCount ? ((opensCount as number) / (sentCount as number)) * 100 : 0

            const { count: clicks } = await supabase
                .from('article_clicks')
                .select('*', { count: 'exact', head: true })
                .eq('segment', segment)
                .gte('newsletter_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])

            const clickRate = sentCount && clicks ? ((clicks as number) / (sentCount as number)) * 100 : 0

            return {
                name: segment,
                subscribers,
                openRate,
                clickRate,
                engagement: (openRate + clickRate * 2) / 3 // Weighted engagement score
            }
        })
    )

    // Get top articles
    const { data: topArticles } = await supabase
        .from('article_clicks')
        .select('article_title, article_url, source_domain, segment, newsletter_date')
        .gte('newsletter_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('clicked_at', { ascending: false })
        .limit(10)

    const articleCounts = topArticles?.reduce((acc: any, article) => {
        const key = article.article_url
        if (!acc[key]) {
            acc[key] = { ...article, clicks: 0 }
        }
        acc[key].clicks++
        return acc
    }, {})

    const topArticlesFormatted = Object.values(articleCounts || {})
        .sort((a: any, b: any) => b.clicks - a.clicks)
        .slice(0, 10)
        .map((a: any) => ({
            title: a.article_title || 'Untitled',
            url: a.article_url,
            clicks: a.clicks,
            source: a.source_domain,
            segment: a.segment,
            date: a.newsletter_date
        }))

    // Get top sources
    const { data: sourceData } = await supabase
        .from('article_clicks')
        .select('source_domain')
        .gte('newsletter_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])

    const sourceCounts = sourceData?.reduce((acc: any, { source_domain }) => {
        acc[source_domain] = (acc[source_domain] || 0) + 1
        return acc
    }, {})

    const topSources = Object.entries(sourceCounts || {})
        .sort(([, a]: any, [, b]: any) => b - a)
        .slice(0, 10)
        .map(([domain, clicks]: any) => ({
            domain,
            articles: 0, // TODO: Calculate from newsletter_sends
            clicks,
            avgClickRate: 0 // TODO: Calculate
        }))

    // Get growth data
    const { data: growthData } = await supabase
        .from('subscriber_growth')
        .select('*')
        .order('date', { ascending: false })
        .limit(30)

    const growth = growthData?.reverse().map(g => ({
        date: g.date,
        total: g.total_subscribers,
        new: g.new_today,
        unsubscribed: g.unsubscribed_today
    })) || []

    return {
        overview: {
            totalSubscribers: latestGrowth?.total_subscribers || 0,
            growthThisWeek,
            avgOpenRate,
            avgClickRate,
            newslettersSent: newslettersSent || 0
        },
        segments,
        topArticles: topArticlesFormatted as any,
        topSources,
        growth
    }
}
