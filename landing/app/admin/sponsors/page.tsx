'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import AdminNav from './components/AdminNav';

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
    last_updated: string;
}

export default function SponsorAdminPage() {
    const [leads, setLeads] = useState<SponsorLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'new' | 'sent' | 'responded' | 'booked'>('new');

    useEffect(() => {
        loadSponsors();
    }, [filter]);

    async function loadSponsors() {
        setLoading(true);
        const supabase = createClient();

        let query = supabase
            .from('sponsor_leads')
            .select('*')
            .order('match_score', { ascending: false });

        // Filter by status
        if (filter === 'new') {
            query = query.eq('status', 'matched');
        } else if (filter === 'sent') {
            query = query.in('status', ['outreach_sent', 'follow_up_sent']);
        } else if (filter === 'responded') {
            query = query.eq('status', 'responded');
        } else if (filter === 'booked') {
            query = query.eq('status', 'booked');
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error loading sponsors:', error);
        } else {
            setLeads(data || []);
        }

        setLoading(false);
    }

    function formatPrice(cents: number): string {
        return `$${(cents / 100).toLocaleString()}`;
    }

    function getTierColor(tier: string): string {
        switch (tier) {
            case 'enterprise': return 'bg-purple-100 text-purple-800';
            case 'premium': return 'bg-blue-100 text-blue-800';
            case 'standard': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }

    async function handleApprove(leadId: string) {
        // TODO: Send email via Resend API
        alert('Email sending coming soon!');
    }

    return (
        <>
            <AdminNav />
            <div className="min-h-screen bg-gray-50 p-8">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            📊 Sponsor Pipeline
                        </h1>
                        <p className="text-gray-600">
                            Automated sponsor discovery & outreach
                        </p>
                    </div>

                    {/* Filters */}
                    <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
                        <div className="flex gap-4">
                            <button
                                onClick={() => setFilter('new')}
                                className={`px-4 py-2 rounded-lg font-medium transition ${filter === 'new'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                ⚡ New Leads
                            </button>
                            <button
                                onClick={() => setFilter('sent')}
                                className={`px-4 py-2 rounded-lg font-medium transition ${filter === 'sent'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                📬 Outreach Sent
                            </button>
                            <button
                                onClick={() => setFilter('responded')}
                                className={`px-4 py-2 rounded-lg font-medium transition ${filter === 'responded'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                ✅ Responded
                            </button>
                            <button
                                onClick={() => setFilter('booked')}
                                className={`px-4 py-2 rounded-lg font-medium transition ${filter === 'booked'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                💰 Booked
                            </button>
                        </div>
                    </div>

                    {/* Leads Grid */}
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="mt-4 text-gray-600">Loading sponsors...</p>
                        </div>
                    ) : leads.length === 0 ? (
                        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                            <p className="text-gray-600 text-lg">
                                No sponsors in this category yet
                            </p>
                            <p className="text-gray-500 mt-2">
                                Run sponsor discovery to find new leads
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {leads.map((lead) => (
                                <div
                                    key={lead.id}
                                    className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            {/* Company Info */}
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-xl font-bold text-gray-900">
                                                    🎯 {lead.company_name}
                                                </h3>
                                                <span className="text-sm font-medium text-gray-600">
                                                    Score: {lead.match_score}
                                                </span>
                                            </div>

                                            <p className="text-gray-600 mb-3">
                                                {lead.industry} • {lead.matched_segment} segment
                                            </p>

                                            <p className="text-gray-700 mb-4">
                                                {lead.match_reason}
                                            </p>

                                            {/* Pricing */}
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-2xl font-bold text-gray-900">
                                                        {formatPrice(lead.suggested_price_cents)}
                                                    </span>
                                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTierColor(lead.pricing_tier)}`}>
                                                        {lead.pricing_tier}
                                                    </span>
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                    Guaranteed: {lead.guaranteed_clicks}+ clicks
                                                </div>
                                            </div>

                                            {/* Content Examples Preview */}
                                            {lead.content_examples && (
                                                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                                    <p className="text-sm font-medium text-gray-700 mb-2">
                                                        📝 Content Examples Generated:
                                                    </p>
                                                    <ul className="text-sm text-gray-600 space-y-1">
                                                        {lead.content_examples.map((ex: any, i: number) => (
                                                            <li key={i}>• {ex.headline}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex flex-col gap-2 ml-6">
                                            <button
                                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
                                                onClick={() => alert('Preview coming soon!')}
                                            >
                                                👁️ Preview Email
                                            </button>
                                            <button
                                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
                                                onClick={() => alert('Edit coming soon!')}
                                            >
                                                ✏️ Edit
                                            </button>
                                            {filter === 'new' && (
                                                <button
                                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                                                    onClick={() => handleApprove(lead.id)}
                                                >
                                                    ✓ Approve & Send
                                                </button>
                                            )}
                                            {filter === 'sent' && (
                                                <button
                                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                                                >
                                                    📧 Follow Up
                                                </button>
                                            )}
                                            {filter === 'responded' && (
                                                <button
                                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
                                                >
                                                    📅 Send Calendar
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
