import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client for secure backend operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';

let supabase: ReturnType<typeof createClient>;
if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
}

export async function POST(req: Request) {
    try {
        if (!supabase) {
            return NextResponse.json({ error: 'Database connection not initialized' }, { status: 500 });
        }

        const body = await req.json();
        const { query, node_id, webhook_url, format, depth } = body;

        if (!query || !node_id || !webhook_url) {
            return NextResponse.json(
                { error: 'Missing required fields: query, node_id, webhook_url' },
                { status: 400 }
            );
        }

        const mission = {
            query,
            node_id,
            webhook_url,
            format: format || 'spatial_json',
            depth: depth || 'rapid',
            status: 'pending'
        };

        // Enqueue mission in the database for the Python daemon to pick up
        const { data, error } = await supabase
            .from('research_missions')
            .insert(mission)
            .select('id')
            .single();

        if (error) {
            console.error('Supabase queue error:', error);
            return NextResponse.json({ error: 'Failed to queue research mission' }, { status: 500 });
        }

        return NextResponse.json({
            status: 'acknowledged',
            research_id: data.id,
            message: 'Brief Engine dispatched. Awaiting intelligence gathering.'
        }, { status: 202 });

    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
    }
}
