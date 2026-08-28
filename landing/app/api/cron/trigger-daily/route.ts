import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // Check cron authorization if configured
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date().toISOString().split('T')[0];
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://brief.delights.pro';
    const leadersUrl = `${baseUrl}/newsletters/newsletter_leaders_${today}.html`;

    // Check if today's newsletter is already published
    const checkRes = await fetch(leadersUrl, { method: 'HEAD', cache: 'no-store' });
    if (checkRes.ok) {
      return NextResponse.json({
        status: 'OK',
        message: `Today's dispatches (${today}) are already published. No backup trigger required.`,
        today,
      });
    }

    // Trigger GitHub repository_dispatch to wake up pipeline
    const githubToken = process.env.GITHUB_PAT || process.env.INTERNAL_GOD_KEY;
    if (!githubToken) {
      return NextResponse.json({
        status: 'WARNING',
        message: `Today's dispatches missing for ${today}, but GITHUB_PAT is not set. Unable to auto-trigger dispatch.`,
      });
    }

    const dispatchRes = await fetch(
      'https://api.github.com/repos/LinusInnovator/brief-delights/dispatches',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_type: 'trigger-daily-newsletter',
          client_payload: { source: 'vercel_cron_backup', date: today },
        }),
      }
    );

    if (dispatchRes.ok) {
      return NextResponse.json({
        status: 'BACKUP_TRIGGERED',
        message: `Fired GitHub repository_dispatch for ${today} backup run.`,
      });
    } else {
      const errText = await dispatchRes.text();
      return NextResponse.json(
        { status: 'ERROR', message: `GitHub dispatch failed: ${errText}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
