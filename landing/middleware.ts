import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

// Whitelisted admin emails
const ADMIN_EMAILS = ['linus@disrupt.re', 'linus@delights.pro'];

export async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;

    // Allow access to login page and auth callback without authentication
    if (pathname === '/admin/login' || pathname.startsWith('/auth/')) {
        return NextResponse.next();
    }

    // Only protect other /admin routes
    if (!pathname.startsWith('/admin')) {
        return NextResponse.next();
    }

    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    });
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    });
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value: '',
                        ...options,
                    });
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    response.cookies.set({
                        name,
                        value: '',
                        ...options,
                    });
                },
            },
        }
    );

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
    return response;
}

export const config = {
    matcher: '/admin/:path*',
};
