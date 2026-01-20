// Leave Service - Firebase/Firestore Implementation
import {
  collections,
  docs,
  getDocument,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  addDoc,
  serverTimestamp,
  addAuditLog
} from '../firestore';
import { auth } from '../firebase';
import type { LeaveRequest, LeaveType, LeaveBalance, LeaveStatus, Profile, LeaveEntitlement } from '../../types';
import { staffService } from './staff.service';

// =====================================================
// LEAVE SERVICE
// =====================================================

export const leaveService = {
  // ==================== LEAVE TYPES ====================

  /**
   * Get all leave types for an organization
   */
  async getLeaveTypes(organizationId: string): Promise<LeaveType[]> {
    const q = query(
      collections.leaveTypes(organizationId),
      orderBy('name')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LeaveType));
  },

  /**
   * Create leave type
   */
  async createLeaveType(organizationId: string, input: {
    name: string;
    daysAllowed: number;
    isPaid: boolean;
    requiresApproval: boolean;
    requiresDocument?: boolean;
    carryForwardAllowed?: boolean;
    notes?: string;
  }): Promise<LeaveType> {
    const docRef = await addDoc(collections.leaveTypes(organizationId), {
      organizationId,
      ...input,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return (await getDocument<LeaveType>(docRef))!;
  },

  /**
   * Update leave type
   */
  async updateLeaveType(organizationId: string, typeId: string, updates: Partial<LeaveType>): Promise<void> {
    await updateDoc(docs.leaveType(organizationId, typeId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
  },

  /**
   * Delete leave type
   */
  async deleteLeaveType(organizationId: string, typeId: string): Promise<void> {
    await deleteDoc(docs.leaveType(organizationId, typeId));
  },

  /**
   * Create default leave types for new organization (Kenya Standards)
   */
  async createDefaultLeaveTypes(organizationId: string): Promise<void> {
    const defaults = [
      { name: 'Annual Leave', daysAllowed: 21, isPaid: true, requiresApproval: true, requiresDocument: false, carryForwardAllowed: true, maxCarryForwardDays: 10, appliesToAll: true, appliesToRoles: [], canBeOverridden: true, isDefault: true, notes: 'Kenya Employment Act' },
      { name: 'Sick Leave - Paid', daysAllowed: 14, isPaid: true, requiresApproval: true, requiresDocument: true, carryForwardAllowed: false, appliesToAll: true, appliesToRoles: [], canBeOverridden: false, isDefault: true, notes: '7 full + 7 half (policy configurable)' },
      { name: 'Sick Leave - Unpaid', daysAllowed: 999, isPaid: false, requiresApproval: true, requiresDocument: true, carryForwardAllowed: false, appliesToAll: true, appliesToRoles: [], canBeOverridden: false, isDefault: true, notes: 'After paid sick leave exhausted' },
      { name: 'Maternity Leave', daysAllowed: 90, isPaid: true, requiresApproval: true, requiresDocument: true, carryForwardAllowed: false, appliesToAll: false, appliesToRoles: ['Doctor', 'Nurse', 'Midwife', 'Receptionist / Front Desk', 'HR', 'Administrator', 'Accounts / Finance'], canBeOverridden: false, isDefault: true, notes: 'Female employees' },
      { name: 'Paternity Leave', daysAllowed: 14, isPaid: true, requiresApproval: true, requiresDocument: true, carryForwardAllowed: false, appliesToAll: false, appliesToRoles: ['Doctor', 'Clinical Officer', 'Nurse', 'Lab Technician', 'Pharmacist', 'HR', 'Administrator'], canBeOverridden: false, isDefault: true, notes: 'Male employees' },
      { name: 'Compassionate Leave', daysAllowed: 5, isPaid: true, requiresApproval: true, requiresDocument: false, carryForwardAllowed: false, appliesToAll: true, appliesToRoles: [], canBeOverridden: true, isDefault: true, notes: 'Bereavement / family emergency' },
      { name: 'Study Leave', daysAllowed: 10, isPaid: true, requiresApproval: true, requiresDocument: true, carryForwardAllowed: false, appliesToAll: true, appliesToRoles: [], canBeOverridden: true, isDefault: true, notes: 'Employer-defined, configurable paid/unpaid' },
      { name: 'Unpaid Leave', daysAllowed: 999, isPaid: false, requiresApproval: true, requiresDocument: false, carryForwardAllowed: false, appliesToAll: true, appliesToRoles: [], canBeOverridden: false, isDefault: true, notes: 'Unlimited (no balance limit)' },
      { name: 'Comp Off', daysAllowed: 10, isPaid: true, requiresApproval: true, requiresDocument: false, carryForwardAllowed: true, maxCarryForwardDays: 5, appliesToAll: true, appliesToRoles: [], canBeOverridden: true, isDefault: true, notes: 'Compensatory time off' }
    ];

    for (const type of defaults) {
      await addDoc(collections.leaveTypes(organizationId), {
        organizationId,
        ...type,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  },

  // ==================== LEAVE REQUESTS ====================

  /**
   * Get all leave requests for an organization
   */
  async getLeaveRequests(organizationId: string, filters?: {
    status?: LeaveStatus;
    staffId?: string;
    leaveTypeId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<LeaveRequest[]> {
    const q = query(
      collections.leaveRequests(organizationId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    let requests: LeaveRequest[] = await Promise.all(
      snapshot.docs.map(async doc => {
        const data = doc.data();
        const request: LeaveRequest = { id: doc.id, ...data } as LeaveRequest;

        // Fetch staff details
        if (data.staffId) {
          request.staff = await staffService.getById(data.staffId) || undefined;
        }

        // Fetch leave type
        const leaveTypes = await this.getLeaveTypes(organizationId);
        request.leaveType = leaveTypes.find(t => t.id === data.leaveTypeId);

        return request;
      })
    );

    // Apply filters
    if (filters?.status) {
      requests = requests.filter(r => r.status === filters.status);
    }
    if (filters?.staffId) {
      requests = requests.filter(r => r.staffId === filters.staffId);
    }
    if (filters?.leaveTypeId) {
      requests = requests.filter(r => r.leaveTypeId === filters.leaveTypeId);
    }
    if (filters?.startDate) {
      requests = requests.filter(r => r.startDate >= filters.startDate!);
    }
    if (filters?.endDate) {
      requests = requests.filter(r => r.endDate <= filters.endDate!);
    }

    return requests;
  },

  /**
   * Get pending leave requests
   */
  async getPendingRequests(organizationId: string): Promise<LeaveRequest[]> {
    return this.getLeaveRequests(organizationId, { status: 'Pending' });
  },

  /**
   * Get leave request by ID
   */
  async getRequestById(organizationId: string, requestId: string): Promise<LeaveRequest | null> {
    return getDocument<LeaveRequest>(docs.leaveRequest(organizationId, requestId));
  },

  /**
   * Create leave request with balance enforcement
   */
  async createRequest(organizationId: string, input: {
    staffId: string;
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    reason?: string;
    daysRequested?: number;
    allowOverBalance?: boolean; // Admin can override balance check
  }): Promise<{ success: boolean; error?: string; request?: LeaveRequest; balanceInfo?: { available: number; requested: number; isOverBalance: boolean } }> {
    // Validate dates
    if (new Date(input.endDate) < new Date(input.startDate)) {
      return { success: false, error: 'End date must be on or after start date' };
    }

    // Calculate days requested if not provided
    let daysRequested = input.daysRequested;
    if (!daysRequested) {
      const start = new Date(input.startDate);
      const end = new Date(input.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      daysRequested = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    // Get leave type to check if it's unlimited (999 days means unlimited)
    const leaveTypes = await this.getLeaveTypes(organizationId);
    const leaveType = leaveTypes.find(lt => lt.id === input.leaveTypeId);
    const isPaid = leaveType?.isPaid ?? true;
    const isUnlimited = leaveType?.daysAllowed === 999;

    // Balance enforcement (skip for unlimited leave types)
    let balanceInfo = { available: 0, requested: daysRequested, isOverBalance: false };

    if (!isUnlimited) {
      try {
        const balances = await this.getStaffBalances(organizationId, input.staffId);
        const typeBalance = balances.find(b => b.leaveTypeId === input.leaveTypeId);

        if (typeBalance) {
          const available = typeBalance.remaining;
          balanceInfo = { available, requested: daysRequested, isOverBalance: daysRequested > available };

          // Block if over balance and admin hasn't confirmed
          if (balanceInfo.isOverBalance && !input.allowOverBalance) {
            return {
              success: false,
              error: `Insufficient leave balance. Available: ${available} days, Requested: ${daysRequested} days. Admin confirmation required to proceed.`,
              balanceInfo
            };
          }
        }
      } catch (err) {
        console.error('Error checking balance:', err);
      }
    }

    const docRef = await addDoc(collections.leaveRequests(organizationId), {
      organizationId,
      staffId: input.staffId,
      leaveTypeId: input.leaveTypeId,
      startDate: input.startDate,
      endDate: input.endDate,
      daysRequested,
      isHalfDay: false,
      isPaid,
      reason: input.reason || null,
      status: 'Pending' as LeaveStatus,
      requestedBy: auth.currentUser?.uid || null,
      requestedByEmail: auth.currentUser?.email || null,
      balanceBeforeRequest: balanceInfo.available,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Update pending days in LEAVE ENTITLEMENTS
    try {
      const balanceQuery = query(
        collections.leaveEntitlements(organizationId),
        where('staffId', '==', input.staffId),
        where('leaveTypeId', '==', input.leaveTypeId),
        where('year', '==', new Date().getFullYear())
      );
      const balanceSnapshot = await getDocs(balanceQuery);
      if (!balanceSnapshot.empty) {
        const balanceDoc = balanceSnapshot.docs[0];
        const currentBalance = balanceDoc.data() as LeaveEntitlement;
        await updateDoc(balanceDoc.ref, {
          pendingDays: (currentBalance.pendingDays || 0) + daysRequested,
          updatedAt: serverTimestamp()
        });
      }
    } catch (balanceError) {
      console.error('Error updating pending entitlement:', balanceError);
    }

    const request = await this.getRequestById(organizationId, docRef.id);
    return { success: true, request: request!, balanceInfo };
  },

  /**
   * Approve leave request
   */
  async approveRequest(organizationId: string, requestId: string, comment?: string): Promise<{ success: boolean; error?: string }> {
    const request = await this.getRequestById(organizationId, requestId);
    if (!request) {
      return { success: false, error: 'Leave request not found' };
    }

    if (request.status !== 'Pending') {
      return { success: false, error: 'Request is not pending' };
    }

    const now = new Date().toISOString();
    const reviewerId = auth.currentUser?.uid;

    await updateDoc(docs.leaveRequest(organizationId, requestId), {
      status: 'Approved',
      reviewedBy: reviewerId,
      reviewedAt: now,
      approvedBy: reviewerId,
      approvedAt: now,
      approvalComment: comment || null,
      updatedAt: serverTimestamp()
    });

    // Update LEAVE ENTITLEMENTS - increment usedDays, decrement pendingDays
    try {
      const balanceQuery = query(
        collections.leaveEntitlements(organizationId),
        where('staffId', '==', request.staffId),
        where('leaveTypeId', '==', request.leaveTypeId),
        where('year', '==', new Date().getFullYear())
      );
      const balanceSnapshot = await getDocs(balanceQuery);
      if (!balanceSnapshot.empty) {
        const balanceDoc = balanceSnapshot.docs[0];
        const currentBalance = balanceDoc.data() as LeaveEntitlement;
        await updateDoc(balanceDoc.ref, {
          usedDays: (currentBalance.usedDays || 0) + request.daysRequested,
          pendingDays: Math.max(0, (currentBalance.pendingDays || 0) - request.daysRequested),
          updatedAt: serverTimestamp()
        });
      }
    } catch (balanceError) {
      console.error('Error updating leave entitlement:', balanceError);
    }

    // Add audit log
    await addAuditLog(
      'Staff',
      `Approved leave request for ${request.staff?.fullName || 'staff'}`,
      reviewerId,
      auth.currentUser?.email || undefined,
      organizationId,
      { requestId, staffId: request.staffId }
    );

    return { success: true };
  },

  /**
   * Reject leave request
   */
  async rejectRequest(organizationId: string, requestId: string, reason?: string): Promise<{ success: boolean; error?: string }> {
    const request = await this.getRequestById(organizationId, requestId);
    if (!request) {
      return { success: false, error: 'Leave request not found' };
    }

    if (request.status !== 'Pending') {
      return { success: false, error: 'Request is not pending' };
    }

    const now = new Date().toISOString();
    const reviewerId = auth.currentUser?.uid;

    await updateDoc(docs.leaveRequest(organizationId, requestId), {
      status: 'Rejected',
      reviewedBy: reviewerId,
      reviewedAt: now,
      rejectionReason: reason || null,
      updatedAt: serverTimestamp()
    });

    // Restore pending balance (decrement pendingDays) in ENTITLEMENTS
    try {
      const balanceQuery = query(
        collections.leaveEntitlements(organizationId),
        where('staffId', '==', request.staffId),
        where('leaveTypeId', '==', request.leaveTypeId),
        where('year', '==', new Date().getFullYear())
      );
      const balanceSnapshot = await getDocs(balanceQuery);
      if (!balanceSnapshot.empty) {
        const balanceDoc = balanceSnapshot.docs[0];
        const currentBalance = balanceDoc.data() as LeaveEntitlement;
        await updateDoc(balanceDoc.ref, {
          pendingDays: Math.max(0, (currentBalance.pendingDays || 0) - request.daysRequested),
          updatedAt: serverTimestamp()
        });
      }
    } catch (balanceError) {
      console.error('Error restoring pending entitlement:', balanceError);
    }

    return { success: true };
  },

  /**
   * Cancel leave request (by staff)
   */
  async cancelRequest(organizationId: string, requestId: string): Promise<{ success: boolean; error?: string }> {
    const request = await this.getRequestById(organizationId, requestId);
    if (!request) {
      return { success: false, error: 'Leave request not found' };
    }

    if (request.status !== 'Pending') {
      return { success: false, error: 'Can only cancel pending requests' };
    }

    await updateDoc(docs.leaveRequest(organizationId, requestId), {
      status: 'Cancelled',
      updatedAt: serverTimestamp()
    });

    // Restore pending balance (decrement pendingDays) in ENTITLEMENTS
    try {
      const balanceQuery = query(
        collections.leaveEntitlements(organizationId),
        where('staffId', '==', request.staffId),
        where('leaveTypeId', '==', request.leaveTypeId),
        where('year', '==', new Date().getFullYear())
      );
      const balanceSnapshot = await getDocs(balanceQuery);
      if (!balanceSnapshot.empty) {
        const balanceDoc = balanceSnapshot.docs[0];
        const currentBalance = balanceDoc.data() as LeaveEntitlement;
        await updateDoc(balanceDoc.ref, {
          pendingDays: Math.max(0, (currentBalance.pendingDays || 0) - request.daysRequested),
          updatedAt: serverTimestamp()
        });
      }
    } catch (balanceError) {
      console.error('Error restoring pending entitlement:', balanceError);
    }

    return { success: true };
  },

  /**
   * Check if staff is on approved leave for a date
   */
  async isStaffOnLeave(organizationId: string, staffId: string, date: string): Promise<boolean> {
    const requests = await this.getLeaveRequests(organizationId, {
      staffId,
      status: 'Approved'
    });

    return requests.some(request => {
      return date >= request.startDate && date <= request.endDate;
    });
  },

  /**
   * Get current user's leave requests
   * @param organizationId - Organization ID
   * @param staffId - Optional staff ID (uses current user if not provided)
   */
  async getMyLeaveRequests(organizationId: string, staffId?: string): Promise<LeaveRequest[]> {
    const userId = staffId || auth.currentUser?.uid;
    if (!userId) return [];

    return this.getLeaveRequests(organizationId, { staffId: userId });
  },

  // ==================== LEAVE BALANCES (via Entitlements) ====================

  /**
   * Get leave balances for a staff member with computed properties
   * NOW READS FROM LEAVE ENTITLEMENTS
   */
  async getStaffBalances(organizationId: string, staffId: string, year?: number): Promise<(LeaveBalance & { remaining: number; allocated: number; used: number })[]> {
    const currentYear = year || new Date().getFullYear();

    const q = query(
      collections.leaveEntitlements(organizationId),
      where('staffId', '==', staffId),
      where('year', '==', currentYear)
    );

    const snapshot = await getDocs(q);
    const balances = snapshot.docs.map(doc => {
      const data = doc.data() as LeaveEntitlement;
      // Map Entitlement fields to Balance fields for compatibility
      return {
        id: doc.id,
        ...data,
        totalDays: data.allocatedDays || 0 // Map allocatedDays to totalDays
      } as any as LeaveBalance;
    });

    // Fetch leave type details and compute remaining days
    const leaveTypes = await this.getLeaveTypes(organizationId);
    return balances.map(balance => {
      const allocated = balance.totalDays || 0;
      const used = balance.usedDays || 0;
      const pending = balance.pendingDays || 0;
      // Note: Entitlements might have carryForwardDays, implicitly added to allocated or separate?
      // For now, simple remaining calc.
      const remaining = Math.max(0, allocated - used - pending);
      return {
        ...balance,
        leaveType: leaveTypes.find(t => t.id === balance.leaveTypeId),
        allocated,
        used,
        remaining
      };
    });
  },

  /**
   * Initialize leave balances for new staff
   * UPDATED: Uses leaveEntitlements collection
   */
  async initializeStaffBalances(organizationId: string, staffId: string): Promise<void> {
    const leaveTypes = await this.getLeaveTypes(organizationId);
    const currentYear = new Date().getFullYear();

    for (const type of leaveTypes) {
      // Check if entitlement already exists
      const q = query(
        collections.leaveEntitlements(organizationId),
        where('staffId', '==', staffId),
        where('leaveTypeId', '==', type.id),
        where('year', '==', currentYear)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
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
          updatedAt: serverTimestamp()
        });
      }
    }
  },
  /**
   * Get current user's balances
   */
  async getMyBalances(organizationId: string, staffId: string): Promise<LeaveBalance[]> {
    return this.getStaffBalances(organizationId, staffId);
  },

  /**
   * Submit a leave request (alias for createRequest)
   */
  async submitRequest(organizationId: string, input: {
    staffId: string;
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    reason?: string;
    daysRequested?: number;
  }): Promise<{ success: boolean; error?: string; request?: LeaveRequest }> {
    return this.createRequest(organizationId, input);
  }
};
