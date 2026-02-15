import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// TODO: Re-enable auth check after fixing session persistence
// Temporarily disabled to allow dashboard access

export async function middleware(request: NextRequest) {
    // Allow all requests through for now
    return NextResponse.next();
}

export const config = {
    matcher: '/admin/:path*',
};
