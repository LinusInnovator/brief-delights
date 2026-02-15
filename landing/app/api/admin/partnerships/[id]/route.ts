import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_KEY!
        );

        const { data, error } = await supabase
            .from('sponsored_content')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        return NextResponse.json({ partnership: data });

    } catch (error: any) {
        console.error('Get partnership error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 404 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_KEY!
        );

        const body = await request.json();

        const { data, error } = await supabase
            .from('sponsored_content')
            .update(body)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ partnership: data });

    } catch (error: any) {
        console.error('Update partnership error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_KEY!
        );

        const { error } = await supabase
            .from('sponsored_content')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Delete partnership error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
