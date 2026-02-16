import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

/**
 * GET /api/admin/sponsors/schedule
 * Get sponsor schedule for a date range
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start') || new Date().toISOString().split('T')[0];
    const days = parseInt(searchParams.get('days') || '7');

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + days);

    try {
        const { data, error } = await supabase
            .from('sponsor_schedule')
            .select(`
                *,
                sponsor_content (
                    id, name, company_name, headline, cta_url, is_default, segments
                )
            `)
            .gte('scheduled_date', startDate)
            .lte('scheduled_date', endDate.toISOString().split('T')[0])
            .order('scheduled_date', { ascending: true });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Also get the default sponsor for empty slots
        const { data: defaultSponsor } = await supabase
            .from('sponsor_content')
            .select('id, name, company_name, headline, cta_url, segments')
            .eq('is_default', true)
            .eq('is_active', true)
            .single();

        return NextResponse.json({
            schedule: data,
            defaultSponsor,
        });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 });
    }
}

/**
 * POST /api/admin/sponsors/schedule
 * Assign sponsor to a date + segment (upsert)
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const { data, error } = await supabase
            .from('sponsor_schedule')
            .upsert(
                {
                    sponsor_content_id: body.sponsor_content_id,
                    scheduled_date: body.scheduled_date,
                    segment: body.segment,
                    status: 'scheduled',
                },
                {
                    onConflict: 'scheduled_date,segment',
                }
            )
            .select(`
                *,
                sponsor_content (
                    id, name, company_name, headline, cta_url, is_default, segments
                )
            `)
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ schedule: data });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to schedule sponsor' }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/sponsors/schedule
 * Remove a scheduled sponsor
 */
export async function DELETE(request: NextRequest) {
    try {
        const body = await request.json();

        const { error } = await supabase
            .from('sponsor_schedule')
            .delete()
            .eq('scheduled_date', body.scheduled_date)
            .eq('segment', body.segment);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to remove schedule' }, { status: 500 });
    }
}
