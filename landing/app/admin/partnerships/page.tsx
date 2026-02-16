'use client';

import { useEffect, useState } from 'react';
import AdminNav from '../sponsors/components/AdminNav';
import { createClient } from '@/lib/supabase/client';

interface Partnership {
    id: string;
    sponsor_name: string;
    sponsor_domain: string | null;
    headline: string;
    body: string;
    cta_text: string | null;
    cta_url: string | null;
    scheduled_date: string | null;
    segment: string;
    status: string;
    deal_value_cents: number | null;
    partnership_type: string | null;
}

export default function PartnershipsPage() {
    const [partnerships, setPartnerships] = useState<Partnership[]>([]);
    const [loading, setLoading] = useState(true);
    const [showEditor, setShowEditor] = useState(false);
    const [showQuickCreate, setShowQuickCreate] = useState(false);
    const [generatingUrl, setGeneratingUrl] = useState('');
    const [generating, setGenerating] = useState(false);
    const [editingPartnership, setEditingPartnership] = useState<Partnership | null>(null);
    const [formData, setFormData] = useState({
        sponsor_name: '',
        sponsor_domain: '',
        headline: '',
        body: '',
        cta_text: '',
        cta_url: '',
        segment: 'all',
        partnership_type: 'paid',
        deal_value_cents: 0,
    });

    const supabase = createClient();

    useEffect(() => {
        loadPartnerships();
    }, []);

    async function loadPartnerships() {
        try {
            const { data, error } = await supabase
                .from('sponsored_content')
                .select('*')
                .order('scheduled_date', { ascending: true });

            if (error) throw error;
            setPartnerships(data || []);
        } catch (error) {
            console.error('Failed to load partnerships:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        try {
            if (editingPartnership) {
                // Update existing
                const { error } = await supabase
                    .from('sponsored_content')
                    .update(formData)
                    .eq('id', editingPartnership.id);

                if (error) throw error;
            } else {
                // Create new
                const { error } = await supabase
                    .from('sponsored_content')
                    .insert({
                        ...formData,
                        status: 'draft',
                    });

                if (error) throw error;
            }

            setShowEditor(false);
            setEditingPartnership(null);
            resetForm();
            await loadPartnerships();
        } catch (error) {
            console.error('Failed to save partnership:', error);
            alert('Failed to save partnership: ' + (error as Error).message);
        }
    }

    async function handleSchedule(partnershipId: string, date: string) {
        try {
            const segment = prompt('Schedule for which segment? (all/builders/innovators/leaders)', 'all');
            if (!segment) return;

            const { error } = await supabase
                .from('sponsored_content')
                .update({
                    scheduled_date: date,
                    segment,
                    status: 'scheduled'
                })
                .eq('id', partnershipId);

            if (error) throw error;

            await loadPartnerships();
            alert('Scheduled successfully!');
        } catch (error) {
            console.error('Failed to schedule:', error);
            alert('Failed to schedule partnership');
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Delete this partnership?')) return;

        try {
            const { error } = await supabase
                .from('sponsored_content')
                .delete()
                .eq('id', id);

            if (error) throw error;
            await loadPartnerships();
        } catch (error) {
            console.error('Failed to delete:', error);
            alert('Failed to delete partnership');
        }
    }

    function openEditor(partnership?: Partnership) {
        if (partnership) {
            setEditingPartnership(partnership);
            setFormData({
                sponsor_name: partnership.sponsor_name,
                sponsor_domain: partnership.sponsor_domain || '',
                headline: partnership.headline,
                body: partnership.body,
                cta_text: partnership.cta_text || '',
                cta_url: partnership.cta_url || '',
                segment: partnership.segment,
                partnership_type: partnership.partnership_type || 'paid',
                deal_value_cents: partnership.deal_value_cents || 0,
            });
        } else {
            resetForm();
        }
        setShowEditor(true);
    }

    function resetForm() {
        setFormData({
            sponsor_name: '',
            sponsor_domain: '',
            headline: '',
            body: '',
            cta_text: '',
            cta_url: '',
            segment: 'all',
            partnership_type: 'paid',
            deal_value_cents: 0,
        });
    }

    async function handleQuickCreate(url: string) {
        setGenerating(true);
        try {
            const res = await fetch('/api/admin/partnerships/generate-from-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url }),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to generate');
            }

            const data = await res.json();

            // Pre-fill form with generated data
            setFormData({
                sponsor_name: data.sponsor_name,
                sponsor_domain: data.sponsor_domain,
                headline: data.headline,
                body: data.body,
                cta_text: data.cta_text,
                cta_url: data.cta_url,
                segment: 'all',
                partnership_type: 'paid',
                deal_value_cents: 0,
            });

            // Close quick create modal and open editor
            setShowQuickCreate(false);
            setGeneratingUrl('');
            setShowEditor(true);
        } catch (error: any) {
            console.error('Failed to generate:', error);
            alert(error.message || 'Failed to generate content from URL');
        } finally {
            setGenerating(false);
        }
    }

    const draftPartnerships = partnerships.filter(p => p.status === 'draft');
    const scheduledPartnerships = partnerships.filter(p => p.status === 'scheduled');

    return (
        <>
            <AdminNav />
            <div className="min-h-screen bg-gray-50 p-8">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                📦 Partnership Manager
                            </h1>
                            <p className="text-gray-600">
                                Manage manual partnerships and sponsored content
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowQuickCreate(true)}
                                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium flex items-center gap-2"
                            >
                                ⚡ Quick Create from URL
                            </button>
                            <button
                                onClick={() => openEditor()}
                                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                            >
                                + New Partnership
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        </div>
                    ) : (
                        <>
                            {/* Scheduled Content */}
                            <div className="mb-8">
                                <h2 className="text-xl font-bold text-gray-900 mb-4">🗓️ Scheduled</h2>
                                {scheduledPartnerships.length === 0 ? (
                                    <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-600">
                                        No partnerships scheduled yet
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-4">
                                        {scheduledPartnerships.map(p => (
                                            <div key={p.id} className="bg-white rounded-lg shadow-sm p-6">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <h3 className="text-lg font-bold text-gray-900">
                                                                {p.sponsor_name}
                                                            </h3>
                                                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded font-medium">
                                                                {p.scheduled_date}
                                                            </span>
                                                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded font-medium">
                                                                {p.segment}
                                                            </span>
                                                        </div>
                                                        <p className="text-gray-900 font-medium mb-1">{p.headline}</p>
                                                        <p className="text-sm text-gray-600 line-clamp-2">{p.body}</p>
                                                    </div>
                                                    <div className="flex gap-2 ml-4">
                                                        <button
                                                            onClick={() => openEditor(p)}
                                                            className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
                                                        >
                                                            ✏️ Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(p.id)}
                                                            className="px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Draft Partnerships */}
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 mb-4">📝 Drafts</h2>
                                {draftPartnerships.length === 0 ? (
                                    <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-600">
                                        No draft partnerships
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-4">
                                        {draftPartnerships.map(p => (
                                            <div key={p.id} className="bg-white rounded-lg shadow-sm p-6">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                                                            {p.sponsor_name}
                                                        </h3>
                                                        <p className="text-gray-900 font-medium mb-1">{p.headline}</p>
                                                        <p className="text-sm text-gray-600 line-clamp-2">{p.body}</p>
                                                    </div>
                                                    <div className="flex gap-2 ml-4 flex-col">
                                                        <button
                                                            onClick={() => {
                                                                const date = prompt('Schedule for date (YYYY-MM-DD):');
                                                                if (date) handleSchedule(p.id, date);
                                                            }}
                                                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
                                                        >
                                                            📅 Schedule
                                                        </button>
                                                        <button
                                                            onClick={() => openEditor(p)}
                                                            className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
                                                        >
                                                            ✏️ Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(p.id)}
                                                            className="px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                                                        >
                                                            🗑️ Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Editor Modal */}
            {showEditor && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">
                                {editingPartnership ? 'Edit Partnership' : 'New Partnership'}
                            </h2>

                            <div className="space-y-4">
                                {/* Sponsor Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Sponsor Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.sponsor_name}
                                        onChange={(e) => setFormData({ ...formData, sponsor_name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="e.g., Railway"
                                    />
                                </div>

                                {/* Sponsor Domain */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Website
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.sponsor_domain}
                                        onChange={(e) => setFormData({ ...formData, sponsor_domain: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="railway.app"
                                    />
                                </div>

                                {/* Headline */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Headline *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.headline}
                                        onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Deploy in Seconds, Not Hours"
                                        maxLength={100}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">{formData.headline.length}/100 characters</p>
                                </div>

                                {/* Body */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Body Text *
                                    </label>
                                    <textarea
                                        value={formData.body}
                                        onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        rows={6}
                                        placeholder="Tired of Docker config hell? Railway deploys your code with zero setup..."
                                        maxLength={500}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">{formData.body.length}/500 characters</p>
                                </div>

                                {/* CTA */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            CTA Button Text
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.cta_text}
                                            onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Try Railway Free"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            CTA URL
                                        </label>
                                        <input
                                            type="url"
                                            value={formData.cta_url}
                                            onChange={(e) => setFormData({ ...formData, cta_url: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="https://railway.app"
                                        />
                                    </div>
                                </div>

                                {/* Deal Value */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Deal Value ($)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.deal_value_cents / 100}
                                        onChange={(e) => setFormData({ ...formData, deal_value_cents: parseFloat(e.target.value) * 100 })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="800"
                                    />
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => {
                                        setShowEditor(false);
                                        setEditingPartnership(null);
                                        resetForm();
                                    }}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                                >
                                    {editingPartnership ? 'Update' : 'Create'} Partnership
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Create Modal */}
            {showQuickCreate && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">
                            ⚡ Quick Create from URL
                        </h2>
                        <p className="text-gray-600 mb-4">
                            Paste a URL and we'll auto-generate compelling sponsored content using AI.
                        </p>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Product URL
                            </label>
                            <input
                                type="text"
                                value={generatingUrl}
                                onChange={(e) => setGeneratingUrl(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                placeholder="share.delights.pro"
                                disabled={generating}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && generatingUrl && !generating) {
                                        handleQuickCreate(generatingUrl);
                                    }
                                }}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Example: share.delights.pro or https://railway.app
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowQuickCreate(false);
                                    setGeneratingUrl('');
                                }}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
                                disabled={generating}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleQuickCreate(generatingUrl)}
                                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                disabled={!generatingUrl || generating}
                            >
                                {generating ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Generating...
                                    </>
                                ) : (
                                    '✨ Generate Content'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
