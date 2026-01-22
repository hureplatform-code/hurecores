import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { payrollService, staffService, scheduleService } from '../../lib/services';
import type { PayrollPeriod, PayrollEntry, Profile } from '../../types';
import { formatDateTimeKE, formatDateKE, formatTimeKE } from '../../lib/utils/dateFormat';
import DateInput from '../common/DateInput';
import { PrivacyMask, PrivacyToggle } from '../common/PrivacyControl';

// Extended PayrollEntry with additional UI fields for the spec
interface ExtendedPayrollEntry extends PayrollEntry {
    monthUnits?: number;
    allowanceDetails?: { amount: number; notes: string }[];
    workedUnitsDays?: number;
    absentDays?: number;
}

// Locum Payout Entry
interface LocumPayoutEntry {
    id: string;
    locumName: string;
    shiftDate: string;
    shiftTime: string;
    role: string;
    location: string;
    rateCents: number;
    status: 'Scheduled' | 'Worked' | 'No-show';
    supervisorName?: string;
}

const PayrollView: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);
    const [entries, setEntries] = useState<ExtendedPayrollEntry[]>([]);
    const [locumPayouts, setLocumPayouts] = useState<LocumPayoutEntry[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
    const [showAllowanceModal, setShowAllowanceModal] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [activeTab, setActiveTab] = useState<'employees' | 'locums'>('employees');
    const [showArchived, setShowArchived] = useState(false);
    const [showSalaries, setShowSalaries] = useState(false); // Toggle to hide/show salary information

    const [newPeriod, setNewPeriod] = useState({
        name: '',
        startDate: '',
        endDate: ''
    });

    const [newAllowance, setNewAllowance] = useState({ amount: 0, notes: '' });
    const [editingAllowanceIndex, setEditingAllowanceIndex] = useState<number | null>(null);

    useEffect(() => {
        loadPeriods();
    }, [user?.organizationId, showArchived]); // Reload when archive toggle changes

    useEffect(() => {
        if (selectedPeriod) {
            loadPeriodDetails(selectedPeriod.id);
        }
    }, [selectedPeriod?.id]);

    const loadPeriods = async () => {
        if (!user?.organizationId) return;

        setLoading(true);
        try {
            const data = await payrollService.getPeriods(user.organizationId);
            // Filter based on showArchived toggle
            const filteredData = showArchived
                ? data.filter(p => p.isArchived)
                : data.filter(p => !p.isArchived);
            setPeriods(filteredData);
            if (filteredData.length > 0) {
                setSelectedPeriod(filteredData[0]); // Select most recent
            } else {
                setSelectedPeriod(null);
            }
        } catch (error) {
            console.error('Error loading payroll periods:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadPeriodDetails = async (periodId: string) => {
        if (!user?.organizationId || !selectedPeriod) return;

        try {
            const [entriesData, summaryData] = await Promise.all([
                payrollService.getEntries(user.organizationId, periodId),
                payrollService.getPeriodSummary(user.organizationId, periodId)
            ]);

            // Transform entries to extended format with additional calculations
            const extendedEntries: ExtendedPayrollEntry[] = entriesData
                .filter(entry => {
                    // Exclude owners unless they have salary configured
                    if (entry.staff?.systemRole === 'OWNER') {
                        return (entry.staff.monthlySalaryCents || 0) > 0 || (entry.staff.hourlyRateCents || 0) > 0;
                    }
                    return true;
                })
                .map(entry => {
                    // Calculate month units (days in period)
                    const startDate = new Date(selectedPeriod.startDate);
                    const endDate = new Date(selectedPeriod.endDate);
                    const monthUnits = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

                    // Calculate paid units = worked + paid leave
                    const workedDays = Math.ceil((entry.workedUnits || 0) / 8); // Assuming 8h workday
                    const paidLeaveUnitsVal = entry.paidLeaveUnits || 0;
                    const paidUnits = workedDays + paidLeaveUnitsVal;

                    // Calculate payable base
                    let payableBaseCents = 0;
                    if (entry.payMethod === 'Fixed') {
                        payableBaseCents = entry.staff?.monthlySalaryCents || 0;
                    } else {
                        // Prorated: (monthly salary / month units) * paid units
                        const monthlySalary = entry.staff?.monthlySalaryCents || 0;
                        payableBaseCents = Math.round((monthlySalary / monthUnits) * paidUnits);
                    }

                    return {
                        ...entry,
                        monthUnits,
                        workedUnitsDays: workedDays,
                        absentDays: entry.absentUnits || 0,
                        allowanceDetails: []
                    } as ExtendedPayrollEntry;
                });

            setEntries(extendedEntries);
            setSummary(summaryData);

            // Load locum payouts from shifts
            const shifts = await scheduleService.getShifts(user.organizationId, {
                startDate: selectedPeriod.startDate,
                endDate: selectedPeriod.endDate
            });

            const locums: LocumPayoutEntry[] = shifts
                .filter(shift => shift.assignments?.some(a => a.isLocum))
                .flatMap(shift => {
                    return (shift.assignments || [])
                        .filter(a => a.isLocum)
                        .map(assignment => ({
                            id: assignment.id,
                            locumName: assignment.locumName || 'Unknown',
                            shiftDate: shift.date,
                            shiftTime: `${shift.startTime} - ${shift.endTime}`,
                            role: shift.roleRequired || 'Locum',
                            location: shift.location?.name || 'Unknown',
                            rateCents: assignment.locumRateCents || 0,
                            status: 'Worked' as const, // Would check attendance
                            supervisorName: assignment.supervisor?.fullName
                        }));
                });

            setLocumPayouts(locums);
        } catch (error) {
            console.error('Error loading period details:', error);
        }
    };

    const handleCreatePeriod = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.organizationId) return;

        setError('');
        try {
            const period = await payrollService.createPeriod(user.organizationId, newPeriod);
            setShowCreateModal(false);
            setNewPeriod({ name: '', startDate: '', endDate: '' });
            loadPeriods();
            setSelectedPeriod(period);
        } catch (err: any) {
            setError(err.message || 'Failed to create period');
        }
    };

    const handleGenerateEntries = async () => {
        if (!user?.organizationId || !selectedPeriod) return;

        try {
            await payrollService.generateEntries(user.organizationId, selectedPeriod.id);
            setSuccess('Payroll entries generated from attendance and leave data');
            loadPeriodDetails(selectedPeriod.id);
            setTimeout(() => setSuccess(''), 5000);
        } catch (err: any) {
            setError(err.message || 'Failed to generate entries');
        }
    };

    const handleMarkAllPaid = async () => {
        if (!user?.organizationId || !selectedPeriod) return;

        const unpaidCount = entries.filter(e => !e.isPaid).length;
        if (unpaidCount === 0) {
            setError('All entries are already marked as paid');
            return;
        }

        const confirmed = window.confirm(
            `⚠️ CONFIRM PAYOUT MARKING\n\n` +
            `You are about to mark ${unpaidCount} staff members as PAID.\n\n` +
            `This will:\n` +
            `• Record today's date as the payment date\n` +
            `• Record your name as the payer\n` +
            `• Create an immutable audit log entry\n\n` +
            `Total amount: ${formatCurrency(entries.filter(e => !e.isPaid).reduce((sum, e) => sum + e.netPayCents, 0))}\n\n` +
            `Are you sure you want to proceed?`
        );

        if (!confirmed) return;

        try {
            await payrollService.markAllAsPaid(user.organizationId, selectedPeriod.id);
            setSuccess(`${unpaidCount} entries marked as paid by ${user.email}`);
            loadPeriodDetails(selectedPeriod.id);
            setTimeout(() => setSuccess(''), 5000);
        } catch (err: any) {
            setError(err.message || 'Failed to mark as paid');
        }
    };

    const handleMarkEntryPaid = async (entryId: string) => {
        if (!user?.organizationId) return;

        // Find entry to determine current state
        const entry = entries.find(e => e.id === entryId);
        if (!entry) return;

        try {
            if (entry.isPaid) {
                // Unmark as paid (toggle off)
                await payrollService.unmarkAsPaid(user.organizationId, entryId);
                setSuccess('Entry unmarked as paid - corrections can be made');
            } else {
                // Mark as paid (toggle on)
                await payrollService.markAsPaid(user.organizationId, entryId);
                setSuccess('Entry marked as paid');
            }
            loadPeriodDetails(selectedPeriod!.id);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to update paid status');
        }
    };

    const handleFinalize = async () => {
        if (!user?.organizationId || !selectedPeriod) return;

        const confirmed = window.confirm(
            `🔒 FINALIZE PAYROLL PERIOD\n\n` +
            `You are about to FINALIZE "${selectedPeriod.name}".\n\n` +
            `This will:\n` +
            `• Lock all entries (no more edits)\n` +
            `• Create a permanent snapshot\n` +
            `• Enable CSV export\n\n` +
            `⚠️ This action CANNOT be undone.\n\n` +
            `Are you sure?`
        );

        if (!confirmed) return;

        try {
            await payrollService.finalizePeriod(user.organizationId, selectedPeriod.id);
            setSuccess('Payroll period finalized. Data is now read-only.');
            loadPeriods();
            setTimeout(() => setSuccess(''), 5000);
        } catch (err: any) {
            setError(err.message || 'Failed to finalize');
        }
    };

    const handleArchivePeriod = async () => {
        if (!user?.organizationId || !selectedPeriod) return;

        const isCurrentlyArchived = selectedPeriod.isArchived;

        const confirmed = window.confirm(
            isCurrentlyArchived
                ? `Unarchive "${selectedPeriod.name}"?\n\nThis will restore the period to the main list.`
                : `📦 Archive "${selectedPeriod.name}"?\n\nArchived periods are hidden from the main list but can be viewed in the "Archived" view.`
        );

        if (!confirmed) return;

        try {
            if (isCurrentlyArchived) {
                await payrollService.unarchivePeriod(user.organizationId, selectedPeriod.id);
                setSuccess('Payroll period restored');
            } else {
                await payrollService.archivePeriod(user.organizationId, selectedPeriod.id);
                setSuccess('Payroll period archived');
            }
            loadPeriods();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to archive');
        }
    };

    const handleExport = async () => {
        if (!user?.organizationId || !selectedPeriod) return;

        // Only allow export if finalized
        if (!selectedPeriod.isFinalized) {
            setError('Please finalize the payroll period before exporting. This ensures data integrity.');
            return;
        }

        try {
            const csv = await payrollService.exportToCSV(user.organizationId, selectedPeriod.id);
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `payroll-${selectedPeriod.name.replace(/\s+/g, '-')}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err: any) {
            setError(err.message || 'Failed to export');
        }
    };

    const handleAddAllowance = async (entryId: string) => {
        if (!user?.organizationId || !selectedPeriod || selectedPeriod.isFinalized) return;

        const entry = entries.find(e => e.id === entryId);
        if (!entry) return;

        if (editingAllowanceIndex !== null) {
            // Edit existing allowance
            setEntries(prev => prev.map(e => {
                if (e.id !== entryId) return e;
                const newDetails = [...(e.allowanceDetails || [])];
                newDetails[editingAllowanceIndex] = {
                    amount: newAllowance.amount * 100,
                    notes: newAllowance.notes
                };
                const newTotal = newDetails.reduce((sum, a) => sum + a.amount, 0);
                return {
                    ...e,
                    allowanceDetails: newDetails,
                    allowancesTotalCents: newTotal
                };
            }));
        } else {
            // Add new allowance
            const newAllowanceDetails = [
                ...(entry.allowanceDetails || []),
                { amount: newAllowance.amount * 100, notes: newAllowance.notes }
            ];
            const totalAllowances = newAllowanceDetails.reduce((sum, a) => sum + a.amount, 0);

            setEntries(prev => prev.map(e =>
                e.id === entryId
                    ? { ...e, allowanceDetails: newAllowanceDetails, allowancesTotalCents: totalAllowances }
                    : e
            ));
        }

        setShowAllowanceModal(null);
        setNewAllowance({ amount: 0, notes: '' });
        setEditingAllowanceIndex(null);
    };

    const handleEditAllowance = (entryId: string, allowanceIdx: number) => {
        const entry = entries.find(e => e.id === entryId);
        if (!entry) return;
        const allowance = entry.allowanceDetails?.[allowanceIdx];
        if (!allowance) return;

        setNewAllowance({
            amount: allowance.amount / 100,
            notes: allowance.notes
        });
        setEditingAllowanceIndex(allowanceIdx);
        setShowAllowanceModal(entryId);
    };

    const handleDeleteAllowance = (entryId: string, allowanceIdx: number) => {
        if (!window.confirm('Are you sure you want to delete this allowance?')) return;

        setEntries(prev => prev.map(e => {
            if (e.id !== entryId) return e;
            const newDetails = [...(e.allowanceDetails || [])];
            newDetails.splice(allowanceIdx, 1);
            const newTotal = newDetails.reduce((sum, a) => sum + a.amount, 0);
            return {
                ...e,
                allowanceDetails: newDetails,
                allowancesTotalCents: newTotal
            };
        }));
    };

    const formatCurrency = (cents: number) => {
        if (!showSalaries) return 'KES •••';
        // Format with no decimals, use comma separators
        return `KES ${Math.round(cents / 100).toLocaleString('en-KE', { maximumFractionDigits: 0 })}`
    };

    const getPayMethodBadge = (method: string) => {
        if (method === 'Fixed') {
            return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">Fixed</span>;
        }
        return <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-semibold">Prorated</span>;
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">HURE Payroll – Preview (Attendance + Leave)</h2>
                    <p className="text-slate-500 mt-1">
                        Payroll has two tabs: <span className="font-semibold">Employees</span> | <span className="font-semibold">Locums/Contractors</span>.
                        Locums auto-filter by pay period range; payable amount is only for <span className="font-semibold text-emerald-600">Worked</span>.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowSalaries(!showSalaries)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors font-medium"
                        title={showSalaries ? "Hide salary amounts" : "Show salary amounts"}
                    >
                        <span className="text-lg">{showSalaries ? '👁️' : '👁️‍🗨️'}</span>
                        <span className="text-sm">{showSalaries ? 'Hide Salaries' : 'Show Salaries'}</span>
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700"
                    >
                        + Create Period
                    </button>
                </div>
            </div>

            {/* Payroll Rules Banner */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
                <div className="flex items-start space-x-3">
                    <span className="text-xl">📋</span>
                    <div className="text-sm text-slate-600">
                        <p className="font-semibold text-slate-700 mb-1">Payroll Calculation Rules:</p>
                        <p><strong>Section 1:</strong> <strong>Paid Units</strong> = Worked Units + Paid Leave Units. <strong>Unpaid Leave + Absent</strong> contribute 0 to pay.</p>
                        <p><strong>Fixed salaries</strong> ignore units for pay (units shown for reporting only). <strong>Prorated</strong> = Monthly Salary × (Paid Units / Month Units).</p>
                        <p className="mt-1 text-slate-500">Leave overrides attendance: if staff has approved leave on a date, that date counts as Paid Leave, not Worked/Absent.</p>

                        <p className="font-semibold text-slate-700 mt-3 mb-1">Section 2: Statutory Deductions (KRA)</p>
                        <p>Taxable pay includes salary + all cash allowances (per KRA guidelines).</p>
                        <p><strong>PAYE, NSSF, NHDF, and SHA</strong> are calculated automatically.</p>
                        <p>Employee portions reduce net pay. Employer portions are shown for cost visibility only and do not affect net pay.</p>

                        <p className="font-semibold text-slate-700 mt-3 mb-1">Section 3: Payments & Remittance</p>
                        <p>HURE Core prepares and validated payroll calculations.</p>
                        <p>Payments and statutory remittances are handled externally.</p>
                        <p className="text-slate-500">Figures shown represent a payroll preview, not payment execution.</p>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex justify-between items-center">
                    <span>{error}</span>
                    <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">✕</button>
                </div>
            )}

            {success && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl mb-6 flex justify-between items-center">
                    <span>✓ {success}</span>
                    <button onClick={() => setSuccess('')} className="text-emerald-500 hover:text-emerald-700">✕</button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Period List */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl border border-slate-200 p-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-900">Payroll Periods</h3>
                        </div>
                        {/* Archive Toggle */}
                        <div className="flex items-center justify-between bg-slate-50 rounded-lg p-2 mb-4">
                            <span className="text-xs font-medium text-slate-600">
                                {showArchived ? '📦 Archived' : '📋 Active'}
                            </span>
                            <button
                                onClick={() => setShowArchived(!showArchived)}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${showArchived
                                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                    : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                    }`}
                            >
                                {showArchived ? 'View Active' : 'View Archived'}
                            </button>
                        </div>
                        <div className="space-y-2">
                            {periods.map(period => (
                                <button
                                    key={period.id}
                                    onClick={() => setSelectedPeriod(period)}
                                    className={`w-full text-left p-3 rounded-xl transition-colors ${selectedPeriod?.id === period.id
                                        ? 'bg-[#e0f2f1] border-2 border-[#4fd1c5]'
                                        : 'bg-slate-50 border border-slate-200 hover:border-slate-300'
                                        }`}
                                >
                                    <div className="font-medium text-slate-900">{period.name}</div>
                                    <div className="text-xs text-slate-500 mt-1">
                                        {period.startDate} → {period.endDate}
                                    </div>
                                    {period.isFinalized ? (
                                        <span className="inline-block mt-2 bg-[#1a2e35] text-[#4fd1c5] px-2 py-0.5 rounded text-xs font-bold border border-[#4fd1c5]/30">
                                            🔒 FINALIZED
                                        </span>
                                    ) : (
                                        <span className="inline-block mt-2 bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs font-bold">
                                            DRAFT
                                        </span>
                                    )}
                                </button>
                            ))}

                            {periods.length === 0 && (
                                <p className="text-center text-slate-500 py-8">No periods yet</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Period Details */}
                <div className="lg:col-span-3">
                    {selectedPeriod ? (
                        <>
                            {/* Period Header with Filter */}
                            <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 flex flex-wrap gap-4 items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="text-sm text-slate-600">
                                        <span className="font-semibold">Marked by:</span> Owner/Admin
                                    </div>
                                    <div className="text-sm text-slate-600">
                                        <span className="font-semibold">Pay period:</span> {selectedPeriod.startDate} to {selectedPeriod.endDate}
                                    </div>
                                </div>
                                <div className="text-xs text-slate-400">
                                    Auto-saved: {formatDateTimeKE(new Date())}
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl mb-6 w-fit">
                                <button
                                    onClick={() => setActiveTab('employees')}
                                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'employees'
                                        ? 'bg-white text-slate-900 shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                >
                                    Employees
                                </button>
                                <button
                                    onClick={() => setActiveTab('locums')}
                                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'locums'
                                        ? 'bg-white text-slate-900 shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                >
                                    Locums / Contractors
                                </button>
                            </div>

                            {/* Summary Cards */}
                            {summary && activeTab === 'employees' && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                                        <div className="text-2xl font-bold text-slate-900">{summary.totalEntries}</div>
                                        <div className="text-sm text-slate-500">Staff</div>
                                    </div>
                                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                                        <div className="text-2xl font-bold text-slate-900">{formatCurrency(summary.totalGrossCents)}</div>
                                        <div className="text-sm text-slate-500">Total Gross</div>
                                    </div>
                                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                                        <div className="text-2xl font-bold text-emerald-600">{formatCurrency(summary.totalNetCents)}</div>
                                        <div className="text-sm text-slate-500">Total Net</div>
                                    </div>
                                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                                        <div className="text-2xl font-bold text-slate-900">{summary.paidCount}/{summary.totalEntries}</div>
                                        <div className="text-sm text-slate-500">Paid</div>
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex flex-wrap gap-3 mb-6">
                                {entries.length === 0 && !selectedPeriod.isFinalized && activeTab === 'employees' && (
                                    <button
                                        onClick={handleGenerateEntries}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-blue-700"
                                    >
                                        Generate Entries
                                    </button>
                                )}
                                {entries.length > 0 && !selectedPeriod.isFinalized && activeTab === 'employees' && (
                                    <>
                                        <button
                                            onClick={handleMarkAllPaid}
                                            className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-emerald-700"
                                        >
                                            ✓ Mark All Paid
                                        </button>
                                        <button
                                            onClick={handleFinalize}
                                            className="bg-slate-800 text-white px-4 py-2 rounded-xl font-semibold hover:bg-slate-900"
                                        >
                                            🔒 Finalize Period
                                        </button>
                                    </>
                                )}
                                {selectedPeriod.isFinalized && (
                                    <button
                                        onClick={handleExport}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-blue-700"
                                    >
                                        📥 Export Employees CSV
                                    </button>
                                )}
                                {/* Archive button now always visible for both draft and finalized periods */}
                                <button
                                    onClick={handleArchivePeriod}
                                    className={selectedPeriod.isArchived
                                        ? "bg-amber-500 text-white px-4 py-2 rounded-xl font-semibold hover:bg-amber-600"
                                        : "bg-slate-500 text-white px-4 py-2 rounded-xl font-semibold hover:bg-slate-600"
                                    }
                                    title={selectedPeriod.isArchived ? "Restore this period from archive" : "Move this period to archive"}
                                >
                                    {selectedPeriod.isArchived ? '📤 Unarchive' : '📦 Archive'}
                                </button>
                                {!selectedPeriod.isFinalized && activeTab === 'locums' && (
                                    <button
                                        onClick={() => {/* Export locums as CSV */ }}
                                        className="bg-purple-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-purple-700"
                                    >
                                        📥 Export Locums CSV
                                    </button>
                                )}
                            </div>


                            {/* Employees Tab Content */}
                            {activeTab === 'employees' && (
                                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                                    <table className="w-full">
                                        <thead className="bg-slate-50 border-b border-slate-200">
                                            <tr>
                                                <th className="w-8 px-3 py-4"></th>
                                                <th className="text-left px-4 py-4 text-sm font-semibold text-slate-600">STAFF</th>
                                                <th className="text-center px-4 py-4 text-sm font-semibold text-slate-600">PAID UNITS / MONTH</th>
                                                <th className="text-right px-4 py-4 text-sm font-semibold text-slate-600">MONTHLY SALARY (KSH)</th>
                                                <th className="text-center px-4 py-4 text-sm font-semibold text-slate-600">PAY METHOD</th>
                                                <th className="text-right px-4 py-4 text-sm font-semibold text-slate-600">PAYABLE BASE (KSH)</th>
                                                <th className="text-right px-4 py-4 text-sm font-semibold text-slate-600">ALLOWANCES (KSH)</th>
                                                <th className="text-right px-4 py-4 text-sm font-semibold text-slate-600">TOTAL GROSS (KSH)</th>
                                                <th className="text-center px-4 py-4 text-sm font-semibold text-slate-600">STATUS</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {entries.map(entry => {
                                                const isExpanded = expandedEntry === entry.id;
                                                return (
                                                    <React.Fragment key={entry.id}>
                                                        <tr className="hover:bg-slate-50">
                                                            <td className="px-3 py-4">
                                                                <button
                                                                    onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
                                                                    className="text-slate-400 hover:text-slate-600"
                                                                >
                                                                    {isExpanded ? '−' : '+'}
                                                                </button>
                                                            </td>
                                                            <td className="px-4 py-4">
                                                                <div className="font-medium text-slate-900">{entry.staff?.fullName || 'Unknown'}</div>
                                                                <div className="text-sm text-slate-500">{entry.staff?.jobTitle || ''}</div>
                                                            </td>
                                                            <td className="px-4 py-4 text-center text-slate-600">
                                                                {(entry.workedUnits + entry.paidLeaveUnits) || 0} / {entry.monthUnits || 30}
                                                            </td>
                                                            <td className="px-4 py-4 text-right text-slate-600">
                                                                <PrivacyMask isVisible={showSalaries}>
                                                                    {((entry.staff?.monthlySalaryCents || 0) / 100).toLocaleString()}
                                                                </PrivacyMask>
                                                            </td>
                                                            <td className="px-4 py-4 text-center">
                                                                {getPayMethodBadge(entry.payMethod)}
                                                            </td>
                                                            <td className="px-4 py-4 text-right text-slate-600">
                                                                <PrivacyMask isVisible={showSalaries}>
                                                                    {((entry.payableBaseCents) / 100).toLocaleString()}
                                                                </PrivacyMask>
                                                            </td>
                                                            <td className="px-4 py-4 text-right text-slate-600">
                                                                <PrivacyMask isVisible={showSalaries}>
                                                                    {((entry.allowancesTotalCents || 0) / 100).toLocaleString()}
                                                                </PrivacyMask>
                                                            </td>
                                                            <td className="px-4 py-4 text-right font-bold text-slate-900">
                                                                <PrivacyMask isVisible={showSalaries}>
                                                                    {(((entry.payableBaseCents || 0) + (entry.allowancesTotalCents || 0)) / 100).toLocaleString()}
                                                                </PrivacyMask>
                                                            </td>
                                                            <td className="px-4 py-4 text-center">
                                                                {selectedPeriod.isFinalized ? (
                                                                    /* Fully locked after finalization */
                                                                    entry.isPaid ? (
                                                                        <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs font-bold">
                                                                            ✓ Paid (Finalized)
                                                                        </span>
                                                                    ) : (
                                                                        <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded-full text-xs font-bold">
                                                                            Unpaid (Finalized)
                                                                        </span>
                                                                    )
                                                                ) : (
                                                                    /* Editable checkbox before finalization */
                                                                    <label className="flex items-center justify-center cursor-pointer">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={entry.isPaid}
                                                                            onChange={() => handleMarkEntryPaid(entry.id)}
                                                                            className="w-5 h-5"
                                                                        />
                                                                        <span className={`ml-2 text-sm ${entry.isPaid ? 'text-emerald-600 font-medium' : 'text-slate-500'}`}>
                                                                            {entry.isPaid ? '✓ Paid' : 'Unpaid'}
                                                                        </span>
                                                                    </label>
                                                                )}
                                                            </td>
                                                        </tr>

                                                        {/* Expanded Row - Drilldown */}
                                                        {isExpanded && (
                                                            <tr className="bg-slate-50">
                                                                <td colSpan={9} className="px-6 py-4">
                                                                    <div className="grid grid-cols-3 gap-6">
                                                                        {/* Units Breakdown */}
                                                                        <div className="bg-white rounded-xl p-4 border border-slate-200">
                                                                            <h4 className="font-semibold text-slate-800 mb-3">Units Breakdown</h4>
                                                                            <div className="space-y-2 text-sm">
                                                                                <div className="flex justify-between">
                                                                                    <span className="text-slate-600">Worked Units (attendance):</span>
                                                                                    <span className="font-medium">{entry.workedUnitsDays || entry.workedUnits || 0}</span>
                                                                                </div>
                                                                                <div className="flex justify-between">
                                                                                    <span className="text-slate-600">Paid Leave Units:</span>
                                                                                    <span className="font-medium">{entry.paidLeaveUnits || 0}</span>
                                                                                </div>
                                                                                <div className="flex justify-between text-slate-400">
                                                                                    <span>Unpaid Leave Units:</span>
                                                                                    <span>{entry.unpaidLeaveUnits || 0}</span>
                                                                                </div>
                                                                                <div className="flex justify-between text-slate-400">
                                                                                    <span>Absent Units:</span>
                                                                                    <span>{entry.absentUnits || 0}</span>
                                                                                </div>
                                                                                <div className="border-t pt-2 mt-2">
                                                                                    <div className="bg-blue-50 rounded p-2">
                                                                                        <div className="text-xs text-blue-600 font-medium">Paid Units (used for pay)</div>
                                                                                        <div className="text-sm">Paid Units = Worked ({entry.workedUnits}) + Paid Leave ({entry.paidLeaveUnits}) = <strong>{entry.workedUnits + entry.paidLeaveUnits}</strong></div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        {/* Pay Calculation */}
                                                                        <div className="bg-white rounded-xl p-4 border border-slate-200">
                                                                            <h4 className="font-semibold text-slate-800 mb-3">Pay Calculation</h4>
                                                                            <div className="space-y-2 text-sm">
                                                                                <div className="flex justify-between">
                                                                                    <span className="text-slate-600">Monthly Salary:</span>
                                                                                    <span className="font-medium">
                                                                                        <PrivacyMask isVisible={showSalaries}>
                                                                                            {formatCurrency(entry.staff?.monthlySalaryCents || 0)}
                                                                                        </PrivacyMask>
                                                                                    </span>
                                                                                </div>
                                                                                <div className="flex justify-between">
                                                                                    <span className="text-slate-600">Pay Method:</span>
                                                                                    <span className="font-medium">{entry.payMethod}</span>
                                                                                </div>
                                                                                <div className="border-t pt-2 mt-2">
                                                                                    <div className="bg-amber-50 rounded p-2">
                                                                                        <div className="text-xs text-amber-600 font-medium">{entry.payMethod}</div>
                                                                                        {entry.payMethod === 'Fixed' ? (
                                                                                            <div className="text-sm">Payable Base = full monthly salary (units shown for reporting only).</div>
                                                                                        ) : (
                                                                                            <div className="text-sm">
                                                                                                Payable Base = Monthly Salary × (Paid Units / Month Units)<br />
                                                                                                Payable Base = Monthly Salary × (Paid Units / Month Units)<br />
                                                                                                = <PrivacyMask isVisible={showSalaries}>{formatCurrency(entry.staff?.monthlySalaryCents || 0)}</PrivacyMask> × ({entry.workedUnits + entry.paidLeaveUnits} / {entry.monthUnits}) = <PrivacyMask isVisible={showSalaries}>{formatCurrency(entry.payableBaseCents)}</PrivacyMask>
                                                                                            </div>
                                                                                        )}
                                                                                        <div className="mt-2 text-xs text-slate-500 border-t border-slate-200 pt-1">
                                                                                            Configured as: Taxable Pay = Basic Salary + Cash Allowances
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        {/* Allowances + Audit */}
                                                                        <div className="bg-white rounded-xl p-4 border border-slate-200">
                                                                            <div className="flex justify-between items-center mb-3">
                                                                                <h4 className="font-semibold text-slate-800">Allowances + Audit</h4>
                                                                                {!selectedPeriod.isFinalized && (
                                                                                    <button
                                                                                        onClick={() => setShowAllowanceModal(entry.id)}
                                                                                        className="text-xs bg-blue-600 text-white px-2 py-1 rounded font-semibold hover:bg-blue-700"
                                                                                    >
                                                                                        + Add Allowance
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                            <p className="text-xs text-slate-500 mb-2">Optional payroll additions</p>

                                                                            <table className="w-full text-sm mb-3">
                                                                                <thead>
                                                                                    <tr className="text-left text-slate-500">
                                                                                        <th className="py-1">Amount (KSh)</th>
                                                                                        <th className="py-1">Notes</th>
                                                                                        <th className="py-1 text-right">Actions</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody>
                                                                                    {(entry.allowanceDetails || []).map((allowance, idx) => (
                                                                                        <tr key={idx}>
                                                                                            <td className="py-1">
                                                                                                <PrivacyMask isVisible={showSalaries}>
                                                                                                    {(allowance.amount / 100).toLocaleString()}
                                                                                                </PrivacyMask>
                                                                                            </td>
                                                                                            <td className="py-1 text-slate-600">{allowance.notes}</td>
                                                                                            <td className="py-1 text-right">
                                                                                                {!selectedPeriod.isFinalized && (
                                                                                                    <div className="flex justify-end space-x-2">
                                                                                                        <button
                                                                                                            onClick={() => handleEditAllowance(entry.id, idx)}
                                                                                                            className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                                                                                                            Edit
                                                                                                        </button>
                                                                                                        <button
                                                                                                            onClick={() => handleDeleteAllowance(entry.id, idx)}
                                                                                                            className="text-red-600 hover:text-red-800 text-xs font-medium">
                                                                                                            Delete
                                                                                                        </button>
                                                                                                    </div>
                                                                                                )}
                                                                                            </td>
                                                                                        </tr>
                                                                                    ))}
                                                                                    {(!entry.allowanceDetails || entry.allowanceDetails.length === 0) && (
                                                                                        <tr>
                                                                                            <td colSpan={3} className="py-2 text-slate-400 text-center">No allowances</td>
                                                                                        </tr>
                                                                                    )}
                                                                                </tbody>
                                                                            </table>

                                                                            <div className="border-t pt-2 space-y-1 text-sm">
                                                                                <div className="flex justify-between">
                                                                                    <span className="text-slate-600">Allowances:</span>
                                                                                    <span className="font-medium">
                                                                                        <PrivacyMask isVisible={showSalaries}>
                                                                                            {((entry.allowancesTotalCents) / 100).toLocaleString()}
                                                                                        </PrivacyMask>
                                                                                    </span>
                                                                                </div>
                                                                                <div className="flex justify-between">
                                                                                    <span className="text-slate-600">Total Gross:</span>
                                                                                    <span className="font-bold">
                                                                                        <PrivacyMask isVisible={showSalaries}>
                                                                                            {(((entry.payableBaseCents || 0) + (entry.allowancesTotalCents || 0)) / 100).toLocaleString()}
                                                                                        </PrivacyMask>
                                                                                    </span>
                                                                                </div>

                                                                                {/* Statutory Deductions Breakdown */}
                                                                                {entry.deductionDetails && (
                                                                                    <div className="border-t border-slate-100 pt-2 space-y-1">
                                                                                        <div className="text-xs font-semibold text-slate-700 mb-1">Deductions (KRA)</div>
                                                                                        <div className="flex justify-between text-xs">
                                                                                            <span className="text-slate-500">PAYE:</span>
                                                                                            <PrivacyMask isVisible={showSalaries} className="text-red-500">
                                                                                                -{((entry.deductionDetails.payeCents || entry.deductionDetails.paye || 0) / 100).toLocaleString()}
                                                                                            </PrivacyMask>
                                                                                        </div>
                                                                                        <div className="flex justify-between text-xs">
                                                                                            <span className="text-slate-500">SHIF (2.75%):</span>
                                                                                            <PrivacyMask isVisible={showSalaries} className="text-red-500">
                                                                                                -{((entry.deductionDetails.shifCents || entry.deductionDetails.shif || 0) / 100).toLocaleString()}
                                                                                            </PrivacyMask>
                                                                                        </div>
                                                                                        <div className="flex justify-between text-xs">
                                                                                            <span className="text-slate-500">NSSF (Tier I+II):</span>
                                                                                            <PrivacyMask isVisible={showSalaries} className="text-red-500">
                                                                                                -{((entry.deductionDetails.nssfCents || entry.deductionDetails.nssf || 0) / 100).toLocaleString()}
                                                                                            </PrivacyMask>
                                                                                        </div>
                                                                                        <div className="flex justify-between text-xs">
                                                                                            <span className="text-slate-500">Housing Levy (1.5%):</span>
                                                                                            <PrivacyMask isVisible={showSalaries} className="text-red-500">
                                                                                                -{((entry.deductionDetails.housingLevyCents || entry.deductionDetails.housingLevy || 0) / 100).toLocaleString()}
                                                                                            </PrivacyMask>
                                                                                        </div>
                                                                                        <div className="flex justify-between font-medium pt-1 border-t border-slate-100">
                                                                                            <span className="text-slate-700">Total Deductions:</span>
                                                                                            <PrivacyMask isVisible={showSalaries} className="text-red-600">
                                                                                                -{((entry.deductionDetails.totalCents || entry.deductionDetails.total || 0) / 100).toLocaleString()}
                                                                                            </PrivacyMask>
                                                                                        </div>
                                                                                    </div>
                                                                                )}

                                                                                <div className="flex justify-between text-slate-500 pt-2 border-t mt-2">
                                                                                    <span>Paid Status:</span>
                                                                                    <span className={entry.isPaid ? 'text-emerald-600 font-medium' : 'text-slate-400'}>
                                                                                        {entry.isPaid ? '✓ Paid' : 'Not yet paid'}
                                                                                    </span>
                                                                                </div>
                                                                                {entry.isPaid && (
                                                                                    <>
                                                                                        <div className="flex justify-between text-slate-500">
                                                                                            <span>📅 Paid On:</span>
                                                                                            <span>{entry.paidAt ? `${formatDateKE(entry.paidAt)} at ${formatTimeKE(entry.paidAt)}` : '—'}</span>
                                                                                        </div>
                                                                                        <div className="flex justify-between text-slate-500">
                                                                                            <span>👤 Marked By:</span>
                                                                                            <span className="font-medium text-slate-700">{entry.paidBy || 'Unknown'}</span>
                                                                                        </div>
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </tbody>
                                    </table>

                                    {entries.length === 0 && (
                                        <div className="p-12 text-center">
                                            <div className="text-4xl mb-4">💰</div>
                                            <h3 className="text-lg font-semibold text-slate-900 mb-2">No payroll entries</h3>
                                            <p className="text-slate-500 mb-4">Generate entries based on staff attendance and pay rates</p>
                                            {!selectedPeriod.isFinalized && (
                                                <button
                                                    onClick={handleGenerateEntries}
                                                    className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700"
                                                >
                                                    Generate Entries
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Locums Tab Content */}
                            {activeTab === 'locums' && (
                                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                                    <div className="bg-purple-50 border-b border-purple-200 p-4">
                                        <div className="flex items-start space-x-3">
                                            <span className="text-xl">🔄</span>
                                            <div>
                                                <p className="text-sm font-medium text-purple-800">Locum / Contractor Payouts</p>
                                                <p className="text-sm text-purple-600">
                                                    External locums are NOT included in employee payroll. This list shows shifts worked by locums during this period.
                                                    Only "Worked" shifts are payable.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <table className="w-full">
                                        <thead className="bg-slate-50 border-b border-slate-200">
                                            <tr>
                                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">LOCUM</th>
                                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">DATE</th>
                                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">SHIFT TIME</th>
                                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">ROLE</th>
                                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">LOCATION</th>
                                                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-600">RATE (KSH)</th>
                                                <th className="text-center px-6 py-4 text-sm font-semibold text-slate-600">STATUS</th>
                                                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-600">PAYABLE</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {locumPayouts.map(locum => (
                                                <tr key={locum.id} className="hover:bg-slate-50">
                                                    <td className="px-6 py-4">
                                                        <div className="font-medium text-slate-900">{locum.locumName}</div>
                                                        <div className="text-sm text-slate-500">External</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-600">{locum.shiftDate}</td>
                                                    <td className="px-6 py-4 text-slate-600">{locum.shiftTime}</td>
                                                    <td className="px-6 py-4 text-slate-600">{locum.role}</td>
                                                    <td className="px-6 py-4 text-slate-600">{locum.location}</td>
                                                    <td className="px-6 py-4 text-right text-slate-600">
                                                        <PrivacyMask isVisible={showSalaries}>
                                                            {(locum.rateCents / 100).toLocaleString()}
                                                        </PrivacyMask>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        {locum.status === 'Worked' ? (
                                                            <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs font-bold">Worked</span>
                                                        ) : locum.status === 'No-show' ? (
                                                            <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-bold">No-show</span>
                                                        ) : (
                                                            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-bold">Scheduled</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-bold">
                                                        {locum.status === 'Worked'
                                                            ? (
                                                                <PrivacyMask isVisible={showSalaries}>
                                                                    {formatCurrency(locum.rateCents)}
                                                                </PrivacyMask>
                                                            )
                                                            : <span className="text-slate-400">—</span>
                                                        }
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        {locumPayouts.length > 0 && (
                                            <tfoot className="bg-slate-50 border-t border-slate-200">
                                                <tr>
                                                    <td colSpan={7} className="px-6 py-4 text-right font-semibold text-slate-700">
                                                        Total Payable (Worked only):
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-bold text-emerald-600">
                                                        <PrivacyMask isVisible={showSalaries}>
                                                            {formatCurrency(
                                                                locumPayouts
                                                                    .filter(l => l.status === 'Worked')
                                                                    .reduce((sum, l) => sum + l.rateCents, 0)
                                                            )}
                                                        </PrivacyMask>
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>

                                    {locumPayouts.length === 0 && (
                                        <div className="p-12 text-center">
                                            <div className="text-4xl mb-4">🔄</div>
                                            <h3 className="text-lg font-semibold text-slate-900 mb-2">No locum shifts in this period</h3>
                                            <p className="text-slate-500">Locum payouts are derived from scheduled shifts with assigned locums.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                            <div className="text-4xl mb-4">💰</div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">No payroll period selected</h3>
                            <p className="text-slate-500">Create a new payroll period to get started</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Period Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 m-4">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-900">Create Payroll Period</h2>
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>

                        <form onSubmit={handleCreatePeriod} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Period Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={newPeriod.name}
                                    onChange={(e) => setNewPeriod(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-xl"
                                    placeholder="e.g., January 2026"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <DateInput
                                        label="Start Date"
                                        required
                                        value={newPeriod.startDate}
                                        onChange={(value) => setNewPeriod(prev => ({ ...prev, startDate: value }))}
                                    />
                                </div>
                                <div>
                                    <DateInput
                                        label="End Date"
                                        required
                                        value={newPeriod.endDate}
                                        onChange={(value) => setNewPeriod(prev => ({ ...prev, endDate: value }))}
                                    />
                                </div>
                            </div>

                            <div className="flex space-x-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 py-3 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
                                >
                                    Create Period
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Allowance Modal */}
            {showAllowanceModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 m-4">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-900">
                                {editingAllowanceIndex !== null ? 'Edit Allowance' : 'Add Allowance'}
                            </h2>
                            <button onClick={() => { setShowAllowanceModal(null); setEditingAllowanceIndex(null); setNewAllowance({ amount: 0, notes: '' }); }} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Amount (KSH) *</label>
                                <input
                                    type="number"
                                    required
                                    value={newAllowance.amount}
                                    onChange={(e) => setNewAllowance(prev => ({ ...prev, amount: Number(e.target.value) }))}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-xl"
                                    placeholder="e.g., 5000"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Notes *</label>
                                <input
                                    type="text"
                                    required
                                    value={newAllowance.notes}
                                    onChange={(e) => setNewAllowance(prev => ({ ...prev, notes: e.target.value }))}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-xl"
                                    placeholder="e.g., Transport allowance"
                                />
                            </div>
                            <div className="flex space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAllowanceModal(null)}
                                    className="flex-1 py-3 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleAddAllowance(showAllowanceModal)}
                                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PayrollView;
