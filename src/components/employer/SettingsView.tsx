import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { organizationService } from '../../lib/services/organization.service';
import type { Organization } from '../../types';

const SettingsView: React.FC = () => {
    const { user } = useAuth();
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '' });

    useEffect(() => {
        if (user?.organizationId) {
            loadOrganization();
        }
    }, [user?.organizationId]);

    const loadOrganization = async () => {
        if (!user?.organizationId) return;

        setLoading(true);
        try {
            const org = await organizationService.getById(user.organizationId);
            setOrganization(org);
            if (org) {
                setFormData({ name: org.name || '', email: org.email || '' });
            }
        } catch (err) {
            console.error('Error loading organization:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!user?.organizationId) return;

        setSaving(true);
        try {
            await organizationService.update(user.organizationId, {
                name: formData.name,
                email: formData.email
            });
            alert('Settings saved successfully');
        } catch (err) {
            console.error('Error saving settings:', err);
            alert('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="p-8 max-w-3xl mx-auto flex items-center justify-center h-64">
                <div className="animate-spin text-4xl">⏳</div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-3xl mx-auto h-full flex flex-col animate-in fade-in duration-500">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
                <p className="text-slate-500">Manage general organization preferences.</p>
            </div>

            <div className="space-y-8">
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-6">General Information</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Organization Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-2 border rounded-xl font-medium"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Contact Email</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-4 py-2 border rounded-xl font-medium"
                            />
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>

                <div className="bg-red-50 p-8 rounded-3xl border border-red-100">
                    <h3 className="text-lg font-bold text-red-900 mb-2">Danger Zone</h3>
                    <p className="text-red-700 mb-6 text-sm">
                        Deactivating your organization will restrict access for all staff members.
                        This action can be reversed by a Super Admin, but data may be archived.
                    </p>
                    <button className="px-6 py-2 bg-white border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50">
                        Deactivate Organization
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsView;
