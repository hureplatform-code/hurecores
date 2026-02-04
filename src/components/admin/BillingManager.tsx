// =====================================================
// BILLING MANAGER
// Comprehensive billing module with tabbed sections:
// 1. Overview (revenue metrics + alerts)
// 2. Subscriptions (org-level list)
// 3. Pricing & Plans (editable prices)
// =====================================================

import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import {
    collection,
    query,
    getDocs,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    addDoc,
    where,
    orderBy,
    serverTimestamp
} from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { PrivacyMask, PrivacyToggle } from '../common/PrivacyControl';

// =====================================================
// INTERFACES
// =====================================================

interface Subscription {
    id: string;
    organizationId: string;
    organizationName: string;
    plan: string;
    status: 'TRIAL' | 'ACTIVE' | 'SUSPENDED';
    amount: number;
    lastPayment?: any;
    nextRenewal?: any;
    trialEndsAt?: any;
    createdAt: any;
}

interface PlanPricing {
    essential: number;
    professional: number;
    enterprise: number;
    lastUpdated?: any;
    updatedBy?: string;
}

interface BillingAlert {
    id: string;
    type: 'payment_failed' | 'trial_expiring' | 'suspended';
    organizationName: string;
    message: string;
    createdAt: any;
}

// =====================================================
// COMPONENT
// =====================================================

const BillingManager: React.FC = () => {
    const { user } = useAuth();
    const [billingTab, setBillingTab] = useState<'overview' | 'subscriptions' | 'pricing'>('overview');
    const [showFinancials, setShowFinancials] = useState(false);

    // Data
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [pricing, setPricing] = useState<PlanPricing>({
        essential: 8000,
        professional: 15000,
        enterprise: 25000
    });
    const [alerts, setAlerts] = useState<BillingAlert[]>([]);
    const [loading, setLoading] = useState(true);

    // Subscriptions filters
    const [statusFilter, setStatusFilter] = useState<string>('All');
    const [planFilter, setPlanFilter] = useState<string>('All');
    const [searchQuery, setSearchQuery] = useState('');

    // Pricing edit state
    const [editPricing, setEditPricing] = useState<PlanPricing>({
        essential: 8000,
        professional: 15000,
        enterprise: 25000
    });
    const [savingPricing, setSavingPricing] = useState(false);

    // Action menu
    const [activeMenu, setActiveMenu] = useState<string | null>(null);

    // =====================================================
    // DATA LOADING
    // =====================================================

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load Organizations as Subscriptions
            const orgsQuery = query(collection(db, 'organizations'), orderBy('createdAt', 'desc'));
            const orgsSnap = await getDocs(orgsQuery);

            const subsData: Subscription[] = orgsSnap.docs
                .filter(doc => {
                    const data = doc.data();
                    // Only include approved/active orgs (not pending review)
                    return data.orgStatus !== 'Pending' && data.approvalStatus !== 'Pending Review';
                })
                .map(doc => {
                    const data = doc.data();

                    let status: 'TRIAL' | 'ACTIVE' | 'SUSPENDED' = 'TRIAL';
                    if (data.approvalStatus === 'Active' || data.orgStatus === 'Active') {
                        status = 'ACTIVE';
                    } else if (data.approvalStatus === 'Suspended' || data.orgStatus === 'Suspended') {
                        status = 'SUSPENDED';
                    } else if (data.approvalStatus === 'Approved') {
                        status = 'TRIAL';
                    }

                    // Calculate trial end date (10 days from enabled)
                    let trialEndsAt = null;
                    if (data.enabledAt) {
                        const enabledDate = new Date(data.enabledAt.seconds * 1000);
                        trialEndsAt = new Date(enabledDate.getTime() + 10 * 24 * 60 * 60 * 1000);
                    }

                    // Calculate next renewal (31 days from last payment or enabled date)
                    let nextRenewal = null;
                    if (data.lastPaymentAt) {
                        const lastPaymentDate = new Date(data.lastPaymentAt.seconds * 1000);
                        nextRenewal = new Date(lastPaymentDate.getTime() + 31 * 24 * 60 * 60 * 1000);
                    }

                    return {
                        id: doc.id,
                        organizationId: doc.id,
                        organizationName: data.name || 'Unknown',
                        plan: data.plan || 'Essential',
                        status,
                        amount: getPlanAmount(data.plan || 'Essential'),
                        lastPayment: data.lastPaymentAt,
                        nextRenewal,
                        trialEndsAt,
                        createdAt: data.createdAt
                    };
                });

            setSubscriptions(subsData);

            // Load Pricing from settings
            const pricingDoc = await getDoc(doc(db, 'platformSettings', 'pricing'));
            if (pricingDoc.exists()) {
                const pricingData = pricingDoc.data() as PlanPricing;
                setPricing(pricingData);
                setEditPricing(pricingData);
            }

            // Generate alerts based on subscription status
            const alertsData: BillingAlert[] = [];

            // Suspended orgs
            subsData.filter(s => s.status === 'SUSPENDED').forEach(sub => {
                alertsData.push({
                    id: `suspended-${sub.id}`,
                    type: 'suspended',
                    organizationName: sub.organizationName,
                    message: `${sub.organizationName} subscription is suspended due to non-payment`,
                    createdAt: new Date()
                });
            });

            // Trials expiring soon (within 3 days)
            const now = new Date();
            subsData.filter(s => s.status === 'TRIAL' && s.trialEndsAt).forEach(sub => {
                const daysRemaining = Math.ceil((sub.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                if (daysRemaining <= 3 && daysRemaining > 0) {
                    alertsData.push({
                        id: `trial-${sub.id}`,
                        type: 'trial_expiring',
                        organizationName: sub.organizationName,
                        message: `${sub.organizationName} trial expires in ${daysRemaining} day(s)`,
                        createdAt: new Date()
                    });
                }
            });

            setAlerts(alertsData);

        } catch (error) {
            console.error('Error loading billing data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getPlanAmount = (plan: string): number => {
        switch (plan) {
            case 'Essential': return pricing.essential;
            case 'Professional': return pricing.professional;
            case 'Enterprise': return pricing.enterprise;
            default: return pricing.essential;
        }
    };

    // =====================================================
    // METRICS CALCULATIONS
    // =====================================================

    const getMetrics = () => {
        const activeSubscriptions = subscriptions.filter(s => s.status === 'ACTIVE');
        const trialSubscriptions = subscriptions.filter(s => s.status === 'TRIAL');
        const suspendedSubscriptions = subscriptions.filter(s => s.status === 'SUSPENDED');

        // Total MRR (Monthly Recurring Revenue) from active subscriptions
        const totalMRR = activeSubscriptions.reduce((sum, sub) => sum + getPlanAmount(sub.plan), 0);

        // Revenue this month (same as MRR for simplicity)
        const revenueThisMonth = totalMRR;

        // Suspended/Unpaid amount
        const suspendedAmount = suspendedSubscriptions.reduce((sum, sub) => sum + getPlanAmount(sub.plan), 0);

        // Plan breakdown
        const essentialSubs = activeSubscriptions.filter(s => s.plan === 'Essential');
        const professionalSubs = activeSubscriptions.filter(s => s.plan === 'Professional');
        const enterpriseSubs = activeSubscriptions.filter(s => s.plan === 'Enterprise');

        return {
            totalMRR,
            revenueThisMonth,
            suspendedAmount,
            activeCount: activeSubscriptions.length,
            trialCount: trialSubscriptions.length,
            suspendedCount: suspendedSubscriptions.length,
            plans: {
                essential: {
                    count: essentialSubs.length,
                    mrr: essentialSubs.length * pricing.essential
                },
                professional: {
                    count: professionalSubs.length,
                    mrr: professionalSubs.length * pricing.professional
                },
                enterprise: {
                    count: enterpriseSubs.length,
                    mrr: enterpriseSubs.length * pricing.enterprise
                }
            }
        };
    };

    const metrics = getMetrics();

    // =====================================================
    // PRICING ACTIONS
    // =====================================================

    const handleSavePricing = async () => {
        if (!confirm('Save pricing changes? This will apply to new subscriptions and reactivations only.')) return;

        setSavingPricing(true);
        try {
            // Log the change
            await addDoc(collection(db, 'auditLogs'), {
                action: 'Plan pricing updated',
                category: 'Pricing',
                entityType: 'Pricing',
                entityName: 'Core Subscription Plans',
                performedBy: user?.id || 'system',
                performedByEmail: user?.email || 'Super Admin',
                details: {
                    oldPricing: pricing,
                    newPricing: editPricing
                },
                createdAt: serverTimestamp()
            });

            // Save pricing
            await setDoc(doc(db, 'platformSettings', 'pricing'), {
                essential: editPricing.essential,
                professional: editPricing.professional,
                enterprise: editPricing.enterprise,
                lastUpdated: serverTimestamp(),
                updatedBy: user?.email || 'Super Admin'
            });

            setPricing(editPricing);
            alert('Pricing saved successfully!');
        } catch (error) {
            console.error('Error saving pricing:', error);
            alert('Failed to save pricing');
        } finally {
            setSavingPricing(false);
        }
    };

    // =====================================================
    // SUBSCRIPTION ACTIONS
    // =====================================================

    const handleResumeSubscription = async (sub: Subscription) => {
        if (!confirm(`Resume subscription for ${sub.organizationName}?`)) return;

        try {
            await updateDoc(doc(db, 'organizations', sub.organizationId), {
                orgStatus: 'Active',
                approvalStatus: 'Active',
                reactivatedAt: serverTimestamp()
            });

            await addDoc(collection(db, 'auditLogs'), {
                action: 'Subscription reactivated',
                category: 'Subscription',
                entityType: 'Organization',
                entityName: sub.organizationName,
                performedBy: user?.id || 'system',
                performedByEmail: user?.email || 'Super Admin',
                details: { plan: sub.plan },
                createdAt: serverTimestamp()
            });

            await loadData();
            setActiveMenu(null);
        } catch (error) {
            console.error('Error resuming subscription:', error);
            alert('Failed to resume subscription');
        }
    };

    // =====================================================
    // FILTERING
    // =====================================================

    const getFilteredSubscriptions = () => {
        let filtered = subscriptions;

        if (statusFilter !== 'All') {
            filtered = filtered.filter(s => s.status === statusFilter);
        }

        if (planFilter !== 'All') {
            filtered = filtered.filter(s => s.plan === planFilter);
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(s => s.organizationName.toLowerCase().includes(q));
        }

        return filtered;
    };

    // =====================================================
    // HELPERS
    // =====================================================

    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'N/A';
        if (timestamp.seconds) {
            return new Date(timestamp.seconds * 1000).toLocaleDateString();
        }
        if (timestamp instanceof Date) {
            return timestamp.toLocaleDateString();
        }
        return 'N/A';
    };

    const formatCurrency = (amount: number) => {
        return `KES ${amount.toLocaleString()}`;
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'bg-emerald-100 text-emerald-700';
            case 'TRIAL': return 'bg-amber-100 text-amber-700';
            case 'SUSPENDED': return 'bg-red-100 text-red-700';
            default: return 'bg-slate-100 text-slate-600';
        }
    };

    const getTrialDaysRemaining = (sub: Subscription) => {
        if (sub.status !== 'TRIAL' || !sub.trialEndsAt) return null;
        const now = new Date();
        const days = Math.ceil((sub.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return days > 0 ? days : 0;
    };

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
        <div className="animate-in fade-in duration-500">
            {/* Billing Tabs */}
            <div className="flex items-center gap-2 mb-6">
                <button
                    onClick={() => setBillingTab('overview')}
                    className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${billingTab === 'overview'
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                >
                    Overview
                </button>
                <button
                    onClick={() => setBillingTab('subscriptions')}
                    className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${billingTab === 'subscriptions'
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                >
                    Subscriptions
                </button>
                <button
                    onClick={() => setBillingTab('pricing')}
                    className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${billingTab === 'pricing'
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                >
                    Pricing & Plans
                </button>
            </div>

            {/* ===== OVERVIEW TAB ===== */}
            {billingTab === 'overview' && (
                <div className="space-y-8">
                    {/* Billing Metrics */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-slate-800">Billing Metrics</h3>
                            <PrivacyToggle isVisible={showFinancials} onToggle={() => setShowFinancials(!showFinancials)} label={showFinancials ? 'Hide Values' : 'Show Values'} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Total MRR */}
                            <button
                                onClick={() => setBillingTab('subscriptions')}
                                className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all text-left group"
                            >
                                <div className="text-sm font-medium text-slate-500 mb-2">Total MRR</div>
                                <div className="text-4xl font-bold text-blue-600">
                                    <PrivacyMask isVisible={showFinancials}>
                                        {formatCurrency(metrics.totalMRR)}
                                    </PrivacyMask>
                                </div>
                                <div className="text-xs text-slate-500 mt-2">Monthly recurring revenue</div>
                                <div className="text-xs font-semibold text-blue-600 mt-3 group-hover:underline">View more →</div>
                            </button>

                            {/* Revenue This Month */}
                            <button
                                onClick={() => setBillingTab('subscriptions')}
                                className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-lg transition-all text-left group"
                            >
                                <div className="text-sm font-medium text-slate-500 mb-2">Revenue This Month</div>
                                <div className="text-4xl font-bold text-emerald-600">
                                    <PrivacyMask isVisible={showFinancials}>
                                        {formatCurrency(metrics.revenueThisMonth)}
                                    </PrivacyMask>
                                </div>
                                <div className="text-xs text-slate-500 mt-2">Total revenue collected this month</div>
                                <div className="text-xs font-semibold text-emerald-600 mt-3 group-hover:underline">View more →</div>
                            </button>

                            {/* Suspended (Unpaid) */}
                            <button
                                onClick={() => { setBillingTab('subscriptions'); setStatusFilter('SUSPENDED'); }}
                                className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-red-300 hover:shadow-lg transition-all text-left group"
                            >
                                <div className="text-sm font-medium text-slate-500 mb-2">Suspended (Unpaid)</div>
                                <div className="text-4xl font-bold text-red-600">
                                    <PrivacyMask isVisible={showFinancials}>
                                        {formatCurrency(metrics.suspendedAmount)}
                                    </PrivacyMask>
                                </div>
                                <div className="text-xs text-slate-500 mt-2">Restricted due to non-payment</div>
                                <div className="flex justify-between items-center mt-3">
                                    <span className="text-xs font-semibold text-red-600 group-hover:underline">View more →</span>
                                    <span className="text-xs font-bold text-red-600">
                                        <PrivacyMask isVisible={showFinancials}>
                                            {formatCurrency(metrics.suspendedAmount)}
                                        </PrivacyMask>
                                    </span>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Plan Performance */}
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Plan Performance</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Essential */}
                            <button
                                onClick={() => { setBillingTab('subscriptions'); setPlanFilter('Essential'); }}
                                className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all text-left group"
                            >
                                <div className="text-sm font-medium text-slate-500 mb-2">Essential Plan</div>
                                <div className="text-4xl font-bold text-slate-800">
                                    {formatCurrency(pricing.essential)}<span className="text-sm font-normal text-slate-400">/mo</span>
                                </div>
                                <div className="flex justify-between items-center mt-4 text-sm">
                                    <span className="text-slate-500">{metrics.plans.essential.count} Active Subscriptions</span>
                                    <span className="font-semibold text-slate-700">{metrics.plans.essential.count}</span>
                                </div>
                                <div className="flex justify-between items-center mt-1 text-sm">
                                    <span className="text-slate-500">MRR</span>
                                    <span className="font-semibold text-slate-700">
                                        <PrivacyMask isVisible={showFinancials}>
                                            {formatCurrency(metrics.plans.essential.mrr)}
                                        </PrivacyMask>
                                    </span>
                                </div>
                                <div className="text-xs font-semibold text-blue-600 mt-4 group-hover:underline">View Subscriptions →</div>
                            </button>

                            {/* Professional */}
                            <button
                                onClick={() => { setBillingTab('subscriptions'); setPlanFilter('Professional'); }}
                                className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all text-left group"
                            >
                                <div className="text-sm font-medium text-slate-500 mb-2">Professional Plan</div>
                                <div className="text-4xl font-bold text-slate-800">
                                    {formatCurrency(pricing.professional)}<span className="text-sm font-normal text-slate-400">/mo</span>
                                </div>
                                <div className="flex justify-between items-center mt-4 text-sm">
                                    <span className="text-slate-500">{metrics.plans.professional.count} Active Subscriptions</span>
                                    <span className="font-semibold text-slate-700">{metrics.plans.professional.count}</span>
                                </div>
                                <div className="flex justify-between items-center mt-1 text-sm">
                                    <span className="text-slate-500">MRR</span>
                                    <span className="font-semibold text-slate-700">
                                        <PrivacyMask isVisible={showFinancials}>
                                            {formatCurrency(metrics.plans.professional.mrr)}
                                        </PrivacyMask>
                                    </span>
                                </div>
                                <div className="text-xs font-semibold text-blue-600 mt-4 group-hover:underline">View Subscriptions →</div>
                            </button>

                            {/* Enterprise */}
                            <button
                                onClick={() => { setBillingTab('subscriptions'); setPlanFilter('Enterprise'); }}
                                className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all text-left group"
                            >
                                <div className="text-sm font-medium text-slate-500 mb-2">Enterprise Plan</div>
                                <div className="text-4xl font-bold text-slate-800">
                                    {formatCurrency(pricing.enterprise)}<span className="text-sm font-normal text-slate-400">/mo</span>
                                </div>
                                <div className="flex justify-between items-center mt-4 text-sm">
                                    <span className="text-slate-500">{metrics.plans.enterprise.count} Active Subscriptions</span>
                                    <span className="font-semibold text-slate-700">{metrics.plans.enterprise.count}</span>
                                </div>
                                <div className="flex justify-between items-center mt-1 text-sm">
                                    <span className="text-slate-500">MRR</span>
                                    <span className="font-semibold text-slate-700">
                                        <PrivacyMask isVisible={showFinancials}>
                                            {formatCurrency(metrics.plans.enterprise.mrr)}
                                        </PrivacyMask>
                                    </span>
                                </div>
                                <div className="text-xs font-semibold text-blue-600 mt-4 group-hover:underline">View Subscriptions →</div>
                            </button>
                        </div>
                    </div>

                    {/* Alerts */}
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Alerts</h3>
                        <div className="bg-white rounded-2xl border border-slate-200 p-6">
                            {alerts.length === 0 ? (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <span className="text-2xl">✓</span>
                                    </div>
                                    <p className="text-slate-600 font-medium">No billing issues detected</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {alerts.map(alert => (
                                        <div key={alert.id} className={`p-4 rounded-xl ${alert.type === 'suspended' ? 'bg-red-50 border border-red-100' :
                                            alert.type === 'trial_expiring' ? 'bg-amber-50 border border-amber-100' :
                                                'bg-slate-50 border border-slate-100'
                                            }`}>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xl">
                                                    {alert.type === 'suspended' ? '⚠️' : alert.type === 'trial_expiring' ? '⏳' : '📢'}
                                                </span>
                                                <div>
                                                    <div className="font-semibold text-slate-900">{alert.organizationName}</div>
                                                    <div className="text-sm text-slate-600">{alert.message}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ===== SUBSCRIPTIONS TAB ===== */}
            {billingTab === 'subscriptions' && (
                <div>
                    {/* Filters */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="All">All Status</option>
                                <option value="ACTIVE">Active</option>
                                <option value="TRIAL">Trial</option>
                                <option value="SUSPENDED">Suspended</option>
                            </select>

                            <select
                                value={planFilter}
                                onChange={(e) => setPlanFilter(e.target.value)}
                                className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="All">All Plans</option>
                                <option value="Essential">Essential</option>
                                <option value="Professional">Professional</option>
                                <option value="Enterprise">Enterprise</option>
                            </select>

                            <input
                                type="text"
                                placeholder="🔍 Search..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="text-sm text-slate-500">
                            {getFilteredSubscriptions().length} Subscriptions
                        </div>
                    </div>

                    {/* Subscriptions Table */}
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                                <tr>
                                    <th className="px-6 py-4">Organization</th>
                                    <th className="px-6 py-4">Plan</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Amount</th>
                                    <th className="px-6 py-4">Last Payment</th>
                                    <th className="px-6 py-4">Next Renewal</th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {getFilteredSubscriptions().length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                            No subscriptions match the current filter.
                                        </td>
                                    </tr>
                                ) : (
                                    getFilteredSubscriptions().map(sub => (
                                        <tr key={sub.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-lg font-bold text-blue-600">
                                                        {sub.organizationName?.charAt(0) || '?'}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-900">{sub.organizationName}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 font-medium">{sub.plan}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold uppercase w-fit ${getStatusBadge(sub.status)}`}>
                                                        {sub.status === 'TRIAL' ? 'TRIAL / UNPAID' : sub.status}
                                                    </span>
                                                    {sub.status === 'TRIAL' && getTrialDaysRemaining(sub) !== null && (
                                                        <span className="text-xs text-slate-500">Trial ends in {getTrialDaysRemaining(sub)} days</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-semibold text-slate-900">{formatCurrency(getPlanAmount(sub.plan))}</td>
                                            <td className="px-6 py-4 text-sm text-slate-500">
                                                {sub.status === 'TRIAL' ? 'Trial Period' : formatDate(sub.lastPayment)}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-500">
                                                {sub.status === 'TRIAL' && sub.trialEndsAt
                                                    ? formatDate(sub.trialEndsAt)
                                                    : formatDate(sub.nextRenewal)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="relative">
                                                    <button
                                                        onClick={() => setActiveMenu(activeMenu === sub.id ? null : sub.id)}
                                                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
                                                    >
                                                        ⋯
                                                    </button>

                                                    {activeMenu === sub.id && (
                                                        <div className="absolute right-0 top-10 bg-white rounded-xl shadow-lg border border-slate-200 py-2 w-48 z-10">
                                                            <button
                                                                onClick={() => { setActiveMenu(null); }}
                                                                className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 text-slate-700"
                                                            >
                                                                View Subscription
                                                            </button>
                                                            {sub.status === 'SUSPENDED' && (
                                                                <button
                                                                    onClick={() => handleResumeSubscription(sub)}
                                                                    className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 text-emerald-600"
                                                                >
                                                                    Resume
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => { setActiveMenu(null); }}
                                                                className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 text-slate-700"
                                                            >
                                                                Open Organization
                                                            </button>
                                                            <button
                                                                onClick={() => { setActiveMenu(null); }}
                                                                className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 text-slate-700"
                                                            >
                                                                Open Billing Details
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ===== PRICING & PLANS TAB ===== */}
            {billingTab === 'pricing' && (
                <div>
                    <div className="mb-6">
                        <h3 className="text-lg font-bold text-slate-800">Pricing & Plans</h3>
                        <p className="text-slate-500 text-sm mt-1">
                            Manage Core subscription pricing. Changes apply to new subscriptions only.
                        </p>
                    </div>

                    {/* Pricing Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Essential Plan */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                                    <span className="text-white text-xs">✓</span>
                                </div>
                                <h4 className="font-bold text-slate-900">Essential Plan</h4>
                            </div>
                            <div className="text-3xl font-bold text-blue-600 mb-4">
                                {formatCurrency(editPricing.essential)}<span className="text-sm font-normal text-slate-400">/month</span>
                            </div>
                            <div className="flex items-center gap-2 mb-4">
                                <input
                                    type="number"
                                    value={editPricing.essential}
                                    onChange={(e) => setEditPricing(prev => ({ ...prev, essential: parseInt(e.target.value) || 0 }))}
                                    className="w-24 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="text-sm text-slate-500">KES / month</span>
                            </div>
                            <p className="text-xs text-slate-500">Applies to new subscriptions only</p>
                            <div className="border-t border-slate-100 mt-4 pt-4">
                                <div className="text-2xl font-bold text-slate-800">
                                    {formatCurrency(editPricing.essential)}<span className="text-sm font-normal text-slate-400">/month</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">Applies to new subscriptions only</p>
                            </div>
                        </div>

                        {/* Professional Plan */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                                    <span className="text-white text-xs">✓</span>
                                </div>
                                <h4 className="font-bold text-slate-900">Professional Plan</h4>
                            </div>
                            <div className="text-3xl font-bold text-blue-600 mb-4">
                                {formatCurrency(editPricing.professional)}<span className="text-sm font-normal text-slate-400">/month</span>
                            </div>
                            <div className="flex items-center gap-2 mb-4">
                                <input
                                    type="number"
                                    value={editPricing.professional}
                                    onChange={(e) => setEditPricing(prev => ({ ...prev, professional: parseInt(e.target.value) || 0 }))}
                                    className="w-24 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="text-sm text-slate-500">KES / month</span>
                            </div>
                            <p className="text-xs text-slate-500">Applies to new subscriptions only</p>
                            <div className="border-t border-slate-100 mt-4 pt-4">
                                <div className="text-2xl font-bold text-slate-800">
                                    {formatCurrency(editPricing.professional)}<span className="text-sm font-normal text-slate-400">/month</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">Applies to new subscriptions only</p>
                            </div>
                        </div>

                        {/* Enterprise Plan */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                                    <span className="text-white text-xs">✓</span>
                                </div>
                                <h4 className="font-bold text-slate-900">Enterprise Plan</h4>
                            </div>
                            <div className="text-3xl font-bold text-blue-600 mb-4">
                                {formatCurrency(editPricing.enterprise)}<span className="text-sm font-normal text-slate-400">/month</span>
                            </div>
                            <div className="flex items-center gap-2 mb-4">
                                <input
                                    type="number"
                                    value={editPricing.enterprise}
                                    onChange={(e) => setEditPricing(prev => ({ ...prev, enterprise: parseInt(e.target.value) || 0 }))}
                                    className="w-24 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="text-sm text-slate-500">KES / month</span>
                            </div>
                            <p className="text-xs text-slate-500">Applies to new subscriptions only</p>
                            <div className="border-t border-slate-100 mt-4 pt-4">
                                <div className="text-2xl font-bold text-slate-800">
                                    {formatCurrency(editPricing.enterprise)}<span className="text-sm font-normal text-slate-400">/month</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">Applies to new subscriptions only</p>
                            </div>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-center mt-8">
                        <button
                            onClick={handleSavePricing}
                            disabled={savingPricing}
                            className="px-8 py-3 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-all disabled:opacity-50"
                        >
                            {savingPricing ? 'Saving...' : 'Save Pricing'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BillingManager;
