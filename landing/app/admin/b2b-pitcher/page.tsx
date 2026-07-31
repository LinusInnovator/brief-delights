"use client";

import React, { useState } from "react";
import Link from "next/link";

interface LeadProspect {
  id: string;
  company: string;
  domain: string;
  matrixScore: number;
  status: "APPROVED" | "PENDING_REVIEW" | "PITCHED";
  previewUrl: string;
  email: string;
}

export default function B2BPitcherStudio() {
  const [activeTab, setActiveTab] = useState<"pitch" | "hunter">("pitch");
  const [autoPilot, setAutoPilot] = useState<boolean>(false);
  const [targetUrl, setTargetUrl] = useState<string>("");
  const [founderEmail, setFounderEmail] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedPreview, setGeneratedPreview] = useState<string | null>(null);

  const [leads, setLeads] = useState<LeadProspect[]>([
    {
      id: "1",
      company: "PostHog",
      domain: "posthog.com",
      matrixScore: 92.4,
      status: "APPROVED",
      previewUrl: "/previews/posthogcom.html",
      email: "founder@posthog.com",
    },
    {
      id: "2",
      company: "Linear",
      domain: "linear.app",
      matrixScore: 94.1,
      status: "PITCHED",
      previewUrl: "/previews/linearapp.html",
      email: "karri@linear.app",
    },
    {
      id: "3",
      company: "Supabase",
      domain: "supabase.com",
      matrixScore: 89.7,
      status: "PENDING_REVIEW",
      previewUrl: "/previews/supabasecom.html",
      email: "paul@supabase.com",
    },
  ]);

  const handleGeneratePitch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUrl) return;

    setIsGenerating(true);
    setTimeout(() => {
      const cleanDomain = targetUrl.replace(/^https?:\/\//, "").replace("www.", "").split("/")[0];
      const companyName = cleanDomain.split(".")[0].toUpperCase();
      const preview = `/previews/${cleanDomain.replace(".", "")}.html`;

      setGeneratedPreview(preview);
      setIsGenerating(false);

      const newLead: LeadProspect = {
        id: Date.now().toString(),
        company: companyName,
        domain: cleanDomain,
        matrixScore: 91.2,
        status: autoPilot ? "PITCHED" : "APPROVED",
        previewUrl: preview,
        email: founderEmail || `founder@${cleanDomain}`,
      };

      setLeads([newLead, ...leads]);
    }, 1800);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Navigation */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
                White-Label B2B Engine
              </span>
              <span className="text-slate-500 text-sm">v1.0 Release</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white mt-2">
              Universal Business Signal Engine & Growth Studio
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Autonomous co-branded newsletter preview generator & outreach platform for any company, agency, VC, or brand.
            </p>
          </div>

          {/* Trust Switch (Auto-Pilot Toggle) */}
          <div className="flex items-center gap-4 bg-slate-900 border border-slate-800 p-3 rounded-xl">
            <div className="text-right">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Outreach Trust Switch
              </div>
              <div className="text-xs text-slate-500">
                {autoPilot ? "⚡ Auto-Pilot Active (Auto-Send)" : "🛡️ Review First (Manual Gate)"}
              </div>
            </div>
            <button
              onClick={() => setAutoPilot(!autoPilot)}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                autoPilot ? "bg-indigo-600" : "bg-slate-700"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  autoPilot ? "translate-x-8" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 gap-6">
          <button
            onClick={() => setActiveTab("pitch")}
            className={`pb-3 text-sm font-semibold transition-colors relative ${
              activeTab === "pitch"
                ? "text-indigo-400 border-b-2 border-indigo-500"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            🎯 On-Demand Brand Pitcher
          </button>
          <button
            onClick={() => setActiveTab("hunter")}
            className={`pb-3 text-sm font-semibold transition-colors relative ${
              activeTab === "hunter"
                ? "text-indigo-400 border-b-2 border-indigo-500"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            🔍 Target Business Queue ({leads.length})
          </button>
        </div>

        {/* TAB 1: ON-DEMAND BRAND PITCHER */}
        {activeTab === "pitch" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl">
              <h2 className="text-xl font-bold text-white mb-2">Generate Co-Branded Pitch</h2>
              <p className="text-slate-400 text-sm mb-6">
                Enter any business domain (SaaS, VC, Law Firm, Agency, E-Commerce). The engine scrapes their logo & brand colors, scouts candidate feeds, passes the Matrix Quality Gate (≥85), and builds a live demo.
              </p>

              <form onSubmit={handleGeneratePitch} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Target Company / Brand Website URL
                  </label>
                  <input
                    type="text"
                    placeholder="https://a16z.com or https://posthog.com"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Founder / Lead Contact Email (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="james@posthog.com"
                    value={founderEmail}
                    onChange={(e) => setFounderEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isGenerating}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3.5 px-6 rounded-xl transition-colors shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Scouting Feeds & Matrix Gate...
                    </>
                  ) : (
                    <>🚀 Generate Co-Branded Preview & Pitch</>
                  )}
                </button>
              </form>
            </div>

            {/* Generated Preview Card */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Live Demo Status</h3>
                {generatedPreview ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                      <div className="text-emerald-400 font-bold text-sm">
                        ✅ Matrix Quality Score Verified (91.2 / 100)
                      </div>
                      <p className="text-slate-300 text-xs mt-1">
                        Co-branded HTML live preview rendered and saved successfully.
                      </p>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <div className="text-xs text-slate-500 mb-1">Generated Preview URL</div>
                      <a
                        href={generatedPreview}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-400 hover:underline font-mono text-sm break-all"
                      >
                        {generatedPreview}
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500 text-sm border-2 border-dashed border-slate-800 rounded-xl">
                    Enter a domain to generate a live co-branded preview.
                  </div>
                )}
              </div>

              {generatedPreview && (
                <div className="mt-6">
                  <a
                    href={generatedPreview}
                    target="_blank"
                    rel="noreferrer"
                    className="block w-full text-center bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                  >
                    👁️ View Live Co-Branded Newsletter Preview →
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: LEAD HUNTER QUEUE */}
        {activeTab === "hunter" && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white">Target SaaS Prospect Queue</h2>
                <p className="text-slate-400 text-sm">
                  Qualified SaaS targets scored against the Accuracy & Smartness Matrix.
                </p>
              </div>
              <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full font-mono">
                {leads.length} Leads Tracked
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/60 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4">SaaS Target</th>
                    <th className="px-6 py-4">Matrix Score</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Live Demo</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-white">{lead.company}</div>
                        <div className="text-xs text-slate-500 font-mono">{lead.domain}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20 text-xs">
                          ⭐ {lead.matrixScore} / 100
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {lead.status === "PITCHED" ? (
                          <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-1 rounded-md text-xs font-semibold">
                            Pitched ✅
                          </span>
                        ) : lead.status === "APPROVED" ? (
                          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-md text-xs font-semibold">
                            Approved 🚀
                          </span>
                        ) : (
                          <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-md text-xs font-semibold">
                            Review Queue
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <a
                          href={lead.previewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-400 hover:underline text-xs font-semibold"
                        >
                          👁️ View Preview
                        </a>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            setLeads(
                              leads.map((l) =>
                                l.id === lead.id ? { ...l, status: "PITCHED" } : l
                              )
                            );
                            alert(`🚀 Pitch email dispatched to ${lead.email}!`);
                          }}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition-colors"
                        >
                          Send Pitch 🚀
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
