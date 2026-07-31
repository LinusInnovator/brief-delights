import React from "react";

interface PreviewPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function DynamicPreviewPage({ params }: PreviewPageProps) {
  const { slug } = await params;
  const cleanSlug = (slug || "").replace(/\.html?$/i, "").toLowerCase();

  const domainMap: Record<string, { name: string; domain: string; color: string; tagColor?: string }> = {
    resendcom: { name: "Resend", domain: "resend.com", color: "#ffffff", tagColor: "#38bdf8" },
    neontech: { name: "Neon", domain: "neon.tech", color: "#00e599", tagColor: "#00e599" },
    vercelcom: { name: "Vercel", domain: "vercel.com", color: "#ffffff", tagColor: "#38bdf8" },
    posthogcom: { name: "PostHog", domain: "posthog.com", color: "#f54e00", tagColor: "#f54e00" },
    linearapp: { name: "Linear", domain: "linear.app", color: "#5e6ad2", tagColor: "#5e6ad2" },
    supabasecom: { name: "Supabase", domain: "supabase.com", color: "#3ecf8e", tagColor: "#3ecf8e" },
  };

  const matched = domainMap[cleanSlug];
  const companyName = matched?.name || cleanSlug.replace(/(com|app|io|org|net|tech|dev|co)$/i, "").toUpperCase() || "Target Brand";
  const brandColor = matched?.color || (cleanSlug.includes("neon") ? "#00e599" : cleanSlug.includes("linear") ? "#5e6ad2" : cleanSlug.includes("supabase") ? "#3ecf8e" : "#f54e00");
  const tagColor = matched?.tagColor || (brandColor === "#ffffff" || brandColor === "#000000" ? "#38bdf8" : brandColor);
  const badgeTextColor = (brandColor === "#ffffff" || matched?.name === "Resend" || matched?.name === "Vercel") ? "#0f172a" : "#ffffff";
  const cleanDomain = matched?.domain || `${cleanSlug.replace(/(com|app|io|tech|dev|co)$/i, "")}.com`;
  const logoUrl = `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=128`;

  return (
    <div style={{ backgroundColor: "#0f172a", color: "#f8fafc", minHeight: "100vh", padding: "40px 20px", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: "680px", margin: "0 auto", backgroundColor: "#1e293b", borderRadius: "16px", overflow: "hidden", border: "1px solid #334155" }}>
        
        {/* Header */}
        <div style={{ backgroundColor: "#0f172a", padding: "40px 24px 32px 24px", textAlign: "center", borderBottom: `3px solid ${brandColor}` }}>
          <div style={{
            width: "68px",
            height: "68px",
            borderRadius: "18px",
            backgroundColor: "rgba(255, 255, 255, 0.08)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px auto",
            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.35)",
            padding: "8px"
          }}>
            <img src={logoUrl} alt={companyName} style={{ maxHeight: "42px", maxWidth: "42px", width: "auto", height: "auto", objectFit: "contain" }} />
          </div>
          <div style={{ display: "inline-block", backgroundColor: brandColor, color: badgeTextColor, padding: "5px 14px", borderRadius: "9999px", fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px" }}>
            POWERED BY BRIEF DELIGHTS SIGNAL ENGINE
          </div>
          <h1 style={{ fontSize: "28px", margin: "16px 0 6px 0", color: "#ffffff", fontWeight: 800 }}>{companyName} Weekly Signal Brief</h1>
          <p style={{ fontSize: "14px", color: "#94a3b8", margin: 0 }}>
            Curated high-impact intelligence tailored for {companyName} users & ecosystem.
          </p>
        </div>

        {/* Content */}
        <div style={{ padding: "32px 24px" }}>
          <h3 style={{ color: "#94a3b8", textTransform: "uppercase", fontSize: "12px", letterSpacing: "1px", marginBottom: "20px" }}>
            Top Curated Signals This Week
          </h3>

          {/* Sample Signal Cards */}
          <div style={{ backgroundColor: "#0f172a", borderRadius: "12px", padding: "20px", marginBottom: "20px", border: "1px solid #334155" }}>
            <span style={{ color: tagColor, fontSize: "12px", fontWeight: "bold", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
              🚀 AI & AGENTIC ARCHITECTURE
            </span>
            <h4 style={{ fontSize: "18px", color: "#ffffff", margin: "0 0 10px 0" }}>
              Anthropic Releases Claude 3.5 Sonnet & High-Precision API Functions
            </h4>
            <p style={{ fontSize: "14px", color: "#cbd5e1", lineHeight: "1.6", marginBottom: "12px" }}>
              New benchmarking reveals 30% reduction in agent failure rates for structured JSON extraction and multi-turn workflows.
            </p>
            <div style={{ backgroundColor: "#1e293b", padding: "12px 16px", borderRadius: "8px", borderLeft: `3px solid ${tagColor}`, fontSize: "13px", color: "#e2e8f0" }}>
              💡 <strong>Why This Matters to {companyName} Users:</strong> {
                companyName === "Supabase" ? "Enables zero-latency pgvector similarity search inside Supabase Edge Functions for RAG workflows." :
                companyName === "PostHog" ? "Enforces high-concurrency LLM event tracking in PostHog session replays without spiking ingestion latency." :
                companyName === "Linear" ? "Automates cycle planning and PR triage directly inside Linear GraphQL workflows using agentic tools." :
                companyName === "Resend" ? "Integrates automated AI email deliverability monitoring and DKIM/SPF verification into Resend dispatches." :
                companyName === "Neon" ? "Unlocks instant database branching for isolated AI agent evaluation and schema migrations." :
                "Enables direct integration of high-reliability autonomous agents into client applications."
              }
            </div>
          </div>

          <div style={{ backgroundColor: "#0f172a", borderRadius: "12px", padding: "20px", marginBottom: "20px", border: "1px solid #334155" }}>
            <span style={{ color: tagColor, fontSize: "12px", fontWeight: "bold", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
              ⚡ SYSTEMS & INFRASTRUCTURE
            </span>
            <h4 style={{ fontSize: "18px", color: "#ffffff", margin: "0 0 10px 0" }}>
              Cloudflare Announces Edge WebGPU Computing Runtime
            </h4>
            <p style={{ fontSize: "14px", color: "#cbd5e1", lineHeight: "1.6", marginBottom: "12px" }}>
              Developers can now execute local zero-latency model inference across 300+ global edge locations natively.
            </p>
            <div style={{ backgroundColor: "#1e293b", padding: "12px 16px", borderRadius: "8px", borderLeft: `3px solid ${tagColor}`, fontSize: "13px", color: "#e2e8f0" }}>
              💡 <strong>Why This Matters to {companyName} Users:</strong> {
                companyName === "Supabase" ? "Cuts cold-start latency for Supabase Deno Edge Functions connecting to serverless Postgres pools." :
                companyName === "PostHog" ? "Optimizes edge ClickHouse query performance for real-time PostHog user cohort segmentation." :
                companyName === "Linear" ? "Accelerates real-time Sync Engine latency for Linear desktop and web client applications." :
                companyName === "Resend" ? "Reduces API response latency for high-volume transactional email dispatches across global edge nodes." :
                companyName === "Neon" ? "Scales serverless Postgres compute endpoints to zero when idle to minimize cloud database spend." :
                "Cuts global API latency for client-side applications."
              }
            </div>
          </div>

          <div style={{ backgroundColor: "#0f172a", borderRadius: "12px", padding: "20px", marginBottom: "20px", border: "1px solid #334155" }}>
            <span style={{ color: tagColor, fontSize: "12px", fontWeight: "bold", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
              🛡️ SECURITY & COMPLIANCE
            </span>
            <h4 style={{ fontSize: "18px", color: "#ffffff", margin: "0 0 10px 0" }}>
              NIST Finalizes Post-Quantum Cryptographic Standards
            </h4>
            <p style={{ fontSize: "14px", color: "#cbd5e1", lineHeight: "1.6", marginBottom: "12px" }}>
              Enterprise API security frameworks must migrate to quantum-resistant encryption algorithms over the next 18 months.
            </p>
            <div style={{ backgroundColor: "#1e293b", padding: "12px 16px", borderRadius: "8px", borderLeft: `3px solid ${tagColor}`, fontSize: "13px", color: "#e2e8f0" }}>
              💡 <strong>Why This Matters to {companyName} Users:</strong> {
                companyName === "Supabase" ? "Hardens Supabase Row Level Security (RLS) policies and JWT validation against automated API escalation." :
                companyName === "PostHog" ? "Secures custom PostHog event webhooks against unauthorized API key exposure in high-scale client apps." :
                companyName === "Linear" ? "Ensures SOC2 audit trail integrity for enterprise Linear integration webhooks." :
                companyName === "Resend" ? "Prevents phishing spoofing via strict domain authentication and automated abuse filtering." :
                companyName === "Neon" ? "Protects Neon connection pooler credentials during high-concurrency serverless application spikes." :
                "Ensures long-term enterprise compliance and end-to-end security guarantees."
              }
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: "36px" }}>
            <a
              href={`https://${cleanDomain}`}
              target="_blank"
              rel="noreferrer"
              style={{ display: "inline-block", backgroundColor: brandColor, color: "#ffffff", padding: "14px 28px", borderRadius: "10px", fontWeight: "bold", textDecoration: "none", fontSize: "15px" }}
            >
              Explore {companyName} Platform →
            </a>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", padding: "24px", fontSize: "13px", color: "#64748b", borderTop: "1px solid #334155" }}>
          <p style={{ margin: "0 0 6px 0" }}>Generated dynamically for <strong>{companyName}</strong> via Brief Delights White-Label Signal Engine.</p>
          <p style={{ margin: 0 }}>Matrix Score Quality Verified (92.4 / 100) • 100% Automated Curation</p>
        </div>

      </div>
    </div>
  );
}
