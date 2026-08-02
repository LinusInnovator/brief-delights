'use client';

import { useEffect, useState } from 'react';
import AdminSidebar from '../components/AdminSidebar';

interface SocialPost {
  segment: string;
  segment_name: string;
  segment_emoji: string;
  article_title: string;
  reddit_title: string;
  reddit_body: string;
  reddit_submit_url: string;
  twitter_share_url: string;
  linkedin_share_url: string;
  archive_url: string;
  date: string;
}

export default function SocialPublisherPage() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<string>('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchPosts();
  }, []);

  async function fetchPosts() {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/social-posts');
      const data = await res.json();
      if (data.success) {
        setPosts(data.posts || []);
        setDate(data.date || '');
      }
    } catch (e) {
      console.error('Failed to load social posts:', e);
    } finally {
      setLoading(false);
    }
  }

  function handleCopy(text: string, index: number) {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2500);
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex font-sans text-[#121212]">
      <AdminSidebar />

      <main className="flex-1 ml-[240px] p-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between border-b border-[#E5DCD3] pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-[#8C6D2B] uppercase mb-1">
              <span>📢 Distribution & Growth</span>
              <span>&bull;</span>
              <span>{date || 'Today'}</span>
            </div>
            <h1 className="font-serif text-3xl font-bold text-[#121212] tracking-tight">
              1-Click Reddit & Social Publisher
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              One-click pre-filled launchers to publish today's strategic breakdowns to r/BriefDelights, X/Twitter, and LinkedIn.
            </p>
          </div>

          <button
            onClick={fetchPosts}
            className="px-4 py-2 bg-white border border-[#E5DCD3] hover:border-[#58111A] text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-2 text-[#58111A]"
          >
            🔄 Refresh Breakdown Posts
          </button>
        </div>

        {/* Content State */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block w-8 h-8 border-3 border-[#58111A] border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-sm text-slate-500 font-mono">Loading today's strategic breakdowns...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="p-12 bg-white border border-[#E5DCD3] rounded-xl text-center">
            <span className="text-4xl mb-3 block">📭</span>
            <h3 className="font-serif text-lg font-bold text-[#121212]">No Posts Available For Today</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Run the daily newsletter pipeline to generate today's story selection and strategic summaries.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {posts.map((post, idx) => (
              <div
                key={post.segment}
                className="bg-white border border-[#E5DCD3] rounded-xl shadow-sm overflow-hidden"
              >
                {/* Card Top Banner */}
                <div className="bg-[#3D0A11] px-6 py-4 text-white flex items-center justify-between border-b border-[#C5A059]/20">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{post.segment_emoji}</span>
                    <div>
                      <span className="text-[10px] font-mono tracking-widest text-[#C5A059] uppercase block">
                        Segment #{idx + 1}
                      </span>
                      <h2 className="font-serif text-lg font-bold leading-snug">
                        {post.segment_name}
                      </h2>
                    </div>
                  </div>

                  {/* Direct Action Launchers */}
                  <div className="flex items-center gap-2">
                    <a
                      href={post.reddit_submit_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-[#C5A059] hover:bg-[#D4AF66] text-[#121212] text-xs font-bold rounded-lg shadow transition flex items-center gap-1.5"
                    >
                      ⚡ Open & Post to r/BriefDelights
                    </a>
                  </div>
                </div>

                {/* Card Content Body */}
                <div className="p-6">
                  {/* Article Title */}
                  <div className="mb-4">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-slate-500 block mb-1">
                      Reddit Post Title
                    </label>
                    <div className="p-3 bg-[#FAF8F5] border border-[#E5DCD3] rounded-lg font-serif font-bold text-sm text-[#121212] flex items-center justify-between">
                      <span>{post.reddit_title}</span>
                      <button
                        onClick={() => handleCopy(post.reddit_title, idx * 10)}
                        className="text-xs font-sans text-[#58111A] font-semibold hover:underline ml-4 whitespace-nowrap"
                      >
                        {copiedIndex === idx * 10 ? '✅ Copied Title' : '📋 Copy Title'}
                      </button>
                    </div>
                  </div>

                  {/* Markdown Body Preview */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
                        Markdown Body Preview
                      </label>
                      <button
                        onClick={() => handleCopy(post.reddit_body, idx * 10 + 1)}
                        className="text-xs font-sans text-[#58111A] font-semibold hover:underline"
                      >
                        {copiedIndex === idx * 10 + 1 ? '✅ Copied Body' : '📋 Copy Markdown Body'}
                      </button>
                    </div>
                    <pre className="p-4 bg-[#121316] text-[#E2E8F0] rounded-lg font-mono text-xs leading-relaxed overflow-x-auto max-h-[260px] border border-slate-800">
                      {post.reddit_body}
                    </pre>
                  </div>

                  {/* Multi-Channel Actions Footer */}
                  <div className="pt-4 border-t border-[#E5DCD3] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-4">
                      <span className="text-slate-500 font-medium">Other Channels:</span>
                      <a
                        href={post.twitter_share_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-[#121212] hover:text-[#58111A] flex items-center gap-1 transition"
                      >
                        𝕏 Post to Twitter
                      </a>
                      <span className="text-slate-300">&bull;</span>
                      <a
                        href={post.linkedin_share_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-[#0A66C2] hover:underline flex items-center gap-1"
                      >
                        💼 Post to LinkedIn
                      </a>
                    </div>

                    <a
                      href={post.archive_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-500 hover:text-[#58111A] font-medium hover:underline"
                    >
                      View Live Archive Issue &rarr;
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
