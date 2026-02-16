import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Click Tracking Redirect
 * 
 * When users click links in newsletter, they go through this endpoint first.
 * This allows us to track clicks before redirecting to the actual URL.
 * 
 * For sponsor clicks, pass ?sponsor_schedule_id=<uuid> to increment the
 * sponsor_schedule clicks counter.
 * 
 * Examples:
 *   Article:  /track?url=https://docker.com/blog&segment=builders
 *   Sponsor:  /track?url=https://docker.com&segment=builders&sponsor_schedule_id=abc-123
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const targetUrl = searchParams.get('url');
        const segment = searchParams.get('segment');
        const sponsorScheduleId = searchParams.get('sponsor_schedule_id');

        // Validate URL
        if (!targetUrl) {
            return NextResponse.json(
                { error: 'Missing url parameter' },
                { status: 400 }
            );
        }

        // Validate it's a proper URL
        try {
            new URL(targetUrl);
        } catch {
            return NextResponse.json(
                { error: 'Invalid url parameter' },
                { status: 400 }
            );
        }

        // Track sponsor click (non-blocking — don't delay the redirect)
        if (sponsorScheduleId && supabaseUrl && supabaseKey) {
            const supabase = createClient(supabaseUrl, supabaseKey);
            // Increment clicks atomically using RPC or a simple update
            supabase
                .rpc('increment_sponsor_clicks', { schedule_id: sponsorScheduleId })
                .then(({ error }) => {
                    if (error) {
                        console.error('Sponsor click tracking error:', error);
                    }
                });
        }

        // Redirect to actual URL
        return NextResponse.redirect(targetUrl);

    } catch (error) {
        console.error('Track redirect error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
