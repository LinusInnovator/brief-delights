import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// In-memory cache for AB config (refreshed every 5 minutes)
let abConfigCache: ABConfig | null = null;
let abConfigLastFetch = 0;
const AB_CONFIG_TTL = 5 * 60 * 1000; // 5 minutes

interface ABVariant {
    slot: string;
    weight: number;
    content: Record<string, string>;
}

interface ABConfig {
    experiment_id: string;
    active: boolean;
    variants: Record<string, ABVariant>;
}

async function getABConfig(origin: string): Promise<ABConfig | null> {
    const now = Date.now();
    if (abConfigCache && now - abConfigLastFetch < AB_CONFIG_TTL) {
        return abConfigCache;
    }

    try {
        const res = await fetch(`${origin}/ab-config.json`, { cache: 'no-store' });
        if (!res.ok) return null;
        abConfigCache = await res.json();
        abConfigLastFetch = now;
        return abConfigCache;
    } catch {
        return abConfigCache; // Return stale cache on error
    }
}

function pickVariant(variants: Record<string, ABVariant>): string {
    const entries = Object.entries(variants);
    const totalWeight = entries.reduce((sum, [, v]) => sum + v.weight, 0);
    let random = Math.random() * totalWeight;

    for (const [id, variant] of entries) {
        random -= variant.weight;
        if (random <= 0) return id;
    }

    // Fallback to first variant (champion)
    return entries[0][0];
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Admin routes — allow through (existing behavior)
    if (pathname.startsWith('/admin')) {
        return NextResponse.next();
    }

    // A/B testing only applies to the homepage
    if (pathname !== '/') {
        return NextResponse.next();
    }

    try {
        const config = await getABConfig(request.nextUrl.origin);
        if (!config || !config.active) {
            return NextResponse.next();
        }

        // Check for existing variant cookie
        let variantId = request.cookies.get('ab_variant')?.value;
        let isNewAssignment = false;

        // Validate the cookie variant still exists in config
        if (!variantId || !config.variants[variantId]) {
            variantId = pickVariant(config.variants);
            isNewAssignment = true;
        }

        const variant = config.variants[variantId];
        if (!variant) {
            return NextResponse.next();
        }

        // Pass variant data to the page via headers
        const response = NextResponse.next();
        response.headers.set('x-ab-variant-id', variantId);
        response.headers.set('x-ab-experiment-id', config.experiment_id);
        response.headers.set('x-ab-variant-content', JSON.stringify(variant.content));

        // Set cookie for consistency (30-day expiry)
        if (isNewAssignment) {
            response.cookies.set('ab_variant', variantId, {
                maxAge: 30 * 24 * 60 * 60, // 30 days
                path: '/',
                sameSite: 'lax',
            });
        }

        return response;
    } catch {
        // On any error, pass through without A/B
        return NextResponse.next();
    }
}

export const config = {
    matcher: ['/', '/admin/:path*'],
};
