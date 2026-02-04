// =====================================================
// PAYMENT MODAL
// Modal for selecting payment method and processing payment
// Supports M-Pesa STK Push and Flutterwave
// =====================================================

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { billingService } from '../../lib/services/billing.service';
import { BILLING_CONFIG, formatKES, getPlanAmountCents } from '../../lib/billing.config';
import type { SubscriptionPlan, PaymentProvider } from '../../types';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    selectedPlan?: SubscriptionPlan;
    isReactivation?: boolean;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    selectedPlan: propPlan,
    isReactivation = false,
}) => {
    const { user } = useAuth();
    const [step, setStep] = useState<'plan' | 'payment' | 'processing' | 'success'>('plan');
    const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>(propPlan || 'Professional');
    const [selectedProvider, setSelectedProvider] = useState<PaymentProvider>('MPESA');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [email, setEmail] = useState(user?.email || '');
    const [error, setError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    if (!isOpen) return null;

    const planAmount = getPlanAmountCents(selectedPlan);
    const plans = Object.values(BILLING_CONFIG.PLANS);

    const handlePayment = async () => {
        if (!user?.organizationId) {
            setError('Unable to process payment. Please try again.');
            return;
        }

        setError(null);
        setProcessing(true);
        setStep('processing');

        try {
            if (selectedProvider === 'MPESA') {
                if (!phoneNumber || phoneNumber.length < 9) {
                    setError('Please enter a valid phone number');
                    setProcessing(false);
                    setStep('payment');
                    return;
                }

                const result = await billingService.initiateMpesaPayment(
                    user.organizationId,
                    phoneNumber,
                    selectedPlan
                );

                if (result.success) {
                    setSuccessMessage(result.message);
                    setStep('success');
                    // In production, would poll for payment confirmation
                    // For now, show success message
                } else {
                    setError(result.message);
                    setStep('payment');
                }
            } else {
                // Flutterwave
                if (!email) {
                    setError('Please enter a valid email');
                    setProcessing(false);
                    setStep('payment');
                    return;
                }

                const result = await billingService.initiateFlutterwavePayment(
                    user.organizationId,
                    email,
                    selectedPlan
                );

                if (result.success && result.paymentLink) {
                    // In production, redirect to Flutterwave
                    setSuccessMessage('Redirect to Flutterwave checkout...');
                    setStep('success');
                    // window.location.href = result.paymentLink;
                } else {
                    setError(result.message);
                    setStep('payment');
                }
            }
        } catch (err) {
            console.error('Payment error:', err);
            setError('Failed to process payment. Please try again.');
            setStep('payment');
        } finally {
            setProcessing(false);
        }
    };

    const handleDevSimulatePayment = async () => {
        if (!user?.organizationId) return;

        setProcessing(true);
        setError(null);

        try {
            const result = await billingService.devSimulatePayment(
                user.organizationId,
                selectedPlan
            );

            if (result.success) {
                setSuccessMessage(result.message);
                setStep('success');
                setTimeout(() => {
                    onSuccess?.();
                }, 1500);
            } else {
                setError(result.message);
            }
        } catch (err) {
            setError('Failed to simulate payment');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-teal-500 to-teal-600 p-6 text-white">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold">
                                {isReactivation ? 'Reactivate Subscription' : 'Complete Payment'}
                            </h2>
                            <p className="text-teal-100 text-sm">
                                {step === 'plan' && 'Select your plan'}
                                {step === 'payment' && 'Choose payment method'}
                                {step === 'processing' && 'Processing...'}
                                {step === 'success' && 'Payment initiated'}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white/80 hover:text-white text-2xl leading-none"
                        >
                            ×
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Step 1: Plan Selection */}
                    {step === 'plan' && (
                        <div>
                            <div className="space-y-3 mb-6">
                                {plans.map((plan) => (
                                    <button
                                        key={plan.id}
                                        onClick={() => setSelectedPlan(plan.id as SubscriptionPlan)}
                                        className={`w-full p-4 rounded-xl border-2 text-left transition-all ${selectedPlan === plan.id
                                            ? 'border-teal-500 bg-teal-50'
                                            : 'border-slate-200 hover:border-teal-300'
                                            }`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <div className="font-bold text-slate-900 flex items-center gap-2">
                                                    {plan.name}
                                                    {'popular' in plan && plan.popular && (
                                                        <span className="bg-teal-100 text-teal-700 text-xs px-2 py-0.5 rounded-full">
                                                            Popular
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-sm text-slate-500">
                                                    {plan.staff} staff, {plan.locations} location{plan.locations > 1 ? 's' : ''}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-slate-900">
                                                    KES {plan.amountKES.toLocaleString()}
                                                </div>
                                                <div className="text-xs text-slate-400">/month</div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={() => setStep('payment')}
                                className="w-full bg-teal-500 text-white py-3 rounded-xl font-bold hover:bg-teal-600 transition-colors"
                            >
                                Continue to Payment
                            </button>
                        </div>
                    )}

                    {/* Step 2: Payment Method */}
                    {step === 'payment' && (
                        <div>
                            {/* Selected Plan Summary */}
                            <div className="bg-slate-50 rounded-xl p-4 mb-6">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <div className="font-semibold text-slate-900">{selectedPlan} Plan</div>
                                        <div className="text-sm text-slate-500">Monthly subscription</div>
                                    </div>
                                    <div className="text-xl font-bold text-slate-900">
                                        {formatKES(planAmount)}
                                    </div>
                                </div>
                            </div>

                            {/* Payment Method Selection */}
                            <div className="space-y-3 mb-6">
                                {/* M-Pesa */}
                                <button
                                    onClick={() => setSelectedProvider('MPESA')}
                                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${selectedProvider === 'MPESA'
                                        ? 'border-green-500 bg-green-50'
                                        : 'border-slate-200 hover:border-green-300'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center text-white font-bold">
                                            M
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-900">M-Pesa</div>
                                            <div className="text-sm text-slate-500">Pay via STK Push</div>
                                        </div>
                                    </div>
                                </button>

                                {/* Flutterwave */}
                                <button
                                    onClick={() => setSelectedProvider('FLUTTERWAVE')}
                                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${selectedProvider === 'FLUTTERWAVE'
                                        ? 'border-orange-500 bg-orange-50'
                                        : 'border-slate-200 hover:border-orange-300'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-gradient-to-r from-orange-400 to-orange-500 rounded-xl flex items-center justify-center text-white font-bold">
                                            FW
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-900">Flutterwave</div>
                                            <div className="text-sm text-slate-500">Card, Bank, Mobile Money</div>
                                        </div>
                                    </div>
                                </button>
                            </div>

                            {/* Payment Details */}
                            {selectedProvider === 'MPESA' && (
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        M-Pesa Phone Number
                                    </label>
                                    <input
                                        type="tel"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        placeholder="e.g., 0712345678"
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                    />
                                    <p className="text-xs text-slate-400 mt-1">
                                        You'll receive an STK Push prompt on this number
                                    </p>
                                </div>
                            )}

                            {selectedProvider === 'FLUTTERWAVE' && (
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="your@email.com"
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                    />
                                    <p className="text-xs text-slate-400 mt-1">
                                        Receipt will be sent to this email
                                    </p>
                                </div>
                            )}

                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep('plan')}
                                    className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handlePayment}
                                    disabled={processing}
                                    className="flex-1 bg-teal-500 text-white py-3 rounded-xl font-bold hover:bg-teal-600 transition-colors disabled:opacity-50"
                                >
                                    {processing ? 'Processing...' : `Pay ${formatKES(planAmount)}`}
                                </button>
                            </div>

                            {/* DEV Test Button */}
                            {BILLING_CONFIG.DEV_MODE && (
                                <div className="mt-4 pt-4 border-t border-dashed border-slate-200">
                                    <button
                                        onClick={handleDevSimulatePayment}
                                        disabled={processing}
                                        className="w-full bg-purple-100 text-purple-700 py-2 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors"
                                    >
                                        🧪 [DEV] Simulate Successful Payment
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 3: Processing */}
                    {step === 'processing' && (
                        <div className="text-center py-8">
                            <div className="animate-spin text-5xl mb-4">⏳</div>
                            <p className="text-slate-600">Processing your payment...</p>
                            <p className="text-sm text-slate-400 mt-2">Please wait</p>
                        </div>
                    )}

                    {/* Step 4: Success */}
                    {step === 'success' && (
                        <div className="text-center py-8">
                            <div className="text-5xl mb-4">✅</div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Payment Initiated!</h3>
                            <p className="text-slate-600 mb-6">{successMessage}</p>

                            {selectedProvider === 'MPESA' && (
                                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                                    <p className="text-green-800 text-sm">
                                        <strong>Check your phone!</strong> Enter your M-Pesa PIN when prompted to complete the payment.
                                    </p>
                                </div>
                            )}

                            <button
                                onClick={() => {
                                    onSuccess?.();
                                    onClose();
                                }}
                                className="w-full bg-teal-500 text-white py-3 rounded-xl font-bold hover:bg-teal-600 transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PaymentModal;
