import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Initialize Supabase client
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
)

/**
 * Click Tracking Endpoint
 * 
 * Logs newsletter article clicks to Supabase, then redirects to the original URL.
 * GDPR-compliant: emails are hashed if provided
 * 
 * Query params:
 * - url: Original article URL (required)
 * - s: Segment (builders/innovators/leaders)
 * - d: Newsletter date (YYYY-MM-DD)
 * - t: Article title
 * - e: Email (optional, will be hashed)
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams

    // Extract parameters
    const url = searchParams.get('url')
    const segment = searchParams.get('s')
    const date = searchParams.get('d')
    const title = searchParams.get('t')
    const email = searchParams.get('e') // Optional

    // Validate required params
    if (!url) {
        return NextResponse.json(
            { error: 'Missing required parameter: url' },
            { status: 400 }
        )
    }

    // Extract source domain from URL
    let sourceDomain = ''
    try {
        sourceDomain = new URL(url).hostname.replace('www.', '')
    } catch (e) {
        sourceDomain = 'unknown'
    }

    // Get referrer (where click came from)
    const referrer = request.headers.get('referer') || 'direct'

    // Hash email if provided (GDPR-compliant)
    let subscriberHash = null
    if (email) {
        try {
            const encoder = new TextEncoder()
            const data = encoder.encode(email.toLowerCase().trim())
            const hashBuffer = await crypto.subtle.digest('SHA-256', data)
            const hashArray = Array.from(new Uint8Array(hashBuffer))
            subscriberHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
        } catch (e) {
            console.error('Failed to hash email:', e)
        }
    }

    // Log click to Supabase (asynchronously, don't block redirect)
    try {
        await supabase.from('article_clicks').insert({
            article_url: url,
            article_title: title || null,
            segment: segment || 'unknown',
            newsletter_date: date || new Date().toISOString().split('T')[0],
            subscriber_hash: subscriberHash,
            source_domain: sourceDomain,
            referrer: referrer
        })
    } catch (error) {
        console.error('Failed to log click:', error)
        // Don't block redirect if logging fails
    }

    // Redirect to original URL
    return NextResponse.redirect(url, { status: 307 })
}
