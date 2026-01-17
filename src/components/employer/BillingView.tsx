import React, { useState, useEffect } from 'react';
import { PLANS } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import { organizationService } from '../../lib/services/organization.service';
import { staffService } from '../../lib/services/staff.service';
import type { Organization, Subscription } from '../../types';

interface BillingViewProps {
    organization?: Organization | null;
}

const BillingView: React.FC<BillingViewProps> = ({ organization: orgProp }) => {
    const { user } = useAuth();
    const [organization, setOrganization] = useState<Organization | null>(orgProp || null);
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [usage, setUsage] = useState({ locations: 0, staff: 0, admins: 0 });
    const [loading, setLoading] = useState(!orgProp);

    useEffect(() => {
        if (user?.organizationId && !orgProp) {
            loadData();
        } else if (orgProp) {
            setOrganization(orgProp);
            loadUsageData();
        }
    }, [user?.organizationId, orgProp]);

    const loadData = async () => {
        if (!user?.organizationId) return;

        setLoading(true);
        try {
            const [org, sub] = await Promise.all([
                organizationService.getById(user.organizationId),
                organizationService.getSubscription(user.organizationId)
            ]);
            setOrganization(org);
            setSubscription(sub);
            await loadUsageData();
        } catch (err) {
            console.error('Error loading billing data:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadUsageData = async () => {
        if (!user?.organizationId) return;
        try {
            const [locations, staffData, adminData] = await Promise.all([
                organizationService.getLocations(user.organizationId),
                staffService.getActiveCount(user.organizationId),
                staffService.checkAdminSeatAvailability(user.organizationId)
            ]);
            setUsage({
                locations: locations.length,
                staff: staffData,
                admins: adminData.used
            });
        } catch (err) {
            console.error('Error loading usage data:', err);
        }
    };

    const currentPlanId = organization?.plan || 'Professional';
    const currentPlan = PLANS.find(p => p.id === currentPlanId) || PLANS[1];

    const renewDate = subscription?.currentPeriodEnd
        ? new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'N/A';

    const maxLocations = organization?.maxLocations || currentPlan.locations;
    const maxStaff = organization?.maxStaff || currentPlan.staff;
    const maxAdmins = organization?.maxAdmins || currentPlan.admins;

    if (loading) {
        return (
            <div className="p-8 max-w-7xl mx-auto flex items-center justify-center h-64">
                <div className="animate-spin text-4xl">⏳</div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto h-full flex flex-col animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Billing & Subscription</h2>
                    <p className="text-slate-500">Manage your plan and payment methods.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                {/* Current Plan Card */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <div className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Current Plan</div>
                                <h3 className="text-3xl font-bold">{currentPlan.name}</h3>
                            </div>
                            <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${subscription?.status === 'Active' || subscription?.status === 'Trial'
                                    ? 'bg-green-500 text-white'
                                    : 'bg-amber-500 text-white'
                                }`}>
                                {subscription?.status || 'Trial'}
                            </span>
                        </div>

                        <div className="text-4xl font-bold mb-2">{currentPlan.price}<span className="text-lg font-medium text-slate-400">/mo</span></div>
                        <p className="text-slate-400 text-sm mb-8">Renews on {renewDate}</p>

                        <div className="flex space-x-4">
                            <button className="flex-1 bg-white text-slate-900 py-3 rounded-xl font-bold hover:bg-slate-100 transition-colors">Manage Subscription</button>
                            <button className="flex-1 bg-transparent border border-slate-600 text-white py-3 rounded-xl font-bold hover:bg-white/10 transition-colors">View Invoices</button>
                        </div>
                    </div>
                </div>

                {/* Usage Limits */}
                <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-6">Plan Usage Limits</h3>
                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between text-sm font-bold mb-2">
                                <span className="text-slate-700">Locations</span>
                                <span className="text-slate-900">{usage.locations} / {maxLocations} Used</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-3">
                                <div className="bg-blue-600 h-3 rounded-full" style={{ width: `${Math.min(100, (usage.locations / maxLocations) * 100)}%` }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm font-bold mb-2">
                                <span className="text-slate-700">Staff Members</span>
                                <span className="text-slate-900">{usage.staff} / {maxStaff} Used</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-3">
                                <div className="bg-indigo-600 h-3 rounded-full" style={{ width: `${Math.min(100, (usage.staff / maxStaff) * 100)}%` }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm font-bold mb-2">
                                <span className="text-slate-700">Admin Roles</span>
                                <span className="text-slate-900">{usage.admins} / {maxAdmins} Used</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-3">
                                <div className="bg-purple-600 h-3 rounded-full" style={{ width: `${Math.min(100, (usage.admins / maxAdmins) * 100)}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Upgrade Options */}
            <div>
                <h3 className="text-xl font-bold text-slate-900 mb-6">Available Plans</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {PLANS.map((p, i) => (
                        <div key={i} className={`p-6 rounded-2xl border transition-all ${p.id === currentPlanId ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-100' : 'border-slate-200 bg-white hover:border-blue-300'}`}>
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-bold text-lg text-slate-900">{p.name}</h4>
                                {p.id === currentPlanId && <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded">Current</span>}
                            </div>
                            <div className="text-2xl font-bold text-slate-900 mb-4">{p.price}<span className="text-sm font-medium text-slate-500">/mo</span></div>
                            <ul className="space-y-2 mb-6">
                                <li className="text-sm text-slate-600 flex items-center">✓ Up to {p.locations} Locations</li>
                                <li className="text-sm text-slate-600 flex items-center">✓ Up to {p.staff} Staff</li>
                                <li className="text-sm text-slate-600 flex items-center">✓ {p.admins} Admins</li>
                            </ul>
                            {p.id !== currentPlanId && (
                                <button className="w-full py-2 border border-slate-300 rounded-lg text-sm font-bold hover:bg-slate-50 text-slate-700">Upgrade</button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default BillingView;
