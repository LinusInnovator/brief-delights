import Link from 'next/link';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const { slug } = resolvedParams;

  const match = slug.match(/^(\d{4}-\d{2}-\d{2})-(\w+)$/);
  if (!match) return {};

  const [, date, segment] = match;
  const capitalizedSegment = segment.charAt(0).toUpperCase() + segment.slice(1);
  const title = `${capitalizedSegment} Brief (${date}) — Daily Tech & AI Intelligence`;
  const description = `Read the ${capitalizedSegment} Edition of Brief Delights for ${date}. Role-curated AI research, developer tooling benchmarks, and market strategy takeaways.`;
  const canonicalUrl = `https://brief.delights.pro/archive/${slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'Brief Delights',
      type: 'article',
      publishedTime: date,
      images: [
        {
          url: 'https://brief.delights.pro/bd_seal_logo.png',
          width: 1200,
          height: 630,
          alt: 'Brief Delights - Knowledge Refined',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['https://brief.delights.pro/bd_seal_logo.png'],
    },
  };
}

function isLockedDate(dateStr: string): boolean {
  try {
    const editionDate = new Date(dateStr + 'T00:00:00Z');
    const now = new Date();
    const diffDays = (now.getTime() - editionDate.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays < 2.5; // Lock editions from last ~2 days
  } catch {
    return false;
  }
}

export default async function NewsletterSlugPage({ params }: PageProps) {
  const resolvedParams = await params;
  const { slug } = resolvedParams;

  // Format: YYYY-MM-DD-segment (e.g. 2026-03-31-leaders)
  const match = slug.match(/^(\d{4}-\d{2}-\d{2})-(\w+)$/);
  if (!match) {
    notFound();
  }

  const [, date, segment] = match;
  const filename = `newsletter_${segment}_${date}.html`;
  const filePath = join(process.cwd(), 'public', 'newsletters', filename);

  if (!existsSync(filePath)) {
    notFound();
  }

  const fullHtml = readFileSync(filePath, 'utf-8');
  const locked = isLockedDate(date);

  // If locked, truncate content and show preview blur
  let bodyContent = fullHtml;
  if (locked) {
    // Keep first 1500 characters or head/style tags for styling
    const styleMatch = fullHtml.match(/<style[\s\S]*?<\/style>/gi);
    const styles = styleMatch ? styleMatch.join('\n') : '';
    
    // Extract early body preview
    const bodyMatch = fullHtml.match(/<body[\s\S]*?>([\s\S]*?)<\/body>/i);
    const rawBody = bodyMatch ? bodyMatch[1] : fullHtml;
    const previewBody = rawBody.substring(0, 800);

    bodyContent = `
      <html>
        <head>${styles}</head>
        <body style="font-family: system-ui, sans-serif; background: #f9fafb; margin:0; padding:20px;">
          <div>${previewBody}...</div>
        </body>
      </html>
    `;
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    'headline': `${segment.charAt(0).toUpperCase() + segment.slice(1)} Brief (${date}) — Daily Tech & AI Intelligence`,
    'datePublished': date,
    'inLanguage': 'en-US',
    'author': {
      '@type': 'Organization',
      'name': 'Brief Delights',
      'url': 'https://brief.delights.pro',
    },
    'publisher': {
      '@type': 'Organization',
      'name': 'Brief Delights',
      'logo': {
        '@type': 'ImageObject',
        'url': 'https://brief.delights.pro/bd_seal_logo.png',
      },
    },
    'mainEntityOfPage': {
      '@type': 'WebPage',
      '@id': `https://brief.delights.pro/archive/${slug}`,
    },
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Top Banner */}
      <header className="bg-black text-white py-3 px-6 flex justify-between items-center text-sm sticky top-0 z-50">
        <Link href="/archive" className="hover:text-gray-300 font-medium">
          ← Back to Archive
        </Link>
        <div className="flex items-center gap-4">
          <span className="capitalize text-gray-400">
            {segment} • {date}
          </span>
          <Link
            href="/"
            className="bg-white text-black px-4 py-1.5 rounded-full font-bold text-xs hover:bg-gray-200 transition"
          >
            Subscribe Free
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto w-full px-4 py-8 flex-1 relative">
        {!locked ? (
          <div
            className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-8 overflow-hidden"
            dangerouslySetInnerHTML={{ __html: fullHtml }}
          />
        ) : (
          <div className="relative bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-8 overflow-hidden min-h-[500px]">
            {/* Blurred Preview Content */}
            <div
              className="select-none pointer-events-none opacity-40 blur-[3px]"
              dangerouslySetInnerHTML={{ __html: bodyContent }}
            />

            {/* Lock Glassmorphism Overlay - Knowledge Refined Brand */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-white/95 to-white flex flex-col items-center justify-center p-6 text-center z-10 backdrop-blur-md">
              <div className="w-16 h-16 bg-[#58111A]/10 border border-[#58111A]/20 rounded-2xl flex items-center justify-center shadow-sm mb-5">
                <img src="/bd_seal_logo.png" alt="Brief Delights Seal" className="w-10 h-10 object-contain" />
              </div>
              <h1 className="text-2xl md:text-3xl font-serif font-bold text-[#121212] mb-2">
                Subscriber-Only Intelligence
              </h1>
              <p className="text-gray-600 max-w-md mb-6 text-sm leading-relaxed">
                Today&apos;s and yesterday&apos;s editions are reserved for active subscribers.
                Subscribe free now to read this issue and receive future daily letters.
              </p>

              <form action="/" method="GET" className="w-full max-w-sm flex flex-col gap-3">
                <input
                  type="email"
                  placeholder="Enter your work email"
                  className="w-full px-5 py-3.5 border-2 border-gray-200 rounded-xl focus:border-[#58111A] focus:outline-none text-sm text-gray-900 bg-white"
                  required
                />
                <button
                  type="submit"
                  className="w-full bg-[#121212] text-white font-bold py-4 px-6 rounded-xl hover:bg-[#58111A] transition text-sm shadow-lg shadow-[#58111A]/10"
                >
                  Subscribe Free to Read Latest Issue &rarr;
                </button>
              </form>

              <p className="text-xs text-gray-400 mt-4 font-mono">
                Editions older than 2 days automatically unlock for public archive browsing.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
