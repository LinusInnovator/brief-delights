import { NextRequest, NextResponse } from 'next/server';

/**
 * Click Tracking Redirect
 * 
 * When users click article links in newsletter, they go through this endpoint first.
 * This allows us to track clicks before redirecting to the actual article.
 * 
 * GDPR Note: Resend webhook will handle the actual storage. This just redirects.
 * 
 * Example: https://brief.delights.pro/track?url=https://docker.com/blog&segment=builders
 */

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const targetUrl = searchParams.get('url');
        const segment = searchParams.get('segment');

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

        // Redirect to actual article
        // The click tracking happens via Resend webhook, not here
        // This keeps the redirect fast and doesn't collect any data server-side
        return NextResponse.redirect(targetUrl);

    } catch (error) {
        console.error('Track redirect error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
