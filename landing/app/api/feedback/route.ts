import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

/**
 * POST /api/feedback — Record a newsletter rating
 * Body: { rating: 'loved'|'good'|'meh', date: '2026-02-19', segment: 'builders' }
 * Returns: { id: uuid }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { rating, date, segment } = body;

        if (!rating || !date || !segment) {
            return NextResponse.json(
                { error: 'Missing required fields: rating, date, segment' },
                { status: 400 }
            );
        }

        if (!['loved', 'good', 'meh'].includes(rating)) {
            return NextResponse.json(
                { error: 'Invalid rating. Must be: loved, good, or meh' },
                { status: 400 }
            );
        }

        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data, error } = await supabase
            .from('newsletter_feedback')
            .insert({
                edition_date: date,
                segment,
                rating,
            })
            .select('id')
            .single();

        if (error) {
            console.error('Feedback insert error:', error);
            return NextResponse.json(
                { error: 'Failed to save feedback' },
                { status: 500 }
            );
        }

        return NextResponse.json({ id: data.id });
    } catch (error) {
        console.error('Feedback API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/feedback — Attach comment to existing feedback
 * Body: { id: uuid, comment: string }
 */
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, comment } = body;

        if (!id || !comment) {
            return NextResponse.json(
                { error: 'Missing required fields: id, comment' },
                { status: 400 }
            );
        }

        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const { error } = await supabase
            .from('newsletter_feedback')
            .update({ comment })
            .eq('id', id);

        if (error) {
            console.error('Feedback update error:', error);
            return NextResponse.json(
                { error: 'Failed to save comment' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Feedback PATCH error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
