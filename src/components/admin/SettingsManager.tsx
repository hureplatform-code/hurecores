// =====================================================
// SETTINGS MANAGER
// Platform configuration for Super Admin
// Sections: Platform Rules, Billing Defaults, Compliance, Notifications
// =====================================================

import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import {
    doc,
    getDoc,
    setDoc,
    addDoc,
    collection,
    serverTimestamp
} from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';

// =====================================================
// INTERFACES
// =====================================================

interface PlatformSettings {
    // Platform Rules
    trialDuration: number;
    autoSuspensionEnabled: boolean;
    billingCycleLength: number;

    // Billing Defaults
    paymentProviders: {
        flutterwave: boolean;
        mpesa: boolean;
    };
    autoPayAllowed: boolean;

    // Compliance / Governance
    requireOrgApproval: boolean;
    requireFacilityApproval: boolean;

    // Notifications
    enableBillingEmails: boolean;
    enableSuspensionAlerts: boolean;

    // Meta
    lastUpdated?: any;
    updatedBy?: string;
}

// =====================================================
// COMPONENT
// =====================================================

const SettingsManager: React.FC = () => {
    const { user } = useAuth();
    const [settings, setSettings] = useState<PlatformSettings>({
        trialDuration: 10,
        autoSuspensionEnabled: true,
        billingCycleLength: 31,
        paymentProviders: {
            flutterwave: true,
            mpesa: true
        },
        autoPayAllowed: true,
        requireOrgApproval: true,
        requireFacilityApproval: false,
        enableBillingEmails: true,
        enableSuspensionAlerts: true
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // =====================================================
    // DATA LOADING
    // =====================================================

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const settingsDoc = await getDoc(doc(db, 'platformSettings', 'config'));
            if (settingsDoc.exists()) {
                setSettings(settingsDoc.data() as PlatformSettings);
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        } finally {
            setLoading(false);
        }
    };

    // =====================================================
    // SAVE SETTINGS
    // =====================================================

    const handleSave = async () => {
        setSaving(true);
        try {
            await setDoc(doc(db, 'platformSettings', 'config'), {
                ...settings,
                lastUpdated: serverTimestamp(),
                updatedBy: user?.email || 'Super Admin'
            });

            // Log the change
            await addDoc(collection(db, 'auditLogs'), {
                action: 'Platform settings updated',
                category: 'Settings',
                entityType: 'Settings',
                entityName: 'Platform Configuration',
                performedBy: user?.id || 'system',
                performedByEmail: user?.email || 'Super Admin',
                createdAt: serverTimestamp()
            });

            setHasChanges(false);
            alert('Settings saved successfully!');
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const updateSetting = (key: string, value: any) => {
        setSettings(prev => {
            const updated = { ...prev };
            const keys = key.split('.');
            if (keys.length === 2) {
                (updated as any)[keys[0]][keys[1]] = value;
            } else {
                (updated as any)[key] = value;
            }
            return updated;
        });
        setHasChanges(true);
    };

    // =====================================================
    // RENDER TOGGLE
    // =====================================================

    const Toggle: React.FC<{ enabled: boolean; onChange: (val: boolean) => void; disabled?: boolean }> = ({ enabled, onChange, disabled }) => (
        <button
            onClick={() => !disabled && onChange(!enabled)}
            disabled={disabled}
            className={`relative w-12 h-6 rounded-full transition-colors ${enabled ? 'bg-blue-600' : 'bg-slate-300'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
            <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
            />
        </button>
    );

    // =====================================================
    // RENDER
    // =====================================================

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin text-4xl">⏳</div>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-500 max-w-4xl">
            {/* Platform Rules */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <span>📋</span> Platform Rules
                </h3>

                <div className="space-y-6">
                    {/* Trial Duration */}
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="font-medium text-slate-900">Trial Duration</div>
                            <div className="text-sm text-slate-500">Number of days for trial period (starts from Enable Access)</div>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={settings.trialDuration}
                                onChange={(e) => updateSetting('trialDuration', parseInt(e.target.value) || 10)}
                                className="w-20 border border-slate-200 rounded-lg px-3 py-2 text-center font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-slate-500">days</span>
                        </div>
                    </div>

                    {/* Auto-suspension */}
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="font-medium text-slate-900">Auto-suspension enabled</div>
                            <div className="text-sm text-slate-500">Automatically suspend access on non-payment</div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-slate-500">Read-only</span>
                            <Toggle enabled={settings.autoSuspensionEnabled} onChange={() => { }} disabled={true} />
                        </div>
                    </div>

                    {/* Billing Cycle */}
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="font-medium text-slate-900">Billing Cycle Length</div>
                            <div className="text-sm text-slate-500">Days between renewals</div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-slate-500">Read-only</span>
                            <div className="px-4 py-2 bg-slate-100 rounded-lg text-slate-700 font-medium">
                                {settings.billingCycleLength} days
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Billing Defaults */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <span>💳</span> Billing Defaults
                </h3>

                <div className="space-y-6">
                    {/* Payment Providers */}
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="font-medium text-slate-900">Payment Providers</div>
                            <div className="text-sm text-slate-500">Enabled payment methods</div>
                        </div>
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.paymentProviders.flutterwave}
                                    onChange={(e) => updateSetting('paymentProviders.flutterwave', e.target.checked)}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-slate-700">Flutterwave</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.paymentProviders.mpesa}
                                    onChange={(e) => updateSetting('paymentProviders.mpesa', e.target.checked)}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-slate-700">M-Pesa</span>
                            </label>
                        </div>
                    </div>

                    {/* Auto-pay */}
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="font-medium text-slate-900">Auto-pay Allowed</div>
                            <div className="text-sm text-slate-500">Allow employers to enable automatic recurring payments</div>
                        </div>
                        <Toggle
                            enabled={settings.autoPayAllowed}
                            onChange={(val) => updateSetting('autoPayAllowed', val)}
                        />
                    </div>
                </div>
            </div>

            {/* Compliance / Governance */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <span>🛡️</span> Compliance / Governance
                </h3>

                <div className="space-y-6">
                    {/* Require Org Approval */}
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="font-medium text-slate-900">Require Organization Approval</div>
                            <div className="text-sm text-slate-500">Organizations must be approved before Enable Access</div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-emerald-600">Required</span>
                            <Toggle enabled={true} onChange={() => { }} disabled={true} />
                        </div>
                    </div>

                    {/* Require Facility Approval */}
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="font-medium text-slate-900">Require Facility Approval</div>
                            <div className="text-sm text-slate-500">Facilities must be approved separately (future feature)</div>
                        </div>
                        <Toggle
                            enabled={settings.requireFacilityApproval}
                            onChange={(val) => updateSetting('requireFacilityApproval', val)}
                        />
                    </div>
                </div>
            </div>

            {/* Notifications */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <span>🔔</span> Notifications
                </h3>

                <div className="space-y-6">
                    {/* Billing Emails */}
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="font-medium text-slate-900">Enable Billing Emails</div>
                            <div className="text-sm text-slate-500">Send payment receipts and renewal reminders</div>
                        </div>
                        <Toggle
                            enabled={settings.enableBillingEmails}
                            onChange={(val) => updateSetting('enableBillingEmails', val)}
                        />
                    </div>

                    {/* Suspension Alerts */}
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="font-medium text-slate-900">Enable Suspension Alerts</div>
                            <div className="text-sm text-slate-500">Notify employers before and after suspension</div>
                        </div>
                        <Toggle
                            enabled={settings.enableSuspensionAlerts}
                            onChange={(val) => updateSetting('enableSuspensionAlerts', val)}
                        />
                    </div>
                </div>
            </div>

            {/* Save Button */}
            {hasChanges && (
                <div className="flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default SettingsManager;
