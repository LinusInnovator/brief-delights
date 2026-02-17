'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { discoverSponsors, generateAndSaveEmailDraft, type DiscoveryResult } from '@/lib/sponsorDiscovery';

// ========== Types ==========

interface SponsorContent {
    id: string;
    name: string;
    company_name: string;
    headline: string;
    description: string;
    cta_text: string;
    cta_url: string;
    logo_url: string | null;
    segments: string[];
    is_default: boolean;
    is_active: boolean;
    sponsor_lead_id: string | null;
    created_at: string;
    updated_at: string;
}

interface SponsorLead {
    id: string;
    company_name: string;
    domain: string;
    industry: string;
    matched_segment: string;
    match_score: number;
    match_reason: string;
    competitor_mentioned: string;
    pricing_tier: string;
    suggested_price_cents: number;
    guaranteed_clicks: number;
    content_examples: any;
    email_draft: any;
    status: string;
    discovered_at: string;
    eagerness_score: number;
    discovery_method: string;
    competitive_context: any;
    dream_outcome: string;
    article_clicks: number;
}

interface ScheduleEntry {
    id: string;
    sponsor_content_id: string;
    scheduled_date: string;
    segment: string;
    status: string;
    clicks: number;
    impressions: number;
    sponsor_content: {
        id: string;
        name: string;
        company_name: string;
        headline: string;
        is_default: boolean;
    };
}

interface SponsorStat {
    id: string;
    name: string;
    company_name: string;
    is_default: boolean;
    is_active: boolean;
    totalClicks: number;
    totalImpressions: number;
    ctr: string;
    sentCount: number;
    scheduledCount: number;
    bySegment: Record<string, { clicks: number; impressions: number; sends: number }>;
}

type Tab = 'library' | 'schedule' | 'pipeline' | 'stats';

// ========== Main Component ==========

export default function SponsorAdminPage() {
    const [activeTab, setActiveTab] = useState<Tab>('library');

    return (
        <>
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-7xl mx-auto px-8 py-6">
                    {/* Header */}
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold text-gray-900 mb-1">
                            Sponsor Management
                        </h1>
                        <p className="text-gray-600">
                            Create ad creatives, schedule placements, and track performance
                        </p>
                    </div>

                    {/* Tab Bar */}
                    <div className="border-b border-gray-200 mb-6">
                        <nav className="flex gap-1">
                            {([
                                { key: 'library' as Tab, label: '📚 Library', desc: 'Ad creatives' },
                                { key: 'schedule' as Tab, label: '📅 Schedule', desc: 'Calendar' },
                                { key: 'pipeline' as Tab, label: '⚡ Pipeline', desc: 'Auto-discovery' },
                                { key: 'stats' as Tab, label: '📈 Stats', desc: 'Performance' },
                            ]).map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Tab Content */}
                    {activeTab === 'library' && <LibraryTab />}
                    {activeTab === 'schedule' && <ScheduleTab />}
                    {activeTab === 'pipeline' && <PipelineTab />}
                    {activeTab === 'stats' && <StatsTab />}
                </div>
            </div>
        </>
    );
}

// ========== Library Tab ==========

function LibraryTab() {
    const [sponsors, setSponsors] = useState<SponsorContent[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingSponsor, setEditingSponsor] = useState<SponsorContent | null>(null);
    const [pipelineLeads, setPipelineLeads] = useState<SponsorLead[]>([]);
    const [showImportPicker, setShowImportPicker] = useState(false);

    const loadSponsors = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/sponsors/content');
            const data = await res.json();
            setSponsors(data.sponsors || []);
        } catch (e) {
            console.error('Failed to load sponsors:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadSponsors(); }, [loadSponsors]);

    async function loadPipelineLeads() {
        const supabase = createClient();
        const { data } = await supabase
            .from('sponsor_leads')
            .select('*')
            .order('match_score', { ascending: false })
            .limit(20);
        setPipelineLeads(data || []);
        setShowImportPicker(true);
    }

    function importFromPipeline(lead: SponsorLead) {
        setEditingSponsor({
            id: '',
            name: `${lead.company_name} Sponsorship`,
            company_name: lead.company_name,
            headline: lead.company_name,
            description: lead.match_reason || `Sponsored by ${lead.company_name}`,
            cta_text: 'Learn More →',
            cta_url: lead.domain ? `https://${lead.domain}` : '',
            logo_url: null,
            segments: [lead.matched_segment],
            is_default: false,
            is_active: true,
            sponsor_lead_id: lead.id,
            created_at: '',
            updated_at: '',
        });
        setShowImportPicker(false);
        setShowModal(true);
    }

    async function handleSave(sponsor: Partial<SponsorContent>) {
        try {
            if (editingSponsor?.id) {
                // Update
                await fetch(`/api/admin/sponsors/content/${editingSponsor.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(sponsor),
                });
            } else {
                // Create
                await fetch('/api/admin/sponsors/content', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(sponsor),
                });
            }
            setShowModal(false);
            setEditingSponsor(null);
            await loadSponsors();
        } catch (e) {
            console.error('Failed to save:', e);
        }
    }

    async function handleSetDefault(id: string) {
        await fetch(`/api/admin/sponsors/content/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_default: true }),
        });
        await loadSponsors();
    }

    async function handleToggleActive(id: string, isActive: boolean) {
        await fetch(`/api/admin/sponsors/content/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_active: !isActive }),
        });
        await loadSponsors();
    }

    async function handleDelete(id: string) {
        if (!confirm('Delete this sponsor? This cannot be undone.')) return;
        await fetch(`/api/admin/sponsors/content/${id}`, { method: 'DELETE' });
        await loadSponsors();
    }

    if (loading) return <LoadingSpinner text="Loading sponsor library..." />;

    return (
        <div>
            {/* Actions */}
            <div className="flex gap-3 mb-6">
                <button
                    onClick={() => {
                        setEditingSponsor(null);
                        setShowModal(true);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                >
                    + Create Sponsor
                </button>
                <button
                    onClick={loadPipelineLeads}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
                >
                    ↓ Import from Pipeline
                </button>
            </div>

            {/* Import Picker */}
            {showImportPicker && (
                <div className="bg-white rounded-lg shadow-sm border border-blue-200 p-4 mb-6">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-semibold text-gray-900">Select a pipeline lead to import</h3>
                        <button onClick={() => setShowImportPicker(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                    </div>
                    {pipelineLeads.length === 0 ? (
                        <p className="text-gray-500 text-sm">No pipeline leads found. Run sponsor discovery first.</p>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {pipelineLeads.map(lead => (
                                <button
                                    key={lead.id}
                                    onClick={() => importFromPipeline(lead)}
                                    className="text-left p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition"
                                >
                                    <p className="font-medium text-gray-900 text-sm">{lead.company_name}</p>
                                    <p className="text-xs text-gray-500">{lead.industry} · {lead.matched_segment}</p>
                                    <p className="text-xs text-blue-600 mt-1">Score: {lead.match_score}</p>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Sponsor Grid */}
            {sponsors.length === 0 ? (
                <EmptyState
                    emoji="📚"
                    title="No sponsors yet"
                    description="Create your first sponsor or import from the pipeline"
                />
            ) : (
                <div className="grid md:grid-cols-2 gap-4">
                    {sponsors.map(sponsor => (
                        <div
                            key={sponsor.id}
                            className={`bg-white rounded-lg shadow-sm p-5 border-2 transition ${sponsor.is_default
                                ? 'border-yellow-400 ring-1 ring-yellow-200'
                                : sponsor.is_active
                                    ? 'border-transparent hover:border-gray-200'
                                    : 'border-transparent opacity-60'
                                }`}
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-gray-900">{sponsor.company_name}</h3>
                                        {sponsor.is_default && (
                                            <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full font-medium">
                                                DEFAULT
                                            </span>
                                        )}
                                        {!sponsor.is_active && (
                                            <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full font-medium">
                                                PAUSED
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-500">{sponsor.name}</p>
                                </div>
                                <div className="flex gap-1">
                                    {sponsor.segments.map(seg => (
                                        <span key={seg} className={`text-xs px-2 py-0.5 rounded-full font-medium ${seg === 'builders' ? 'bg-orange-100 text-orange-700'
                                            : seg === 'leaders' ? 'bg-blue-100 text-blue-700'
                                                : 'bg-purple-100 text-purple-700'
                                            }`}>
                                            {seg}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Preview */}
                            <div className="bg-gray-50 rounded-lg p-4 mb-3 border border-gray-100">
                                <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Together With Our Sponsor</p>
                                <p className="font-semibold text-gray-900 text-sm">{sponsor.headline}</p>
                                <p className="text-gray-600 text-sm mt-1 line-clamp-2">{sponsor.description}</p>
                                <span className="inline-block mt-2 text-blue-600 text-sm font-medium">{sponsor.cta_text}</span>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <button
                                    onClick={() => {
                                        setEditingSponsor(sponsor);
                                        setShowModal(true);
                                    }}
                                    className="text-sm px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                                >
                                    ✏️ Edit
                                </button>
                                {!sponsor.is_default && (
                                    <button
                                        onClick={() => handleSetDefault(sponsor.id)}
                                        className="text-sm px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition"
                                    >
                                        ⭐ Set Default
                                    </button>
                                )}
                                <button
                                    onClick={() => handleToggleActive(sponsor.id, sponsor.is_active)}
                                    className="text-sm px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                                >
                                    {sponsor.is_active ? '⏸ Pause' : '▶️ Activate'}
                                </button>
                                <button
                                    onClick={() => handleDelete(sponsor.id)}
                                    className="text-sm px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition ml-auto"
                                >
                                    🗑
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <SponsorModal
                    sponsor={editingSponsor}
                    onSave={handleSave}
                    onClose={() => {
                        setShowModal(false);
                        setEditingSponsor(null);
                    }}
                />
            )}
        </div>
    );
}

// ========== Schedule Tab ==========

function ScheduleTab() {
    const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
    const [sponsors, setSponsors] = useState<SponsorContent[]>([]);
    const [defaultSponsor, setDefaultSponsor] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [startDate] = useState(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    });
    const [assigning, setAssigning] = useState<{ date: string; segment: string } | null>(null);

    const loadSchedule = useCallback(async () => {
        setLoading(true);
        try {
            const dateStr = startDate.toISOString().split('T')[0];
            const [schedRes, sponsorRes] = await Promise.all([
                fetch(`/api/admin/sponsors/schedule?start=${dateStr}&days=7`),
                fetch('/api/admin/sponsors/content?active=true'),
            ]);
            const schedData = await schedRes.json();
            const sponsorData = await sponsorRes.json();
            setSchedule(schedData.schedule || []);
            setDefaultSponsor(schedData.defaultSponsor || null);
            setSponsors(sponsorData.sponsors || []);
        } catch (e) {
            console.error('Failed to load schedule:', e);
        } finally {
            setLoading(false);
        }
    }, [startDate]);

    useEffect(() => { loadSchedule(); }, [loadSchedule]);

    async function handleAssign(sponsorId: string, date: string, segment: string) {
        await fetch('/api/admin/sponsors/schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sponsor_content_id: sponsorId,
                scheduled_date: date,
                segment,
            }),
        });
        setAssigning(null);
        await loadSchedule();
    }

    async function handleRemove(date: string, segment: string) {
        await fetch('/api/admin/sponsors/schedule', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scheduled_date: date, segment }),
        });
        await loadSchedule();
    }

    if (loading) return <LoadingSpinner text="Loading schedule..." />;

    const segments = ['builders', 'innovators', 'leaders'];
    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        days.push(d.toISOString().split('T')[0]);
    }

    function getScheduleEntry(date: string, segment: string) {
        return schedule.find(s => s.scheduled_date === date && s.segment === segment);
    }

    const segmentColors: Record<string, string> = {
        builders: 'border-orange-300',
        innovators: 'border-purple-300',
        leaders: 'border-blue-300',
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">
                    7-day schedule · Empty slots auto-fill with {defaultSponsor ? <strong>{defaultSponsor.company_name}</strong> : 'no default (set one in Library)'}
                </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-200">
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-24">Segment</th>
                            {days.map(day => {
                                const d = new Date(day + 'T12:00:00');
                                const isToday = day === new Date().toISOString().split('T')[0];
                                return (
                                    <th key={day} className={`px-2 py-3 text-center text-xs font-medium uppercase ${isToday ? 'text-blue-600 bg-blue-50' : 'text-gray-500'}`}>
                                        {d.toLocaleDateString('en-US', { weekday: 'short' })}<br />
                                        <span className="text-[11px] normal-case">{d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {segments.map(segment => (
                            <tr key={segment} className="border-b border-gray-100">
                                <td className="px-4 py-2">
                                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${segment === 'builders' ? 'bg-orange-100 text-orange-700'
                                        : segment === 'leaders' ? 'bg-blue-100 text-blue-700'
                                            : 'bg-purple-100 text-purple-700'
                                        }`}>
                                        {segment}
                                    </span>
                                </td>
                                {days.map(day => {
                                    const entry = getScheduleEntry(day, segment);
                                    const isAssigning = assigning?.date === day && assigning?.segment === segment;

                                    return (
                                        <td key={day} className="px-1 py-2 text-center relative">
                                            {isAssigning ? (
                                                <div className="absolute inset-0 z-10 bg-white border-2 border-blue-400 rounded-lg shadow-lg p-2 overflow-y-auto max-h-48">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-[10px] font-medium text-gray-500">Select sponsor</span>
                                                        <button onClick={() => setAssigning(null)} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
                                                    </div>
                                                    {sponsors.filter(s => s.segments.includes(segment)).map(s => (
                                                        <button
                                                            key={s.id}
                                                            onClick={() => handleAssign(s.id, day, segment)}
                                                            className="block w-full text-left px-2 py-1 text-xs rounded hover:bg-blue-50 transition truncate"
                                                        >
                                                            {s.company_name}
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : entry ? (
                                                <div className={`border-l-2 ${segmentColors[segment]} bg-gray-50 rounded px-2 py-1.5 text-left group relative`}>
                                                    <p className="text-xs font-medium text-gray-900 truncate">{entry.sponsor_content?.company_name}</p>
                                                    {entry.status === 'sent' && (
                                                        <p className="text-[10px] text-green-600">{entry.clicks} clicks</p>
                                                    )}
                                                    <button
                                                        onClick={() => handleRemove(day, segment)}
                                                        className="absolute top-0.5 right-0.5 text-gray-300 hover:text-red-500 text-xs opacity-0 group-hover:opacity-100 transition"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setAssigning({ date: day, segment })}
                                                    className="w-full h-10 border border-dashed border-gray-200 rounded text-gray-300 hover:border-blue-300 hover:text-blue-400 hover:bg-blue-50 transition text-xs"
                                                >
                                                    {defaultSponsor ? (
                                                        <span className="text-gray-400 text-[10px]">↳ {defaultSponsor.company_name}</span>
                                                    ) : '+'}
                                                </button>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ========== Pipeline Tab ==========

function PipelineTab() {
    const [leads, setLeads] = useState<SponsorLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'new' | 'sent' | 'responded' | 'booked'>('new');
    const [sending, setSending] = useState<string | null>(null);
    const [discovering, setDiscovering] = useState(false);
    const [discoveryResult, setDiscoveryResult] = useState<DiscoveryResult | null>(null);
    const [expandedDraft, setExpandedDraft] = useState<string | null>(null);
    const [generatingEmail, setGeneratingEmail] = useState<string | null>(null);

    const loadLeads = useCallback(async () => {
        setLoading(true);
        const supabase = createClient();
        let query = supabase
            .from('sponsor_leads')
            .select('*')
            .order('match_score', { ascending: false });

        if (filter === 'new') query = query.eq('status', 'matched');
        else if (filter === 'sent') query = query.in('status', ['outreach_sent', 'follow_up_sent']);
        else if (filter === 'responded') query = query.eq('status', 'responded');
        else if (filter === 'booked') query = query.eq('status', 'booked');

        const { data } = await query;
        setLeads(data || []);
        setLoading(false);
    }, [filter]);

    useEffect(() => { loadLeads(); }, [loadLeads]);

    async function handleRunDiscovery() {
        setDiscovering(true);
        setDiscoveryResult(null);
        try {
            const result = await discoverSponsors();
            setDiscoveryResult(result);
            if (result.status === 'success') {
                await loadLeads();
            }
        } catch {
            setDiscoveryResult({ status: 'error', articlesAnalyzed: 0, incumbentsDetected: [], challengersFound: 0, leadsWritten: 0, error: 'Unexpected error' });
        } finally {
            setDiscovering(false);
        }
    }

    async function handleGenerateEmail(leadId: string) {
        setGeneratingEmail(leadId);
        try {
            const draft = await generateAndSaveEmailDraft(leadId);
            if (draft) {
                // Refresh lead data to show the draft
                await loadLeads();
                setExpandedDraft(leadId);
            }
        } catch { /* ignore */ }
        finally { setGeneratingEmail(null); }
    }

    async function handleSendEmail(leadId: string) {
        if (!confirm('Send outreach email to this sponsor?')) return;
        setSending(leadId);
        try {
            const res = await fetch(`/api/admin/sponsors/${leadId}/send`, { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                alert('Email sent successfully!');
                await loadLeads();
            } else {
                alert('Failed: ' + (data.error || 'Unknown error'));
            }
        } catch { alert('Failed to send email'); }
        finally { setSending(null); }
    }

    function formatPrice(cents: number) {
        if (!cents && cents !== 0) return '—';
        return `$${(cents / 100).toLocaleString()}`;
    }

    function getTierColor(tier: string) {
        switch (tier) {
            case 'enterprise': return 'bg-purple-100 text-purple-800';
            case 'premium': return 'bg-blue-100 text-blue-800';
            case 'standard': return 'bg-green-100 text-green-800';
            case 'starter': return 'bg-amber-100 text-amber-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }

    function getMethodBadge(method: string) {
        switch (method) {
            case 'competitive_challenger': return { label: '🎯 Competitive', color: 'bg-orange-100 text-orange-800' };
            case 'content_analysis': return { label: '📊 Content Match', color: 'bg-blue-100 text-blue-800' };
            default: return { label: '✏️ Manual', color: 'bg-gray-100 text-gray-600' };
        }
    }

    return (
        <div>
            {/* Discovery Controls */}
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-5 mb-6 border border-indigo-100">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-bold text-gray-900 mb-1">🔍 Sponsor Discovery Engine</h3>
                        <p className="text-sm text-gray-600">
                            Analyses article clicks → detects incumbents → finds hungry challengers → generates outreach
                        </p>
                    </div>
                    <button
                        onClick={handleRunDiscovery}
                        disabled={discovering}
                        className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition shadow-sm ${discovering
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md'
                            }`}
                    >
                        {discovering ? (
                            <span className="flex items-center gap-2">
                                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                Scanning...
                            </span>
                        ) : '🔍 Run Discovery'}
                    </button>
                </div>

                {/* Discovery Result Banner */}
                {discoveryResult && (
                    <div className={`mt-4 p-3 rounded-lg text-sm ${discoveryResult.status === 'success'
                        ? 'bg-green-50 border border-green-200 text-green-800'
                        : 'bg-red-50 border border-red-200 text-red-800'
                        }`}>
                        {discoveryResult.status === 'success' ? (
                            <div className="flex items-center gap-4 flex-wrap">
                                <span>✅ <strong>{discoveryResult.leadsWritten}</strong> leads discovered</span>
                                <span>📰 {discoveryResult.articlesAnalyzed} articles analysed</span>
                                {discoveryResult.incumbentsDetected.length > 0 && (
                                    <span>🏢 Incumbents: {discoveryResult.incumbentsDetected.join(', ')}</span>
                                )}
                                <span>🎯 {discoveryResult.challengersFound} competitive challengers</span>
                            </div>
                        ) : (
                            <span>❌ {discoveryResult.error}</span>
                        )}
                    </div>
                )}
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-6">
                {(['new', 'sent', 'responded', 'booked'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === f
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        {f === 'new' ? '⚡ New' : f === 'sent' ? '📬 Sent' : f === 'responded' ? '✅ Responded' : '💰 Booked'}
                    </button>
                ))}
            </div>

            {loading ? <LoadingSpinner text="Loading pipeline..." /> : leads.length === 0 ? (
                <EmptyState emoji="⚡" title={`No ${filter} leads`} description="Run sponsor discovery to find new leads" />
            ) : (
                <div className="space-y-3">
                    {leads.map(lead => {
                        const methodBadge = getMethodBadge(lead.discovery_method);
                        const hasEmail = lead.email_draft && typeof lead.email_draft === 'object';
                        const isExpanded = expandedDraft === lead.id;

                        return (
                            <div key={lead.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition border border-gray-100">
                                <div className="p-5">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            {/* Header: Name + Badges */}
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <h3 className="text-lg font-bold text-gray-900">{lead.company_name}</h3>
                                                <span className="text-sm text-gray-500">Score: {lead.match_score}</span>
                                                {lead.eagerness_score && (
                                                    <span className="text-xs text-gray-400">
                                                        ⚡ {lead.eagerness_score}
                                                    </span>
                                                )}
                                                {/* Discovery method badge */}
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${methodBadge.color}`}>
                                                    {methodBadge.label}
                                                </span>
                                                {/* Competitor badge */}
                                                {lead.competitor_mentioned && (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-800">
                                                        🎯 vs {lead.competitor_mentioned}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Info line */}
                                            <p className="text-sm text-gray-600 mb-1">
                                                {lead.industry} · {lead.matched_segment}
                                                {lead.domain && <span className="text-gray-400"> · {lead.domain}</span>}
                                            </p>

                                            {/* Match reason / Dream outcome */}
                                            {lead.match_reason && (
                                                <p className="text-sm text-gray-700 mb-2">{lead.match_reason}</p>
                                            )}
                                            {lead.dream_outcome && !lead.match_reason && (
                                                <p className="text-sm text-gray-600 italic mb-2">&ldquo;{lead.dream_outcome}&rdquo;</p>
                                            )}

                                            {/* Pricing row */}
                                            <div className="flex items-center gap-3">
                                                <span className="text-xl font-bold text-gray-900">{formatPrice(lead.suggested_price_cents)}</span>
                                                {lead.pricing_tier && (
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTierColor(lead.pricing_tier)}`}>
                                                        {lead.pricing_tier}
                                                    </span>
                                                )}
                                                {lead.guaranteed_clicks && (
                                                    <span className="text-xs text-gray-500">{lead.guaranteed_clicks}+ clicks guaranteed</span>
                                                )}
                                                {lead.article_clicks && (
                                                    <span className="text-xs text-gray-400">({lead.article_clicks} real clicks)</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex flex-col gap-2 ml-4">
                                            {filter === 'new' && (
                                                <>
                                                    {!hasEmail && (
                                                        <button
                                                            onClick={() => handleGenerateEmail(lead.id)}
                                                            disabled={generatingEmail === lead.id}
                                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${generatingEmail === lead.id
                                                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                                : 'bg-white border border-blue-300 text-blue-700 hover:bg-blue-50'
                                                                }`}
                                                        >
                                                            {generatingEmail === lead.id ? '...' : '✉️ Generate Email'}
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleSendEmail(lead.id)}
                                                        disabled={sending === lead.id}
                                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${sending === lead.id
                                                            ? 'bg-gray-300 text-white cursor-not-allowed'
                                                            : 'bg-blue-600 text-white hover:bg-blue-700'
                                                            }`}
                                                    >
                                                        {sending === lead.id ? 'Sending...' : '✓ Approve & Send'}
                                                    </button>
                                                </>
                                            )}
                                            {filter === 'sent' && (
                                                <button className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition">
                                                    📧 Follow Up
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Email Draft Expandable Section */}
                                {hasEmail && (
                                    <div className="border-t border-gray-100">
                                        <button
                                            onClick={() => setExpandedDraft(isExpanded ? null : lead.id)}
                                            className="w-full px-5 py-2 text-left text-xs font-medium text-gray-500 hover:bg-gray-50 transition flex items-center gap-1"
                                        >
                                            <span className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                                            ✉️ Email Draft Preview
                                        </button>
                                        {isExpanded && (
                                            <div className="px-5 pb-4 space-y-3">
                                                <div>
                                                    <p className="text-[10px] uppercase text-gray-400 font-bold mb-0.5">Subject A (Competitive)</p>
                                                    <p className="text-sm text-gray-800 font-medium">{(lead.email_draft as any).subject_competitive}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] uppercase text-gray-400 font-bold mb-0.5">Subject B (Data-Driven)</p>
                                                    <p className="text-sm text-gray-800 font-medium">{(lead.email_draft as any).subject_data_driven}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] uppercase text-gray-400 font-bold mb-0.5">Body</p>
                                                    <pre className="text-xs text-gray-700 whitespace-pre-wrap bg-gray-50 rounded p-3 max-h-48 overflow-y-auto">
                                                        {(lead.email_draft as any).body}
                                                    </pre>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ========== Stats Tab ==========

function StatsTab() {
    const [stats, setStats] = useState<SponsorStat[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const res = await fetch('/api/admin/sponsors/stats');
                const data = await res.json();
                setStats(data.stats || []);
                setSummary(data.summary || null);
            } catch (e) {
                console.error('Failed to load stats:', e);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    if (loading) return <LoadingSpinner text="Loading stats..." />;

    return (
        <div>
            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    {[
                        { label: 'Total Sponsors', value: summary.totalSponsors },
                        { label: 'Active', value: summary.activeSponsors },
                        { label: 'Total Sends', value: summary.totalSends },
                        { label: 'Total Clicks', value: summary.totalClicks },
                        { label: 'Total Impressions', value: summary.totalImpressions },
                    ].map(m => (
                        <div key={m.label} className="bg-white rounded-lg shadow-sm p-4">
                            <p className="text-xs text-gray-500 mb-1">{m.label}</p>
                            <p className="text-2xl font-bold text-gray-900">{m.value}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Per-Sponsor Table */}
            {stats.length === 0 ? (
                <EmptyState emoji="📈" title="No stats yet" description="Stats will appear after sponsors are scheduled and sent" />
            ) : (
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sponsor</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Sends</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Clicks</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">CTR</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Builders</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Innovators</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Leaders</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.map(stat => (
                                <tr key={stat.id} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-gray-900">{stat.company_name}</p>
                                            {stat.is_default && (
                                                <span className="bg-yellow-100 text-yellow-800 text-[10px] px-1.5 py-0.5 rounded-full font-medium">DEFAULT</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500">{stat.name}</p>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stat.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {stat.is_active ? 'Active' : 'Paused'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center font-medium text-gray-900">{stat.sentCount}</td>
                                    <td className="px-4 py-3 text-center font-medium text-gray-900">{stat.totalClicks}</td>
                                    <td className="px-4 py-3 text-center font-medium text-gray-900">{stat.ctr}</td>
                                    <td className="px-4 py-3 text-center text-sm text-gray-600">
                                        {stat.bySegment['builders'] ? `${stat.bySegment['builders'].clicks} clicks` : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-center text-sm text-gray-600">
                                        {stat.bySegment['innovators'] ? `${stat.bySegment['innovators'].clicks} clicks` : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-center text-sm text-gray-600">
                                        {stat.bySegment['leaders'] ? `${stat.bySegment['leaders'].clicks} clicks` : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ========== Shared Components ==========

function SponsorModal({
    sponsor,
    onSave,
    onClose,
}: {
    sponsor: SponsorContent | null;
    onSave: (data: Partial<SponsorContent>) => void;
    onClose: () => void;
}) {
    const [form, setForm] = useState({
        name: sponsor?.name || '',
        company_name: sponsor?.company_name || '',
        headline: sponsor?.headline || '',
        description: sponsor?.description || '',
        cta_text: sponsor?.cta_text || 'Learn More →',
        cta_url: sponsor?.cta_url || '',
        logo_url: sponsor?.logo_url || '',
        segments: sponsor?.segments || ['builders', 'innovators', 'leaders'],
        is_default: sponsor?.is_default || false,
        is_active: sponsor?.is_active !== false,
        sponsor_lead_id: sponsor?.sponsor_lead_id || null,
    });

    function toggleSegment(seg: string) {
        setForm(f => ({
            ...f,
            segments: f.segments.includes(seg)
                ? f.segments.filter(s => s !== seg)
                : [...f.segments, seg],
        }));
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900">
                        {sponsor?.id ? 'Edit Sponsor' : 'Create Sponsor'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Internal Name</label>
                            <input
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={form.name}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                placeholder="Docker Q1 Campaign"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                            <input
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={form.company_name}
                                onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                                placeholder="Docker"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Headline</label>
                        <input
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={form.headline}
                            onChange={e => setForm(f => ({ ...f, headline: e.target.value }))}
                            placeholder="Ship faster with Docker Desktop"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            rows={3}
                            value={form.description}
                            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            placeholder="Ad copy that appears in the newsletter..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">CTA Text</label>
                            <input
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={form.cta_text}
                                onChange={e => setForm(f => ({ ...f, cta_text: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">CTA URL</label>
                            <input
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={form.cta_url}
                                onChange={e => setForm(f => ({ ...f, cta_url: e.target.value }))}
                                placeholder="https://docker.com/desktop"
                            />
                        </div>
                    </div>

                    {/* Segments */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Target Segments</label>
                        <div className="flex gap-2">
                            {['builders', 'innovators', 'leaders'].map(seg => (
                                <button
                                    key={seg}
                                    onClick={() => toggleSegment(seg)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${form.segments.includes(seg)
                                        ? seg === 'builders' ? 'bg-orange-500 text-white'
                                            : seg === 'leaders' ? 'bg-blue-600 text-white'
                                                : 'bg-purple-600 text-white'
                                        : 'bg-gray-100 text-gray-600'
                                        }`}
                                >
                                    {seg}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Flags */}
                    <div className="flex gap-6">
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={form.is_default}
                                onChange={e => setForm(f => ({ ...f, is_default: e.target.checked }))}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-gray-700">Default sponsor (fallback)</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={form.is_active}
                                onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-gray-700">Active</span>
                        </label>
                    </div>

                    {/* Preview */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Newsletter Preview</label>
                        <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                            <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-2 text-center">Together With Our Sponsor</p>
                            <h3 className="font-bold text-gray-900">{form.headline || 'Your Headline'}</h3>
                            <p className="text-gray-600 text-sm mt-1">{form.description || 'Your description...'}</p>
                            <a className="inline-block mt-3 text-blue-600 font-medium text-sm">{form.cta_text}</a>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onSave(form)}
                        disabled={!form.company_name || !form.headline || !form.cta_url}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {sponsor?.id ? 'Save Changes' : 'Create Sponsor'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function LoadingSpinner({ text }: { text: string }) {
    return (
        <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-3 text-gray-500 text-sm">{text}</p>
        </div>
    );
}

function EmptyState({ emoji, title, description }: { emoji: string; title: string; description: string }) {
    return (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="text-4xl mb-3">{emoji}</div>
            <p className="text-gray-900 font-medium text-lg">{title}</p>
            <p className="text-gray-500 mt-1">{description}</p>
        </div>
    );
}
