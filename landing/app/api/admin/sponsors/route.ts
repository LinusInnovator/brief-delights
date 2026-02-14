import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

/**
 * GET /api/admin/sponsors
 * List all sponsor leads with optional filtering
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const segment = searchParams.get('segment');

    try {
        let query = supabase
            .from('sponsor_leads')
            .select('*')
            .order('match_score', { ascending: false });

        if (status) {
            query = query.eq('status', status);
        }
        if (segment) {
            query = query.eq('matched_segment', segment);
        }

        const { data, error } = await query;

        if (error) {
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ sponsors: data });
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to fetch sponsors' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/admin/sponsors
 * Create a new sponsor lead (or update from discovery script)
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const { data, error } = await supabase
            .from('sponsor_leads')
            .insert(body)
            .select()
            .single();

        if (error) {
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ sponsor: data });
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to create sponsor' },
            { status: 500 }
        );
    }
}
