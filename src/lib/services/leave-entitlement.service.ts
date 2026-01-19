// Leave Entitlement Service - Per-staff leave allocations
import {
    collections,
    docs,
    getDocument,
    getDocs,
    updateDoc,
    addDoc,
    query,
    where,
    serverTimestamp,
} from '../firestore';
import type { LeaveEntitlement, LeaveType } from '../../types';
import { leaveService } from './leave.service';

export const leaveEntitlementService = {
    /**
     * Initialize leave entitlements for a new staff member
     * Creates entitlements based on org-level leave types
     */
    async initializeStaffEntitlements(
        organizationId: string,
        staffId: string,
        year?: number
    ): Promise<void> {
        const currentYear = year || new Date().getFullYear();

        // Get org-level leave types
        const leaveTypes = await leaveService.getLeaveTypes(organizationId);

        // Create entitlement for each leave type
        for (const type of leaveTypes) {
            await addDoc(collections.leaveEntitlements(organizationId), {
                organizationId,
                staffId,
                leaveTypeId: type.id,
                year: currentYear,
                allocatedDays: type.daysAllowed,
                usedDays: 0,
                pendingDays: 0,
                carriedForwardDays: 0,
                isActive: true,
                isOverridden: false,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        }
    },

    /**
     * Get staff entitlements for a given year
     */
    async getStaffEntitlements(
        organizationId: string,
        staffId: string,
        year?: number
    ): Promise<LeaveEntitlement[]> {
        const currentYear = year || new Date().getFullYear();

        const q = query(
            collections.leaveEntitlements(organizationId),
            where('staffId', '==', staffId),
            where('year', '==', currentYear)
        );

        const snapshot = await getDocs(q);
        const entitlements: LeaveEntitlement[] = [];

        // Fetch leave types
        const leaveTypes = await leaveService.getLeaveTypes(organizationId);

        for (const doc of snapshot.docs) {
            const data = doc.data();
            const leaveType = leaveTypes.find(t => t.id === data.leaveTypeId);

            entitlements.push({
                id: doc.id,
                ...data,
                leaveType,
            } as LeaveEntitlement);
        }

        return entitlements;
    },

    /**
     * Get only active entitlements (for dropdown)
     */
    async getActiveEntitlements(
        organizationId: string,
        staffId: string,
        year?: number
    ): Promise<LeaveEntitlement[]> {
        const all = await this.getStaffEntitlements(organizationId, staffId, year);
        return all.filter(e => e.isActive && e.leaveType);
    },

    /**
     * Calculate remaining days for an entitlement
     */
    calculateRemainingDays(entitlement: LeaveEntitlement): number {
        const { allocatedDays, usedDays, pendingDays, carriedForwardDays } = entitlement;
        return Math.max(0, allocatedDays + carriedForwardDays - usedDays - pendingDays);
    },

    /**
     * Update entitlement allocation (employer override)
     */
    async updateAllocation(
        organizationId: string,
        entitlementId: string,
        newAllocation: number,
        reason: string,
        overriddenBy: string
    ): Promise<void> {
        const entitlement = await getDocument<LeaveEntitlement>(
            docs.leaveEntitlement(organizationId, entitlementId)
        );

        if (!entitlement) {
            throw new Error('Entitlement not found');
        }

        await updateDoc(docs.leaveEntitlement(organizationId, entitlementId), {
            allocatedDays: newAllocation,
            isOverridden: true,
            overrideReason: reason,
            overriddenBy,
            overriddenAt: new Date().toISOString(),
            updatedAt: serverTimestamp(),
        });
    },

    /**
     * Toggle entitlement active status
     */
    async toggleActive(
        organizationId: string,
        entitlementId: string,
        isActive: boolean
    ): Promise<void> {
        await updateDoc(docs.leaveEntitlement(organizationId, entitlementId), {
            isActive,
            updatedAt: serverTimestamp(),
        });
    },

    /**
     * Increment used days (called when leave is approved)
     */
    async incrementUsedDays(
        organizationId: string,
        staffId: string,
        leaveTypeId: string,
        days: number,
        year?: number
    ): Promise<void> {
        const currentYear = year || new Date().getFullYear();

        // Find the entitlement
        const q = query(
            collections.leaveEntitlements(organizationId),
            where('staffId', '==', staffId),
            where('leaveTypeId', '==', leaveTypeId),
            where('year', '==', currentYear)
        );

        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            const current = doc.data();

            await updateDoc(doc.ref, {
                usedDays: (current.usedDays || 0) + days,
                updatedAt: serverTimestamp(),
            });
        }
    },

    /**
     * Increment pending days (called when leave request is submitted)
     */
    async incrementPendingDays(
        organizationId: string,
        staffId: string,
        leaveTypeId: string,
        days: number,
        year?: number
    ): Promise<void> {
        const currentYear = year || new Date().getFullYear();

        const q = query(
            collections.leaveEntitlements(organizationId),
            where('staffId', '==', staffId),
            where('leaveTypeId', '==', leaveTypeId),
            where('year', '==', currentYear)
        );

        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            const current = doc.data();

            await updateDoc(doc.ref, {
                pendingDays: (current.pendingDays || 0) + days,
                updatedAt: serverTimestamp(),
            });
        }
    },

    /**
     * Decrement pending days (called when request is approved, rejected, or cancelled)
     */
    async decrementPendingDays(
        organizationId: string,
        staffId: string,
        leaveTypeId: string,
        days: number,
        year?: number
    ): Promise<void> {
        const currentYear = year || new Date().getFullYear();

        const q = query(
            collections.leaveEntitlements(organizationId),
            where('staffId', '==', staffId),
            where('leaveTypeId', '==', leaveTypeId),
            where('year', '==', currentYear)
        );

        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            const current = doc.data();

            await updateDoc(doc.ref, {
                pendingDays: Math.max(0, (current.pendingDays || 0) - days),
                updatedAt: serverTimestamp(),
            });
        }
    },
};
