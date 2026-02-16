import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

/**
 * GET /api/admin/sponsors/content
 * List all sponsor content (ad creatives)
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const activeOnly = searchParams.get('active') === 'true';

    try {
        let query = supabase
            .from('sponsor_content')
            .select('*')
            .order('created_at', { ascending: false });

        if (activeOnly) {
            query = query.eq('is_active', true);
        }

        const { data, error } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ sponsors: data });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch sponsors' }, { status: 500 });
    }
}

/**
 * POST /api/admin/sponsors/content
 * Create new sponsor content
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // If setting as default, unset other defaults first
        if (body.is_default) {
            await supabase
                .from('sponsor_content')
                .update({ is_default: false })
                .eq('is_default', true);
        }

        const { data, error } = await supabase
            .from('sponsor_content')
            .insert({
                name: body.name,
                company_name: body.company_name,
                headline: body.headline,
                description: body.description,
                cta_text: body.cta_text || 'Learn More →',
                cta_url: body.cta_url,
                logo_url: body.logo_url || null,
                segments: body.segments || ['builders', 'innovators', 'leaders'],
                is_default: body.is_default || false,
                is_active: body.is_active !== false,
                sponsor_lead_id: body.sponsor_lead_id || null,
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ sponsor: data });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create sponsor' }, { status: 500 });
    }
}
