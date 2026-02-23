import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { discoverSponsors } from '@/lib/sponsorDiscovery';

/**
 * POST /api/cron/discover-sponsors
 * 
 * Server-side trigger for sponsor discovery.
 * Called automatically by the daily pipeline after newsletters are sent.
 * Can also be called via curl or GitHub Actions cron.
 * 
 * Auth: requires CRON_SECRET header to prevent unauthorized access.
 */
export async function POST(request: NextRequest) {
    const cronSecret = request.headers.get('x-cron-secret')
        || request.headers.get('authorization')?.replace('Bearer ', '');

    // Accept either Vercel's CRON_SECRET or the Supabase Service Key (as an admin override)
    const validSecrets = [process.env.CRON_SECRET, process.env.SUPABASE_SERVICE_KEY].filter(Boolean);

    if (!cronSecret || !validSecrets.includes(cronSecret)) {
        return NextResponse.json(
            { error: 'Unauthorized — missing or invalid cron secret' },
            { status: 401 }
        );
    }

    try {
        // Create server-side Supabase client with service key
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_KEY!
        );

        console.log('[discover-sponsors] Starting automated sponsor discovery...');

        // Run discovery with the server-side client
        const result = await discoverSponsors(supabase);

        console.log(`[discover-sponsors] Done: ${result.leadsWritten} leads written, ${result.incumbentsDetected.length} incumbents detected`);

        return NextResponse.json({
            success: true,
            ...result,
            triggered_by: 'cron',
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[discover-sponsors] Error:', error);
        return NextResponse.json(
            {
                error: 'Discovery failed',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

/**
 * GET — simple health check for monitoring
 */
export async function GET() {
    return NextResponse.json({
        status: 'ok',
        endpoint: 'discover-sponsors',
        description: 'POST with x-cron-secret header to trigger sponsor discovery',
    });
}
