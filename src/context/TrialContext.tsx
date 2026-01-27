import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { organizationService } from '../lib/services/organization.service';
import type { Organization, Subscription } from '../types';

interface TrialContextType {
    // Status
    isLoading: boolean;
    loadError: string | null;
    isTrial: boolean;
    isActive: boolean;
    isInactive: boolean;
    isVerified: boolean;

    // Trial info
    daysRemaining: number;
    trialEndDate: Date | null;
    isUrgent: boolean; // 5 days or less
    isCritical: boolean; // 2 days or less

    // Access control
    canAccessOperations: boolean; // Can use schedule, attendance, leave, etc.
    canPerformPayouts: boolean; // Can run payroll payouts, mark paid
    canGenerateInvoices: boolean; // Can generate official invoices
    canExportReports: boolean; // Can export statutory reports

    // Data
    organization: Organization | null;
    subscription: Subscription | null;

    // Actions
    refreshStatus: () => Promise<void>;
}

const TrialContext = createContext<TrialContextType | undefined>(undefined);

export const useTrialStatus = () => {
    const context = useContext(TrialContext);
    if (!context) {
        throw new Error('useTrialStatus must be used within TrialProvider');
    }
    return context;
};

export const TrialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [subscription, setSubscription] = useState<Subscription | null>(null);

    useEffect(() => {
        if (user?.organizationId) {
            loadStatus();
        } else {
            setIsLoading(false);
        }
    }, [user?.organizationId]);

    const loadStatus = async () => {
        if (!user?.organizationId) {
            console.warn('[TrialContext] No organizationId on user:', user);
            return;
        }

        console.log('[TrialContext] Loading status for org:', user.organizationId);
        setIsLoading(true);
        setLoadError(null);
        try {
            const [org, sub] = await Promise.all([
                organizationService.getById(user.organizationId),
                organizationService.getSubscription(user.organizationId)
            ]);
            console.log('[TrialContext] Loaded org:', org?.id, 'orgStatus:', org?.orgStatus);
            console.log('[TrialContext] Loaded subscription:', sub?.status);
            setOrganization(org);
            setSubscription(sub);
            if (!org) {
                console.warn('[TrialContext] Organization not found for ID:', user.organizationId);
                setLoadError('Organization data not found');
            }
        } catch (err: any) {
            console.error('[TrialContext] Error loading trial status:', err);
            setLoadError(err?.message || 'Failed to load organization data');
        } finally {
            setIsLoading(false);
        }
    };

    // Calculate trial info
    const calculateTrialInfo = () => {
        const now = new Date();
        let trialEndDate: Date | null = null;

        if (subscription?.trialEndsAt) {
            trialEndDate = new Date(subscription.trialEndsAt);
        } else if (organization?.verifiedAt) {
            // Start trial from verification date
            trialEndDate = new Date(organization.verifiedAt);
            trialEndDate.setDate(trialEndDate.getDate() + 10); // 10 days trial
        } else if (organization?.approvedAt) {
            // Fallback for organizations with approvedAt field (legacy)
            trialEndDate = new Date(organization.approvedAt);
            trialEndDate.setDate(trialEndDate.getDate() + 10);
        } else if (organization?.orgStatus === 'Verified' && organization?.createdAt) {
            // Fallback for verified orgs without verifiedAt/approvedAt (legacy)
            trialEndDate = new Date(organization.createdAt);
            trialEndDate.setDate(trialEndDate.getDate() + 10);
        }

        if (!trialEndDate) {
            return {
                daysRemaining: 0,
                trialEndDate: null,
                isExpired: true,
                isUrgent: false,
                isCritical: false
            };
        }

        const diffTime = trialEndDate.getTime() - now.getTime();
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
            daysRemaining: Math.max(0, daysRemaining),
            trialEndDate,
            isExpired: daysRemaining <= 0,
            isUrgent: daysRemaining <= 5 && daysRemaining > 2,
            isCritical: daysRemaining <= 2 && daysRemaining > 0
        };
    };

    const trialInfo = calculateTrialInfo();

    // Determine status
    const isTrial = subscription?.status === 'Trial' || (!subscription?.status && !trialInfo.isExpired);
    const isActive = subscription?.status === 'Active';
    const isInactive = trialInfo.isExpired && !isActive;
    // Organization is verified if orgStatus OR approvalStatus is 'Verified' or 'Active'
    // (handles both old orgStatus field and new approvalStatus field)
    const orgData = organization as any; // Allow checking both fields
    const isVerified = 
        orgData?.orgStatus === 'Verified' || 
        orgData?.orgStatus === 'Active' ||
        orgData?.approvalStatus === 'Approved' ||
        orgData?.approvalStatus === 'Active';

    // Debug logging
    console.log('[TrialContext] Status check:', {
        orgStatus: orgData?.orgStatus,
        approvalStatus: orgData?.approvalStatus,
        isVerified,
        isTrial,
        isActive,
        isLoading,
        loadError
    });

    // Access control rules
    // During trial (Day 1-10): Full operational access, but payout/invoice/export blocked
    // After trial unpaid (Inactive): Everything locked except billing
    // After payment (Active): Full access, verification rules enforced

    const canAccessOperations = isTrial || isActive; // Can use schedule, attendance, leave
    const canPerformPayouts = isActive && isVerified; // Must be paid AND verified
    const canGenerateInvoices = isActive && isVerified;
    const canExportReports = isActive && isVerified;

    const value: TrialContextType = {
        isLoading,
        loadError,
        isTrial,
        isActive,
        isInactive,
        isVerified,
        daysRemaining: trialInfo.daysRemaining,
        trialEndDate: trialInfo.trialEndDate,
        isUrgent: trialInfo.isUrgent,
        isCritical: trialInfo.isCritical,
        canAccessOperations,
        canPerformPayouts,
        canGenerateInvoices,
        canExportReports,
        organization,
        subscription,
        refreshStatus: loadStatus
    };

    return (
        <TrialContext.Provider value={value}>
            {children}
        </TrialContext.Provider>
    );
};

// Access Blocked Component - shows when user tries to access locked features
export const AccessBlockedOverlay: React.FC<{ reason?: 'inactive' | 'verification' | 'payout' }> = ({ reason = 'inactive' }) => {
    const messages = {
        inactive: {
            title: 'Your trial has ended',
            subtitle: 'Please activate a plan to continue using HURE.',
            icon: '🔒'
        },
        verification: {
            title: 'Verification Required',
            subtitle: 'This feature is disabled until your organization is verified. Submit required business credentials (Business Registration and KRA PIN) for review.',
            icon: '📋'
        },
        payout: {
            title: 'Payment Required',
            subtitle: 'Upgrade to a paid plan and complete verification to run payouts.',
            icon: '💳'
        }
    };

    const msg = messages[reason];

    return (
        <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md text-center">
                <div className="text-6xl mb-4">{msg.icon}</div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">{msg.title}</h2>
                <p className="text-slate-600 mb-6">{msg.subtitle}</p>
                <button
                    onClick={() => {
                        if (reason === 'verification') {
                            window.location.hash = '/employer/organization';
                        } else {
                            window.location.hash = '/employer/billing';
                        }
                    }}
                    className="inline-block bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 cursor-pointer"
                >
                    {reason === 'verification' ? 'Go to Verification' : 'Go to Billing'}
                </button>
            </div>
        </div>
    );
};

export default TrialContext;
