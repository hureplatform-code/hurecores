import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

interface PAYEBand {
    limit: number;
    rate: number;
}

interface StatutoryRules {
    payeBands: PAYEBand[];
    personalRelief: number;
    shifRate: number; // Percentage
    nssfTierI: number; // Fixed or Percentage
    nssfTierII: number; // Percentage
    housingLevyRate: number; // Percentage
    nssfTierILimit: number;
    nssfTierIILimit: number;
}

const DEFAULT_RULES: StatutoryRules = {
    payeBands: [
        { limit: 24000, rate: 0.1 },
        { limit: 32333, rate: 0.25 },
        { limit: 500000, rate: 0.3 },
        { limit: 800000, rate: 0.325 },
        { limit: Infinity, rate: 0.35 }
    ],
    personalRelief: 2400,
    shifRate: 2.75,
    nssfTierI: 360,     // 6% of 6,000
    nssfTierII: 0.06,   // 6% of basic - Tier I
    housingLevyRate: 1.5,
    nssfTierILimit: 6000,
    nssfTierIILimit: 18000
};

const StatutoryRulesManager: React.FC = () => {
    const [rules, setRules] = useState<StatutoryRules>(DEFAULT_RULES);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        loadRules();
    }, []);

    const loadRules = async () => {
        try {
            const docRef = doc(db, 'system_settings', 'payroll_rules');
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                setRules({ ...DEFAULT_RULES, ...docSnap.data() } as StatutoryRules);
            }
        } catch (err) {
            console.error('Error loading rules:', err);
            setError('Failed to load rules');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setSuccess('');
        setError('');

        try {
            const docRef = doc(db, 'system_settings', 'payroll_rules');
            await setDoc(docRef, {
                ...rules,
                updatedAt: serverTimestamp()
            });
            setSuccess('Statutory rules updated successfully');
        } catch (err) {
            console.error('Error saving rules:', err);
            setError('Failed to save rules');
        } finally {
            setSaving(false);
        }
    };

    const handleBandChange = (index: number, field: keyof PAYEBand, value: number) => {
        const newBands = [...rules.payeBands];
        newBands[index] = { ...newBands[index], [field]: value };
        setRules({ ...rules, payeBands: newBands });
    };

    const addBand = () => {
        setRules({
            ...rules,
            payeBands: [...rules.payeBands, { limit: 0, rate: 0 }]
        });
    };

    const removeBand = (index: number) => {
        const newBands = [...rules.payeBands];
        newBands.splice(index, 1);
        setRules({ ...rules, payeBands: newBands });
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading rules...</div>;

    return (
        <div className="max-w-4xl mx-auto p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-900">Kenya Statutory Rules (KRA)</h2>
                {success && <span className="text-sm text-emerald-600 font-medium px-3 py-1 bg-emerald-50 rounded-lg">{success}</span>}
                {error && <span className="text-sm text-red-600 font-medium px-3 py-1 bg-red-50 rounded-lg">{error}</span>}
            </div>

            <div className="space-y-8">
                {/* General Rates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Personal Relief (Monthly)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-slate-500">KES</span>
                            <input
                                type="number"
                                value={rules.personalRelief}
                                onChange={e => setRules({ ...rules, personalRelief: Number(e.target.value) })}
                                className="w-full pl-12 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Housing Levy (%)</label>
                        <input
                            type="number"
                            step="0.01"
                            value={rules.housingLevyRate}
                            onChange={e => setRules({ ...rules, housingLevyRate: Number(e.target.value) })}
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">SHIF Rate (%)</label>
                        <input
                            type="number"
                            step="0.01"
                            value={rules.shifRate}
                            onChange={e => setRules({ ...rules, shifRate: Number(e.target.value) })}
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>

                {/* NSSF */}
                <div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100">NSSF Configuration</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Tier I Limit (KES)</label>
                            <input
                                type="number"
                                value={rules.nssfTierILimit}
                                onChange={e => setRules({ ...rules, nssfTierILimit: Number(e.target.value) })}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Tier II Limit (KES)</label>
                            <input
                                type="number"
                                value={rules.nssfTierIILimit}
                                onChange={e => setRules({ ...rules, nssfTierIILimit: Number(e.target.value) })}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* PAYE Bands */}
                <div>
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                        <h3 className="text-lg font-semibold text-slate-800">PAYE Tax Bands (Monthly)</h3>
                        <button onClick={addBand} className="text-sm text-blue-600 hover:text-blue-700 font-medium">+ Add Band</button>
                    </div>

                    <div className="space-y-3">
                        {rules.payeBands.map((band, idx) => (
                            <div key={idx} className="flex items-center gap-4">
                                <span className="text-sm text-slate-500 w-8">{idx + 1}.</span>
                                <div className="flex-1">
                                    <label className="block text-xs text-slate-500 mb-1">Upper Limit (Use 0 for Infinity)</label>
                                    <input
                                        type="number"
                                        value={band.limit === Infinity ? 0 : band.limit}
                                        onChange={e => handleBandChange(idx, 'limit', Number(e.target.value) || Infinity)}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                                        placeholder="Max Amount"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs text-slate-500 mb-1">Rate (0.1 = 10%)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={band.rate}
                                        onChange={e => handleBandChange(idx, 'rate', Number(e.target.value))}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                                        placeholder="Rate"
                                    />
                                </div>
                                <button onClick={() => removeBand(idx)} className="text-red-500 hover:text-red-700 mt-5">✕</button>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                        * Bands apply cumulatively. Set the UPPER limit for each band. Order matters (lowest to highest).
                    </p>
                </div>

                {/* Save Action */}
                <div className="pt-6 border-t border-slate-100 flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 transition-colors"
                    >
                        {saving ? 'Saving...' : 'Save Global Rules'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StatutoryRulesManager;
