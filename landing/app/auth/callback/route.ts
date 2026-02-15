import { createClient } from '@/lib/supabase/client';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');

    // Check for recovery type in both query params and hash
    const typeParam = requestUrl.searchParams.get('type');

    // Supabase recovery links often include type in the hash fragment
    // We need to check if this is a recovery flow
    const isRecovery = typeParam === 'recovery' || requestUrl.hash.includes('type=recovery');

    if (code) {
        const supabase = createClient();
        await supabase.auth.exchangeCodeForSession(code);
    }

    // If this is a password recovery, redirect to reset page
    if (isRecovery) {
        return NextResponse.redirect(new URL('/auth/reset-password', requestUrl.origin));
    }

    // Otherwise redirect to admin dashboard
    return NextResponse.redirect(new URL('/admin/sponsors', requestUrl.origin));
}
