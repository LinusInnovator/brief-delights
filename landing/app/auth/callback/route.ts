import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const type = requestUrl.searchParams.get('type');

    if (code) {
        const supabase = await createClient();
        await supabase.auth.exchangeCodeForSession(code);
    }

    // If this is a password recovery, redirect to reset page
    if (type === 'recovery') {
        return NextResponse.redirect(new URL('/auth/reset-password', requestUrl.origin));
    }

    // Otherwise redirect to admin
    return NextResponse.redirect(new URL('/admin/sponsors', requestUrl.origin));
}
