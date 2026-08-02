import Link from 'next/link';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ArchiveLockGate from './ArchiveLockGate';

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
        <ArchiveLockGate
          fullHtml={fullHtml}
          bodyContent={fullHtml}
          segment={segment}
          date={date}
        />
      </main>
    </div>
  );
}
