import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * DEV ONLY: Simplified bypass for local testing
 * Provides a direct login link without creating users
 */
export async function POST(request: NextRequest) {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
            { error: 'Not available in production' },
            { status: 403 }
        );
    }

    try {
        const { email } = await request.json();

        // Check for service key
        const serviceKey = process.env.SUPABASE_SERVICE_KEY;

        if (!serviceKey) {
            console.error('[DEV-LOGIN] Missing SUPABASE_SERVICE_KEY');
            return NextResponse.json(
                { error: 'Server configuration error - missing service key. Add SUPABASE_SERVICE_KEY to .env.local' },
                { status: 500 }
            );
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceKey,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );

        console.log('[DEV-LOGIN] Creating magic link for:', email);

        // Generate a magic link using admin API
        const { data, error } = await supabase.auth.admin.generateLink({
            type: 'magiclink',
            email: email,
            options: {
                redirectTo: `${request.nextUrl.origin}/admin/sponsors`
            }
        });

        if (error) {
            console.error('[DEV-LOGIN] Supabase error:', error);
            return NextResponse.json(
                { error: `Supabase error: ${error.message}` },
                { status: 500 }
            );
        }

        if (!data?.properties?.action_link) {
            console.error('[DEV-LOGIN] No action link in response');
            return NextResponse.json(
                { error: 'Failed to generate link' },
                { status: 500 }
            );
        }

        console.log('[DEV-LOGIN] Success! Redirecting to:', data.properties.action_link);

        return NextResponse.json({
            success: true,
            redirectUrl: data.properties.action_link
        });

    } catch (error) {
        console.error('[DEV-LOGIN] Unexpected error:', error);
        return NextResponse.json(
            { error: `Internal error: ${error instanceof Error ? error.message : 'Unknown'}` },
            { status: 500 }
        );
    }
}
