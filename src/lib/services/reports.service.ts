// Reports Service - Query-driven reports from live operational data
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { collections } from '../firestore';
import type {
    Profile,
    AttendanceRecord,
    Shift,
    ShiftAssignment,
    LeaveRequest,
    LeaveBalance,
    PayrollEntry,
    PolicyDocument,
    DocumentAcknowledgement,
    AuditLog,
    Location
} from '../../types';

// ================================================================
// TYPES
// ================================================================

export interface ReportFilters {
    dateRange: 'daily' | 'weekly' | 'monthly' | 'custom';
    startDate?: string;
    endDate?: string;
    locationIds?: string[];
    staffIds?: string[];
    roles?: string[];
    employmentTypes?: string[];
    status?: string[];
}

export interface StaffReportRow {
    id: string;
    fullName: string;
    email: string;
    phone?: string;
    systemRole: string;
    jobTitle?: string;
    department?: string;
    employmentType: string;
    staffStatus: string;
    locationId?: string;
    locationName?: string;
    hireDate?: string;
    payMethod: string;
    monthlySalaryCents: number;
}

export interface AttendanceReportRow {
    staffId: string;
    staffName: string;
    date: string;
    clockIn?: string;
    clockOut?: string;
    scheduledStart?: string;
    scheduledEnd?: string;
    scheduledHours: number;
    actualHours: number;
    variance: number;
    overtimeHours: number;
    lateMinutes: number;
    status: string;
    locationName?: string;
}

export interface SchedulingReportRow {
    date: string;
    shiftId: string;
    locationName: string;
    startTime: string;
    endTime: string;
    staffNeeded: number;
    staffAssigned: number;
    isFilled: boolean;
    fillRate: number;
    unfilledCount: number;
}

export interface LeaveReportRow {
    staffId: string;
    staffName: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    daysRequested: number;
    status: string;
    balanceBefore: number;
    balanceAfter: number;
    isPaid: boolean;
    approvedBy?: string;
    approvedAt?: string;
}

export interface PayrollReportRow {
    staffId: string;
    staffName: string;
    periodName: string;
    baseSalaryCents: number;
    workedUnits: number;
    paidLeaveUnits: number;
    unpaidLeaveUnits: number;
    allowancesTotalCents: number;
    deductionsTotalCents: number;
    grossPayCents: number;
    netPayCents: number;
    isPaid: boolean;
    payMethod: string;
    locationName?: string;
}

export interface ComplianceReportRow {
    documentId: string;
    documentName: string;
    uploadedAt: string;
    totalStaffAssigned: number;
    acknowledgedCount: number;
    pendingCount: number;
    acknowledgedRate: number;
}

export interface AuditReportRow {
    id: string;
    eventType: string;
    description: string;
    userEmail?: string;
    targetTable?: string;
    createdAt: string;
}

// ================================================================
// HELPER FUNCTIONS
// ================================================================

function getDateRange(filters: ReportFilters): { start: Date; end: Date } {
    const now = new Date();
    let start: Date;
    let end: Date = new Date(now.setHours(23, 59, 59, 999));

    switch (filters.dateRange) {
        case 'daily':
            start = new Date();
            start.setHours(0, 0, 0, 0);
            break;
        case 'weekly':
            start = new Date();
            start.setDate(start.getDate() - 7);
            start.setHours(0, 0, 0, 0);
            break;
        case 'monthly':
            start = new Date();
            start.setMonth(start.getMonth() - 1);
            start.setHours(0, 0, 0, 0);
            break;
        case 'custom':
            start = filters.startDate ? new Date(filters.startDate) : new Date();
            end = filters.endDate ? new Date(filters.endDate) : new Date();
            end.setHours(23, 59, 59, 999);
            break;
        default:
            start = new Date();
            start.setMonth(start.getMonth() - 1);
    }

    return { start, end };
}

function formatCurrency(cents: number): string {
    return `KES ${(cents / 100).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
}

// ================================================================
// REPORT METHODS
// ================================================================

class ReportsService {
    // ----------------------------------------------------------
    // STAFF REPORT
    // ----------------------------------------------------------
    async getStaffReport(
        organizationId: string,
        filters: ReportFilters,
        locations: Location[]
    ): Promise<StaffReportRow[]> {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('organizationId', '==', organizationId));
        const snapshot = await getDocs(q);

        const locationMap = new Map(locations.map(l => [l.id, l.name]));

        let staff: StaffReportRow[] = snapshot.docs.map(doc => {
            const data = doc.data() as Profile;
            return {
                id: doc.id,
                fullName: data.fullName,
                email: data.email,
                phone: data.phone,
                systemRole: data.systemRole,
                jobTitle: data.jobTitle,
                department: data.department,
                employmentType: data.employmentType,
                staffStatus: data.staffStatus,
                locationId: data.locationId,
                locationName: data.locationId ? locationMap.get(data.locationId) : undefined,
                hireDate: data.hireDate,
                payMethod: data.payMethod,
                monthlySalaryCents: data.monthlySalaryCents || 0
            };
        });

        // Apply filters
        if (filters.locationIds?.length) {
            staff = staff.filter(s => s.locationId && filters.locationIds!.includes(s.locationId));
        }
        if (filters.roles?.length) {
            staff = staff.filter(s => filters.roles!.includes(s.jobTitle || ''));
        }
        if (filters.employmentTypes?.length) {
            staff = staff.filter(s => filters.employmentTypes!.includes(s.employmentType));
        }
        if (filters.status?.length) {
            staff = staff.filter(s => filters.status!.includes(s.staffStatus));
        }

        return staff;
    }

    // ----------------------------------------------------------
    // ATTENDANCE REPORT
    // ----------------------------------------------------------
    async getAttendanceReport(
        organizationId: string,
        filters: ReportFilters,
        locations: Location[]
    ): Promise<AttendanceReportRow[]> {
        const { start, end } = getDateRange(filters);
        const startStr = start.toISOString().split('T')[0];
        const endStr = end.toISOString().split('T')[0];

        const attendanceRef = collections.attendance(organizationId);
        const q = query(
            attendanceRef,
            where('date', '>=', startStr),
            where('date', '<=', endStr)
        );
        const snapshot = await getDocs(q);

        // Get staff names
        const usersRef = collection(db, 'users');
        const usersQuery = query(usersRef, where('organizationId', '==', organizationId));
        const usersSnap = await getDocs(usersQuery);
        const staffMap = new Map(usersSnap.docs.map(d => [d.id, d.data().fullName]));
        const locationMap = new Map(locations.map(l => [l.id, l.name]));

        let records: AttendanceReportRow[] = snapshot.docs.map(doc => {
            const data = doc.data() as AttendanceRecord;
            const actualHours = data.totalHours || 0;
            const scheduledHours = 8; // Default 8 hours
            const variance = actualHours - scheduledHours;
            const overtimeHours = variance > 0 ? variance : 0;

            // Calculate late minutes
            let lateMinutes = 0;
            if (data.clockIn) {
                const clockInTime = new Date(`2000-01-01T${data.clockIn}`);
                const expectedTime = new Date(`2000-01-01T09:00:00`); // Default 9AM
                if (clockInTime > expectedTime) {
                    lateMinutes = Math.round((clockInTime.getTime() - expectedTime.getTime()) / 60000);
                }
            }

            return {
                staffId: data.staffId || '',
                staffName: data.staffId ? staffMap.get(data.staffId) || 'Unknown' : data.externalLocumName || 'External',
                date: data.date,
                clockIn: data.clockIn,
                clockOut: data.clockOut,
                scheduledStart: '09:00',
                scheduledEnd: '17:00',
                scheduledHours,
                actualHours,
                variance,
                overtimeHours,
                lateMinutes,
                status: data.status,
                locationName: data.locationId ? locationMap.get(data.locationId) : undefined
            };
        });

        // Apply filters
        if (filters.locationIds?.length) {
            const locNames = filters.locationIds.map(id => locationMap.get(id));
            records = records.filter(r => r.locationName && locNames.includes(r.locationName));
        }
        if (filters.staffIds?.length) {
            records = records.filter(r => filters.staffIds!.includes(r.staffId));
        }

        return records;
    }

    // ----------------------------------------------------------
    // SCHEDULING REPORT
    // ----------------------------------------------------------
    async getSchedulingReport(
        organizationId: string,
        filters: ReportFilters,
        locations: Location[]
    ): Promise<SchedulingReportRow[]> {
        const { start, end } = getDateRange(filters);
        const startStr = start.toISOString().split('T')[0];
        const endStr = end.toISOString().split('T')[0];

        const shiftsRef = collections.shifts(organizationId);
        const q = query(
            shiftsRef,
            where('date', '>=', startStr),
            where('date', '<=', endStr)
        );
        const snapshot = await getDocs(q);

        const locationMap = new Map(locations.map(l => [l.id, l.name]));

        // Get all shift assignments
        const assignmentsRef = collections.shiftAssignments(organizationId);
        const assignSnap = await getDocs(assignmentsRef);
        const assignmentsByShift = new Map<string, number>();
        assignSnap.docs.forEach(doc => {
            const data = doc.data();
            const count = assignmentsByShift.get(data.shiftId) || 0;
            assignmentsByShift.set(data.shiftId, count + 1);
        });

        let rows: SchedulingReportRow[] = snapshot.docs.map(doc => {
            const data = doc.data() as Shift;
            const staffAssigned = assignmentsByShift.get(doc.id) || 0;
            const isFilled = staffAssigned >= data.staffNeeded;
            const fillRate = data.staffNeeded > 0 ? (staffAssigned / data.staffNeeded) * 100 : 100;

            return {
                date: data.date,
                shiftId: doc.id,
                locationName: locationMap.get(data.locationId) || 'Unknown',
                startTime: data.startTime,
                endTime: data.endTime,
                staffNeeded: data.staffNeeded,
                staffAssigned,
                isFilled,
                fillRate: Math.round(fillRate),
                unfilledCount: Math.max(0, data.staffNeeded - staffAssigned)
            };
        });

        // Apply filters
        if (filters.locationIds?.length) {
            const locNames = filters.locationIds.map(id => locationMap.get(id));
            rows = rows.filter(r => locNames.includes(r.locationName));
        }

        return rows;
    }

    // ----------------------------------------------------------
    // LEAVE REPORT
    // ----------------------------------------------------------
    async getLeaveReport(
        organizationId: string,
        filters: ReportFilters
    ): Promise<LeaveReportRow[]> {
        const { start, end } = getDateRange(filters);
        const startStr = start.toISOString().split('T')[0];
        const endStr = end.toISOString().split('T')[0];

        const leaveRef = collections.leaveRequests(organizationId);
        const q = query(
            leaveRef,
            where('startDate', '>=', startStr),
            where('startDate', '<=', endStr)
        );
        const snapshot = await getDocs(q);

        // Get staff names and leave types
        const usersRef = collection(db, 'users');
        const usersQuery = query(usersRef, where('organizationId', '==', organizationId));
        const usersSnap = await getDocs(usersQuery);
        const staffMap = new Map(usersSnap.docs.map(d => [d.id, d.data().fullName]));

        const leaveTypesRef = collections.leaveTypes(organizationId);
        const leaveTypesSnap = await getDocs(leaveTypesRef);
        const leaveTypeMap = new Map(leaveTypesSnap.docs.map(d => [d.id, d.data().name]));

        let rows: LeaveReportRow[] = snapshot.docs.map(doc => {
            const data = doc.data() as LeaveRequest;
            return {
                staffId: data.staffId,
                staffName: staffMap.get(data.staffId) || 'Unknown',
                leaveType: leaveTypeMap.get(data.leaveTypeId) || 'Unknown',
                startDate: data.startDate,
                endDate: data.endDate,
                daysRequested: data.daysRequested,
                status: data.status,
                balanceBefore: data.balanceBeforeRequest || 0,
                balanceAfter: data.balanceAfterApproval || 0,
                isPaid: data.isPaid,
                approvedBy: data.approvedBy,
                approvedAt: data.approvedAt
            };
        });

        // Apply filters
        if (filters.staffIds?.length) {
            rows = rows.filter(r => filters.staffIds!.includes(r.staffId));
        }
        if (filters.status?.length) {
            rows = rows.filter(r => filters.status!.includes(r.status));
        }

        return rows;
    }

    // ----------------------------------------------------------
    // PAYROLL REPORT
    // ----------------------------------------------------------
    async getPayrollReport(
        organizationId: string,
        filters: ReportFilters,
        locations: Location[]
    ): Promise<PayrollReportRow[]> {
        const entriesRef = collections.payrollEntries(organizationId);
        const snapshot = await getDocs(entriesRef);

        // Get staff and periods
        const usersRef = collection(db, 'users');
        const usersQuery = query(usersRef, where('organizationId', '==', organizationId));
        const usersSnap = await getDocs(usersQuery);
        const staffMap = new Map(usersSnap.docs.map(d => [d.id, { name: d.data().fullName, locationId: d.data().locationId }]));

        const periodsRef = collections.payrollPeriods(organizationId);
        const periodsSnap = await getDocs(periodsRef);
        const periodMap = new Map(periodsSnap.docs.map(d => [d.id, d.data().name]));
        const locationMap = new Map(locations.map(l => [l.id, l.name]));

        let rows: PayrollReportRow[] = snapshot.docs.map(doc => {
            const data = doc.data() as PayrollEntry;
            const staffInfo = staffMap.get(data.staffId);
            return {
                staffId: data.staffId,
                staffName: staffInfo?.name || 'Unknown',
                periodName: periodMap.get(data.payrollPeriodId) || 'Unknown',
                baseSalaryCents: data.baseSalaryCents,
                workedUnits: data.workedUnits,
                paidLeaveUnits: data.paidLeaveUnits,
                unpaidLeaveUnits: data.unpaidLeaveUnits,
                allowancesTotalCents: data.allowancesTotalCents,
                deductionsTotalCents: data.deductionsTotalCents,
                grossPayCents: data.grossPayCents,
                netPayCents: data.netPayCents,
                isPaid: data.isPaid,
                payMethod: data.payMethod,
                locationName: staffInfo?.locationId ? locationMap.get(staffInfo.locationId) : undefined
            };
        });

        // Apply filters
        if (filters.staffIds?.length) {
            rows = rows.filter(r => filters.staffIds!.includes(r.staffId));
        }
        if (filters.locationIds?.length) {
            const locNames = filters.locationIds.map(id => locationMap.get(id));
            rows = rows.filter(r => r.locationName && locNames.includes(r.locationName));
        }

        return rows;
    }

    // ----------------------------------------------------------
    // COMPLIANCE REPORT
    // ----------------------------------------------------------
    async getComplianceReport(organizationId: string): Promise<ComplianceReportRow[]> {
        const docsRef = collections.policyDocuments(organizationId);
        const docsSnap = await getDocs(docsRef);

        const ackRef = collections.documentAcknowledgements(organizationId);
        const ackSnap = await getDocs(ackRef);

        // Count acknowledgments per document
        const ackByDoc = new Map<string, number>();
        ackSnap.docs.forEach(doc => {
            const data = doc.data();
            const count = ackByDoc.get(data.documentId) || 0;
            ackByDoc.set(data.documentId, count + 1);
        });

        // Get total staff count
        const usersRef = collection(db, 'users');
        const usersQuery = query(usersRef, where('organizationId', '==', organizationId), where('staffStatus', '==', 'Active'));
        const usersSnap = await getDocs(usersQuery);
        const totalStaff = usersSnap.size;

        const rows: ComplianceReportRow[] = docsSnap.docs.map(doc => {
            const data = doc.data() as PolicyDocument;
            const acknowledgedCount = ackByDoc.get(doc.id) || 0;
            const pendingCount = totalStaff - acknowledgedCount;
            const acknowledgedRate = totalStaff > 0 ? Math.round((acknowledgedCount / totalStaff) * 100) : 0;

            return {
                documentId: doc.id,
                documentName: data.name,
                uploadedAt: data.createdAt,
                totalStaffAssigned: totalStaff,
                acknowledgedCount,
                pendingCount: Math.max(0, pendingCount),
                acknowledgedRate
            };
        });

        return rows;
    }

    // ----------------------------------------------------------
    // AUDIT REPORT
    // ----------------------------------------------------------
    async getAuditReport(
        organizationId: string,
        filters: ReportFilters
    ): Promise<AuditReportRow[]> {
        const { start, end } = getDateRange(filters);

        // Try org-level audit logs first
        const auditRef = collections.orgAuditLogs(organizationId);
        const snapshot = await getDocs(auditRef);

        let rows: AuditReportRow[] = snapshot.docs.map(doc => {
            const data = doc.data() as AuditLog;
            return {
                id: doc.id,
                eventType: data.eventType,
                description: data.description,
                userEmail: data.userEmail,
                targetTable: data.targetTable,
                createdAt: data.createdAt
            };
        });

        // Filter by date
        rows = rows.filter(r => {
            const recordDate = new Date(r.createdAt);
            return recordDate >= start && recordDate <= end;
        });

        // Sort by newest first
        rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return rows;
    }
}

export const reportsService = new ReportsService();
