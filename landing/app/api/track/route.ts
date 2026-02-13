import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

/**
 * Click Tracking API - GDPR Compliant
 * 
 * Logs newsletter article clicks to Supabase and redirects to original article.
 * 
 * Query params:
 * - url: Original article URL (required)
 * - s: Segment (builders/leaders/innovators)
 * - d: Newsletter date (YYYY-MM-DD)
 * - t: Article title
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');
    const segment = searchParams.get('s');
    const date = searchParams.get('d');
    const title = searchParams.get('t');

    // Validate required parameter
    if (!url) {
        return new NextResponse('Missing required parameter: url', { status: 400 });
    }

    // Validate URL format
    try {
        new URL(url);
    } catch {
        return new NextResponse('Invalid URL format', { status: 400 });
    }

    // Log click to Supabase (async, non-blocking)
    // We don't await this to keep redirect fast
    logClick({
        articleUrl: url,
        articleTitle: title || null,
        segment: segment || 'unknown',
        newsletterDate: date || new Date().toISOString().split('T')[0],
        referrer: request.headers.get('referer') || 'email',
    }).catch(error => {
        console.error('Failed to log click:', error);
        // Don't block redirect on logging failure
    });

    // Redirect to original article (fast, always succeeds)
    return NextResponse.redirect(url, 302);
}

/**
 * Log click to Supabase article_clicks table
 */
async function logClick(data: {
    articleUrl: string;
    articleTitle: string | null;
    segment: string;
    newsletterDate: string;
    referrer: string;
}) {
    try {
        // Extract source domain from URL
        const sourceDomain = new URL(data.articleUrl).hostname;

        // Insert into article_clicks table
        const { error } = await supabase
            .from('article_clicks')
            .insert({
                article_url: data.articleUrl,
                article_title: data.articleTitle,
                segment: data.segment,
                newsletter_date: data.newsletterDate,
                source_domain: sourceDomain,
                referrer: data.referrer,
                // subscriber_hash: null (can be added later via Resend webhooks)
            });

        if (error) {
            console.error('Supabase insert error:', error);
            throw error;
        }

        console.log(`✅ Logged click: ${data.segment} → ${sourceDomain}`);
    } catch (error) {
        console.error('Error logging click:', error);
        throw error;
    }
}
