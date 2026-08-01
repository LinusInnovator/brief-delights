import { NextRequest, NextResponse } from 'next/server';

/**
 * Robust Daily Cron Trigger Endpoint
 * 
 * Invoked by Vercel Cron or external scheduler (e.g. Cron-Job.org / Upstash) at 06:00 UTC.
 * Triggers GitHub Actions workflow instantly via GitHub Repository Dispatch API,
 * bypassing GitHub's native cron queue delays.
 */

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        // Verify Vercel Cron or secret authorization if configured
        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 });
        }

        const githubToken = process.env.GH_PAT_TOKEN || process.env.GITHUB_TOKEN;

        if (!githubToken) {
            console.error('Missing GH_PAT_TOKEN environment variable for GitHub dispatch');
            return NextResponse.json({
                warning: 'GH_PAT_TOKEN missing on server — falling back to internal trigger log',
                timestamp: new Date().toISOString()
            }, { status: 200 });
        }

        // Send repository_dispatch event to GitHub API
        const ghResponse = await fetch('https://api.github.com/repos/LinusInnovator/brief-delights/dispatches', {
            method: 'POST',
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'Authorization': `Bearer ${githubToken}`,
                'Content-Type': 'application/json',
                'User-Agent': 'Brief-Delights-Cron-Trigger',
            },
            body: JSON.stringify({
                event_type: 'trigger-daily-newsletter',
                client_payload: {
                    triggered_at: new Date().toISOString(),
                    source: 'vercel-cron-dispatcher'
                }
            })
        });

        if (ghResponse.ok || ghResponse.status === 204) {
            return NextResponse.json({
                success: true,
                message: 'GitHub Actions workflow triggered instantly via repository_dispatch',
                status: ghResponse.status,
                timestamp: new Date().toISOString()
            });
        }

        const ghError = await ghResponse.text();
        console.error('GitHub dispatch failed:', ghError);
        return NextResponse.json({
            error: 'GitHub dispatch failed',
            details: ghError,
            status: ghResponse.status
        }, { status: 500 });

    } catch (error: any) {
        console.error('Cron trigger error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
