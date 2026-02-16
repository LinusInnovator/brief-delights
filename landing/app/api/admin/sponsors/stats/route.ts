import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

/**
 * GET /api/admin/sponsors/stats
 * Per-sponsor performance stats
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const sponsorId = searchParams.get('sponsor_id');
    const days = parseInt(searchParams.get('days') || '30');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
        // Get all sponsor content with their schedule performance
        let contentQuery = supabase
            .from('sponsor_content')
            .select('id, name, company_name, is_default, is_active, segments, created_at');

        if (sponsorId) {
            contentQuery = contentQuery.eq('id', sponsorId);
        }

        const { data: sponsors, error: sponsorError } = await contentQuery;

        if (sponsorError) {
            return NextResponse.json({ error: sponsorError.message }, { status: 500 });
        }

        // Get schedule data with clicks for each sponsor
        const { data: schedules, error: scheduleError } = await supabase
            .from('sponsor_schedule')
            .select('sponsor_content_id, scheduled_date, segment, clicks, impressions, status')
            .gte('scheduled_date', startDate.toISOString().split('T')[0])
            .in('status', ['sent', 'scheduled']);

        if (scheduleError) {
            return NextResponse.json({ error: scheduleError.message }, { status: 500 });
        }

        // Aggregate stats per sponsor
        const stats = (sponsors || []).map((sponsor) => {
            const sponsorSchedules = (schedules || []).filter(
                (s) => s.sponsor_content_id === sponsor.id
            );

            const totalClicks = sponsorSchedules.reduce((sum, s) => sum + (s.clicks || 0), 0);
            const totalImpressions = sponsorSchedules.reduce((sum, s) => sum + (s.impressions || 0), 0);
            const sentCount = sponsorSchedules.filter((s) => s.status === 'sent').length;
            const scheduledCount = sponsorSchedules.filter((s) => s.status === 'scheduled').length;

            // Per-segment breakdown
            const bySegment: Record<string, { clicks: number; impressions: number; sends: number }> = {};
            for (const s of sponsorSchedules) {
                if (!bySegment[s.segment]) {
                    bySegment[s.segment] = { clicks: 0, impressions: 0, sends: 0 };
                }
                bySegment[s.segment].clicks += s.clicks || 0;
                bySegment[s.segment].impressions += s.impressions || 0;
                if (s.status === 'sent') bySegment[s.segment].sends += 1;
            }

            return {
                ...sponsor,
                totalClicks,
                totalImpressions,
                ctr: totalImpressions > 0
                    ? ((totalClicks / totalImpressions) * 100).toFixed(1) + '%'
                    : '—',
                sentCount,
                scheduledCount,
                bySegment,
            };
        });

        // Overall summary
        const summary = {
            totalSponsors: sponsors?.length || 0,
            activeSponsors: sponsors?.filter((s) => s.is_active).length || 0,
            totalClicks: stats.reduce((sum, s) => sum + s.totalClicks, 0),
            totalImpressions: stats.reduce((sum, s) => sum + s.totalImpressions, 0),
            totalSends: stats.reduce((sum, s) => sum + s.sentCount, 0),
        };

        return NextResponse.json({ stats, summary });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }
}
