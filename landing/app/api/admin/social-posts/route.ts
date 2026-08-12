import { NextResponse, NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function extractPostsFromNewsletterHtml(html: string, dateStr: string, segId: string, segName: string, segEmoji: string) {
  // Simple regex parser for newsletter HTML
  let title = 'Daily Strategic Intelligence';
  const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i) || html.match(/<h2[^>]*>(.*?)<\/h2>/i);
  if (h1Match) {
    title = h1Match[1].replace(/<[^>]+>/g, '').trim();
  }

  // Extract first two paragraph texts for takeaway & why it matters
  const pMatches = Array.from(html.matchAll(/<p[^>]*>(.*?)<\/p>/gi)).map(m => m[1].replace(/<[^>]+>/g, '').trim()).filter(p => p.length > 20);
  
  const summary = pMatches[0] || `Strategic analysis and breakdown for ${segName} on ${dateStr}.`;
  const keyTakeaway = pMatches[1] || summary;
  const whyItMatters = pMatches[2] || `Directly impacts organizational roadmap, technology stack, and competitive strategy for ${segName}.`;

  const redditTitle = `${segEmoji} [${segName}] ${title} — Strategic Breakdown (${dateStr})`;
  const redditBody = `${title}

Source: Brief Delights Editorial | Category: ${segName} | Date: ${dateStr}

📌 WHAT HAPPENED
${summary}

💡 KEY TAKEAWAY
• ${keyTakeaway}

🎯 WHY IT MATTERS
• ${whyItMatters}

📰 ABOUT BRIEF DELIGHTS
We scan 1,340+ tech & AI articles daily across engineering, strategy, and frontier research so you don't have to.

• Read full daily issue: https://brief.delights.pro/archive/${dateStr}-${segId}
• Join free for daily email briefs: https://brief.delights.pro`;

  const encodedTitle = encodeURIComponent(redditTitle);
  const encodedBody = encodeURIComponent(redditBody);
  const redditSubmitUrl = `https://www.reddit.com/r/BriefDelights/submit?title=${encodedTitle}&text=${encodedBody}`;
  const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${redditTitle}\n\nRead breakdown: `)}&url=${encodeURIComponent(`https://brief.delights.pro/archive/${dateStr}-${segId}`)}`;
  const linkedinShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://brief.delights.pro/archive/${dateStr}-${segId}`)}`;

  return {
    segment: segId,
    segment_name: segName,
    segment_emoji: segEmoji,
    article_title: title,
    reddit_title: redditTitle,
    reddit_body: redditBody,
    reddit_submit_url: redditSubmitUrl,
    twitter_share_url: twitterShareUrl,
    linkedin_share_url: linkedinShareUrl,
    archive_url: `https://brief.delights.pro/archive/${dateStr}-${segId}`,
    date: dateStr
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedDate = searchParams.get('date');
    const today = new Date().toISOString().split('T')[0];

    const segments = [
      { id: 'leaders', name: 'Leaders & Strategy', emoji: '💼' },
      { id: 'builders', name: 'Engineering & Tech Stack', emoji: '🛠️' },
      { id: 'innovators', name: 'AI Research & Signals', emoji: '🚀' }
    ];

    // Collect all available historical dates
    const dateSet = new Set<string>();
    dateSet.add(today);

    const publicNewslettersDir = path.join(process.cwd(), 'public', 'newsletters');
    if (fs.existsSync(publicNewslettersDir)) {
      const files = fs.readdirSync(publicNewslettersDir);
      for (const file of files) {
        const match = file.match(/newsletter_[^_]+_(\d{4}-\d{2}-\d{2})\.html/);
        if (match) {
          dateSet.add(match[1]);
        }
      }
    }

    const tmpDir = path.resolve(process.cwd(), '..', '.tmp');
    if (fs.existsSync(tmpDir)) {
      const files = fs.readdirSync(tmpDir);
      for (const file of files) {
        const match = file.match(/_(\d{4}-\d{2}-\d{2})\.(json|html)/);
        if (match) {
          dateSet.add(match[1]);
        }
      }
    }

    const availableDates = Array.from(dateSet).sort().reverse();
    
    // Target date logic: requestedDate or today or latest available date
    let targetDate = requestedDate || today;

    // Check if target date has static file
    const staticFilePath = path.join(process.cwd(), 'public', 'data', 'social_posts_latest.json');
    if ((!requestedDate || requestedDate === today) && fs.existsSync(staticFilePath)) {
      try {
        const fileContent = JSON.parse(fs.readFileSync(staticFilePath, 'utf8'));
        if (fileContent && Array.isArray(fileContent.posts) && fileContent.posts.length > 0) {
          return NextResponse.json({
            success: true,
            date: fileContent.date || today,
            available_dates: availableDates,
            posts: fileContent.posts
          });
        }
      } catch (e) {
        console.error('Error reading static social_posts_latest.json:', e);
      }
    }

    // Attempt loading summaries or html for targetDate (or fallback to latest available)
    let posts: any[] = [];
    
    // Function to generate posts for a specific date
    const buildPostsForDate = (dateStr: string) => {
      const datePosts = [];
      for (const seg of segments) {
        // Try .tmp summaries first
        const summariesPath = path.join(tmpDir, `summaries_${seg.id}_${dateStr}.json`);
        let articles: any[] = [];
        if (fs.existsSync(summariesPath)) {
          try {
            const content = JSON.parse(fs.readFileSync(summariesPath, 'utf8'));
            articles = content.articles || [];
          } catch (e) {}
        }

        if (articles.length > 0) {
          const top = articles[0];
          const title = top.title || 'Daily Tech & AI Strategic Intelligence';
          const summary = top.summary || '';
          const keyTakeaway = top.key_takeaway || top.summary || '';
          let whyItMatters = (top.why_it_matters || top.why_this_matters || '').replace(/^(why\s+(it|this)\s+matters:?\s*|strategic\s+takeaway\s+(for\s+[^:]+:?\s*)?)+/gi, '').trim();

          if (!whyItMatters || whyItMatters.toLowerCase() === keyTakeaway.toLowerCase()) {
            whyItMatters = `Strategic Impact: ${keyTakeaway} — Directly impacts execution, architecture, and technology decisions.`;
          }

          const redditTitle = `${seg.emoji} [${seg.name}] ${title} — Strategic Breakdown (${dateStr})`;
          const sourceName = top.source || 'Research';
          const redditBody = `${title}

Source: ${sourceName} | Category: ${seg.name} | Date: ${dateStr}

📌 WHAT HAPPENED
${summary}

💡 KEY TAKEAWAY
• ${keyTakeaway}

🎯 WHY IT MATTERS
• ${whyItMatters}

📰 ABOUT BRIEF DELIGHTS
We scan 1,340+ tech & AI articles daily across engineering, strategy, and frontier research so you don't have to.

• Read full daily issue: https://brief.delights.pro/archive/${dateStr}-${seg.id}
• Join free for daily email briefs: https://brief.delights.pro`;

          const encodedTitle = encodeURIComponent(redditTitle);
          const encodedBody = encodeURIComponent(redditBody);

          datePosts.push({
            segment: seg.id,
            segment_name: seg.name,
            segment_emoji: seg.emoji,
            article_title: title,
            reddit_title: redditTitle,
            reddit_body: redditBody,
            reddit_submit_url: `https://www.reddit.com/r/BriefDelights/submit?title=${encodedTitle}&text=${encodedBody}`,
            twitter_share_url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${redditTitle}\n\nRead breakdown: `)}&url=${encodeURIComponent(`https://brief.delights.pro/archive/${dateStr}-${seg.id}`)}`,
            linkedin_share_url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://brief.delights.pro/archive/${dateStr}-${seg.id}`)}`,
            archive_url: `https://brief.delights.pro/archive/${dateStr}-${seg.id}`,
            date: dateStr
          });
        } else {
          // Try newsletter HTML file from public/newsletters/
          const htmlPath = path.join(publicNewslettersDir, `newsletter_${seg.id}_${dateStr}.html`);
          if (fs.existsSync(htmlPath)) {
            try {
              const htmlContent = fs.readFileSync(htmlPath, 'utf8');
              const post = extractPostsFromNewsletterHtml(htmlContent, dateStr, seg.id, seg.name, seg.emoji);
              datePosts.push(post);
            } catch (e) {}
          }
        }
      }
      return datePosts;
    };

    posts = buildPostsForDate(targetDate);

    // If requested date returned 0 posts and no specific date was queried, try available dates in reverse chronological order
    if (posts.length === 0 && !requestedDate) {
      for (const fallbackDate of availableDates) {
        posts = buildPostsForDate(fallbackDate);
        if (posts.length > 0) {
          targetDate = fallbackDate;
          break;
        }
      }
    }

    return NextResponse.json({
      success: true,
      date: targetDate,
      available_dates: availableDates,
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
