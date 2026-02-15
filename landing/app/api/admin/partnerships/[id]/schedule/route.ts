import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_KEY!
        );

        const body = await request.json();
        const { scheduled_date, segment } = body;

        if (!scheduled_date) {
            return NextResponse.json(
                { error: 'scheduled_date is required' },
                { status: 400 }
            );
        }

        // Update partnership with schedule
        const { data, error } = await supabase
            .from('sponsored_content')
            .update({
                scheduled_date,
                segment: segment || 'all',
                status: 'scheduled',
            })
            .eq('id', params.id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ partnership: data });

    } catch (error: any) {
        console.error('Schedule partnership error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
