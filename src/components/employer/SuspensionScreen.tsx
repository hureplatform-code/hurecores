// =====================================================
// SUSPENSION SCREEN
// Full-screen lock when subscription is suspended
// Only allows access to billing, payment, and support
// =====================================================

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BILLING_CONFIG } from '../../lib/billing.config';
import PaymentModal from './PaymentModal';

interface SuspensionScreenProps {
    reason?: string;
    isEmployee?: boolean;
}

const SuspensionScreen: React.FC<SuspensionScreenProps> = ({
    reason = 'Subscription suspended due to non-payment.',
    isEmployee = false
}) => {
    const { user } = useAuth();
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    // Employee View
    if (isEmployee) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
                <div className="max-w-lg w-full">
                    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-red-100">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-red-600 to-red-700 p-8 text-center">
                            <div className="text-6xl mb-4">🔒</div>
                            <h1 className="text-2xl font-bold text-white mb-2">
                                Access Restricted
                            </h1>
                        </div>

                        {/* Content */}
                        <div className="p-8">
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                                <p className="text-red-800 text-center font-medium">
                                    Your access to Hure core is restricted, please contact your employer for further assistance
                                </p>
                            </div>

                            {/* Support Info */}
                            <div className="mt-6 pt-6 border-t border-slate-100 text-center">
                                <p className="text-slate-500 text-sm mb-2">Need help? Contact us:</p>
                                <div className="flex justify-center gap-4 text-sm">
                                    <a
                                        href={`mailto:${BILLING_CONFIG.SUPPORT_EMAIL}`}
                                        className="text-teal-600 hover:text-teal-800"
                                    >
                                        {BILLING_CONFIG.SUPPORT_EMAIL}
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Organization Info */}
                    {user && (
                        <div className="mt-4 text-center text-sm text-slate-500">
                            <p>Logged in as: {user.email}</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
            <div className="max-w-lg w-full">
                {/* Main Card */}
                <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-red-100">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-red-600 to-red-700 p-8 text-center">
                        <div className="text-6xl mb-4">🔒</div>
                        <h1 className="text-2xl font-bold text-white mb-2">
                            Access Suspended
                        </h1>
                        <p className="text-red-100">
                            {reason}
                        </p>
                    </div>

                    {/* Content */}
                    <div className="p-8">
                        {/* Message */}
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                            <p className="text-red-800 text-sm">
                                <span className="font-semibold">Important:</span> Your platform access has been
                                restricted. All your data is safe and preserved. Pay now to restore full access
                                immediately.
                            </p>
                        </div>

                        {/* Pay Now Button */}
                        <button
                            onClick={() => setShowPaymentModal(true)}
                            className="w-full bg-gradient-to-r from-teal-500 to-teal-600 text-white py-4 rounded-xl font-bold text-lg hover:from-teal-600 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl mb-4"
                        >
                            💳 Pay Now to Restore Access
                        </button>

                        {/* Secondary Actions */}
                        <div className="grid grid-cols-2 gap-3">
                            <a
                                href="#/employer/billing"
                                className="flex items-center justify-center py-3 px-4 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors text-sm font-medium"
                            >
                                📋 View Billing Details
                            </a>
                            <a
                                href={`mailto:${BILLING_CONFIG.SUPPORT_EMAIL}`}
                                className="flex items-center justify-center py-3 px-4 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors text-sm font-medium"
                            >
                                💬 Contact Support
                            </a>
                        </div>

                        {/* Support Info */}
                        <div className="mt-6 pt-6 border-t border-slate-100 text-center">
                            <p className="text-slate-500 text-sm mb-2">Need help? Contact us:</p>
                            <div className="flex justify-center gap-4 text-sm">
                                <a
                                    href={`mailto:${BILLING_CONFIG.SUPPORT_EMAIL}`}
                                    className="text-teal-600 hover:text-teal-800"
                                >
                                    {BILLING_CONFIG.SUPPORT_EMAIL}
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Organization Info */}
                {user && (
                    <div className="mt-4 text-center text-sm text-slate-500">
                        <p>Logged in as: {user.email}</p>
                    </div>
                )}
            </div>

            {/* Payment Modal */}
            {showPaymentModal && (
                <PaymentModal
                    isOpen={showPaymentModal}
                    onClose={() => setShowPaymentModal(false)}
                    onSuccess={() => {
                        setShowPaymentModal(false);
                        // Refresh page to re-check subscription
                        window.location.reload();
                    }}
                />
            )}
        </div>
    );
};

export default SuspensionScreen;
