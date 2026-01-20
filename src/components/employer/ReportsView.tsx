import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { reportsService, ReportFilters } from '../../lib/services/reports.service';
import { organizationService } from '../../lib/services/organization.service';
import { exportToCSV, formatCentsForCSV, formatDateForCSV, formatDateTimeForCSV, type CSVColumn } from '../../lib/utils/exportCSV';
import type { Location } from '../../types';
import { formatDateTimeKE, formatDateKE } from '../../lib/utils/dateFormat';
import DateInput from '../common/DateInput';
import { PrivacyMask, PrivacyToggle } from '../common/PrivacyControl';

type ReportType = 'staff' | 'attendance' | 'scheduling' | 'leave' | 'payroll' | 'compliance' | 'audit';

const REPORT_TABS: { id: ReportType; label: string; icon: string }[] = [
    { id: 'staff', label: 'Staff', icon: '👥' },
    { id: 'attendance', label: 'Attendance', icon: '⏰' },
    { id: 'scheduling', label: 'Scheduling', icon: '📅' },
    { id: 'leave', label: 'Leave', icon: '🏖️' },
    { id: 'payroll', label: 'Payroll', icon: '💰' },
    { id: 'compliance', label: 'Compliance', icon: '📋' },
    { id: 'audit', label: 'Audit', icon: '🔍' },
];

const ReportsView: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<ReportType>('staff');
    const [loading, setLoading] = useState(false);
    const [locations, setLocations] = useState<Location[]>([]);
    const [showFinancials, setShowFinancials] = useState(false);

    // Filters
    const [filters, setFilters] = useState<ReportFilters>({
        dateRange: 'monthly',
        startDate: '',
        endDate: '',
        locationIds: [],
        staffIds: [],
        roles: [],
        employmentTypes: [],
        status: []
    });

    // Report data
    const [reportData, setReportData] = useState<any[]>([]);

    // Load locations on mount
    useEffect(() => {
        if (user?.organizationId) {
            loadLocations();
        }
    }, [user?.organizationId]);

    // Load report when tab or filters change
    useEffect(() => {
        if (user?.organizationId) {
            loadReport();
        }
    }, [activeTab, filters, user?.organizationId]);

    const loadLocations = async () => {
        if (!user?.organizationId) return;
        try {
            const locs = await organizationService.getLocations(user.organizationId);
            setLocations(locs);
        } catch (error) {
            console.error('Error loading locations:', error);
        }
    };

    const loadReport = async () => {
        if (!user?.organizationId) return;
        setLoading(true);

        try {
            let data: any[] = [];
            switch (activeTab) {
                case 'staff':
                    data = await reportsService.getStaffReport(user.organizationId, filters, locations);
                    break;
                case 'attendance':
                    data = await reportsService.getAttendanceReport(user.organizationId, filters, locations);
                    break;
                case 'scheduling':
                    data = await reportsService.getSchedulingReport(user.organizationId, filters, locations);
                    break;
                case 'leave':
                    data = await reportsService.getLeaveReport(user.organizationId, filters);
                    break;
                case 'payroll':
                    data = await reportsService.getPayrollReport(user.organizationId, filters, locations);
                    break;
                case 'compliance':
                    data = await reportsService.getComplianceReport(user.organizationId);
                    break;
                case 'audit':
                    data = await reportsService.getAuditReport(user.organizationId, filters);
                    break;
            }
            setReportData(data);
        } catch (error) {
            console.error('Error loading report:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExportCSV = () => {
        switch (activeTab) {
            case 'staff':
                exportToCSV(reportData as any, [
                    { header: 'Name', accessor: 'fullName' },
                    { header: 'Email', accessor: 'email' },
                    { header: 'Phone', accessor: 'phone' },
                    { header: 'Role', accessor: 'systemRole' },
                    { header: 'Job Title', accessor: 'jobTitle' },
                    { header: 'Department', accessor: 'department' },
                    { header: 'Employment Type', accessor: 'employmentType' },
                    { header: 'Status', accessor: 'staffStatus' },
                    { header: 'Location', accessor: 'locationName' },
                    { header: 'Hire Date', accessor: (r: any) => formatDateForCSV(r.hireDate) },
                    { header: 'Pay Method', accessor: 'payMethod' },
                    { header: 'Monthly Salary', accessor: (r: any) => formatCentsForCSV(r.monthlySalaryCents) },
                ], 'staff_report');
                break;
            case 'attendance':
                exportToCSV(reportData as any, [
                    { header: 'Staff Name', accessor: 'staffName' },
                    { header: 'Date', accessor: 'date' },
                    { header: 'Clock In', accessor: 'clockIn' },
                    { header: 'Clock Out', accessor: 'clockOut' },
                    { header: 'Scheduled Hours', accessor: 'scheduledHours' },
                    { header: 'Actual Hours', accessor: 'actualHours' },
                    { header: 'Variance', accessor: 'variance' },
                    { header: 'Overtime Hours', accessor: 'overtimeHours' },
                    { header: 'Late Minutes', accessor: 'lateMinutes' },
                    { header: 'Status', accessor: 'status' },
                    { header: 'Location', accessor: 'locationName' },
                ], 'attendance_report');
                break;
            case 'scheduling':
                exportToCSV(reportData as any, [
                    { header: 'Date', accessor: 'date' },
                    { header: 'Location', accessor: 'locationName' },
                    { header: 'Start Time', accessor: 'startTime' },
                    { header: 'End Time', accessor: 'endTime' },
                    { header: 'Staff Needed', accessor: 'staffNeeded' },
                    { header: 'Staff Assigned', accessor: 'staffAssigned' },
                    { header: 'Fill Rate %', accessor: 'fillRate' },
                    { header: 'Unfilled', accessor: 'unfilledCount' },
                    { header: 'Is Filled', accessor: (r: any) => r.isFilled ? 'Yes' : 'No' },
                ], 'scheduling_report');
                break;
            case 'leave':
                exportToCSV(reportData as any, [
                    { header: 'Staff Name', accessor: 'staffName' },
                    { header: 'Leave Type', accessor: 'leaveType' },
                    { header: 'Start Date', accessor: 'startDate' },
                    { header: 'End Date', accessor: 'endDate' },
                    { header: 'Days Requested', accessor: 'daysRequested' },
                    { header: 'Status', accessor: 'status' },
                    { header: 'Balance Before', accessor: 'balanceBefore' },
                    { header: 'Balance After', accessor: 'balanceAfter' },
                    { header: 'Is Paid', accessor: (r: any) => r.isPaid ? 'Yes' : 'No' },
                    { header: 'Approved By', accessor: 'approvedBy' },
                ], 'leave_report');
                break;
            case 'payroll':
                exportToCSV(reportData as any, [
                    { header: 'Staff Name', accessor: 'staffName' },
                    { header: 'Period', accessor: 'periodName' },
                    { header: 'Base Salary', accessor: (r: any) => formatCentsForCSV(r.baseSalaryCents) },
                    { header: 'Worked Units', accessor: 'workedUnits' },
                    { header: 'Paid Leave', accessor: 'paidLeaveUnits' },
                    { header: 'Unpaid Leave', accessor: 'unpaidLeaveUnits' },
                    { header: 'Allowances', accessor: (r: any) => formatCentsForCSV(r.allowancesTotalCents) },
                    { header: 'Deductions', accessor: (r: any) => formatCentsForCSV(r.deductionsTotalCents) },
                    { header: 'Gross Pay', accessor: (r: any) => formatCentsForCSV(r.grossPayCents) },
                    { header: 'Net Pay', accessor: (r: any) => formatCentsForCSV(r.netPayCents) },
                    { header: 'Is Paid', accessor: (r: any) => r.isPaid ? 'Yes' : 'No' },
                    { header: 'Location', accessor: 'locationName' },
                ], 'payroll_report');
                break;
            case 'compliance':
                exportToCSV(reportData as any, [
                    { header: 'Document Name', accessor: 'documentName' },
                    { header: 'Uploaded At', accessor: (r: any) => formatDateTimeForCSV(r.uploadedAt) },
                    { header: 'Staff Assigned', accessor: 'totalStaffAssigned' },
                    { header: 'Acknowledged', accessor: 'acknowledgedCount' },
                    { header: 'Pending', accessor: 'pendingCount' },
                    { header: 'Acknowledgment Rate %', accessor: 'acknowledgedRate' },
                ], 'compliance_report');
                break;
            case 'audit':
                exportToCSV(reportData as any, [
                    { header: 'Event Type', accessor: 'eventType' },
                    { header: 'Description', accessor: 'description' },
                    { header: 'User Email', accessor: 'userEmail' },
                    { header: 'Target', accessor: 'targetTable' },
                    { header: 'Date/Time', accessor: (r: any) => formatDateTimeForCSV(r.createdAt) },
                ], 'audit_report');
                break;
        }
    };

    const updateFilter = (key: keyof ReportFilters, value: any) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const getReportData = () => {
        return reportData;
    };

    // Render filter panel
    const renderFilters = () => (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
            <div className="flex flex-wrap gap-4">
                {/* Date Range */}
                <div className="flex-1 min-w-[150px]">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Date Range</label>
                    <select
                        value={filters.dateRange}
                        onChange={(e) => updateFilter('dateRange', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    >
                        <option value="daily">Today</option>
                        <option value="weekly">Last 7 Days</option>
                        <option value="monthly">Last 30 Days</option>
                        <option value="custom">Custom</option>
                    </select>
                </div>

                {filters.dateRange === 'custom' && (
                    <>
                        <div className="min-w-[140px]">
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Start Date</label>
                            <DateInput
                                value={filters.startDate || ''}
                                onChange={(value) => updateFilter('startDate', value)}
                            />
                        </div>
                        <div className="min-w-[140px]">
                            <label className="block text-xs font-semibold text-slate-600 mb-1">End Date</label>
                            <DateInput
                                value={filters.endDate || ''}
                                onChange={(value) => updateFilter('endDate', value)}
                            />
                        </div>
                    </>
                )}

                {/* Location Filter */}
                {locations.length > 0 && (
                    <div className="min-w-[180px]">
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Location</label>
                        <select
                            value={filters.locationIds?.length === 1 ? filters.locationIds[0] : 'all'}
                            onChange={(e) => updateFilter('locationIds', e.target.value === 'all' ? [] : [e.target.value])}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        >
                            <option value="all">All Locations</option>
                            {locations.map(loc => (
                                <option key={loc.id} value={loc.id}>{loc.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Status Filter (for staff/leave reports) */}
                {(activeTab === 'staff' || activeTab === 'leave') && (
                    <div className="min-w-[140px]">
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
                        <select
                            value={filters.status?.length === 1 ? filters.status[0] : 'all'}
                            onChange={(e) => updateFilter('status', e.target.value === 'all' ? [] : [e.target.value])}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        >
                            <option value="all">All Status</option>
                            {activeTab === 'staff' && (
                                <>
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                    <option value="Invited">Invited</option>
                                </>
                            )}
                            {activeTab === 'leave' && (
                                <>
                                    <option value="Pending">Pending</option>
                                    <option value="Approved">Approved</option>
                                    <option value="Rejected">Rejected</option>
                                </>
                            )}
                        </select>
                    </div>
                )}

                {/* Refresh Button */}
                <div className="flex items-end">
                    <button
                        onClick={loadReport}
                        disabled={loading}
                        className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                        {loading ? 'Loading...' : '🔄 Refresh'}
                    </button>
                </div>
            </div>
        </div>
    );

    // Render table based on report type
    const renderTable = () => {
        const data = getReportData();

        if (loading) {
            return (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin text-3xl">⏳</div>
                </div>
            );
        }

        if (!data.length) {
            return (
                <div className="text-center py-12 text-slate-500">
                    <p className="text-4xl mb-4">📊</p>
                    <p>No data found for the selected filters</p>
                </div>
            );
        }

        return (
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-slate-50">
                        <tr>
                            {activeTab === 'staff' && (
                                <>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Name</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Role</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Job Title</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Employment</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Location</th>
                                </>
                            )}
                            {activeTab === 'attendance' && (
                                <>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Staff</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Clock In</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Clock Out</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Hours</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Overtime</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Late</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Status</th>
                                </>
                            )}
                            {activeTab === 'scheduling' && (
                                <>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Location</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Time</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Needed</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Assigned</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Fill Rate</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Status</th>
                                </>
                            )}
                            {activeTab === 'leave' && (
                                <>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Staff</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Type</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Dates</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Days</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Paid</th>
                                </>
                            )}
                            {activeTab === 'payroll' && (
                                <>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Staff</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Period</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Base</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Allowances</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Deductions</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Net Pay</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Paid</th>
                                </>
                            )}
                            {activeTab === 'compliance' && (
                                <>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Document</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Uploaded</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Assigned</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Acknowledged</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Pending</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Rate</th>
                                </>
                            )}
                            {activeTab === 'audit' && (
                                <>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Event</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Description</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">User</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Date/Time</th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {activeTab === 'staff' && reportData.map((row: any, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                                <td className="px-4 py-3 text-sm font-medium text-slate-900">{row.fullName}</td>
                                <td className="px-4 py-3 text-sm text-slate-600">{row.systemRole}</td>
                                <td className="px-4 py-3 text-sm text-slate-600">{row.jobTitle || '-'}</td>
                                <td className="px-4 py-3 text-sm text-slate-600">{row.employmentType}</td>
                                <td className="px-4 py-3">
                                    <span className={`px - 2 py - 1 text - xs font - medium rounded - full ${row.staffStatus === 'Active' ? 'bg-green-100 text-green-700' :
                                        row.staffStatus === 'Inactive' ? 'bg-red-100 text-red-700' :
                                            'bg-yellow-100 text-yellow-700'
                                        } `}>{row.staffStatus}</span>
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-600">{row.locationName || '-'}</td>
                            </tr>
                        ))}
                        {activeTab === 'attendance' && reportData.map((row: any, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                                <td className="px-4 py-3 text-sm font-medium text-slate-900">{row.staffName}</td>
                                <td className="px-4 py-3 text-sm text-slate-600">{row.date}</td>
                                <td className="px-4 py-3 text-sm text-slate-600">{row.clockIn || '-'}</td>
                                <td className="px-4 py-3 text-sm text-slate-600">{row.clockOut || '-'}</td>
                                <td className="px-4 py-3 text-sm text-slate-600">{row.actualHours.toFixed(1)}h</td>
                                <td className="px-4 py-3 text-sm text-teal-600 font-medium">{row.overtimeHours > 0 ? `+ ${row.overtimeHours.toFixed(1)} h` : '-'}</td>
                                <td className="px-4 py-3 text-sm text-red-600">{row.lateMinutes > 0 ? `${row.lateMinutes} m` : '-'}</td>
                                <td className="px-4 py-3">
                                    <span className={`px - 2 py - 1 text - xs font - medium rounded - full ${row.status === 'Present' ? 'bg-green-100 text-green-700' :
                                        row.status === 'Absent' ? 'bg-red-100 text-red-700' :
                                            'bg-yellow-100 text-yellow-700'
                                        } `}>{row.status}</span>
                                </td>
                            </tr>
                        ))}
                        {activeTab === 'scheduling' && reportData.map((row: any, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                                <td className="px-4 py-3 text-sm text-slate-900">{row.date}</td>
                                <td className="px-4 py-3 text-sm text-slate-600">{row.locationName}</td>
                                <td className="px-4 py-3 text-sm text-slate-600">{row.startTime} - {row.endTime}</td>
                                <td className="px-4 py-3 text-sm text-slate-600">{row.staffNeeded}</td>
                                <td className="px-4 py-3 text-sm text-slate-600">{row.staffAssigned}</td>
                                <td className="px-4 py-3 text-sm font-medium">{row.fillRate}%</td>
                                <td className="px-4 py-3">
                                    <span className={`px - 2 py - 1 text - xs font - medium rounded - full ${row.isFilled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                        } `}>{row.isFilled ? 'Filled' : `${row.unfilledCount} Open`}</span>
                                </td>
                            </tr>
                        ))}
                        {activeTab === 'leave' && reportData.map((row: any, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                                <td className="px-4 py-3 text-sm font-medium text-slate-900">{row.staffName}</td>
                                <td className="px-4 py-3 text-sm text-slate-600">{row.leaveType}</td>
                                <td className="px-4 py-3 text-sm text-slate-600">{row.startDate} → {row.endDate}</td>
                                <td className="px-4 py-3 text-sm text-slate-600">{row.daysRequested}</td>
                                <td className="px-4 py-3">
                                    <span className={`px - 2 py - 1 text - xs font - medium rounded - full ${row.status === 'Approved' ? 'bg-green-100 text-green-700' :
                                        row.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                            'bg-yellow-100 text-yellow-700'
                                        } `}>{row.status}</span>
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-600">{row.isPaid ? 'Yes' : 'No'}</td>
                            </tr>
                        ))}
                        {activeTab === 'payroll' && reportData.map((row: any, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                                <td className="px-4 py-3 text-sm font-medium text-slate-900">{row.staffName}</td>
                                <td className="px-4 py-3 text-sm text-slate-600">{row.periodName}</td>
                                <td className="px-4 py-3 text-sm text-slate-600">
                                    <PrivacyMask isVisible={showFinancials}>
                                        KES {(row.baseSalaryCents / 100).toLocaleString()}
                                    </PrivacyMask>
                                </td>
                                <td className="px-4 py-3 text-sm text-green-600">
                                    <PrivacyMask isVisible={showFinancials}>
                                        +KES {(row.allowancesTotalCents / 100).toLocaleString()}
                                    </PrivacyMask>
                                </td>
                                <td className="px-4 py-3 text-sm text-red-600">
                                    <PrivacyMask isVisible={showFinancials}>
                                        -KES {(row.deductionsTotalCents / 100).toLocaleString()}
                                    </PrivacyMask>
                                </td>
                                <td className="px-4 py-3 text-sm font-bold text-slate-900">
                                    <PrivacyMask isVisible={showFinancials}>
                                        KES {(row.netPayCents / 100).toLocaleString()}
                                    </PrivacyMask>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`px - 2 py - 1 text - xs font - medium rounded - full ${row.isPaid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                        } `}>{row.isPaid ? 'Paid' : 'Pending'}</span>
                                </td>
                            </tr>
                        ))}
                        {activeTab === 'compliance' && reportData.map((row: any, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                                <td className="px-4 py-3 text-sm font-medium text-slate-900">{row.documentName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                    {formatDateKE(row.uploadedAt)}
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-600">{row.totalStaffAssigned}</td>
                                <td className="px-4 py-3 text-sm text-green-600">{row.acknowledgedCount}</td>
                                <td className="px-4 py-3 text-sm text-red-600">{row.pendingCount}</td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center">
                                        <div className="w-16 bg-slate-200 rounded-full h-2 mr-2">
                                            <div className="bg-teal-600 h-2 rounded-full" style={{ width: `${row.acknowledgedRate}% ` }} />
                                        </div>
                                        <span className="text-sm font-medium">{row.acknowledgedRate}%</span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {activeTab === 'audit' && reportData.map((row: any, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                                <td className="px-4 py-3">
                                    <span className="px-2 py-1 text-xs font-medium rounded bg-slate-100 text-slate-700">{row.eventType}</span>
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">{row.description}</td>
                                <td className="px-4 py-3 text-sm text-slate-600">{row.userEmail || 'System'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                    {formatDateTimeKE(row.createdAt)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="p-4 md:p-8 w-full max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-[#1a2e35]">Reports</h2>
                    <p className="text-sm text-slate-500 mt-1">Generate and export operational reports</p>
                </div>
                <div className="flex gap-2">
                    {activeTab === 'payroll' && (
                        <PrivacyToggle isVisible={showFinancials} onToggle={() => setShowFinancials(!showFinancials)} label={showFinancials ? 'Hide Financials' : 'Show Financials'} />
                    )}
                    <button
                        onClick={handleExportCSV}
                        disabled={!getReportData().length}
                        className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                        <span className="mr-2">📥</span> Export CSV
                    </button>
                </div>
            </div>

            {/* Report Type Tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
                {REPORT_TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px - 4 py - 2 rounded - lg font - medium text - sm transition - colors ${activeTab === tab.id
                            ? 'bg-teal-600 text-white'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                            } `}
                    >
                        <span className="mr-1">{tab.icon}</span> {tab.label}
                    </button>
                ))}
            </div>

            {/* Filters */}
            {renderFilters()}

            {/* Report Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <span className="text-2xl">{REPORT_TABS.find(t => t.id === activeTab)?.icon}</span>
                        <div>
                            <h2 className="font-bold text-slate-900">{REPORT_TABS.find(t => t.id === activeTab)?.label} Report</h2>
                            <p className="text-sm text-slate-500">{getReportData().length} records found</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {renderTable()}
            </div>
        </div>
    );
};

export default ReportsView;
