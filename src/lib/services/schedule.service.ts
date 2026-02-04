// Schedule Service - Firebase/Firestore Implementation
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
  serverTimestamp
} from '../firestore';
import { auth } from '../firebase';
import type { Shift, ShiftAssignment, Location, Profile } from '../../types';
import { staffService } from './staff.service';
import { organizationService } from './organization.service';
import { leaveService } from './leave.service';

// =====================================================
// AUDIT LOGGING HELPER
// =====================================================

const logScheduleAudit = async (
  organizationId: string,
  action: 'CREATE_SHIFT' | 'UPDATE_SHIFT' | 'DELETE_SHIFT' | 'ASSIGN_STAFF' | 'REMOVE_ASSIGNMENT',
  details: {
    shiftId?: string;
    assignmentId?: string;
    staffId?: string;
    description: string;
    metadata?: Record<string, any>;
  }
) => {
  try {
    await addDoc(collections.auditLogs(), {
      eventType: 'Schedule',
      action,
      userId: auth.currentUser?.uid || null,
      userEmail: auth.currentUser?.email || null,
      organizationId,
      targetTable: action.includes('ASSIGNMENT') ? 'shift_assignments' : 'shifts',
      targetId: details.shiftId || details.assignmentId || null,
      description: details.description,
      metadata: {
        ...details.metadata,
        staffId: details.staffId
      },
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Failed to log audit:', error);
    // Don't throw - audit logging should not break the main operation
  }
};

// =====================================================
// SCHEDULE SERVICE
// =====================================================

export const scheduleService = {
  /**
   * Get all shifts for an organization
   */
  async getShifts(organizationId: string, filters?: {
    locationId?: string;
    startDate?: string;
    endDate?: string;
    date?: string;
  }): Promise<Shift[]> {
    // Use single orderBy to avoid composite index requirement
    // startTime sorting done client-side
    const q = query(
      collections.shifts(organizationId),
      orderBy('date', 'asc')
    );

    const snapshot = await getDocs(q);
    let shifts: Shift[] = await Promise.all(
      snapshot.docs.map(async doc => {
        const data = doc.data();
        const shift: Shift = { id: doc.id, ...data } as Shift;

        // Fetch location
        if (data.locationId) {
          shift.location = await organizationService.getLocation(organizationId, data.locationId) || undefined;
        }

        // Fetch assignments
        shift.assignments = await this.getShiftAssignments(organizationId, doc.id);

        return shift;
      })
    );

    // Apply filters
    if (filters?.locationId) {
      shifts = shifts.filter(s => s.locationId === filters.locationId);
    }
    if (filters?.date) {
      shifts = shifts.filter(s => s.date === filters.date);
    }
    if (filters?.startDate) {
      shifts = shifts.filter(s => s.date >= filters.startDate!);
    }
    if (filters?.endDate) {
      shifts = shifts.filter(s => s.date <= filters.endDate!);
    }

    // Sort by startTime client-side (avoiding composite index)
    shifts.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.startTime || '').localeCompare(b.startTime || '');
    });

    return shifts;
  },

  /**
   * Get today's shifts
   */
  async getTodayShifts(organizationId: string, locationId?: string): Promise<Shift[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.getShifts(organizationId, { date: today, locationId });
  },

  /**
   * Get open shifts (unfilled)
   */
  async getOpenShifts(organizationId: string, locationId?: string): Promise<Shift[]> {
    const shifts = await this.getShifts(organizationId, { locationId });
    return shifts.filter(shift => {
      const assignedCount = shift.assignments?.length || 0;
      return assignedCount < shift.staffNeeded;
    });
  },

  /**
   * Get shift by ID
   */
  async getById(organizationId: string, shiftId: string): Promise<Shift | null> {
    const shift = await getDocument<Shift>(docs.shift(organizationId, shiftId));
    if (!shift) return null;

    // Fetch assignments
    shift.assignments = await this.getShiftAssignments(organizationId, shiftId);

    // Fetch location
    if (shift.locationId) {
      shift.location = await organizationService.getLocation(organizationId, shift.locationId) || undefined;
    }

    return shift;
  },

  /**
   * Create a new shift
   */
  async createShift(organizationId: string, input: {
    locationId: string;
    date: string;
    startTime: string;
    endTime: string;
    roleRequired?: string;
    staffNeeded: number;
    notes?: string;
  }): Promise<Shift> {
    const docRef = await addDoc(collections.shifts(organizationId), {
      organizationId,
      locationId: input.locationId,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      roleRequired: input.roleRequired || null,
      staffNeeded: input.staffNeeded,
      notes: input.notes || null,
      createdBy: auth.currentUser?.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Log audit trail
    await logScheduleAudit(organizationId, 'CREATE_SHIFT', {
      shiftId: docRef.id,
      description: `Created shift for ${input.date} (${input.startTime}-${input.endTime})`,
      metadata: { date: input.date, startTime: input.startTime, endTime: input.endTime, roleRequired: input.roleRequired }
    });

    return (await this.getById(organizationId, docRef.id))!;
  },

  /**
   * Update a shift
   */
  async updateShift(organizationId: string, shiftId: string, updates: Partial<{
    date: string;
    startTime: string;
    endTime: string;
    roleRequired: string;
    staffNeeded: number;
    notes: string;
  }>): Promise<Shift> {
    // Get original for audit
    const original = await this.getById(organizationId, shiftId);

    await updateDoc(docs.shift(organizationId, shiftId), {
      ...updates,
      updatedAt: serverTimestamp()
    });

    // Log audit trail
    await logScheduleAudit(organizationId, 'UPDATE_SHIFT', {
      shiftId,
      description: `Updated shift for ${updates.date || original?.date}`,
      metadata: { before: original, updates }
    });

    return (await this.getById(organizationId, shiftId))!;
  },

  /**
   * Delete a shift
   */
  async deleteShift(organizationId: string, shiftId: string): Promise<void> {
    // Get shift details for audit before deleting
    const shift = await this.getById(organizationId, shiftId);

    await deleteDoc(docs.shift(organizationId, shiftId));

    // Log audit trail
    await logScheduleAudit(organizationId, 'DELETE_SHIFT', {
      shiftId,
      description: `Deleted shift for ${shift?.date} (${shift?.startTime}-${shift?.endTime})`,
      metadata: { deletedShift: shift }
    });
  },

  // ==================== SHIFT ASSIGNMENTS ====================

  /**
   * Get assignments for a shift
   */
  async getShiftAssignments(organizationId: string, shiftId: string): Promise<ShiftAssignment[]> {
    const q = query(
      collections.shiftAssignments(organizationId),
      where('shiftId', '==', shiftId)
    );

    const snapshot = await getDocs(q);
    return Promise.all(
      snapshot.docs.map(async doc => {
        const data = doc.data();
        const assignment: ShiftAssignment = { id: doc.id, ...data } as ShiftAssignment;

        // Fetch staff details
        if (data.staffId) {
          assignment.staff = await staffService.getById(data.staffId) || undefined;
        }

        return assignment;
      })
    );
  },

  /**
   * Check if two time ranges overlap
   */
  timeRangesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
    // Convert times to minutes for comparison
    const toMinutes = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    const s1 = toMinutes(start1);
    const e1 = toMinutes(end1);
    const s2 = toMinutes(start2);
    const e2 = toMinutes(end2);
    
    // Ranges overlap if one starts before the other ends and vice versa
    return s1 < e2 && s2 < e1;
  },

  /**
   * Check if staff has overlapping shifts on the same date
   */
  async checkForOverlappingShifts(
    organizationId: string,
    staffId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeShiftId?: string
  ): Promise<{ hasOverlap: boolean; conflictingShift?: Shift }> {
    // Get all shifts for this staff on this date
    const allShifts = await this.getShifts(organizationId, { date });
    
    for (const shift of allShifts) {
      // Skip the shift we're assigning to (or being excluded)
      if (excludeShiftId && shift.id === excludeShiftId) continue;
      
      // Check if staff is assigned to this shift
      const isAssigned = shift.assignments?.some(a => a.staffId === staffId);
      if (!isAssigned) continue;
      
      // Check for time overlap
      if (this.timeRangesOverlap(startTime, endTime, shift.startTime, shift.endTime)) {
        return { hasOverlap: true, conflictingShift: shift };
      }
    }
    
    return { hasOverlap: false };
  },

  /**
   * Assign staff to shift
   */
  async assignStaff(organizationId: string, shiftId: string, input: {
    staffId?: string;
    isLocum?: boolean;
    locumName?: string;
    locumPhone?: string;
    locumRateCents?: number;
    supervisorId?: string;
    notes?: string;
  }): Promise<{ success: boolean; error?: string; assignment?: ShiftAssignment }> {
    const shift = await this.getById(organizationId, shiftId);
    if (!shift) {
      return { success: false, error: 'Shift not found' };
    }

    // Check if staff is on leave
    if (input.staffId && !input.isLocum) {
      const isOnLeave = await leaveService.isStaffOnLeave(organizationId, input.staffId, shift.date);
      if (isOnLeave) {
        return { success: false, error: 'Staff is on approved leave for this date. Cannot assign to shift.' };
      }
    }

    // Check if shift is full
    const currentAssignments = shift.assignments?.length || 0;
    if (currentAssignments >= shift.staffNeeded) {
      return { success: false, error: 'Shift is already fully staffed' };
    }

    // Check for duplicate assignment
    if (input.staffId) {
      const existing = shift.assignments?.find(a => a.staffId === input.staffId);
      if (existing) {
        return { success: false, error: 'Staff is already assigned to this shift' };
      }

      // Check for overlapping shifts at different locations
      const overlapCheck = await this.checkForOverlappingShifts(
        organizationId,
        input.staffId,
        shift.date,
        shift.startTime,
        shift.endTime,
        shiftId
      );
      
      if (overlapCheck.hasOverlap && overlapCheck.conflictingShift) {
        const conflictLocation = overlapCheck.conflictingShift.location?.name || 'another location';
        return { 
          success: false, 
          error: `Staff is already scheduled at ${conflictLocation} from ${overlapCheck.conflictingShift.startTime} to ${overlapCheck.conflictingShift.endTime} on this date. Cannot have overlapping shifts at different locations.` 
        };
      }
    }

    const docRef = await addDoc(collections.shiftAssignments(organizationId), {
      shiftId,
      staffId: input.staffId || null,
      isLocum: input.isLocum || false,
      locumName: input.locumName || null,
      locumPhone: input.locumPhone || null,
      locumRateCents: input.locumRateCents || null,
      supervisorId: input.supervisorId || null,
      notes: input.notes || null,
      createdAt: serverTimestamp()
    });

    // Log audit trail
    await logScheduleAudit(organizationId, 'ASSIGN_STAFF', {
      shiftId,
      assignmentId: docRef.id,
      staffId: input.staffId,
      description: input.isLocum
        ? `Assigned locum "${input.locumName || 'Unknown'}" to shift on ${shift.date}`
        : `Assigned staff to shift on ${shift.date}`,
      metadata: { isLocum: input.isLocum || false, locumName: input.locumName || null, shiftDate: shift.date }
    });

    const assignments = await this.getShiftAssignments(organizationId, shiftId);
    const assignment = assignments.find(a => a.id === docRef.id);

    return { success: true, assignment };
  },

  /**
   * Remove staff from shift
   */
  async removeAssignment(organizationId: string, assignmentId: string): Promise<void> {
    // Find the assignment first to get the document path and details for audit
    const q = query(collections.shiftAssignments(organizationId));
    const snapshot = await getDocs(q);
    const doc = snapshot.docs.find(d => d.id === assignmentId);

    if (doc) {
      const assignmentData = doc.data();
      await deleteDoc(doc.ref);

      // Log audit trail
      await logScheduleAudit(organizationId, 'REMOVE_ASSIGNMENT', {
        shiftId: assignmentData.shiftId,
        assignmentId,
        staffId: assignmentData.staffId,
        description: assignmentData.isLocum
          ? `Removed locum "${assignmentData.locumName}" from shift`
          : 'Removed staff from shift',
        metadata: { removedAssignment: assignmentData }
      });
    }
  },

  /**
   * Get staff's schedule
   */
  async getStaffSchedule(organizationId: string, staffId: string, filters?: {
    startDate?: string;
    endDate?: string;
  }): Promise<Shift[]> {
    const allShifts = await this.getShifts(organizationId, filters);

    return allShifts.filter(shift =>
      shift.assignments?.some(a => a.staffId === staffId)
    );
  },

  /**
   * Get current user's schedule
   */
  async getMySchedule(organizationId: string, filters?: {
    startDate?: string;
    endDate?: string;
  }): Promise<Shift[]> {
    const userId = auth.currentUser?.uid;
    if (!userId) return [];

    return this.getStaffSchedule(organizationId, userId, filters);
  },

  /**
   * Get available shifts (open shifts user can pick up)
   */
  async getAvailableShifts(organizationId: string): Promise<Shift[]> {
    const today = new Date().toISOString().split('T')[0];
    const shifts = await this.getShifts(organizationId, { startDate: today });

    return shifts.filter(shift => {
      const assignedCount = shift.assignments?.length || 0;
      return assignedCount < shift.staffNeeded;
    });
  },

  /**
   * Check if staff has shifts during a date range (for leave overlap warning)
   */
  async hasStaffShiftsDuringDates(
    organizationId: string,
    staffId: string,
    startDate: string,
    endDate: string
  ): Promise<{ hasOverlap: boolean; overlappingShifts: Shift[] }> {
    const shifts = await this.getStaffSchedule(organizationId, staffId, {
      startDate,
      endDate
    });

    return {
      hasOverlap: shifts.length > 0,
      overlappingShifts: shifts
    };
  }
};
