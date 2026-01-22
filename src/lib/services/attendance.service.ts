// Attendance Service - Firebase/Firestore Implementation
import {
  collections,
  docs,
  getDocument,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  addDoc,
  serverTimestamp
} from '../firestore';
import { auth } from '../firebase';
import type { AttendanceRecord, AttendanceStatus, Profile } from '../../types';
import { staffService } from './staff.service';
import { getTodayDateKE, getDateStringKE } from '../utils/dateFormat';

// =====================================================
// ATTENDANCE SERVICE
// =====================================================

export const attendanceService = {
  /**
   * Get attendance records for an organization
   */
  async getAll(organizationId: string, filters?: {
    startDate?: string;
    endDate?: string;
    locationId?: string;
    staffId?: string;
    status?: AttendanceStatus;
  }): Promise<AttendanceRecord[]> {
    const q = query(
      collections.attendance(organizationId),
      orderBy('date', 'desc')
    );

    const snapshot = await getDocs(q);
    let records = await Promise.all(
      snapshot.docs.map(async doc => {
        const data = doc.data();
        const record: AttendanceRecord = { id: doc.id, ...data } as AttendanceRecord;

        // Fetch staff details if staffId exists
        if (data.staffId) {
          record.staff = await staffService.getById(data.staffId) || undefined;
        }

        return record;
      })
    );

    // Apply filters in memory
    if (filters?.startDate) {
      records = records.filter(r => r.date >= filters.startDate!);
    }
    if (filters?.endDate) {
      records = records.filter(r => r.date <= filters.endDate!);
    }
    if (filters?.locationId) {
      records = records.filter(r => r.locationId === filters.locationId);
    }
    if (filters?.staffId) {
      records = records.filter(r => r.staffId === filters.staffId);
    }
    if (filters?.status) {
      records = records.filter(r => r.status === filters.status);
    }

    return records;
  },

  /**
   * Get attendance by date range (custom date range filter)
   */
  async getByDateRange(organizationId: string, startDate: string, endDate: string, locationId?: string): Promise<AttendanceRecord[]> {
    return this.getAll(organizationId, { startDate, endDate, locationId });
  },

  /**
   * Get today's attendance (using Kenya timezone)
   */
  async getToday(organizationId: string, locationId?: string): Promise<AttendanceRecord[]> {
    const today = getTodayDateKE(); // Use Kenya timezone
    return this.getAll(organizationId, { startDate: today, endDate: today, locationId });
  },

  /**
   * Get today's attendance summary
   */
  async getTodaySummary(organizationId: string, locationId?: string) {
    const records = await this.getToday(organizationId, locationId);

    let presentCount = 0;
    let partialCount = 0;
    let absentCount = 0;
    let onLeaveCount = 0;
    let totalHours = 0;

    records.forEach(record => {
      switch (record.status) {
        case 'Present':
        case 'Worked':
          presentCount++;
          break;
        case 'Partial':
          partialCount++;
          break;
        case 'Absent':
        case 'No-show':
          absentCount++;
          break;
        case 'On Leave':
          onLeaveCount++;
          break;
      }
      totalHours += record.totalHours || 0;
    });

    return {
      organizationId,
      presentCount,
      partialCount,
      absentCount,
      onLeaveCount,
      totalHoursWorked: totalHours,
      totalRecords: records.length
    };
  },

  /**
   * Get attendance by ID
   */
  async getById(organizationId: string, recordId: string): Promise<AttendanceRecord | null> {
    return getDocument<AttendanceRecord>(docs.attendance(organizationId, recordId));
  },

  /**
   * Clock in (using Kenya timezone for date) - Enhanced with error codes
   */
  async clockIn(organizationId: string, staffId: string, locationId?: string, shiftId?: string): Promise<AttendanceRecord> {
    // Get staff profile to check prerequisites
    const profileDoc = await getDocument(docs.user(staffId));
    if (!profileDoc) {
      const error: any = new Error('Staff profile not found');
      error.code = 'PROFILE_NOT_FOUND';
      throw error;
    }

    const profile = profileDoc as Profile;

    // CRITICAL: Check organizationId is set
    if (!profile.organizationId) {
      const error: any = new Error('Profile not linked to organization. Please contact admin to fix your account.');
      error.code = 'MISSING_ORG_ID';
      throw error;
    }

    // Verify organizationId matches
    if (profile.organizationId !== organizationId) {
      const error: any = new Error('Organization mismatch');
      error.code = 'ORG_MISMATCH';
      throw error;
    }

    // Check if staff is active
    // Note: We allow 'Active' status. If a new employee just accepted invitation,
    // their status should be set to 'Active' during invitation acceptance.
    if (profile.staffStatus !== 'Active') {
      const error: any = new Error(`Your account status is '${profile.staffStatus}'. Please contact admin.`);
      error.code = 'INACTIVE_STAFF';
      throw error;
    }

    // Check professional license if exists
    if (profile.license) {
      if (profile.license.verificationStatus === 'Expired') {
        const error: any = new Error('Your professional license has expired. Please update your credentials.');
        error.code = 'LICENSE_EXPIRED';
        throw error;
      }
      if (profile.license.verificationStatus === 'Rejected') {
        const error: any = new Error('Your license verification was rejected. Please contact admin.');
        error.code = 'LICENSE_REJECTED';
        throw error;
      }
    }

    const now = new Date();
    const today = getTodayDateKE(); // Use Kenya timezone for date
    const clockInTime = now.toISOString();

    // Check if already clocked in today
    const existing = await this.getAll(organizationId, {
      startDate: today,
      endDate: today,
      staffId
    });

    if (existing.length > 0 && existing[0].clockIn && !existing[0].clockOut) {
      const error: any = new Error('Already clocked in. Please clock out first.');
      error.code = 'ALREADY_CLOCKED_IN';
      throw error;
    }

    // Check for shift today if no shiftId provided
    if (!shiftId) {
      // TODO: Add check for scheduled shift
      // For now, allow clock-in without shift (configurable by org)
    }

    const docRef = await addDoc(collections.attendance(organizationId), {
      organizationId,
      staffId,
      locationId: locationId || null,
      shiftId: shiftId || null,
      date: today, // Kenya date
      clockIn: clockInTime,
      clockOut: null,
      totalHours: 0,
      status: 'Present' as AttendanceStatus,
      isManualEntry: false,
      isExternal: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return (await this.getById(organizationId, docRef.id))!;
  },

  /**
   * Clock out
   */
  async clockOut(organizationId: string, recordId: string): Promise<AttendanceRecord> {
    const record = await this.getById(organizationId, recordId);
    if (!record) throw new Error('Attendance record not found');
    if (!record.clockIn) throw new Error('No clock in time recorded');
    if (record.clockOut) throw new Error('Already clocked out');

    const now = new Date();
    const clockOutTime = now.toISOString();

    // Calculate hours
    const clockIn = new Date(record.clockIn);
    const hours = (now.getTime() - clockIn.getTime()) / (1000 * 60 * 60);

    await updateDoc(docs.attendance(organizationId, recordId), {
      clockOut: clockOutTime,
      totalHours: Number(hours.toFixed(2)),
      updatedAt: serverTimestamp()
    });

    return (await this.getById(organizationId, recordId))!;
  },

  /**
   * Create manual attendance entry
   */
  async createManualEntry(organizationId: string, input: {
    staffId?: string;
    locationId?: string;
    date: string;
    clockIn?: string;
    clockOut?: string;
    status: AttendanceStatus;
    totalHours?: number;
    isExternal?: boolean;
    externalLocumName?: string;
    externalLocumRole?: string;
    shiftId?: string;
  }): Promise<AttendanceRecord> {
    // Calculate hours if clock times provided
    let totalHours = input.totalHours || 0;
    if (input.clockIn && input.clockOut && !input.totalHours) {
      const clockIn = new Date(input.clockIn);
      const clockOut = new Date(input.clockOut);
      totalHours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
    }

    const docRef = await addDoc(collections.attendance(organizationId), {
      organizationId,
      staffId: input.staffId || null,
      locationId: input.locationId || null,
      date: input.date,
      clockIn: input.clockIn || null,
      clockOut: input.clockOut || null,
      totalHours: Number(totalHours.toFixed(2)),
      status: input.status,
      isManualEntry: true,
      isExternal: input.isExternal || false,
      externalLocumName: input.externalLocumName || null,
      externalLocumRole: input.externalLocumRole || null,
      shiftId: input.shiftId || null,
      editedBy: auth.currentUser?.uid,
      editReason: 'Manual entry',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return (await this.getById(organizationId, docRef.id))!;
  },

  /**
   * Update attendance record
   */
  async update(organizationId: string, recordId: string, updates: {
    clockIn?: string;
    clockOut?: string;
    status?: AttendanceStatus;
    editReason?: string;
    totalHours?: number;
  }): Promise<AttendanceRecord> {
    const record = await this.getById(organizationId, recordId);
    if (!record) throw new Error('Attendance record not found');

    // Recalculate hours if times changed
    let totalHours = updates.totalHours;
    if (!totalHours && (updates.clockIn || updates.clockOut)) {
      const clockIn = new Date(updates.clockIn || record.clockIn || '');
      const clockOut = new Date(updates.clockOut || record.clockOut || '');
      if (clockIn && clockOut) {
        totalHours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
      }
    }

    await updateDoc(docs.attendance(organizationId, recordId), {
      ...updates,
      totalHours: totalHours !== undefined ? Number(totalHours.toFixed(2)) : record.totalHours,
      editedBy: auth.currentUser?.uid,
      updatedAt: serverTimestamp()
    });

    return (await this.getById(organizationId, recordId))!;
  },

  /**
   * Add external locum attendance
   */
  async addExternalLocumAttendance(organizationId: string, input: {
    locumName: string;
    role: string;
    locationId: string;
    date: string;
    shiftStart: string;
    shiftEnd: string;
    status: 'Worked' | 'No-show';
    hours?: number;
  }): Promise<AttendanceRecord> {
    return this.createManualEntry(organizationId, {
      locationId: input.locationId,
      date: input.date,
      clockIn: input.shiftStart,
      clockOut: input.shiftEnd,
      status: input.status,
      totalHours: input.hours,
      isExternal: true,
      externalLocumName: input.locumName,
      externalLocumRole: input.role
    });
  },

  /**
   * Get staff attendance for current user
   */
  async getMyAttendance(organizationId: string, filters?: {
    startDate?: string;
    endDate?: string;
  }): Promise<AttendanceRecord[]> {
    const userId = auth.currentUser?.uid;
    if (!userId) return [];

    return this.getAll(organizationId, {
      staffId: userId,
      ...filters
    });
  },

  // =====================================================
  // LUNCH TRACKING
  // =====================================================

  /**
   * Start lunch
   */
  async startLunch(organizationId: string, recordId: string): Promise<AttendanceRecord> {
    const record = await this.getById(organizationId, recordId);
    if (!record) throw new Error('Attendance record not found');
    if (!record.clockIn) throw new Error('Must clock in first');
    if (record.clockOut) throw new Error('Cannot take lunch after clocking out');
    if (record.isOnLunch) throw new Error('Already on lunch');
    if (record.lunchEnd) throw new Error('Lunch already taken today');
    if (record.isOnBreak) throw new Error('Cannot start lunch while on break');

    const now = new Date().toISOString();

    await updateDoc(docs.attendance(organizationId, recordId), {
      lunchStart: now,
      isOnLunch: true,
      updatedAt: serverTimestamp()
    });

    return (await this.getById(organizationId, recordId))!;
  },

  /**
   * End lunch
   */
  async endLunch(organizationId: string, recordId: string): Promise<AttendanceRecord> {
    const record = await this.getById(organizationId, recordId);
    if (!record) throw new Error('Attendance record not found');
    if (!record.isOnLunch) throw new Error('Not currently on lunch');
    if (!record.lunchStart) throw new Error('No lunch start time recorded');

    const now = new Date();
    const lunchStart = new Date(record.lunchStart);
    const durationMinutes = Math.round((now.getTime() - lunchStart.getTime()) / 60000);

    await updateDoc(docs.attendance(organizationId, recordId), {
      lunchEnd: now.toISOString(),
      lunchDurationMinutes: durationMinutes,
      isOnLunch: false,
      updatedAt: serverTimestamp()
    });

    return (await this.getById(organizationId, recordId))!;
  },

  // =====================================================
  // BREAK TRACKING
  // =====================================================

  /**
   * Start break
   */
  async startBreak(organizationId: string, recordId: string): Promise<AttendanceRecord> {
    const record = await this.getById(organizationId, recordId);
    if (!record) throw new Error('Attendance record not found');
    if (!record.clockIn) throw new Error('Must clock in first');
    if (record.clockOut) throw new Error('Cannot take break after clocking out');
    if (record.isOnBreak) throw new Error('Already on break');
    if (record.isOnLunch) throw new Error('Cannot start break while on lunch');

    const now = new Date().toISOString();

    await updateDoc(docs.attendance(organizationId, recordId), {
      currentBreakStart: now,
      isOnBreak: true,
      updatedAt: serverTimestamp()
    });

    return (await this.getById(organizationId, recordId))!;
  },

  /**
   * End break
   */
  async endBreak(organizationId: string, recordId: string): Promise<AttendanceRecord> {
    const record = await this.getById(organizationId, recordId);
    if (!record) throw new Error('Attendance record not found');
    if (!record.isOnBreak) throw new Error('Not currently on break');
    if (!record.currentBreakStart) throw new Error('No break start time recorded');

    const now = new Date();
    const breakStart = new Date(record.currentBreakStart);
    const durationMinutes = Math.round((now.getTime() - breakStart.getTime()) / 60000);

    // Add to breaks array
    const breaks = record.breaks || [];
    breaks.push({
      startTime: record.currentBreakStart,
      endTime: now.toISOString(),
      durationMinutes
    });

    await updateDoc(docs.attendance(organizationId, recordId), {
      breaks,
      breakCount: breaks.length,
      currentBreakStart: null,
      isOnBreak: false,
      updatedAt: serverTimestamp()
    });

    return (await this.getById(organizationId, recordId))!;
  }
};
