import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_KEY!
        );

        const { searchParams } = request.nextUrl;
        const status = searchParams.get('status');
        const date = searchParams.get('date');

        let query = supabase
            .from('sponsored_content')
            .select('*')
            .order('scheduled_date', { ascending: true });

        if (status) {
            query = query.eq('status', status);
        }

        if (date) {
            query = query.eq('scheduled_date', date);
        }

        const { data, error } = await query;

        if (error) throw error;

        return NextResponse.json({ partnerships: data });

    } catch (error: any) {
        console.error('Get partnerships error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_KEY!
        );

        const body = await request.json();

        const { data, error } = await supabase
            .from('sponsored_content')
            .insert({
                sponsor_name: body.sponsor_name,
                sponsor_domain: body.sponsor_domain,
                sponsor_logo_url: body.sponsor_logo_url,
                headline: body.headline,
                body: body.body,
                cta_text: body.cta_text,
                cta_url: body.cta_url,
                segment: body.segment || 'all',
                partnership_type: body.partnership_type || 'paid',
                deal_value_cents: body.deal_value_cents,
                notes: body.notes,
                status: 'draft',
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ partnership: data });

    } catch (error: any) {
        console.error('Create partnership error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
