// =====================================================
// ENUMS - Application Enums
// =====================================================

// System role determines access level (NOT job title)
export type SystemRole = 'OWNER' | 'ADMIN' | 'EMPLOYEE';

// Legacy role for backward compatibility (maps to job titles)
export type UserRole = 'Owner' | 'Shift Manager' | 'HR Manager' | 'Payroll Officer' | 'Staff' | 'SuperAdmin';

export type SubscriptionPlan = 'Essential' | 'Professional' | 'Enterprise';

export type SubscriptionStatus = 'Active' | 'Suspended' | 'Cancelled' | 'Trial';

// Billing-specific types (per client requirements)
export type BillingSubscriptionState = 'TRIAL' | 'ACTIVE' | 'SUSPENDED';

export type PaymentMode = 'AUTO_PAY' | 'PAY_AS_YOU_GO';

export type PaymentProvider = 'MPESA' | 'FLUTTERWAVE';

export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export type BillingEventType = 'TRIAL_START' | 'PAYMENT_RECEIVED' | 'SUSPENSION' | 'REACTIVATION' | 'PLAN_CHANGE';

export type VerificationStatus = 'Verified' | 'Pending' | 'Unverified' | 'Rejected';

export type AccountStatus = 'Active' | 'Under Review' | 'Suspended';

export type EmploymentType = 'Full-Time' | 'Part-Time' | 'Contract' | 'Locum' | 'External';

export type StaffStatus = 'Invited' | 'Active' | 'Inactive' | 'Archived' | 'On Leave' | 'Terminated';

export type PayMethod = 'Fixed' | 'Prorated' | 'Hourly' | 'Per Shift';

export type AttendanceStatus = 'Present' | 'Partial' | 'Absent' | 'On Leave' | 'Worked' | 'No-show';

export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export type VerificationType = 'ORG' | 'FACILITY';

// Approval lifecycle status (for Organizations and Facilities)
// Pending Review → Approval action → Approved (Not Live) → Enable action → Active (Live)
// Can be Rejected or Suspended at various points
export type ApprovalStatus = 'Pending Review' | 'Approved' | 'Active' | 'Rejected' | 'Suspended';

export type AuditEventType = 'Security' | 'System' | 'Payment' | 'Verification' | 'Staff' | 'Schedule' | 'Approval';

// Healthcare-specific job titles for classification and reporting
// NOTE: Job titles do NOT affect system access or consume admin seats
export const JOB_TITLES = [
  'Doctor',
  'Clinical Officer',
  'Nurse',
  'Midwife',
  'Dentist',
  'Lab Technician',
  'Radiographer',
  'Pharmacist',
  'Receptionist / Front Desk',
  'HR',
  'Administrator',
  'Accounts / Finance',
  'Operations Manager',
  'IT / Systems',
  'Support Staff',
  'Other (custom)'
] as const;

export type JobTitle = typeof JOB_TITLES[number] | string;

// =====================================================
// PERMISSIONS
// =====================================================

export interface StaffPermissions {
  staffManagement: boolean;
  scheduling: boolean;
  attendance: boolean;
  leave: boolean;
  documentsAndPolicies: boolean;
  payroll: boolean;
  settingsAdmin: boolean;
  reportsAccess: boolean;
}

export const DEFAULT_PERMISSIONS: StaffPermissions = {
  staffManagement: false,
  scheduling: false,
  attendance: false,
  leave: false,
  documentsAndPolicies: false,
  payroll: false,
  settingsAdmin: false,
  reportsAccess: false
};

// =====================================================
// DATABASE TYPES - Match Firestore documents
// =====================================================

export interface Organization {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  country: string;
  businessRegistrationNumber?: string;
  businessRegistrationDocUrl?: string;
  kraPin?: string;
  orgStatus: VerificationStatus;
  accountStatus: AccountStatus;
  plan: SubscriptionPlan;
  maxLocations: number;
  maxStaff: number;
  maxAdmins: number;
  logoUrl?: string;
  rejectionReason?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  organizationId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  // New billing state management
  billingState: BillingSubscriptionState;
  paymentMode: PaymentMode;
  amountCents: number;
  currency: string;
  billingCycle: string;
  billingCycleDays: number; // 31 days per client spec
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  nextBillingDate?: string;
  trialStartedAt?: string;
  trialEndsAt?: string;
  trialDays: number; // 10 days per client spec
  autoPayEnabled: boolean;
  lastPaymentDate?: string;
  lastPaymentProvider?: PaymentProvider;
  suspendedAt?: string;
  suspensionReason?: string;
  reactivatedAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Location {
  id: string;
  organizationId: string;
  name: string;
  city?: string;
  address?: string;
  phone?: string;
  isPrimary: boolean;
  status: VerificationStatus;
  licenseNumber?: string;
  licensingBody?: string;
  licenseExpiry?: string;
  licenseDocumentUrl?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Profile {
  id: string;
  email: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
  organizationId?: string;
  locationId?: string;
  // System role for access control
  systemRole: SystemRole;
  // Job title for display
  jobTitle?: string;
  department?: string;
  employmentType: EmploymentType;
  staffStatus: StaffStatus;
  monthlySalaryCents: number;
  hourlyRateCents: number;
  dailyRateCents?: number;
  shiftRateCents?: number;
  payMethod: PayMethod;
  hireDate?: string;
  terminationDate?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  isSuperAdmin: boolean;
  // Permissions (only for ADMIN role)
  permissions?: StaffPermissions;
  // Professional License (Healthcare-specific)
  license?: {
    number: string;
    type: string; // e.g., "Medical License", "Nursing License"
    authority: string; // e.g., "Medical Practitioners Board"
    issuedDate?: string;
    expiryDate: string;
    verificationStatus: 'Pending' | 'Verified' | 'Expired' | 'Rejected';
    documentUrl?: string;
  };
  // New fields for Staff Management UI
  onboardingStatus?: 'Completed' | 'In progress' | 'Not started';
  vettingStatus?: 'Verified' | 'Pending review' | 'In progress' | 'Not started';
  inviteStatus?: 'Active' | 'Pending' | 'None';

  // Practice Approval
  practiceApproval?: {
    organizationApproved: boolean;
    locationApproved: boolean;
    approvedAt?: string;
    approvedBy?: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Simplified User type for auth context
export interface User {
  id: string;
  name: string;
  email: string;
  systemRole: SystemRole;
  jobTitle?: string;
  avatar?: string;
  organizationId?: string;
  locationId?: string;
  isSuperAdmin?: boolean;
  permissions?: StaffPermissions;
  // Legacy field for backward compatibility
  role?: UserRole;
}

// =====================================================
// LEAVE MANAGEMENT
// =====================================================

export interface LeaveType {
  id: string;
  organizationId: string;
  name: string;
  daysAllowed: number;
  isPaid: boolean;
  requiresApproval: boolean;
  requiresDocument: boolean;
  carryForwardAllowed: boolean;
  maxCarryForwardDays?: number;
  appliesToAll: boolean;
  appliesToRoles?: string[]; // e.g., ['Doctor', 'Nurse']
  canBeOverridden: boolean;
  notes?: string;
  isDefault: boolean; // System default leave type
  createdAt: string;
  updatedAt: string;
}

export interface LeaveBalance {
  id: string;
  staffId: string;
  leaveTypeId: string;
  year: number;
  totalDays: number;
  usedDays: number;
  pendingDays: number;
  carryForwardDays: number;
  createdAt: string;
  updatedAt: string;
  // Joined
  leaveType?: LeaveType;
}

// Per-staff leave entitlement (individual allocations and balances)
export interface LeaveEntitlement {
  id: string;
  organizationId: string;
  staffId: string;
  leaveTypeId: string;
  year: number;
  allocatedDays: number; // Can override LeaveType.daysAllowed
  usedDays: number;
  pendingDays: number; // Days in pending requests
  carriedForwardDays: number; // From previous year
  isActive: boolean; // Can disable specific types per staff
  isOverridden: boolean; // True if allocatedDays differs from org default
  overrideReason?: string; // Why allocation was overridden
  overriddenBy?: string; // User ID who made the override
  overriddenAt?: string;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  leaveType?: LeaveType;
  staff?: Profile;
}

// Legacy - keeping for backward compatibility
export interface StaffLeaveEntitlement {
  id: string;
  organizationId: string;
  staffId: string;
  useOrgDefaults: boolean;
  customEntitlements?: {
    leaveTypeId: string;
    daysAllowed: number;
  }[];

  createdAt: string;
  updatedAt: string;
}

export interface LeaveRequest {
  id: string;
  organizationId: string;
  staffId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  daysRequested: number;
  isHalfDay: boolean;
  halfDayType?: 'AM' | 'PM';
  isPaid: boolean;
  reason?: string;
  status: LeaveStatus;
  requestedBy: string; // uid of who submitted (could be staff or admin on behalf)
  requestedByEmail?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  approvalComment?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  documentUrl?: string;
  balanceBeforeRequest?: number;
  balanceAfterApproval?: number;
  hasOverlappingShift?: boolean;
  createdAt: string;
  updatedAt: string;
  // Joined
  leaveType?: LeaveType;
  staff?: Profile;
  reviewer?: Profile;
}

// =====================================================
// SCHEDULING
// =====================================================

export interface Shift {
  id: string;
  organizationId: string;
  locationId: string;
  date: string;
  startTime: string;
  endTime: string;
  roleRequired?: string;
  staffNeeded: number;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  // Joined
  location?: Location;
  assignments?: ShiftAssignment[];
}

export interface ShiftAssignment {
  id: string;
  shiftId: string;
  staffId: string;
  isLocum: boolean;
  locumName?: string;
  locumRateCents?: number;
  locumPhone?: string;
  supervisorId?: string;
  notes?: string;
  createdAt: string;
  // Joined
  staff?: Profile;
  supervisor?: Profile;
}

// =====================================================
// ATTENDANCE
// =====================================================

export interface AttendanceRecord {
  id: string;
  organizationId: string;
  staffId?: string;
  locationId?: string;
  shiftId?: string;
  date: string;
  clockIn?: string;
  clockOut?: string;
  totalHours: number;
  status: AttendanceStatus;
  isManualEntry: boolean;
  isExternal: boolean;
  externalLocumName?: string;
  externalLocumRole?: string;
  editedBy?: string;
  editReason?: string;
  // Lunch tracking
  lunchStart?: string;
  lunchEnd?: string;
  lunchDurationMinutes?: number;
  isOnLunch?: boolean;
  // Break tracking
  breaks?: Array<{ startTime: string; endTime?: string; durationMinutes?: number }>;
  breakCount?: number;
  isOnBreak?: boolean;
  currentBreakStart?: string;
  createdAt: string;
  updatedAt: string;
  // Joined
  staff?: Profile;
  location?: Location;
}

export interface ExternalLocum {
  id: string;
  organizationId: string;
  name: string;
  role: string;
  phone?: string;
  email?: string;
  createdAt: string;
}

// =====================================================
// PAYROLL
// =====================================================

export interface PayrollPeriod {
  id: string;
  organizationId: string;
  name: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  isFinalized: boolean;
  finalizedAt?: string;
  finalizedBy?: string;
  createdAt: string;
  updatedAt: string;
  isArchived?: boolean;
  // Joined
  entries?: PayrollEntry[];
}

export interface PayrollEntry {
  id: string;
  payrollPeriodId: string;
  staffId: string;
  organizationId: string;
  baseSalaryCents: number;
  payMethod: PayMethod;
  workedUnits: number;
  paidLeaveUnits: number;
  unpaidLeaveUnits: number;
  absentUnits: number;
  payableBaseCents: number;
  allowancesTotalCents: number;
  deductionsTotalCents: number;
  deductionDetails?: {
    nssf: number;
    paye: number;
    shif: number;
    housingLevy: number;
    total: number;
  };
  grossPayCents: number;
  netPayCents: number;
  isPaid: boolean;
  paidAt?: string;
  paidBy?: string;
  paymentReference?: string;
  createdAt: string;
  updatedAt: string;
  // Joined
  staff?: Profile;
  allowances?: PayrollAllowance[];
  deductions?: PayrollDeduction[];
}

export interface PayrollAllowance {
  id: string;
  payrollEntryId: string;
  name: string;
  amountCents: number;
  notes?: string;
  createdAt: string;
}

export interface PayrollDeduction {
  id: string;
  payrollEntryId: string;
  name: string;
  amountCents: number;
  notes?: string;
  createdAt: string;
}

// =====================================================
// VERIFICATION & ADMIN
// =====================================================

export interface VerificationRequest {
  id: string;
  type: VerificationType;
  organizationId?: string;
  locationId?: string;
  identifier?: string;
  authority?: string;
  documentUrl?: string;
  status: VerificationStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
  // Joined
  organization?: Organization;
  location?: Location;
}

export interface AuditLog {
  id: string;
  eventType: AuditEventType;
  userId?: string;
  userEmail?: string;
  organizationId?: string;
  targetTable?: string;
  targetId?: string;
  description: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

// =====================================================
// ORGANIZATION SETTINGS & RULES
// =====================================================

export interface AttendanceRules {
  enabled: boolean;
  mode: 'daily' | 'shift-based';
  allowClockInWithoutShift: boolean;
  earlyClockInMinutes: number;
  lateClockInMinutes: number;
  requireLocationAtClockIn: boolean;
}

export interface LunchRules {
  enabled: boolean;
  oncePerDay: boolean;
  minDurationMinutes: number;
  maxDurationMinutes?: number;
  isPaid: boolean;
  requiredAfterHours?: number;
  reminderAfterHours?: number;
}

export interface BreakRules {
  enabled: boolean;
  maxBreaksPerDay: number;
  maxDurationMinutes: number;
  isPaid: boolean;
}

export interface OrganizationSettings {
  id: string;
  organizationId: string;
  attendance: AttendanceRules;
  lunch: LunchRules;
  breaks: BreakRules;
  updatedAt: string;
  updatedBy?: string;
}

export const DEFAULT_ATTENDANCE_RULES: AttendanceRules = {
  enabled: true,
  mode: 'daily',
  allowClockInWithoutShift: true,
  earlyClockInMinutes: 10,
  lateClockInMinutes: 15,
  requireLocationAtClockIn: false
};

export const DEFAULT_LUNCH_RULES: LunchRules = {
  enabled: true,
  oncePerDay: true,
  minDurationMinutes: 30,
  maxDurationMinutes: undefined,
  isPaid: false,
  requiredAfterHours: undefined,
  reminderAfterHours: 4
};

export const DEFAULT_BREAK_RULES: BreakRules = {
  enabled: true,
  maxBreaksPerDay: 2,
  maxDurationMinutes: 15,
  isPaid: true
};

// =====================================================
// DOCUMENTS & POLICIES
// =====================================================

export interface PolicyDocument {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  fileUrl: string;
  fileSizeBytes?: number;
  mimeType?: string;
  assignedTo: 'all' | 'roles' | 'individuals';
  assignedRoles?: string[];
  assignedStaffIds?: string[];
  requiresAcknowledgement: boolean;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentAcknowledgement {
  id: string;
  documentId: string;
  staffId: string;
  staffName?: string;
  acknowledgedAt: string;
}

// =====================================================
// BILLING & PAYMENTS
// =====================================================

export interface PaymentRecord {
  id: string;
  organizationId: string;
  subscriptionId: string;
  plan: SubscriptionPlan;
  amountCents: number;
  currency: string;
  provider: PaymentProvider;
  providerTransactionId?: string;
  providerReference?: string;
  phoneNumber?: string; // For M-Pesa
  email?: string; // For Flutterwave
  status: PaymentStatus;
  failureReason?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillingLog {
  id: string;
  organizationId: string;
  eventType: BillingEventType;
  plan?: SubscriptionPlan;
  amountCents?: number;
  provider?: PaymentProvider;
  previousState?: BillingSubscriptionState;
  newState?: BillingSubscriptionState;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// =====================================================
// ROLES & PERMISSIONS
// =====================================================

export interface CustomRole {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  canViewSchedule: boolean;
  canManageSchedule: boolean;
  canViewStaff: boolean;
  canManageStaff: boolean;
  canApproveLeave: boolean;
  canViewAttendance: boolean;
  canManageAttendance: boolean;
  canViewPayroll: boolean;
  canManagePayroll: boolean;
  canManageSettings: boolean;
  canManageLocations: boolean;
  canManageRoles: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StaffRoleAssignment {
  id: string;
  staffId: string;
  customRoleId: string;
  createdAt: string;
  // Joined
  customRole?: CustomRole;
}

// =====================================================
// NOTIFICATIONS & DOCUMENTS
// =====================================================

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message?: string;
  type?: string;
  isRead: boolean;
  readAt?: string;
  actionUrl?: string;
  createdAt: string;
}

export interface Document {
  id: string;
  organizationId: string;
  uploadedBy: string;
  name: string;
  type?: string;
  fileUrl: string;
  fileSizeBytes?: number;
  mimeType?: string;
  staffId?: string;
  createdAt: string;
}

// =====================================================
// VIEW TYPES
// =====================================================

export interface OrganizationStats {
  organizationId: string;
  name: string;
  plan: SubscriptionPlan;
  maxLocations: number;
  maxStaff: number;
  maxAdmins: number;
  locationsCount: number;
  staffCount: number;
  adminsCount: number;
}

export interface TodayAttendanceSummary {
  organizationId: string;
  presentCount: number;
  partialCount: number;
  absentCount: number;
  onLeaveCount: number;
  totalHoursWorked: number;
}

export interface DashboardStats {
  totalStaff: number;
  maxStaff: number;
  totalLocations: number;
  maxLocations: number;
  todaysShifts: number;
  openShifts: number;
  presentToday: number;
  scheduledToday: number;
  adminSeatsUsed: number;
  maxAdmins: number;
}

// =====================================================
// ADMIN & STATS
// =====================================================

export interface PlatformStats {
  totalOrganizations: number;
  activeSubscriptions: number;
  totalStaff: number;
  pendingVerifications: number;
  verifiedOrganizations: number;
  totalUsers: number;
  planDistribution?: Record<string, number>;
  mrrCents?: number;
}

export interface AuditLogEntry extends AuditLog {
  // Extended type if needed, or just alias
}

// =====================================================
// API RESPONSE TYPES
// =====================================================

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// =====================================================
// FORM INPUT TYPES
// =====================================================

export interface CreateStaffInput {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  systemRole: SystemRole;
  jobTitle?: string;
  department?: string;
  employmentType: EmploymentType;
  locationId?: string;
  monthlySalaryCents?: number;
  dailyRateCents?: number;
  shiftRateCents?: number;
  hourlyRateCents?: number;
  payMethod?: PayMethod;
  hireDate?: string;
  permissions?: StaffPermissions;
  // Professional License (Healthcare)
  licenseType?: string;
  licenseNumber?: string;
  licenseAuthority?: string;
  licenseExpiry?: string;
  licenseDocumentUrl?: string;
}

export interface CreateShiftInput {
  locationId: string;
  date: string;
  startTime: string;
  endTime: string;
  roleRequired?: string;
  staffNeeded: number;
  notes?: string;
}

export interface CreateScheduleInput {
  locationId: string;
  startDate: string;
  endDate: string;
  shifts: CreateShiftInput[];
}

// =====================================================
// STATUTORY PAYROLL RULES (Kenya)
// =====================================================

export interface PAYEBand {
  threshold: number;        // Annual threshold in KES
  rate: number;            // Tax rate as decimal (0.10 = 10%)
  label: string;           // Display label (e.g., "First 288,000")
}

export interface StatutoryRules {
  id: string;
  country: 'Kenya';
  effectiveFrom: string;   // ISO date
  effectiveUntil?: string; // ISO date (null if current)
  version: number;
  isActive: boolean;

  // PAYE (Income Tax)
  payeBands: PAYEBand[];

  // NSSF (National Social Security Fund)
  nssfEmployeeRate: number;    // as decimal (0.06 = 6%)
  nssfEmployerRate: number;    // as decimal (0.06 = 6%)
  nssfCap?: number;            // Optional cap amount
  nssfTier1Limit: number;      // e.g. 6000
  nssfTier2Limit: number;      // e.g. 18000

  // Personal Relief (Monthly)
  personalRelief: number;      // e.g. 2400

  // NHDF (National Housing Development Fund)
  nhdfRate: number;            // as decimal (0.015 = 1.5%)

  // SHA (Social Health Authority)
  shaRate: number;             // as decimal (0.0275 = 2.75%)

  // Metadata
  updatedBy: string;           // Super Admin user ID
  updatedByEmail?: string;
  updatedAt: string;
  notes?: string;
}

export interface DeductionPreview {
  grossPay: number;
  taxablePay: number;
  paye: number;
  nssfEmployee: number;
  nssfEmployer: number;
  nhdf: number;
  sha: number;
  totalEmployeeDeductions: number;
  netPay: number;
  employerCost: number;       // Gross + NSSF employer
}

export interface UpdateAttendanceInput {
  clockIn?: string;
  clockOut?: string;
  status?: AttendanceStatus;
  editReason?: string;
}

// =====================================================
// PLAN LIMITS
// =====================================================

export const PLAN_LIMITS = {
  Essential: { maxLocations: 1, maxStaff: 10, maxAdmins: 2, amountCents: 800000 },
  Professional: { maxLocations: 2, maxStaff: 30, maxAdmins: 5, amountCents: 1500000 },
  Enterprise: { maxLocations: 5, maxStaff: 75, maxAdmins: 10, amountCents: 2500000 },
} as const;

// =====================================================
// ROLE HELPERS
// =====================================================

export function getSystemRoleFromLegacy(role: UserRole): SystemRole {
  if (role === 'Owner') return 'OWNER';
  if (role === 'HR Manager' || role === 'Shift Manager' || role === 'Payroll Officer') return 'ADMIN';
  return 'EMPLOYEE';
}

export function canHavePermissions(systemRole: SystemRole): boolean {
  return systemRole === 'ADMIN';
}

export function isOwnerRole(systemRole: SystemRole): boolean {
  return systemRole === 'OWNER';
}
