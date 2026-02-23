import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function POST(request: NextRequest) {
    try {
        const { variant_id } = await request.json();

        if (!variant_id) {
            return NextResponse.json({ error: 'Missing variant_id' }, { status: 400 });
        }

        // Atomic increment via RPC
        const { error } = await supabase.rpc('increment_ab_impressions', {
            p_variant_id: variant_id,
        });

        if (error) {
            console.error('AB impression error:', error.message);
        }

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
