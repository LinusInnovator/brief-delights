import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

/**
 * GET /api/admin/sponsors/analytics
 * Get sponsor pipeline analytics
 */
export async function GET(request: NextRequest) {
    try {
        // Get all sponsor leads
        const { data: allLeads } = await supabase
            .from('sponsor_leads')
            .select('*');

        // Get sponsor bookings (confirmed deals)
        const { data: bookings } = await supabase
            .from('sponsor_bookings')
            .select('*');

        // Get outreach stats
        const { data: outreach } = await supabase
            .from('sponsor_outreach')
            .select('*');

        // Calculate metrics
        const totalDiscovered = allLeads?.length || 0;
        const totalOutreach = outreach?.filter(o => o.status === 'sent').length || 0;
        const totalResponded = allLeads?.filter(l => l.status === 'responded').length || 0;
        const totalBooked = bookings?.filter(b => b.status === 'confirmed').length || 0;
        const totalPaid = bookings?.filter(b => b.payment_status === 'paid').length || 0;

        // Calculate revenue
        const revenue = bookings
            ?.filter(b => b.payment_status === 'paid')
            .reduce((sum, b) => sum + (b.final_price_cents || 0), 0) || 0;

        // Conversion rate
        const conversionRate = totalOutreach > 0
            ? ((totalPaid / totalOutreach) * 100).toFixed(1)
            : '0.0';

        // Average deal size
        const avgDealSize = totalPaid > 0
            ? revenue / totalPaid
            : 0;

        // Get top performers (from article_clicks joined with sponsor_bookings)
        const { data: topPerformers } = await supabase
            .from('sponsor_bookings')
            .select(`
        company_name,
        final_price_cents,
        newsletter_date,
        article_clicks:article_clicks(count)
      `)
            .eq('status', 'delivered')
            .order('newsletter_date', { ascending: false })
            .limit(5);

        return NextResponse.json({
            metrics: {
                revenue_cents: revenue,
                revenue_display: `$${(revenue / 100).toLocaleString()}`,
                deals_closed: totalPaid,
                conversion_rate: `${conversionRate}%`,
                avg_deal_size_cents: avgDealSize,
                avg_deal_size_display: `$${(avgDealSize / 100).toFixed(0)}`
            },
            funnel: {
                discovered: totalDiscovered,
                outreach: totalOutreach,
                responded: totalResponded,
                booked: totalBooked,
                paid: totalPaid
            },
            top_performers: topPerformers || []
        });
    } catch (error) {
        console.error('Error fetching analytics:', error);
        return NextResponse.json(
            { error: 'Failed to fetch analytics' },
            { status: 500 }
        );
    }
}
