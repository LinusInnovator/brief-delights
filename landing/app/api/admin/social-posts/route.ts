import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const projectRoot = path.resolve(process.cwd(), '..');
    const tmpDir = path.join(projectRoot, '.tmp');

    const segments = [
      { id: 'leaders', name: 'Leaders & Strategy', emoji: '💼' },
      { id: 'builders', name: 'Engineering & Tech Stack', emoji: '🛠️' },
      { id: 'innovators', name: 'AI Research & Signals', emoji: '🚀' }
    ];

    const posts = [];

    for (const seg of segments) {
      let articles: any[] = [];
      const summariesPath = path.join(tmpDir, `summaries_${seg.id}_${today}.json`);

      if (fs.existsSync(summariesPath)) {
        try {
          const content = JSON.parse(fs.readFileSync(summariesPath, 'utf8'));
          articles = content.articles || [];
        } catch (e) {
          console.error(`Error reading ${summariesPath}:`, e);
        }
      } else {
        // Search for recent summaries file fallback
        try {
          const files = fs.readdirSync(tmpDir).filter(f => f.startsWith(`summaries_${seg.id}_`));
          if (files.length > 0) {
            files.sort().reverse();
            const latestFile = path.join(tmpDir, files[0]);
            const content = JSON.parse(fs.readFileSync(latestFile, 'utf8'));
            articles = content.articles || [];
          }
        } catch (e) {
          console.error(`Fallback search error for ${seg.id}:`, e);
        }
      }

      if (articles.length > 0) {
        const top = articles[0];
        const title = top.title || 'Daily Tech & AI Strategic Intelligence';
        const summary = top.summary || '';
        const keyTakeaway = top.key_takeaway || top.summary || '';
        let whyItMatters = (top.why_it_matters || top.why_this_matters || '').replace(/^(why\s+(it|this)\s+matters:?\s*|strategic\s+takeaway\s+(for\s+[^:]+:?\s*)?)+/gi, '').trim();

        if (!whyItMatters || whyItMatters.toLowerCase() === keyTakeaway.toLowerCase()) {
          if (seg.id === 'leaders') {
            whyItMatters = `Executive & Business Impact: ${keyTakeaway} — Forces decision-makers to evaluate operational risk and vendor reliance.`;
          } else if (seg.id === 'builders') {
            whyItMatters = `Engineering & Stack Impact: ${keyTakeaway} — Directly impacts architecture design, latency budgets, and tooling integration.`;
          } else {
            whyItMatters = `Frontier & AI Research Impact: ${keyTakeaway} — Accelerates state-of-the-art capabilities and challenges existing model deployment benchmarks.`;
          }
        }

        const redditTitle = `${seg.emoji} [${seg.name}] ${title} — Strategic Breakdown (${today})`;
        const sourceName = top.source || 'Research';

        const redditBody = `${title}

Source: ${sourceName} | Category: ${seg.name} | Date: ${today}

📌 WHAT HAPPENED
${summary}

💡 KEY TAKEAWAY
• ${keyTakeaway}

🎯 WHY IT MATTERS
• ${whyItMatters}

📰 ABOUT BRIEF DELIGHTS
We scan 1,340+ tech & AI articles daily across engineering, strategy, and frontier research so you don't have to.

• Read full daily issue: https://brief.delights.pro/archive/${today}-${seg.id}
• Join free for daily email briefs: https://brief.delights.pro`;

        const encodedTitle = encodeURIComponent(redditTitle);
        const encodedBody = encodeURIComponent(redditBody);
        const redditSubmitUrl = `https://www.reddit.com/r/BriefDelights/submit?title=${encodedTitle}&text=${encodedBody}`;
        const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${redditTitle}\n\nRead breakdown: `)}&url=${encodeURIComponent(`https://brief.delights.pro/archive/${today}-${seg.id}`)}`;
        const linkedinShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://brief.delights.pro/archive/${today}-${seg.id}`)}`;

        posts.push({
          segment: seg.id,
          segment_name: seg.name,
          segment_emoji: seg.emoji,
          article_title: title,
          reddit_title: redditTitle,
          reddit_body: redditBody,
          reddit_submit_url: redditSubmitUrl,
          twitter_share_url: twitterShareUrl,
          linkedin_share_url: linkedinShareUrl,
          archive_url: `https://brief.delights.pro/archive/${today}-${seg.id}`,
          date: today
        });
      }
    }

    return NextResponse.json({
      success: true,
      date: today,
      posts
    });
  } catch (error: any) {
    console.error('Failed to generate social posts:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
