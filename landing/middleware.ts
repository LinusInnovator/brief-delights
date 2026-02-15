import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Whitelisted admin emails
const ADMIN_EMAILS = ['linus@disrupt.re', 'linus@delights.pro'];

export async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;

    // Allow access to login page without authentication
    if (pathname === '/admin/login') {
        return NextResponse.next();
    }

    // Only protect other /admin routes
    if (!pathname.startsWith('/admin')) {
        return NextResponse.next();
    }

    // Get session from cookie
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
            headers: {
                cookie: request.headers.get('cookie') || ''
            }
        }
    });

    const { data: { session } } = await supabase.auth.getSession();

    // No session? Redirect to login
    if (!session) {
        const loginUrl = new URL('/admin/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Check if email is whitelisted
    const userEmail = session.user.email;
    if (!userEmail || !ADMIN_EMAILS.includes(userEmail)) {
        return new NextResponse('Unauthorized', { status: 403 });
    }

    // All good, proceed
    return NextResponse.next();
}

export const config = {
    matcher: '/admin/:path*',
};
