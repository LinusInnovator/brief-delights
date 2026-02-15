import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

/**
 * GDPR-Compliant Resend Webhook Handler
 * 
 * Privacy Principles:
 * 1. Email Hashing - Never store raw emails, use SHA-256 hashes
 * 2. Data Minimization - Only store what's needed (segment, URL, timestamp)
 * 3. No IP Storage - Don't track user location/device
 * 4. 90-Day Retention - Auto-delete after 90 days (handled by DB schema)
 * 5. Purpose Limitation - Only for aggregate content analytics
 */

// Hash email for GDPR compliance
function hashEmail(email: string): string {
    return crypto
        .createHash('sha256')
        .update(email.toLowerCase().trim())
        .digest('hex');
}

// Extract segment from email metadata or tags
function extractSegment(data: any): string | null {
    // Check for segment in tags or metadata
    if (data.tags?.includes('builders')) return 'builders';
    if (data.tags?.includes('innovators')) return 'innovators';
    if (data.tags?.includes('leaders')) return 'leaders';

    // Check metadata if available
    if (data.metadata?.segment) return data.metadata.segment;

    return null;
}

// Extract article info from clicked URL
function parseArticleUrl(url: string): { article_url: string; source_domain: string } | null {
    try {
        // URLs in newsletter are tracking links, extract actual article URL
        // Format: https://brief.delights.pro/track?url=<article_url>&segment=<segment>
        const parsedUrl = new URL(url);

        if (parsedUrl.pathname === '/track') {
            const articleUrl = parsedUrl.searchParams.get('url');
            if (articleUrl) {
                const articleDomain = new URL(articleUrl).hostname;
                return {
                    article_url: articleUrl,
                    source_domain: articleDomain
                };
            }
        }

        return null;
    } catch {
        return null;
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_KEY!
        );

        const body = await request.json();
        const { type, data } = body;

        // Verify webhook signature (recommended for production)
        // const signature = request.headers.get('resend-signature');
        // if (!verifySignature(signature, body)) {
        //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        // }

        // Extract GDPR-compliant data
        const emailHash = data.email ? hashEmail(data.email) : null;
        const segment = extractSegment(data);
        const emailId = data.email_id || data.id;

        // Handle different event types
        switch (type) {
            case 'email.sent':
            case 'email.delivered':
            case 'email.opened':
                // Store basic email event (no click URL)
                await supabase.from('email_events').insert({
                    event_type: type,
                    email_id: emailId,
                    subscriber_hash: emailHash,
                    segment: segment,
                    clicked_url: null,
                    // NOT storing: IP address, user agent, device info
                });
                break;

            case 'email.clicked':
                // This is the important one - article clicks
                const clickedUrl = data.click?.link || data.url;

                if (clickedUrl) {
                    // Store general click event
                    await supabase.from('email_events').insert({
                        event_type: type,
                        email_id: emailId,
                        subscriber_hash: emailHash,
                        segment: segment,
                        clicked_url: clickedUrl,
                    });

                    // If it's an article click, store in article_clicks for analytics
                    const articleInfo = parseArticleUrl(clickedUrl);
                    if (articleInfo && segment) {
                        await supabase.from('article_clicks').insert({
                            article_url: articleInfo.article_url,
                            article_title: null, // Will be enriched later from article metadata
                            segment: segment,
                            newsletter_date: new Date().toISOString().split('T')[0],
                            subscriber_hash: emailHash,
                            source_domain: articleInfo.source_domain,
                            referrer: null,
                            // NOT storing: IP, user agent, device fingerprint
                        });
                    }
                }
                break;

            case 'email.bounced':
            case 'email.complained':
                // Track deliverability issues (no PII needed)
                await supabase.from('email_events').insert({
                    event_type: type,
                    email_id: emailId,
                    subscriber_hash: emailHash, // Still hash even for bounces
                    segment: segment,
                });
                break;

            default:
                console.log(`Unknown event type: ${type}`);
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Webhook error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Optional: Webhook signature verification for production
function verifySignature(signature: string | null, body: any): boolean {
    if (!signature) return false;

    const secret = process.env.RESEND_WEBHOOK_SECRET;
    if (!secret) return true; // Skip verification in dev if no secret set

    // Implement Resend's signature verification
    // This depends on Resend's specific signing method
    return true; // Placeholder
}
