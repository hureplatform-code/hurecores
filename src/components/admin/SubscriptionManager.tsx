import React, { useState, useEffect } from 'react';
import { adminService } from '../../lib/services';
import type { Organization } from '../../types';
import { PLANS } from '../../constants';

const SubscriptionManager: React.FC = () => {
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSubscriptions();
    }, []);

    const loadSubscriptions = async () => {
        setLoading(true);
        try {
            const orgs = await adminService.getAllOrganizations({ status: 'Active' });
            setOrganizations(orgs);
        } catch (err) {
            console.error('Error loading subscriptions:', err);
        } finally {
            setLoading(false);
        }
    };

    const getPlanAmount = (planId?: string): number => {
        if (!planId) return 0;
        const plan = PLANS.find(p => p.id === planId || p.name === planId);
        if (!plan) return 0;
        // Extract number from price string like "KES 4,500"
        const priceStr = plan.price.replace(/[^0-9]/g, '');
        return parseInt(priceStr, 10) || 0;
    };

    const handleStatusChange = async (orgId: string, newStatus: 'Active' | 'Suspended') => {
        try {
            await adminService.updateAccountStatus(orgId, newStatus);
            await loadSubscriptions();
        } catch (err) {
            console.error('Error updating status:', err);
            alert('Failed to update subscription status');
        }
    };

    const totalMRR = organizations
        .filter(o => o.accountStatus === 'Active')
        .reduce((sum, o) => sum + getPlanAmount(o.plan), 0);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin text-4xl">⏳</div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-end mb-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Subscriptions</h2>
                    <p className="text-slate-500">Manage recurring billing and plans.</p>
                </div>
                <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-lg">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total MRR</div>
                    <div className="text-2xl font-bold">KES {totalMRR.toLocaleString()}</div>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                {organizations.length === 0 ? (
                    <div className="p-16 text-center">
                        <div className="text-6xl mb-4 opacity-20">💳</div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">No Active Subscriptions</h3>
                        <p className="text-slate-500">No organizations with active subscriptions.</p>
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4">Clinic Name</th>
                                <th className="px-6 py-4">Current Plan</th>
                                <th className="px-6 py-4">Monthly Fee</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Next Billing</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {organizations.map((org) => (
                                <tr key={org.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-slate-900">{org.name}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border ${org.plan?.includes('Professional') ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-blue-50 text-blue-700 border-blue-100'
                                            }`}>
                                            {org.plan || 'Essential'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-slate-600">KES {getPlanAmount(org.plan).toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold border ${org.accountStatus === 'Active' ? 'bg-green-50 text-green-700 border-green-200' :
                                            org.accountStatus === 'Suspended' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'
                                            }`}>
                                            {org.accountStatus || 'Pending'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">N/A</td>
                                    <td className="px-6 py-4 text-right">
                                        <select
                                            className="bg-white border border-slate-200 rounded-lg text-xs font-bold py-1 px-2 text-slate-700 outline-none focus:border-blue-500"
                                            value={org.accountStatus || 'Pending'}
                                            onChange={(e) => handleStatusChange(org.id, e.target.value as any)}
                                        >
                                            <option value="Active">Active</option>
                                            <option value="Suspended">Suspend</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default SubscriptionManager;
