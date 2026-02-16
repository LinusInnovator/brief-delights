import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

/**
 * PUT /api/admin/sponsors/content/[id]
 * Update sponsor content
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        // If setting as default, unset other defaults first
        if (body.is_default) {
            await supabase
                .from('sponsor_content')
                .update({ is_default: false })
                .neq('id', id)
                .eq('is_default', true);
        }

        const updateData: Record<string, any> = {};
        const allowedFields = [
            'name', 'company_name', 'headline', 'description',
            'cta_text', 'cta_url', 'logo_url', 'segments',
            'is_default', 'is_active'
        ];

        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updateData[field] = body[field];
            }
        }

        const { data, error } = await supabase
            .from('sponsor_content')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ sponsor: data });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update sponsor' }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/sponsors/content/[id]
 * Delete sponsor content
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const { error } = await supabase
            .from('sponsor_content')
            .delete()
            .eq('id', id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete sponsor' }, { status: 500 });
    }
}
