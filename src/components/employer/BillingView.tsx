// =====================================================
// BILLING VIEW
// Complete billing management for employers
// Features: Status display, Pay Now, Auto-pay toggle, Payment history, DEV controls
// =====================================================

import React, { useState, useEffect } from 'react';
import { PLANS } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import { organizationService } from '../../lib/services/organization.service';
import { staffService } from '../../lib/services/staff.service';
import { billingService } from '../../lib/services/billing.service';
import { BILLING_CONFIG, formatKES, getPlanAmountCents } from '../../lib/billing.config';
import PaymentModal from './PaymentModal';
import type {
    Organization,
    Subscription,
    PaymentRecord,
    BillingSubscriptionState,
    SubscriptionPlan
} from '../../types';

interface BillingViewProps {
    organization?: Organization | null;
}

const BillingView: React.FC<BillingViewProps> = ({ organization: orgProp }) => {
    const { user } = useAuth();
    const [organization, setOrganization] = useState<Organization | null>(orgProp || null);
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const [usage, setUsage] = useState({ locations: 0, staff: 0, admins: 0 });
    const [billingState, setBillingState] = useState<{
        state: BillingSubscriptionState;
        daysRemaining: number;
        isTrialExpired: boolean;
        isPaymentDue: boolean;
    }>({ state: 'TRIAL', daysRemaining: 10, isTrialExpired: false, isPaymentDue: false });

    const [loading, setLoading] = useState(true);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showInvoicesModal, setShowInvoicesModal] = useState(false);
    const [autoPayEnabled, setAutoPayEnabled] = useState(false);
    const [autoPayLoading, setAutoPayLoading] = useState(false);
    const [devActionLoading, setDevActionLoading] = useState(false);
    const [devMessage, setDevMessage] = useState<string | null>(null);

    useEffect(() => {
        if (user?.organizationId) {
            loadData();
        } else if (orgProp) {
            setOrganization(orgProp);
            setLoading(false);
        }
    }, [user?.organizationId, orgProp]);

    const loadData = async () => {
        if (!user?.organizationId) return;
        setLoading(true);
        try {
            const [org, sub, state, paymentHistory] = await Promise.all([
                organizationService.getById(user.organizationId),
                billingService.getSubscription(user.organizationId),
                billingService.getBillingState(user.organizationId),
                billingService.getPaymentHistory(user.organizationId),
            ]);

            setOrganization(org);
            setSubscription(sub);
            setBillingState({
                state: state.state,
                daysRemaining: state.daysRemaining,
                isTrialExpired: state.isTrialExpired,
                isPaymentDue: state.isPaymentDue,
            });
            setPayments(paymentHistory);
            setAutoPayEnabled(sub?.autoPayEnabled || false);

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
            setUsage({ locations: locations.length, staff: staffData, admins: adminData.used });
        } catch (err) {
            console.error('Error loading usage data:', err);
        }
    };

    const handleAutoPayToggle = async () => {
        if (!user?.organizationId) return;
        setAutoPayLoading(true);
        try {
            await billingService.updatePaymentMode(
                user.organizationId,
                autoPayEnabled ? 'PAY_AS_YOU_GO' : 'AUTO_PAY'
            );
            setAutoPayEnabled(!autoPayEnabled);
        } catch (err) {
            console.error('Error toggling auto-pay:', err);
        } finally {
            setAutoPayLoading(false);
        }
    };

    // DEV Actions
    const handleDevSimulatePayment = async () => {
        if (!user?.organizationId) return;
        setDevActionLoading(true);
        setDevMessage(null);
        try {
            const result = await billingService.devSimulatePayment(
                user.organizationId,
                (subscription?.plan || 'Professional') as SubscriptionPlan
            );
            setDevMessage(result.message);
            await loadData();
        } catch (err) {
            setDevMessage('Error simulating payment');
        } finally {
            setDevActionLoading(false);
        }
    };

    const handleDevSimulateSuspension = async () => {
        if (!user?.organizationId) return;
        setDevActionLoading(true);
        setDevMessage(null);
        try {
            const result = await billingService.devSimulateSuspension(user.organizationId);
            setDevMessage(result.message);
            await loadData();
        } catch (err) {
            setDevMessage('Error simulating suspension');
        } finally {
            setDevActionLoading(false);
        }
    };

    const handleDevResetTrial = async () => {
        if (!user?.organizationId) return;
        setDevActionLoading(true);
        setDevMessage(null);
        try {
            const result = await billingService.devResetToTrial(user.organizationId);
            setDevMessage(result.message);
            await loadData();
        } catch (err) {
            setDevMessage('Error resetting to trial');
        } finally {
            setDevActionLoading(false);
        }
    };

    // Helper functions
    const getStatusBadge = () => {
        switch (billingState.state) {
            case 'TRIAL':
                return { bg: 'bg-blue-500', text: 'TRIAL', icon: '🎁' };
            case 'ACTIVE':
                return { bg: 'bg-green-500', text: 'ACTIVE', icon: '✓' };
            case 'SUSPENDED':
                return { bg: 'bg-red-500', text: 'SUSPENDED', icon: '⚠️' };
            default:
                return { bg: 'bg-slate-500', text: billingState.state, icon: '' };
        }
    };

    const getCardGradient = () => {
        if (billingState.state === 'SUSPENDED') return 'from-red-700 to-red-900';
        if (billingState.isPaymentDue) return 'from-amber-600 to-amber-800';
        if (billingState.state === 'ACTIVE') return 'from-teal-700 to-teal-900';
        return 'from-slate-800 to-slate-900';
    };

    const currentPlanId = subscription?.plan || organization?.plan || 'Professional';
    const currentPlan = PLANS.find(p => p.id === currentPlanId) || PLANS[1];
    const statusBadge = getStatusBadge();

    if (loading) {
        return (
            <div className="p-8 max-w-7xl mx-auto flex items-center justify-center h-64">
                <div className="animate-spin text-4xl">⏳</div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto h-full flex flex-col animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Billing & Subscription</h2>
                    <p className="text-slate-500">Manage your plan, payments, and billing settings.</p>
                </div>
                <button
                    onClick={() => setShowPaymentModal(true)}
                    className="bg-teal-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-teal-600 transition-colors flex items-center gap-2"
                >
                    💳 Pay Now
                </button>
            </div>

            {/* Suspended Banner */}
            {billingState.state === 'SUSPENDED' && (
                <div className="bg-red-600 text-white rounded-xl p-6 mb-8 text-center">
                    <div className="text-2xl mb-2">⚠️ Subscription Suspended</div>
                    <p className="text-lg mb-4">
                        Your access is restricted due to non-payment. Pay now to restore full access.
                    </p>
                    <button
                        onClick={() => setShowPaymentModal(true)}
                        className="bg-white text-red-600 px-8 py-3 rounded-xl font-bold hover:bg-red-50 transition-colors"
                    >
                        Pay Now to Restore Access
                    </button>
                </div>
            )}

            {/* Main Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {/* Current Plan Card */}
                <div className={`bg-gradient-to-br ${getCardGradient()} rounded-3xl p-8 text-white shadow-xl relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                    <div className="relative z-10">
                        {/* Status Badge */}
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <div className="text-sm font-bold text-white/60 uppercase tracking-wider mb-1">Current Plan</div>
                                <h3 className="text-3xl font-bold">{currentPlan.name}</h3>
                            </div>
                            <span className={`${statusBadge.bg} px-3 py-1 rounded-lg text-xs font-bold uppercase flex items-center gap-1`}>
                                {statusBadge.icon} {statusBadge.text}
                            </span>
                        </div>

                        <div className="text-4xl font-bold mb-2">
                            {currentPlan.price}
                            <span className="text-lg font-medium text-white/60">/mo</span>
                        </div>

                        {/* Days Remaining */}
                        <div className={`inline-block px-3 py-1 rounded-lg text-sm font-medium mb-4 ${billingState.state === 'SUSPENDED' ? 'bg-red-500/30' :
                                billingState.isPaymentDue ? 'bg-amber-500/30' : 'bg-white/10'
                            }`}>
                            {billingState.state === 'TRIAL' && (
                                billingState.daysRemaining === 0
                                    ? 'Trial expires today'
                                    : `${billingState.daysRemaining} days remaining in trial`
                            )}
                            {billingState.state === 'ACTIVE' && (
                                `Renews in ${billingState.daysRemaining} days`
                            )}
                            {billingState.state === 'SUSPENDED' && (
                                'Payment required'
                            )}
                        </div>

                        {/* Buttons */}
                        <div className="flex space-x-4 mt-6">
                            <button
                                onClick={() => setShowPaymentModal(true)}
                                className="flex-1 bg-white text-slate-900 py-3 rounded-xl font-bold hover:bg-slate-100 transition-colors"
                            >
                                {billingState.state === 'SUSPENDED' ? 'Pay & Reactivate' : 'Manage Subscription'}
                            </button>
                            <button
                                onClick={() => setShowInvoicesModal(true)}
                                className="flex-1 bg-transparent border border-white/40 text-white py-3 rounded-xl font-bold hover:bg-white/10 transition-colors"
                            >
                                View History
                            </button>
                        </div>
                    </div>
                </div>

                {/* Usage + Auto-Pay */}
                <div className="space-y-6">
                    {/* Usage Limits */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">Plan Usage</h3>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-sm font-medium mb-1">
                                    <span className="text-slate-600">Locations</span>
                                    <span className="text-slate-900">{usage.locations} / {currentPlan.locations}</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2">
                                    <div className="bg-teal-500 h-2 rounded-full" style={{ width: `${Math.min(100, (usage.locations / currentPlan.locations) * 100)}%` }}></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-sm font-medium mb-1">
                                    <span className="text-slate-600">Staff</span>
                                    <span className="text-slate-900">{usage.staff} / {currentPlan.staff}</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2">
                                    <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${Math.min(100, (usage.staff / currentPlan.staff) * 100)}%` }}></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-sm font-medium mb-1">
                                    <span className="text-slate-600">Admins</span>
                                    <span className="text-slate-900">{usage.admins} / {currentPlan.admins}</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2">
                                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${Math.min(100, (usage.admins / currentPlan.admins) * 100)}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Auto-Pay Toggle */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-slate-900">Auto-Pay</h3>
                                <p className="text-sm text-slate-500">
                                    {autoPayEnabled ? 'Automatic renewal enabled' : 'Pay manually before renewal'}
                                </p>
                            </div>
                            <button
                                onClick={handleAutoPayToggle}
                                disabled={autoPayLoading}
                                className={`relative w-14 h-8 rounded-full transition-colors ${autoPayEnabled ? 'bg-teal-500' : 'bg-slate-200'
                                    }`}
                            >
                                <span className={`absolute w-6 h-6 bg-white rounded-full top-1 transition-all shadow ${autoPayEnabled ? 'left-7' : 'left-1'
                                    }`}></span>
                            </button>
                        </div>
                        <p className="text-xs text-slate-400 mt-3">
                            {autoPayEnabled
                                ? 'Your subscription will automatically renew every 31 days.'
                                : 'Remember to pay before your renewal date to avoid suspension.'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Payment History */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mb-8">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Payment History</h3>
                {payments.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                        <div className="text-3xl mb-2">📋</div>
                        <p>No payment history yet</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="text-left py-3 px-2 text-sm font-semibold text-slate-600">Date</th>
                                    <th className="text-left py-3 px-2 text-sm font-semibold text-slate-600">Plan</th>
                                    <th className="text-left py-3 px-2 text-sm font-semibold text-slate-600">Amount</th>
                                    <th className="text-left py-3 px-2 text-sm font-semibold text-slate-600">Provider</th>
                                    <th className="text-left py-3 px-2 text-sm font-semibold text-slate-600">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.slice(0, 10).map((payment) => (
                                    <tr key={payment.id} className="border-b border-slate-50 hover:bg-slate-50">
                                        <td className="py-3 px-2 text-sm text-slate-900">
                                            {payment.paidAt ? new Date(payment.paidAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
                                        </td>
                                        <td className="py-3 px-2 text-sm text-slate-700">{payment.plan}</td>
                                        <td className="py-3 px-2 text-sm font-medium text-slate-900">
                                            {formatKES(payment.amountCents)}
                                        </td>
                                        <td className="py-3 px-2">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${payment.provider === 'MPESA'
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-orange-100 text-orange-700'
                                                }`}>
                                                {payment.provider === 'MPESA' ? 'M-Pesa' : 'Flutterwave'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-2">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${payment.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                                    payment.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-red-100 text-red-700'
                                                }`}>
                                                {payment.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Available Plans */}
            <div className="mb-8">
                <h3 className="text-xl font-bold text-slate-900 mb-6">Available Plans</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {PLANS.map((p) => (
                        <div
                            key={p.id}
                            className={`p-6 rounded-2xl border transition-all ${p.id === currentPlanId
                                    ? 'border-teal-500 bg-teal-50/50 ring-2 ring-teal-100'
                                    : 'border-slate-200 bg-white hover:border-teal-300'
                                }`}
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-bold text-lg text-slate-900">{p.name}</h4>
                                {p.id === currentPlanId && (
                                    <span className="bg-teal-100 text-teal-700 text-xs font-bold px-2 py-1 rounded">
                                        Current
                                    </span>
                                )}
                            </div>
                            <div className="text-2xl font-bold text-slate-900 mb-4">
                                {p.price}
                                <span className="text-sm font-medium text-slate-500">/mo</span>
                            </div>
                            <ul className="space-y-2 mb-6">
                                <li className="text-sm text-slate-600 flex items-center">✓ Up to {p.locations} Locations</li>
                                <li className="text-sm text-slate-600 flex items-center">✓ Up to {p.staff} Staff</li>
                                <li className="text-sm text-slate-600 flex items-center">✓ {p.admins} Admins</li>
                            </ul>
                            {p.id !== currentPlanId && (
                                <button
                                    onClick={() => setShowPaymentModal(true)}
                                    className="w-full py-2 border border-slate-300 rounded-lg text-sm font-bold hover:bg-slate-50 text-slate-700"
                                >
                                    {billingState.state === 'SUSPENDED' ? 'Select & Pay' : 'Upgrade'}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* DEV Test Controls */}
            {BILLING_CONFIG.DEV_MODE && (
                <div className="bg-purple-50 border-2 border-dashed border-purple-300 rounded-2xl p-6 mb-8">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-xl">🧪</span>
                        <h3 className="font-bold text-purple-900">Development Test Controls</h3>
                    </div>

                    {devMessage && (
                        <div className="bg-white border border-purple-200 rounded-lg px-4 py-2 mb-4 text-purple-800 text-sm">
                            {devMessage}
                        </div>
                    )}

                    <div className="grid grid-cols-3 gap-4">
                        <button
                            onClick={handleDevSimulatePayment}
                            disabled={devActionLoading}
                            className="bg-green-100 text-green-700 py-2 px-4 rounded-lg font-medium hover:bg-green-200 transition-colors disabled:opacity-50"
                        >
                            ✅ Simulate Payment
                        </button>
                        <button
                            onClick={handleDevSimulateSuspension}
                            disabled={devActionLoading}
                            className="bg-red-100 text-red-700 py-2 px-4 rounded-lg font-medium hover:bg-red-200 transition-colors disabled:opacity-50"
                        >
                            🔒 Simulate Suspension
                        </button>
                        <button
                            onClick={handleDevResetTrial}
                            disabled={devActionLoading}
                            className="bg-blue-100 text-blue-700 py-2 px-4 rounded-lg font-medium hover:bg-blue-200 transition-colors disabled:opacity-50"
                        >
                            🔄 Reset to Trial
                        </button>
                    </div>
                    <p className="text-xs text-purple-600 mt-3">
                        These controls are only visible in development mode. They simulate billing events for testing.
                    </p>
                </div>
            )}

            {/* Info Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                <h4 className="font-bold text-slate-800 mb-3 flex items-center">
                    <span className="mr-2">📋</span>Billing Information
                </h4>
                <ul className="space-y-2 text-sm text-slate-600">
                    <li className="flex items-start">
                        <span className="mr-2 text-slate-400">•</span>
                        Trial period is {BILLING_CONFIG.TRIAL_DAYS} days with full platform access
                    </li>
                    <li className="flex items-start">
                        <span className="mr-2 text-slate-400">•</span>
                        Billing cycle is {BILLING_CONFIG.BILLING_CYCLE_DAYS} days (monthly)
                    </li>
                    <li className="flex items-start">
                        <span className="mr-2 text-slate-400">•</span>
                        Payment methods: M-Pesa (STK Push) and Flutterwave
                    </li>
                    <li className="flex items-start">
                        <span className="mr-2 text-slate-400">•</span>
                        If payment fails, access is immediately suspended - pay to restore
                    </li>
                    <li className="flex items-start">
                        <span className="mr-2 text-slate-400">•</span>
                        Your data is preserved even when suspended
                    </li>
                </ul>
            </div>

            {/* Payment Modal */}
            {showPaymentModal && (
                <PaymentModal
                    isOpen={showPaymentModal}
                    onClose={() => setShowPaymentModal(false)}
                    onSuccess={() => {
                        setShowPaymentModal(false);
                        loadData();
                    }}
                    selectedPlan={currentPlanId as SubscriptionPlan}
                    isReactivation={billingState.state === 'SUSPENDED'}
                />
            )}

            {/* Invoice History Modal */}
            {showInvoicesModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-lg p-6 m-4 max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">Payment History</h2>
                            <button onClick={() => setShowInvoicesModal(false)} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
                        </div>

                        {payments.length === 0 ? (
                            <div className="text-center py-8 text-slate-400">
                                <p>No payments recorded yet</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {payments.map((payment) => (
                                    <div key={payment.id} className="border border-slate-200 rounded-xl p-4">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold text-slate-800">{payment.plan} Plan</p>
                                                <p className="text-sm text-slate-500">
                                                    {payment.paidAt
                                                        ? new Date(payment.paidAt).toLocaleDateString('en-GB', {
                                                            month: 'short', day: 'numeric', year: 'numeric'
                                                        })
                                                        : 'Pending'
                                                    }
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-slate-900">{formatKES(payment.amountCents)}</p>
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${payment.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                                        payment.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-red-100 text-red-700'
                                                    }`}>
                                                    {payment.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default BillingView;
