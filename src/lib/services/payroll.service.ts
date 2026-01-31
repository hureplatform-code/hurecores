// Payroll Service - Firebase/Firestore Implementation
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
import type {
  PayrollPeriod,
  PayrollEntry,
  PayrollAllowance,
  PayrollDeduction,
  Profile
} from '../../types';
import { staffService } from './staff.service';
import { attendanceService } from './attendance.service';
import { leaveService } from './leave.service';
import { auditService } from './audit.service';
import { statutoryService } from './statutory.service';

// =====================================================
// PAYROLL SERVICE
// =====================================================

export const payrollService = {
  // ==================== PAYROLL PERIODS ====================

  /**
   * Get all payroll periods
   */
  async getPeriods(organizationId: string): Promise<PayrollPeriod[]> {
    const q = query(
      collections.payrollPeriods(organizationId),
      orderBy('startDate', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PayrollPeriod));
  },

  /**
   * Get payroll period by ID
   */
  async getPeriodById(organizationId: string, periodId: string): Promise<PayrollPeriod | null> {
    return getDocument<PayrollPeriod>(docs.payrollPeriod(organizationId, periodId));
  },

  /**
   * Create payroll period
   */
  async createPeriod(organizationId: string, input: {
    name: string;
    startDate: string;
    endDate: string;
  }): Promise<PayrollPeriod> {
    // Calculate total days
    const start = new Date(input.startDate);
    const end = new Date(input.endDate);
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const docRef = await addDoc(collections.payrollPeriods(organizationId), {
      organizationId,
      name: input.name,
      startDate: input.startDate,
      endDate: input.endDate,
      totalDays,
      isFinalized: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return (await this.getPeriodById(organizationId, docRef.id))!;
  },

  /**
   * Generate payroll entries for a period
   */
  async generateEntries(organizationId: string, periodId: string): Promise<PayrollEntry[]> {
    const period = await this.getPeriodById(organizationId, periodId);
    if (!period) throw new Error('Payroll period not found');
    if (period.isFinalized) throw new Error('Cannot modify finalized payroll');

    // Get all active staff
    const allStaff = await staffService.getAll(organizationId);
    const activeStaff = allStaff.filter(s => s.staffStatus === 'Active');

    const entries: PayrollEntry[] = [];

    for (const staff of activeStaff) {
      // Get attendance for period
      const attendance = await attendanceService.getAll(organizationId, {
        staffId: staff.id,
        startDate: period.startDate,
        endDate: period.endDate
      });

      // Calculate worked units
      let workedUnits = 0;
      let paidLeaveUnits = 0;
      let unpaidLeaveUnits = 0;
      let absentUnits = 0;

      attendance.forEach(record => {
        switch (record.status) {
          case 'Present':
          case 'Worked':
            workedUnits += record.totalHours || 8; // Default 8 hours
            break;
          case 'On Leave':
            paidLeaveUnits += 1;
            break;
          case 'Absent':
          case 'No-show':
            absentUnits += 1;
            break;
        }
      });

      // Calculate pay based on pay method
      let payableBaseCents = 0;
      const baseSalaryCents = staff.monthlySalaryCents || 0;

      switch (staff.payMethod) {
        case 'Fixed':
          payableBaseCents = baseSalaryCents;
          break;
        case 'Prorated':
          payableBaseCents = Math.round(baseSalaryCents * (workedUnits / (period.totalDays * 8)));
          break;
        case 'Hourly':
          payableBaseCents = (staff.hourlyRateCents || 0) * workedUnits;
          break;
        case 'Per Shift':
          payableBaseCents = (staff.shiftRateCents || staff.dailyRateCents || 0) * (workedUnits / 8);
          break;
      }

      const grossPayCents = payableBaseCents; // + Allowances (handled separately usually, but for now base)

      // --- STATUTORY DEDUCTIONS ---
      const rules = await statutoryService.getGlobalRules();
      const calculation = statutoryService.calculateNetPay(
        grossPayCents / 100, // Convert to KES
        0, // Allowances (currently 0 at generation)
        rules
      );

      // Check for validation errors
      if (!calculation.validation.isValid) {
        console.error(`Payroll validation errors for staff ${staff.id}:`, calculation.validation.errors);
      }

      // Convert all deductions to cents (store as integers)
      const nssfCents = Math.round(calculation.deductions.nssf * 100);
      const payeCents = Math.round(calculation.deductions.paye * 100);
      const shifCents = Math.round(calculation.deductions.shif * 100);
      const housingLevyCents = Math.round(calculation.deductions.housingLevy * 100);
      const netPayCents = Math.round(calculation.netPay * 100);
      const deductionsTotalCents = Math.round(calculation.deductions.total * 100);

      const entryRef = await addDoc(collections.payrollEntries(organizationId), {
        payrollPeriodId: periodId,
        staffId: staff.id,
        organizationId,
        baseSalaryCents,
        payMethod: staff.payMethod,
        workedUnits,
        paidLeaveUnits,
        unpaidLeaveUnits,
        absentUnits,
        payableBaseCents,
        allowancesTotalCents: 0,
        deductionsTotalCents,
        // Store deduction breakdown as numeric cents
        deductionDetails: {
          nssfCents,
          nssfTier1Cents: Math.round((calculation.deductions.nssfTier1 || 0) * 100),
          nssfTier2Cents: Math.round((calculation.deductions.nssfTier2 || 0) * 100),
          payeCents,
          payeGrossTaxCents: Math.round((calculation.paye?.grossTax || 0) * 100),
          payePersonalReliefCents: Math.round((calculation.paye?.personalRelief || 0) * 100),
          shifCents,
          housingLevyCents,
          totalCents: deductionsTotalCents,
          // Validation info for debugging
          isValid: calculation.validation.isValid,
          validationErrors: calculation.validation.errors
        },
        grossPayCents,
        netPayCents,
        isPaid: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      entries.push({
        id: entryRef.id,
        payrollPeriodId: periodId,
        staffId: staff.id,
        organizationId,
        baseSalaryCents,
        payMethod: staff.payMethod,
        workedUnits,
        paidLeaveUnits,
        unpaidLeaveUnits,
        absentUnits,
        payableBaseCents,
        allowancesTotalCents: 0,
        deductionsTotalCents,
        grossPayCents,
        netPayCents,
        isPaid: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        staff
      });
    }

    return entries;
  },

  /**
   * Add a single staff member to an existing payroll period
   * Useful for adding staff who were missed in the initial generation
   */
  async addStaffToPayroll(organizationId: string, periodId: string, staffId: string): Promise<PayrollEntry> {
    const period = await this.getPeriodById(organizationId, periodId);
    if (!period) throw new Error('Payroll period not found');
    if (period.isFinalized) throw new Error('Cannot modify finalized payroll. Unfinalize first.');

    // Check if entry already exists
    const existingEntries = await this.getEntries(organizationId, periodId);
    if (existingEntries.some(e => e.staffId === staffId)) {
      throw new Error('Staff member already has an entry in this payroll period');
    }

    // Get staff details
    const staff = await staffService.getById(staffId);
    if (!staff) throw new Error('Staff member not found');

    // Get attendance for period
    const attendance = await attendanceService.getAll(organizationId, {
      staffId: staff.id,
      startDate: period.startDate,
      endDate: period.endDate
    });

    // Calculate worked units
    let workedUnits = 0;
    let paidLeaveUnits = 0;
    let unpaidLeaveUnits = 0;
    let absentUnits = 0;

    attendance.forEach(record => {
      switch (record.status) {
        case 'Present':
        case 'Worked':
          workedUnits += record.totalHours || 8;
          break;
        case 'On Leave':
          paidLeaveUnits += 1;
          break;
        case 'Absent':
        case 'No-show':
          absentUnits += 1;
          break;
      }
    });

    // Calculate pay
    let payableBaseCents = 0;
    const baseSalaryCents = staff.monthlySalaryCents || 0;

    switch (staff.payMethod) {
      case 'Fixed':
        payableBaseCents = baseSalaryCents;
        break;
      case 'Prorated':
        payableBaseCents = Math.round(baseSalaryCents * (workedUnits / (period.totalDays * 8)));
        break;
      case 'Hourly':
        payableBaseCents = (staff.hourlyRateCents || 0) * workedUnits;
        break;
      case 'Per Shift':
        payableBaseCents = (staff.shiftRateCents || staff.dailyRateCents || 0) * (workedUnits / 8);
        break;
    }

    const grossPayCents = payableBaseCents;

    // Calculate statutory deductions
    const rules = await statutoryService.getGlobalRules();
    const calculation = statutoryService.calculateNetPay(
      grossPayCents / 100,
      0,
      rules
    );

    const nssfCents = Math.round(calculation.deductions.nssf * 100);
    const payeCents = Math.round(calculation.deductions.paye * 100);
    const shifCents = Math.round(calculation.deductions.shif * 100);
    const housingLevyCents = Math.round(calculation.deductions.housingLevy * 100);
    const netPayCents = Math.round(calculation.netPay * 100);
    const deductionsTotalCents = Math.round(calculation.deductions.total * 100);

    // Create entry
    const entryRef = await addDoc(collections.payrollEntries(organizationId), {
      payrollPeriodId: periodId,
      staffId: staff.id,
      organizationId,
      baseSalaryCents,
      payMethod: staff.payMethod,
      workedUnits,
      paidLeaveUnits,
      unpaidLeaveUnits,
      absentUnits,
      payableBaseCents,
      allowancesTotalCents: 0,
      deductionsTotalCents,
      deductionDetails: {
        nssfCents,
        nssfTier1Cents: Math.round((calculation.deductions.nssfTier1 || 0) * 100),
        nssfTier2Cents: Math.round((calculation.deductions.nssfTier2 || 0) * 100),
        payeCents,
        payeGrossTaxCents: Math.round((calculation.paye?.grossTax || 0) * 100),
        payePersonalReliefCents: Math.round((calculation.paye?.personalRelief || 0) * 100),
        shifCents,
        housingLevyCents,
        totalCents: deductionsTotalCents,
        isValid: calculation.validation.isValid,
        validationErrors: calculation.validation.errors
      },
      grossPayCents,
      netPayCents,
      isPaid: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Log action
    await auditService.logAction(organizationId, 'Staff Added to Payroll', 'Payroll', {
      entityId: periodId,
      entityName: period.name,
      details: {
        staffName: staff.fullName,
        staffId: staff.id
      }
    });

    const entry: PayrollEntry = {
      id: entryRef.id,
      payrollPeriodId: periodId,
      staffId: staff.id,
      organizationId,
      baseSalaryCents,
      payMethod: staff.payMethod,
      workedUnits,
      paidLeaveUnits,
      unpaidLeaveUnits,
      absentUnits,
      payableBaseCents,
      allowancesTotalCents: 0,
      deductionsTotalCents,
      grossPayCents,
      netPayCents,
      isPaid: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      staff
    };

    return entry;
  },

  // ==================== PAYROLL ENTRIES ====================

  /**
   * Get entries for a period
   */
  async getEntries(organizationId: string, periodId: string): Promise<PayrollEntry[]> {
    const q = query(
      collections.payrollEntries(organizationId),
      where('payrollPeriodId', '==', periodId)
    );

    const snapshot = await getDocs(q);
    return Promise.all(
      snapshot.docs.map(async doc => {
        const data = doc.data();
        const entry: PayrollEntry = { id: doc.id, ...data } as PayrollEntry;

        // Fetch staff details
        if (data.staffId) {
          entry.staff = await staffService.getById(data.staffId) || undefined;
        }

        return entry;
      })
    );
  },

  /**
   * Get a single entry for a specific employee in a period
   * This is the SECURE method for employees viewing their own pay history
   * CRITICAL: Always filter by BOTH periodId AND staffId to prevent data leakage
   */
  async getEntryForEmployee(organizationId: string, periodId: string, staffId: string): Promise<PayrollEntry | null> {
    const q = query(
      collections.payrollEntries(organizationId),
      where('payrollPeriodId', '==', periodId),
      where('staffId', '==', staffId)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    const data = doc.data();
    const entry: PayrollEntry = { id: doc.id, ...data } as PayrollEntry;

    // Fetch staff details
    if (data.staffId) {
      entry.staff = await staffService.getById(data.staffId) || undefined;
    }

    return entry;
  },

  /**
   * Get all entries for a specific employee across all periods
   * Used for employee pay history view
   * CRITICAL: This ensures employees can ONLY see their own payroll data
   */
  async getEntriesForEmployee(organizationId: string, staffId: string): Promise<PayrollEntry[]> {
    console.log('[payrollService] getEntriesForEmployee called:', { organizationId, staffId });
    
    const q = query(
      collections.payrollEntries(organizationId),
      where('staffId', '==', staffId)
    );

    const snapshot = await getDocs(q);
    console.log('[payrollService] Found entries for employee:', snapshot.size);
    
    return Promise.all(
      snapshot.docs.map(async doc => {
        const data = doc.data();
        const entry: PayrollEntry = { id: doc.id, ...data } as PayrollEntry;

        // Fetch staff details
        if (data.staffId) {
          entry.staff = await staffService.getById(data.staffId) || undefined;
        }

        return entry;
      })
    );
  },

  /**
   * Get periods that have entries for a specific employee
   * Used for My Pay History view to only show periods relevant to the employee
   */
  async getPeriodsWithEmployeeEntries(organizationId: string, staffId: string): Promise<PayrollPeriod[]> {
    // First get all entries for this employee
    const entries = await this.getEntriesForEmployee(organizationId, staffId);
    
    // Get unique period IDs
    const periodIds = [...new Set(entries.map(e => e.payrollPeriodId))];
    
    // Fetch all those periods
    const periods = await Promise.all(
      periodIds.map(periodId => this.getPeriodById(organizationId, periodId))
    );
    
    // Filter out nulls and return
    return periods.filter((p): p is PayrollPeriod => p !== null);
  },

  /**
   * Mark entry as paid
   */
  async markAsPaid(organizationId: string, entryId: string, paymentReference?: string): Promise<void> {
    const q = query(collections.payrollEntries(organizationId));
    const snapshot = await getDocs(q);
    const doc = snapshot.docs.find(d => d.id === entryId);

    if (doc) {
      await updateDoc(doc.ref, {
        isPaid: true,
        paidAt: new Date().toISOString(),
        paidBy: auth.currentUser?.email || auth.currentUser?.uid,
        paymentReference: paymentReference || null,
        updatedAt: serverTimestamp()
      });
    }
  },

  /**
   * Unmark entry as paid (for corrections before finalization)
   */
  async unmarkAsPaid(organizationId: string, entryId: string): Promise<void> {
    const q = query(collections.payrollEntries(organizationId));
    const snapshot = await getDocs(q);
    const doc = snapshot.docs.find(d => d.id === entryId);

    if (doc) {
      await updateDoc(doc.ref, {
        isPaid: false,
        paidAt: null,
        paidBy: null,
        paymentReference: null,
        updatedAt: serverTimestamp()
      });
    }
  },

  /**
   * Mark all entries as paid
   */
  async markAllAsPaid(organizationId: string, periodId: string): Promise<void> {
    const entries = await this.getEntries(organizationId, periodId);

    for (const entry of entries) {
      if (!entry.isPaid) {
        await this.markAsPaid(organizationId, entry.id);
      }
    }
  },

  /**
   * Finalize payroll period
   */
  async finalizePeriod(organizationId: string, periodId: string): Promise<void> {
    const period = await this.getPeriodById(organizationId, periodId);

    await updateDoc(docs.payrollPeriod(organizationId, periodId), {
      isFinalized: true,
      finalizedAt: new Date().toISOString(),
      finalizedBy: auth.currentUser?.uid,
      updatedAt: serverTimestamp()
    });

    // Log to organization audit trail
    await auditService.logAction(organizationId, 'Payroll Finalized', 'Payroll', {
      entityId: periodId,
      entityName: period?.name || `Period ${periodId}`,
      details: {
        periodStart: period?.startDate,
        periodEnd: period?.endDate
      }
    });
  },

  /**
   * Unfinalize payroll period (allows edits again)
   */
  async unfinalizePeriod(organizationId: string, periodId: string): Promise<void> {
    const period = await this.getPeriodById(organizationId, periodId);
    if (!period) throw new Error('Payroll period not found');

    await updateDoc(docs.payrollPeriod(organizationId, periodId), {
      isFinalized: false,
      finalizedAt: null,
      finalizedBy: null,
      updatedAt: serverTimestamp()
    });

    // Log to audit trail
    await auditService.logAction(organizationId, 'Payroll Unfinalized', 'Payroll', {
      entityId: periodId,
      entityName: period.name,
      details: {
        periodStart: period.startDate,
        periodEnd: period.endDate
      }
    });
  },

  /**
   * Mark payroll period as exported
   */
  async markAsExported(organizationId: string, periodId: string): Promise<void> {
    const period = await this.getPeriodById(organizationId, periodId);

    await updateDoc(docs.payrollPeriod(organizationId, periodId), {
      exportedAt: new Date().toISOString(),
      exportedBy: auth.currentUser?.uid,
      updatedAt: serverTimestamp()
    });

    // Log to organization audit trail
    await auditService.logAction(organizationId, 'Payroll Exported', 'Payroll', {
      entityId: periodId,
      entityName: period?.name || `Period ${periodId}`,
      details: {
        periodStart: period?.startDate,
        periodEnd: period?.endDate
      }
    });
  },

  /**
   * Export payroll to CSV
   */
  async exportToCSV(organizationId: string, periodId: string): Promise<string> {
    const period = await this.getPeriodById(organizationId, periodId);
    const entries = await this.getEntries(organizationId, periodId);

    const headers = [
      'Employee Name',
      'Email',
      'Job Title',
      'Pay Method',
      'Base Salary (KES)',
      'Worked Hours',
      'Absent Days',
      'Leave Days',
      'Gross Pay (KES)',
      'Deductions (KES)',
      'Net Pay (KES)',
      'Status'
    ];

    const rows = entries.map(entry => [
      entry.staff?.fullName || 'Unknown',
      entry.staff?.email || '',
      entry.staff?.jobTitle || '',
      entry.payMethod,
      (entry.baseSalaryCents / 100).toFixed(2),
      entry.workedUnits.toString(),
      entry.absentUnits.toString(),
      entry.paidLeaveUnits.toString(),
      (entry.grossPayCents / 100).toFixed(2),
      (entry.deductionsTotalCents / 100).toFixed(2),
      (entry.netPayCents / 100).toFixed(2),
      entry.isPaid ? 'Paid' : 'Pending'
    ]);

    const csvContent = [
      `Payroll Export - ${period?.name || periodId}`,
      `Period: ${period?.startDate} to ${period?.endDate}`,
      '',
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csvContent;
  },

  /**
   * Get payroll summary for period
   */
  async getPeriodSummary(organizationId: string, periodId: string) {
    const entries = await this.getEntries(organizationId, periodId);

    const totalGross = entries.reduce((sum, e) => sum + e.grossPayCents, 0);
    const totalNet = entries.reduce((sum, e) => sum + e.netPayCents, 0);
    const totalDeductions = entries.reduce((sum, e) => sum + e.deductionsTotalCents, 0);
    const paidCount = entries.filter(e => e.isPaid).length;
    const pendingCount = entries.filter(e => !e.isPaid).length;

    return {
      totalEntries: entries.length,
      totalGrossCents: totalGross,
      totalNetCents: totalNet,
      totalDeductionsCents: totalDeductions,
      paidCount,
      pendingCount
    };
  },

  /**
   * Archive a finalized payroll period
   */
  async archivePeriod(organizationId: string, periodId: string): Promise<void> {
    const period = await this.getPeriodById(organizationId, periodId);
    if (!period) throw new Error('Payroll period not found');
    if (!period.isFinalized) throw new Error('Cannot archive unfinalized payroll. Finalize first.');

    await updateDoc(docs.payrollPeriod(organizationId, periodId), {
      isArchived: true,
      archivedAt: new Date().toISOString(),
      archivedBy: auth.currentUser?.uid,
      updatedAt: serverTimestamp()
    });

    // Log to audit trail
    await auditService.logAction(organizationId, 'Payroll Archived', 'Payroll', {
      entityId: periodId,
      entityName: period.name,
      details: { periodStart: period.startDate, periodEnd: period.endDate }
    });
  },

  /**
   * Unarchive a payroll period
   */
  async unarchivePeriod(organizationId: string, periodId: string): Promise<void> {
    await updateDoc(docs.payrollPeriod(organizationId, periodId), {
      isArchived: false,
      archivedAt: null,
      archivedBy: null,
      updatedAt: serverTimestamp()
    });
  }
};
