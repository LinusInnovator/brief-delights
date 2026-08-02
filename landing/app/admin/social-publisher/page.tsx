'use client';

import { useEffect, useState } from 'react';
import AdminSidebar from '../components/AdminSidebar';
import { IconStreamLeaders, IconStreamBuilders, IconStreamInnovators } from '@/components/EditorialIcons';

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

function getSegmentIcon(segment: string) {
  switch (segment) {
    case 'leaders':
      return <IconStreamLeaders className="w-6 h-6 text-[#C5A059]" />;
    case 'builders':
      return <IconStreamBuilders className="w-6 h-6 text-[#C5A059]" />;
    case 'innovators':
      return <IconStreamInnovators className="w-6 h-6 text-[#C5A059]" />;
    default:
      return null;
  }
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
              <span>Distribution & Growth</span>
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
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            Refresh Breakdown Posts
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
            <div className="w-12 h-12 rounded-full bg-[#FAF8F5] border border-[#E5DCD3] flex items-center justify-center mx-auto mb-3 text-[#58111A]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/></svg>
            </div>
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
                    <div className="w-9 h-9 rounded-lg bg-white/10 border border-[#C5A059]/30 flex items-center justify-center">
                      {getSegmentIcon(post.segment)}
                    </div>
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
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                      Open & Post to r/BriefDelights
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
                        className="text-xs font-sans text-[#58111A] font-semibold hover:underline ml-4 whitespace-nowrap flex items-center gap-1"
                      >
                        {copiedIndex === idx * 10 ? (
                          <>
                            <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                            <span>Copied Title</span>
                          </>
                        ) : (
                          <span>Copy Title</span>
                        )}
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
                        className="text-xs font-sans text-[#58111A] font-semibold hover:underline flex items-center gap-1"
                      >
                        {copiedIndex === idx * 10 + 1 ? (
                          <>
                            <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                            <span>Copied Body</span>
                          </>
                        ) : (
                          <span>Copy Markdown Body</span>
                        )}
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
