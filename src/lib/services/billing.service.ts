// =====================================================
// BILLING SERVICE
// Handles subscription management, payments, and billing logs
// =====================================================

import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    addDoc,
    query,
    where,
    orderBy,
    limit,
    Timestamp,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { BILLING_CONFIG, getPlanAmountCents, formatKES } from '../billing.config';
import type {
    Subscription,
    PaymentRecord,
    BillingLog,
    SubscriptionPlan,
    BillingSubscriptionState,
    PaymentMode
} from '../../types';
import { formatDateKE } from '../utils/dateFormat';
import type {
    PaymentProvider,
    PaymentStatus,
    BillingEventType
} from '../../types';

// Constants for plan IDs - must match database
export const PLAN_IDS = {
    // Add plan IDs here if needed
};

// =====================================================
// COLLECTION REFERENCES
// =====================================================

const paymentsRef = collection(db, 'payments');
const billingLogsRef = collection(db, 'billing_logs');
// subscriptionsRef removed - use dynamic subcollection

// =====================================================
// SUBSCRIPTION MANAGEMENT
// =====================================================

export const billingService = {
    /**
     * Get subscription for an organization
     */
    async getSubscription(organizationId: string): Promise<Subscription | null> {
        try {
            const q = query(
                collection(db, 'organizations', organizationId, 'subscriptions'),
                limit(1)
            );
            const snapshot = await getDocs(q);
            if (snapshot.empty) return null;

            const docData = snapshot.docs[0].data();
            return {
                id: snapshot.docs[0].id,
                ...docData,
                createdAt: docData.createdAt?.toDate?.()?.toISOString() || docData.createdAt,
                updatedAt: docData.updatedAt?.toDate?.()?.toISOString() || docData.updatedAt,
                trialStartedAt: docData.trialStartedAt?.toDate?.()?.toISOString() || docData.trialStartedAt,
                trialEndsAt: docData.trialEndsAt?.toDate?.()?.toISOString() || docData.trialEndsAt,
                currentPeriodStart: docData.currentPeriodStart?.toDate?.()?.toISOString() || docData.currentPeriodStart,
                currentPeriodEnd: docData.currentPeriodEnd?.toDate?.()?.toISOString() || docData.currentPeriodEnd,
                nextBillingDate: docData.nextBillingDate?.toDate?.()?.toISOString() || docData.nextBillingDate,
                lastPaymentDate: docData.lastPaymentDate?.toDate?.()?.toISOString() || docData.lastPaymentDate,
                suspendedAt: docData.suspendedAt?.toDate?.()?.toISOString() || docData.suspendedAt,
                reactivatedAt: docData.reactivatedAt?.toDate?.()?.toISOString() || docData.reactivatedAt,
            } as Subscription;
        } catch (error) {
            console.error('Error getting subscription:', error);
            return null;
        }
    },

    /**
     * Create initial subscription (starts trial)
     */
    async createSubscription(
        organizationId: string,
        plan: SubscriptionPlan = 'Professional'
    ): Promise<Subscription> {
        const now = new Date();
        const trialEnd = new Date(now);
        trialEnd.setDate(trialEnd.getDate() + BILLING_CONFIG.TRIAL_DAYS);

        const subscriptionData = {
            organizationId,
            plan,
            status: 'Trial' as const,
            billingState: 'TRIAL' as BillingSubscriptionState,
            paymentMode: 'PAY_AS_YOU_GO' as PaymentMode,
            amountCents: getPlanAmountCents(plan),
            currency: BILLING_CONFIG.CURRENCY,
            billingCycle: 'monthly',
            billingCycleDays: BILLING_CONFIG.BILLING_CYCLE_DAYS,
            trialStartedAt: Timestamp.fromDate(now),
            trialEndsAt: Timestamp.fromDate(trialEnd),
            trialDays: BILLING_CONFIG.TRIAL_DAYS,
            autoPayEnabled: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        const docRef = await addDoc(collection(db, 'organizations', organizationId, 'subscriptions'), subscriptionData);

        // Log trial start
        await this.logBillingEvent(organizationId, 'TRIAL_START', {
            plan,
            description: `Trial started for ${plan} plan. Ends on ${formatDateKE(trialEnd)}`,
            newState: 'TRIAL',
        });

        return {
            id: docRef.id,
            ...subscriptionData,
            trialStartedAt: now.toISOString(),
            trialEndsAt: trialEnd.toISOString(),
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
        } as Subscription;
    },

    /**
     * Get billing state for an organization
     */
    async getBillingState(organizationId: string): Promise<{
        state: BillingSubscriptionState;
        daysRemaining: number;
        isTrialExpired: boolean;
        isPaymentDue: boolean;
        nextPaymentDate: Date | null;
        canAccessPlatform: boolean;
        reason?: string;
    }> {
        const subscription = await this.getSubscription(organizationId);

        if (!subscription) {
            return {
                state: 'TRIAL',
                daysRemaining: BILLING_CONFIG.TRIAL_DAYS,
                isTrialExpired: false,
                isPaymentDue: false,
                nextPaymentDate: null,
                canAccessPlatform: true,
                reason: 'No subscription found - assuming new organization',
            };
        }

        const now = new Date();

        // Check if suspended
        if (subscription.billingState === 'SUSPENDED') {
            return {
                state: 'SUSPENDED',
                daysRemaining: 0,
                isTrialExpired: true,
                isPaymentDue: true,
                nextPaymentDate: null,
                canAccessPlatform: false,
                reason: subscription.suspensionReason || 'Subscription suspended due to non-payment',
            };
        }

        // Check trial status
        if (subscription.billingState === 'TRIAL') {
            const trialEnd = subscription.trialEndsAt ? new Date(subscription.trialEndsAt) : null;
            if (trialEnd) {
                const diffMs = trialEnd.getTime() - now.getTime();
                const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

                if (daysRemaining <= 0) {
                    // Trial expired - should suspend
                    return {
                        state: 'TRIAL',
                        daysRemaining: 0,
                        isTrialExpired: true,
                        isPaymentDue: true,
                        nextPaymentDate: null,
                        canAccessPlatform: false, // Day 11 - payment required
                        reason: 'Trial has expired. Payment required to continue.',
                    };
                }

                return {
                    state: 'TRIAL',
                    daysRemaining: Math.max(0, daysRemaining),
                    isTrialExpired: false,
                    isPaymentDue: daysRemaining <= 2,
                    nextPaymentDate: trialEnd,
                    canAccessPlatform: true,
                };
            }
        }

        // Check active subscription
        if (subscription.billingState === 'ACTIVE') {
            const nextBilling = subscription.nextBillingDate
                ? new Date(subscription.nextBillingDate)
                : null;

            if (nextBilling) {
                const diffMs = nextBilling.getTime() - now.getTime();
                const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

                return {
                    state: 'ACTIVE',
                    daysRemaining: Math.max(0, daysRemaining),
                    isTrialExpired: true,
                    isPaymentDue: daysRemaining <= 3,
                    nextPaymentDate: nextBilling,
                    canAccessPlatform: true,
                };
            }

            return {
                state: 'ACTIVE',
                daysRemaining: BILLING_CONFIG.BILLING_CYCLE_DAYS,
                isTrialExpired: true,
                isPaymentDue: false,
                nextPaymentDate: null,
                canAccessPlatform: true,
            };
        }

        // Default fallback
        return {
            state: subscription.billingState || 'TRIAL',
            daysRemaining: 0,
            isTrialExpired: false,
            isPaymentDue: false,
            nextPaymentDate: null,
            canAccessPlatform: true,
        };
    },

    /**
     * Check if organization can access platform
     */
    async canAccessPlatform(organizationId: string): Promise<{
        allowed: boolean;
        reason?: string;
        billingState: BillingSubscriptionState;
    }> {
        const state = await this.getBillingState(organizationId);
        return {
            allowed: state.canAccessPlatform,
            reason: state.reason,
            billingState: state.state,
        };
    },

    /**
     * Update subscription state
     */
    async updateBillingState(
        organizationId: string,
        newState: BillingSubscriptionState,
        reason?: string
    ): Promise<void> {
        const subscription = await this.getSubscription(organizationId);
        if (!subscription) throw new Error('Subscription not found');

        const previousState = subscription.billingState;
        const now = new Date();

        const updates: Record<string, unknown> = {
            billingState: newState,
            status: newState === 'ACTIVE' ? 'Active' : newState === 'SUSPENDED' ? 'Suspended' : 'Trial',
            updatedAt: serverTimestamp(),
        };

        if (newState === 'SUSPENDED') {
            updates.suspendedAt = Timestamp.fromDate(now);
            updates.suspensionReason = reason || 'Non-payment';
        } else if (newState === 'ACTIVE' && previousState === 'SUSPENDED') {
            updates.reactivatedAt = Timestamp.fromDate(now);
            updates.suspendedAt = null;
            updates.suspensionReason = null;
        }

        const subRef = doc(db, 'organizations', organizationId, 'subscriptions', subscription.id);
        await updateDoc(subRef, updates);

        // Log state change
        const eventType: BillingEventType = newState === 'SUSPENDED' ? 'SUSPENSION' :
            (previousState === 'SUSPENDED' ? 'REACTIVATION' : 'PAYMENT_RECEIVED');

        await this.logBillingEvent(organizationId, eventType, {
            previousState,
            newState,
            description: reason || `State changed from ${previousState} to ${newState}`,
        });
    },

    /**
     * Update payment mode (auto-pay vs pay-as-you-go)
     */
    async updatePaymentMode(
        organizationId: string,
        mode: PaymentMode
    ): Promise<void> {
        const subscription = await this.getSubscription(organizationId);
        if (!subscription) throw new Error('Subscription not found');

        const subRef = doc(db, 'organizations', organizationId, 'subscriptions', subscription.id);
        await updateDoc(subRef, {
            paymentMode: mode,
            autoPayEnabled: mode === 'AUTO_PAY',
            updatedAt: serverTimestamp(),
        });
    },

    /**
     * Update subscription plan
     */
    async updatePlan(
        organizationId: string,
        newPlan: SubscriptionPlan
    ): Promise<void> {
        const subscription = await this.getSubscription(organizationId);
        if (!subscription) throw new Error('Subscription not found');

        const subRef = doc(db, 'organizations', organizationId, 'subscriptions', subscription.id);
        await updateDoc(subRef, {
            plan: newPlan,
            amountCents: getPlanAmountCents(newPlan),
            updatedAt: serverTimestamp(),
        });

        await this.logBillingEvent(organizationId, 'PLAN_CHANGE', {
            plan: newPlan,
            description: `Plan changed to ${newPlan}`,
        });
    },

    // =====================================================
    // PAYMENT PROCESSING
    // =====================================================

    /**
     * Initiate M-Pesa STK Push payment
     * NOTE: This is a placeholder - actual implementation requires server-side logic
     */
    async initiateMpesaPayment(
        organizationId: string,
        phoneNumber: string,
        plan: SubscriptionPlan
    ): Promise<{
        success: boolean;
        checkoutRequestId?: string;
        message: string;
    }> {
        // Validate phone number format (Kenyan)
        const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
        if (cleanPhone.length < 9) {
            return { success: false, message: 'Invalid phone number format' };
        }

        const amount = getPlanAmountCents(plan) / 100;

        // Create pending payment record
        const paymentData = {
            organizationId,
            plan,
            amountCents: getPlanAmountCents(plan),
            currency: BILLING_CONFIG.CURRENCY,
            provider: 'MPESA' as PaymentProvider,
            phoneNumber: cleanPhone,
            status: 'PENDING' as PaymentStatus,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        const paymentRef = await addDoc(paymentsRef, paymentData);

        // In production, this would call the Firebase Cloud Function
        // to initiate the actual M-Pesa STK Push
        console.log('[BILLING] M-Pesa STK Push initiated:', {
            paymentId: paymentRef.id,
            phone: cleanPhone,
            amount,
            plan,
        });

        return {
            success: true,
            checkoutRequestId: paymentRef.id,
            message: `STK Push sent to ${cleanPhone} for KES ${amount.toLocaleString()}. Please enter your M-Pesa PIN to complete payment.`,
        };
    },

    /**
     * Initiate Flutterwave payment
     * NOTE: This is a placeholder - returns redirect URL for Flutterwave checkout
     */
    async initiateFlutterwavePayment(
        organizationId: string,
        email: string,
        plan: SubscriptionPlan
    ): Promise<{
        success: boolean;
        paymentLink?: string;
        transactionRef?: string;
        message: string;
    }> {
        const amount = getPlanAmountCents(plan) / 100;
        const transactionRef = `HURE-${organizationId}-${Date.now()}`;

        // Create pending payment record
        const paymentData = {
            organizationId,
            plan,
            amountCents: getPlanAmountCents(plan),
            currency: BILLING_CONFIG.CURRENCY,
            provider: 'FLUTTERWAVE' as PaymentProvider,
            email,
            providerReference: transactionRef,
            status: 'PENDING' as PaymentStatus,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        await addDoc(paymentsRef, paymentData);

        // In production, this would generate a Flutterwave checkout link
        // For now, return a placeholder URL
        const paymentLink = `https://checkout.flutterwave.com/v3/hosted/pay?tx_ref=${transactionRef}`;

        console.log('[BILLING] Flutterwave payment initiated:', {
            transactionRef,
            email,
            amount,
            plan,
        });

        return {
            success: true,
            paymentLink,
            transactionRef,
            message: `Redirecting to Flutterwave checkout for KES ${amount.toLocaleString()}`,
        };
    },

    /**
     * Process successful payment (called by webhook or test function)
     */
    async processSuccessfulPayment(
        organizationId: string,
        paymentId: string,
        provider: PaymentProvider,
        transactionId: string
    ): Promise<void> {
        const subscription = await this.getSubscription(organizationId);
        if (!subscription) throw new Error('Subscription not found');

        const now = new Date();
        const nextBilling = new Date(now);
        nextBilling.setDate(nextBilling.getDate() + BILLING_CONFIG.BILLING_CYCLE_DAYS);

        // Update payment record
        const paymentRef = doc(db, 'payments', paymentId);
        await updateDoc(paymentRef, {
            status: 'COMPLETED',
            providerTransactionId: transactionId,
            paidAt: Timestamp.fromDate(now),
            updatedAt: serverTimestamp(),
        });

        // Update subscription
        const subRef = doc(db, 'organizations', organizationId, 'subscriptions', subscription.id);
        await updateDoc(subRef, {
            billingState: 'ACTIVE',
            status: 'Active',
            lastPaymentDate: Timestamp.fromDate(now),
            lastPaymentProvider: provider,
            currentPeriodStart: Timestamp.fromDate(now),
            currentPeriodEnd: Timestamp.fromDate(nextBilling),
            nextBillingDate: Timestamp.fromDate(nextBilling),
            suspendedAt: null,
            suspensionReason: null,
            updatedAt: serverTimestamp(),
        });

        // Log payment
        await this.logBillingEvent(organizationId, 'PAYMENT_RECEIVED', {
            plan: subscription.plan,
            amountCents: subscription.amountCents,
            provider,
            previousState: subscription.billingState,
            newState: 'ACTIVE',
            description: `Payment received via ${provider}. Next billing: ${formatDateKE(nextBilling)}`,
        });
    },

    // =====================================================
    // PAYMENT HISTORY
    // =====================================================

    /**
     * Get payment history for an organization
     */
    async getPaymentHistory(organizationId: string): Promise<PaymentRecord[]> {
        try {
            const q = query(
                paymentsRef,
                where('organizationId', '==', organizationId),
                orderBy('createdAt', 'desc'),
                limit(50)
            );

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
                    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
                    paidAt: data.paidAt?.toDate?.()?.toISOString() || data.paidAt,
                } as PaymentRecord;
            });
        } catch (error) {
            console.error('Error getting payment history:', error);
            return [];
        }
    },

    // =====================================================
    // BILLING LOGS
    // =====================================================

    /**
     * Log a billing event
     */
    async logBillingEvent(
        organizationId: string,
        eventType: BillingEventType,
        details: {
            plan?: SubscriptionPlan;
            amountCents?: number;
            provider?: PaymentProvider;
            previousState?: BillingSubscriptionState;
            newState?: BillingSubscriptionState;
            description: string;
            metadata?: Record<string, unknown>;
        }
    ): Promise<void> {
        try {
            await addDoc(billingLogsRef, {
                organizationId,
                eventType,
                ...details,
                createdAt: serverTimestamp(),
            });
        } catch (error) {
            console.error('Error logging billing event:', error);
        }
    },

    /**
     * Get billing logs for an organization
     */
    async getBillingLogs(organizationId: string): Promise<BillingLog[]> {
        try {
            const q = query(
                billingLogsRef,
                where('organizationId', '==', organizationId),
                orderBy('createdAt', 'desc'),
                limit(100)
            );

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
                } as BillingLog;
            });
        } catch (error) {
            console.error('Error getting billing logs:', error);
            return [];
        }
    },

    // =====================================================
    // DEV/TEST FUNCTIONS
    // Only available in development mode
    // =====================================================

    /**
     * [DEV ONLY] Simulate a successful payment
     */
    async devSimulatePayment(
        organizationId: string,
        plan: SubscriptionPlan
    ): Promise<{ success: boolean; message: string }> {
        if (!BILLING_CONFIG.DEV_MODE) {
            return { success: false, message: 'Dev mode is not enabled' };
        }

        try {
            // Create a simulated payment record
            const paymentData = {
                organizationId,
                plan,
                amountCents: getPlanAmountCents(plan),
                currency: BILLING_CONFIG.CURRENCY,
                provider: 'MPESA' as PaymentProvider,
                phoneNumber: '254700000000',
                providerTransactionId: `TEST-${Date.now()}`,
                status: 'COMPLETED' as PaymentStatus,
                paidAt: serverTimestamp(),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            const paymentRef = await addDoc(paymentsRef, paymentData);

            // Process as successful
            await this.processSuccessfulPayment(
                organizationId,
                paymentRef.id,
                'MPESA',
                `TEST-${Date.now()}`
            );

            return {
                success: true,
                message: `[DEV] Payment simulated for ${plan} plan. Subscription is now ACTIVE.`,
            };
        } catch (error) {
            console.error('[DEV] Error simulating payment:', error);
            return { success: false, message: 'Failed to simulate payment' };
        }
    },

    /**
     * [DEV ONLY] Simulate suspension
     */
    async devSimulateSuspension(
        organizationId: string
    ): Promise<{ success: boolean; message: string }> {
        if (!BILLING_CONFIG.DEV_MODE) {
            return { success: false, message: 'Dev mode is not enabled' };
        }

        try {
            await this.updateBillingState(
                organizationId,
                'SUSPENDED',
                '[DEV] Simulated suspension for testing'
            );

            return {
                success: true,
                message: '[DEV] Subscription suspended. Access restricted to billing only.',
            };
        } catch (error) {
            console.error('[DEV] Error simulating suspension:', error);
            return { success: false, message: 'Failed to simulate suspension' };
        }
    },

    /**
     * [DEV ONLY] Reset to trial state
     */
    async devResetToTrial(
        organizationId: string
    ): Promise<{ success: boolean; message: string }> {
        if (!BILLING_CONFIG.DEV_MODE) {
            return { success: false, message: 'Dev mode is not enabled' };
        }

        try {
            const subscription = await this.getSubscription(organizationId);
            if (!subscription) {
                // Create new trial subscription
                await this.createSubscription(organizationId);
                return {
                    success: true,
                    message: '[DEV] New trial subscription created.',
                };
            }

            const now = new Date();
            const trialEnd = new Date(now);
            trialEnd.setDate(trialEnd.getDate() + BILLING_CONFIG.TRIAL_DAYS);

            const subRef = doc(db, 'organizations', organizationId, 'subscriptions', subscription.id);
            await updateDoc(subRef, {
                billingState: 'TRIAL',
                status: 'Trial',
                trialStartedAt: Timestamp.fromDate(now),
                trialEndsAt: Timestamp.fromDate(trialEnd),
                suspendedAt: null,
                suspensionReason: null,
                currentPeriodStart: null,
                currentPeriodEnd: null,
                nextBillingDate: null,
                lastPaymentDate: null,
                updatedAt: serverTimestamp(),
            });

            await this.logBillingEvent(organizationId, 'TRIAL_START', {
                description: '[DEV] Trial reset for testing',
                newState: 'TRIAL',
            });

            return {
                success: true,
                message: `[DEV] Reset to trial. Expires on ${formatDateKE(trialEnd)}.`,
            };
        } catch (error) {
            console.error('[DEV] Error resetting to trial:', error);
            return { success: false, message: 'Failed to reset to trial' };
        }
    },
};

export default billingService;
