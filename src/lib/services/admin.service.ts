// Admin Service - Platform Administration Functions
import {
    collections,
    docs,
    getDocument,
    queryCollection,
    addAuditLog,
    getDoc,
    getDocs,
    updateDoc,
    query,
    where,
    orderBy,
    limit as firestoreLimit,
    serverTimestamp
} from '../firestore';
import type {
    Organization,
    Location,
    VerificationRequest,
    VerificationStatus,
    AuditLogEntry,
    PlatformStats
} from '../../types';

// =====================================================
// ADMIN SERVICE
// =====================================================

export const adminService = {
    /**
     * Get platform-wide statistics
     */
    async getPlatformStats(): Promise<PlatformStats> {
        // Total organizations
        const orgsSnapshot = await getDocs(collections.organizations());
        const totalOrganizations = orgsSnapshot.size;

        // Count verified organizations - check both approvalStatus and orgStatus for compatibility
        let verifiedOrganizations = 0;
        let planDistribution: Record<string, number> = {};

        orgsSnapshot.forEach(doc => {
            const data = doc.data();
            // Check approvalStatus first (new field), then fallback to orgStatus (legacy)
            const approvalStatus = data.approvalStatus;
            const orgStatus = data.orgStatus;
            
            const isVerifiedOrActive = 
                approvalStatus === 'Active' || 
                approvalStatus === 'Approved' ||
                orgStatus === 'Verified' || 
                orgStatus === 'Active';
            
            if (isVerifiedOrActive) {
                verifiedOrganizations++;
            }
            const plan = data.plan || 'Essential';
            planDistribution[plan] = (planDistribution[plan] || 0) + 1;
        });

        // Total users
        const usersSnapshot = await getDocs(collections.users());
        const totalUsers = usersSnapshot.size;

        // Pending verifications
        const pendingQuery = query(
            collections.verificationRequests(),
            where('status', '==', 'Pending')
        );
        const pendingSnapshot = await getDocs(pendingQuery);
        const pendingVerifications = pendingSnapshot.size;

        return {
            totalOrganizations,
            verifiedOrganizations,
            totalUsers,
            totalStaff: totalUsers, // Mapping totalUsers to totalStaff for now
            activeSubscriptions: verifiedOrganizations, // Approximation until subscription logic is refined
            pendingVerifications,
            planDistribution
        };
    },

    /**
     * Get audit logs with limit
     */
    async getAuditLogs(limitCount: number = 10): Promise<AuditLogEntry[]> {
        const q = query(
            collections.auditLogs(),
            orderBy('createdAt', 'desc'),
            firestoreLimit(limitCount)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
        })) as AuditLogEntry[];
    },

    /**
     * Get pending verifications
     */
    async getPendingVerifications(): Promise<VerificationRequest[]> {
        const q = query(
            collections.verificationRequests(),
            where('status', '==', 'Pending'),
            orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(q);
        const requests = await Promise.all(
            snapshot.docs.map(async doc => {
                const data = doc.data() as VerificationRequest;
                const request: VerificationRequest = {
                    id: doc.id,
                    ...data,
                    createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
                };

                // Fetch related organization
                if (data.organizationId) {
                    const org = await getDocument<Organization>(docs.organization(data.organizationId));
                    if (org) request.organization = org;
                }

                // Fetch related location
                if (data.locationId && data.organizationId) {
                    const loc = await getDocument<Location>(docs.location(data.organizationId, data.locationId));
                    if (loc) request.location = loc;
                }

                return request;
            })
        );
        return requests;
    },

    /**
     * Get all verifications
     */
    async getAllVerifications(): Promise<VerificationRequest[]> {
        const q = query(
            collections.verificationRequests(),
            orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(q);
        const requests = await Promise.all(
            snapshot.docs.map(async doc => {
                const data = doc.data() as VerificationRequest;
                const request: VerificationRequest = {
                    id: doc.id,
                    ...data,
                    createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
                };

                // Fetch related organization
                if (data.organizationId) {
                    const org = await getDocument<Organization>(docs.organization(data.organizationId));
                    if (org) request.organization = org;
                }

                // Fetch related location
                if (data.locationId && data.organizationId) {
                    const loc = await getDocument<Location>(docs.location(data.organizationId, data.locationId));
                    if (loc) request.location = loc;
                }

                return request;
            })
        );
        return requests;
    },

    /**
     * Approve a verification request
     */
    async approveVerification(verificationId: string): Promise<{ success: boolean; error?: string }> {
        try {
            const verificationDoc = await getDoc(docs.verificationRequest(verificationId));
            if (!verificationDoc.exists()) {
                return { success: false, error: 'Verification request not found' };
            }

            const verification = { id: verificationDoc.id, ...verificationDoc.data() } as VerificationRequest;

            // Update verification request
            await updateDoc(docs.verificationRequest(verificationId), {
                status: 'Verified' as VerificationStatus,
                reviewedAt: new Date().toISOString(),
                updatedAt: serverTimestamp()
            });

            // Update the target entity
            if (verification.type === 'ORG' && verification.organizationId) {
                const verifiedDate = new Date().toISOString();
                await updateDoc(docs.organization(verification.organizationId), {
                    orgStatus: 'Verified' as VerificationStatus,
                    approvalStatus: 'Approved', // Sync approvalStatus with orgStatus
                    verifiedAt: verifiedDate,
                    approvedAt: verifiedDate, // For trial calculation
                    updatedAt: serverTimestamp()
                });
            } else if (verification.type === 'FACILITY' && verification.locationId && verification.organizationId) {
                await updateDoc(docs.location(verification.organizationId, verification.locationId), {
                    status: 'Verified' as VerificationStatus,
                    verificationStatus: 'Approved', // Sync verificationStatus
                    verifiedAt: new Date().toISOString(),
                    updatedAt: serverTimestamp()
                });
            }

            // Add audit log
            await addAuditLog(
                'Verification Approved',
                `Approved ${verification.type} verification for ${verification.organization?.name || 'Organization'}`,
                undefined,
                undefined,
                verification.organizationId
            );

            return { success: true };
        } catch (error: any) {
            console.error('Error approving verification:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Reject a verification request
     */
    async rejectVerification(verificationId: string, reason: string): Promise<{ success: boolean; error?: string }> {
        try {
            const verificationDoc = await getDoc(docs.verificationRequest(verificationId));
            if (!verificationDoc.exists()) {
                return { success: false, error: 'Verification request not found' };
            }

            const verification = { id: verificationDoc.id, ...verificationDoc.data() } as VerificationRequest;

            // Update verification request
            await updateDoc(docs.verificationRequest(verificationId), {
                status: 'Rejected' as VerificationStatus,
                rejectionReason: reason,
                reviewedAt: new Date().toISOString(),
                updatedAt: serverTimestamp()
            });

            // Update the target entity
            if (verification.type === 'ORG' && verification.organizationId) {
                await updateDoc(docs.organization(verification.organizationId), {
                    orgStatus: 'Rejected' as VerificationStatus,
                    approvalStatus: 'Rejected', // Sync approvalStatus with orgStatus
                    rejectionReason: reason,
                    updatedAt: serverTimestamp()
                });
            } else if (verification.type === 'FACILITY' && verification.locationId && verification.organizationId) {
                await updateDoc(docs.location(verification.organizationId, verification.locationId), {
                    status: 'Rejected' as VerificationStatus,
                    verificationStatus: 'Rejected', // Sync verificationStatus
                    rejectionReason: reason,
                    updatedAt: serverTimestamp()
                });
            }

            // Add audit log
            await addAuditLog(
                'Verification Rejected',
                `Rejected ${verification.type} verification for ${verification.organization?.name || 'Organization'}: ${reason}`,
                undefined,
                undefined,
                verification.organizationId
            );

            return { success: true };
        } catch (error: any) {
            console.error('Error rejecting verification:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Get all organizations
     */
    async getAllOrganizations(filters?: {
        status?: string;
        plan?: string;
        search?: string;
    }): Promise<Organization[]> {
        let q = query(collections.organizations(), orderBy('createdAt', 'desc'));

        const snapshot = await getDocs(q);
        let results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Organization));

        // Apply filters in memory
        if (filters?.status) {
            results = results.filter(org => org.accountStatus === filters.status || org.orgStatus === filters.status);
        }
        if (filters?.plan) {
            results = results.filter(org => org.plan === filters.plan);
        }
        if (filters?.search) {
            const search = filters.search.toLowerCase();
            results = results.filter(org =>
                org.name.toLowerCase().includes(search) ||
                org.email.toLowerCase().includes(search)
            );
        }

        return results;
    },

    /**
     * Update organization account status
     */
    async updateAccountStatus(organizationId: string, status: 'Active' | 'Suspended' | 'Inactive') {
        // Map account status to approval status for consistency
        const approvalStatusMap: Record<string, string> = {
            'Active': 'Active',
            'Suspended': 'Suspended',
            'Inactive': 'Suspended'
        };
        
        await updateDoc(docs.organization(organizationId), {
            accountStatus: status,
            orgStatus: status,
            approvalStatus: approvalStatusMap[status] || status,
            updatedAt: serverTimestamp()
        });

        await addAuditLog(
            'Account Status Changed',
            `Organization ${organizationId} status changed to ${status}`,
            undefined,
            undefined,
            organizationId
        );
    },

    /**
     * Alias for updateAccountStatus for backward compatibility
     */
    async updateOrganizationStatus(organizationId: string, status: 'Active' | 'Suspended' | 'Inactive') {
        return this.updateAccountStatus(organizationId, status);
    }
};
