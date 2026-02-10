// =====================================================
// SUBSCRIPTION GUARD
// Wrapper component that checks subscription state and restricts access
// =====================================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { billingService } from '../../lib/services/billing.service';
import SuspensionScreen from '../employer/SuspensionScreen';
import type { BillingSubscriptionState } from '../../types';

interface SubscriptionGuardProps {
    children: React.ReactNode;
    allowBillingAccess?: boolean; // If true, always allow access (for billing pages)
    allowVerificationAccess?: boolean; // If true, always allow access (for verification page)
}

interface GuardState {
    loading: boolean;
    canAccess: boolean;
    billingState: BillingSubscriptionState;
    reason?: string;
}

const SubscriptionGuard: React.FC<SubscriptionGuardProps> = ({
    children,
    allowBillingAccess = false,
    allowVerificationAccess = false
}) => {
    const { user } = useAuth();
    const [state, setState] = useState<GuardState>({
        loading: true,
        canAccess: true,
        billingState: 'TRIAL',
    });

    useEffect(() => {
        checkSubscriptionAccess();
    }, [user?.organizationId]);

    const checkSubscriptionAccess = async () => {
        if (!user?.organizationId) {
            setState({
                loading: false,
                canAccess: true,
                billingState: 'TRIAL',
            });
            return;
        }

        try {
            const { allowed, reason, billingState } = await billingService.canAccessPlatform(
                user.organizationId
            );

            setState({
                loading: false,
                canAccess: allowed || allowBillingAccess || allowVerificationAccess,
                billingState,
                reason,
            });
        } catch (error) {
            console.error('Error checking subscription access:', error);
            // Block access on error - safer than allowing unrestricted access
            setState({
                loading: false,
                canAccess: allowBillingAccess || allowVerificationAccess,
                billingState: 'SUSPENDED',
                reason: 'Unable to verify subscription. Please check your billing status or contact support.',
            });
        }
    };

    // Loading state
    if (state.loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin text-4xl mb-4">⏳</div>
                    <p className="text-slate-500">Checking subscription...</p>
                </div>
            </div>
        );
    }

    // Suspended - show suspension screen
    if (!state.canAccess && state.billingState === 'SUSPENDED') {
        return <SuspensionScreen />;
    }

    // Trial expired but not yet suspended - also block
    if (!state.canAccess) {
        return <SuspensionScreen reason={state.reason} />;
    }

    // Access allowed
    return <>{children}</>;
};

export default SubscriptionGuard;
