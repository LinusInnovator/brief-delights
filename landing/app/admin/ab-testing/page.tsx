'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Experiment {
    id: string;
    element: string;
    status: string;
    started_at: string;
}

interface Variant {
    id: string;
    experiment_id: string;
    slot: string;
    weight: number;
    content: Record<string, string>;
    impressions: number;
    conversions: number;
    conversion_rate: number;
    confidence: number;
    promoted_at: string | null;
    killed_at: string | null;
    created_at: string;
}

interface ABEvent {
    id: number;
    variant_id: string;
    event_type: string;
    details: Record<string, any>;
    created_at: string;
}

export default function ABTestingPage() {
    const [experiment, setExperiment] = useState<Experiment | null>(null);
    const [variants, setVariants] = useState<Variant[]>([]);
    const [events, setEvents] = useState<ABEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [triggeringEngine, setTriggeringEngine] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        const supabase = createClient();

        // Get running experiment
        const { data: experiments } = await supabase
            .from('ab_experiments')
            .select('*')
            .eq('status', 'running')
            .limit(1);

        if (experiments && experiments.length > 0) {
            setExperiment(experiments[0]);

            // Get variants
            const { data: variantsData } = await supabase
                .from('ab_variants')
                .select('*')
                .eq('experiment_id', experiments[0].id)
                .order('slot', { ascending: true });

            if (variantsData) setVariants(variantsData);

            // Get recent events
            const { data: eventsData } = await supabase
                .from('ab_events')
                .select('*')
                .eq('experiment_id', experiments[0].id)
                .order('created_at', { ascending: false })
                .limit(20);

            if (eventsData) setEvents(eventsData);
        }

        setLoading(false);
    }

    async function triggerEngine() {
        setTriggeringEngine(true);
        try {
            const res = await fetch('/api/cron/ab-engine', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-cron-secret': 'manual-trigger', // Admin-triggered
                },
            });
            const data = await res.json();
            alert(JSON.stringify(data, null, 2));
            await fetchData(); // Refresh
        } catch (error) {
            alert('Engine error: ' + error);
        }
        setTriggeringEngine(false);
    }

    async function killVariant(variantId: string) {
        if (!confirm('Kill this variant? It will be removed from the experiment.')) return;

        const supabase = createClient();
        await supabase
            .from('ab_variants')
            .update({ killed_at: new Date().toISOString() })
            .eq('id', variantId);

        await fetchData();
    }

    function getSlotColor(slot: string) {
        switch (slot) {
            case 'champion': return { bg: 'bg-green-50', border: 'border-green-500', text: 'text-green-700', badge: 'bg-green-100 text-green-700' };
            case 'challenger': return { bg: 'bg-blue-50', border: 'border-blue-500', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700' };
            case 'explorer': return { bg: 'bg-purple-50', border: 'border-purple-500', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-700' };
            default: return { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-700', badge: 'bg-gray-100 text-gray-700' };
        }
    }

    function getEventIcon(type: string) {
        switch (type) {
            case 'promoted': return '🏆';
            case 'killed': return '☠️';
            case 'generated': return '🧬';
            case 'started': return '🚀';
            default: return '📋';
        }
    }

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="animate-spin h-8 w-8 border-3 border-blue-600 border-t-transparent rounded-full" />
            </div>
        );
    }

    const activeVariants = variants.filter(v => !v.killed_at);
    const killedVariants = variants.filter(v => v.killed_at);
    const totalImpressions = activeVariants.reduce((sum, v) => sum + v.impressions, 0);
    const totalConversions = activeVariants.reduce((sum, v) => sum + v.conversions, 0);
    const overallRate = totalImpressions > 0 ? (totalConversions / totalImpressions * 100).toFixed(2) : '0';

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">🧪 A/B Testing Engine</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Autonomous landing page optimization — inform, don't gate
                    </p>
                </div>
                <button
                    onClick={triggerEngine}
                    disabled={triggeringEngine}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50"
                >
                    {triggeringEngine ? '⚙️ Running...' : '⚡ Run Engine Now'}
                </button>
            </div>

            {!experiment ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
                    <p className="text-lg font-medium text-yellow-800">No active experiment</p>
                    <p className="text-sm text-yellow-600 mt-2">Run the Supabase migration and seed the initial experiment to get started.</p>
                </div>
            ) : (
                <>
                    {/* Stats Overview */}
                    <div className="grid grid-cols-4 gap-4 mb-8">
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <p className="text-xs text-gray-500 uppercase tracking-wider">Total Impressions</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{totalImpressions.toLocaleString()}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <p className="text-xs text-gray-500 uppercase tracking-wider">Total Conversions</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{totalConversions.toLocaleString()}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <p className="text-xs text-gray-500 uppercase tracking-wider">Overall Rate</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{overallRate}%</p>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <p className="text-xs text-gray-500 uppercase tracking-wider">Active Variants</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{activeVariants.length}</p>
                        </div>
                    </div>

                    {/* Active Variants */}
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Variants</h2>
                    <div className="space-y-4 mb-8">
                        {activeVariants.map((variant) => {
                            const colors = getSlotColor(variant.slot);
                            const rate = variant.impressions > 0
                                ? (variant.conversions / variant.impressions * 100).toFixed(2)
                                : '---';

                            return (
                                <div
                                    key={variant.id}
                                    className={`${colors.bg} border-l-4 ${colors.border} rounded-xl p-6`}
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${colors.badge}`}>
                                                {variant.slot}
                                            </span>
                                            <span className="text-xs text-gray-400">{variant.id}</span>
                                            <span className="text-xs text-gray-400">│ {variant.weight}% traffic</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {variant.slot !== 'champion' && (
                                                <button
                                                    onClick={() => killVariant(variant.id)}
                                                    className="text-red-500 hover:text-red-700 text-xs font-medium px-2 py-1 rounded hover:bg-red-50 transition"
                                                >
                                                    Kill ☠️
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Content Preview */}
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">Banner</p>
                                            <p className="text-sm font-medium text-gray-900">{variant.content.banner_text}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">CTA</p>
                                            <p className="text-sm font-medium text-gray-900">{variant.content.cta_primary}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-xs text-gray-500 mb-1">Subheadline</p>
                                            <p className="text-sm text-gray-700">{variant.content.subheadline}</p>
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="flex items-center gap-6 text-sm">
                                        <div>
                                            <span className="text-gray-500">Impressions: </span>
                                            <span className="font-semibold text-gray-900">{variant.impressions.toLocaleString()}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Conversions: </span>
                                            <span className="font-semibold text-gray-900">{variant.conversions}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Rate: </span>
                                            <span className="font-bold text-gray-900">{rate}%</span>
                                        </div>
                                        {variant.slot !== 'champion' && (
                                            <div>
                                                <span className="text-gray-500">Confidence: </span>
                                                <span className={`font-bold ${variant.confidence >= 0.95 ? 'text-green-600' : variant.confidence >= 0.70 ? 'text-yellow-600' : 'text-gray-600'}`}>
                                                    {(variant.confidence * 100).toFixed(1)}%
                                                </span>
                                            </div>
                                        )}

                                        {/* Visual confidence bar */}
                                        {variant.slot !== 'champion' && (
                                            <div className="flex-1 max-w-[200px]">
                                                <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${variant.confidence >= 0.95 ? 'bg-green-500' : variant.confidence >= 0.70 ? 'bg-yellow-500' : 'bg-gray-400'}`}
                                                        style={{ width: `${Math.min(variant.confidence * 100, 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Event Log */}
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity Log</h2>
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-8">
                        {events.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">
                                No events yet — the engine hasn't run yet
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {events.map((event) => (
                                    <div key={event.id} className="px-6 py-3 flex items-center gap-4">
                                        <span className="text-lg">{getEventIcon(event.event_type)}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900">
                                                {event.event_type.charAt(0).toUpperCase() + event.event_type.slice(1)}
                                                {event.details?.improvement_pct && (
                                                    <span className="text-green-600 ml-2">+{event.details.improvement_pct}%</span>
                                                )}
                                            </p>
                                            <p className="text-xs text-gray-500 truncate">
                                                {event.variant_id}
                                                {event.details?.slot && ` • ${event.details.slot}`}
                                                {event.details?.confidence && ` • ${(event.details.confidence * 100).toFixed(1)}% confidence`}
                                            </p>
                                        </div>
                                        <span className="text-xs text-gray-400">
                                            {new Date(event.created_at).toLocaleDateString('en-US', {
                                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Killed Variants */}
                    {killedVariants.length > 0 && (
                        <>
                            <h2 className="text-lg font-semibold text-gray-400 mb-4">Killed Variants</h2>
                            <div className="space-y-2 mb-8">
                                {killedVariants.map((variant) => (
                                    <div key={variant.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4 opacity-60">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-gray-400">☠️ {variant.id}</span>
                                                <span className="text-xs text-gray-400">
                                                    │ {variant.impressions} imp │ {(variant.conversion_rate * 100).toFixed(2)}% rate
                                                </span>
                                            </div>
                                            <span className="text-xs text-gray-400">
                                                Killed {new Date(variant.killed_at!).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1 truncate">{variant.content.subheadline}</p>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
}
