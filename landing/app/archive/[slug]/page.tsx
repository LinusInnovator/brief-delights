import Link from 'next/link';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { notFound } from 'next/navigation';

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ slug: string }>;
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
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

            {/* Lock Glassmorphism Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-white/90 to-white flex flex-col items-center justify-center p-6 text-center z-10 backdrop-blur-sm">
              <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg mb-4 text-white">
                🔒
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                Subscriber Only Access
              </h1>
              <p className="text-gray-600 max-w-md mb-6 text-sm md:text-base leading-relaxed">
                Today&apos;s and yesterday&apos;s editions are reserved for active subscribers.
                Subscribe free now to read the full issue and get future letters daily!
              </p>

              <form action="/" method="GET" className="w-full max-w-sm flex flex-col gap-3">
                <input
                  type="email"
                  placeholder="Enter your work email"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm text-gray-900"
                  required
                />
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-3.5 px-6 rounded-xl hover:opacity-95 transition text-sm shadow-md"
                >
                  Subscribe Free to Read Latest News →
                </button>
              </form>

              <p className="text-xs text-gray-400 mt-4">
                Editions older than 2 days automatically unlock for public archive browsing.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
