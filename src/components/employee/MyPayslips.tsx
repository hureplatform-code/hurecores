import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { payrollService } from '../../lib/services';
import type { PayrollPeriod, PayrollEntry } from '../../types';
import { formatDateKE } from '../../lib/utils/dateFormat';
import { useTrialStatus, AccessBlockedOverlay } from '../../context/TrialContext';
import DateInput from '../common/DateInput';

// Helper to format currency
const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(cents / 100);
};

// Sub-component to handle fetching/displaying row data
const PayHistoryRow: React.FC<{ period: PayrollPeriod; user: any; onView: () => void }> = ({ period, user, onView }) => {
    const [entry, setEntry] = useState<PayrollEntry | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEntry = async () => {
            // CRITICAL SECURITY CHECK: Ensure we have both user.id and user.organizationId
            if (!user?.id || !user?.organizationId) {
                console.error('[PayHistoryRow] Missing user.id or user.organizationId');
                setLoading(false);
                return;
            }

            try {
                // SECURE APPROACH: Use getEntryForEmployee which filters by BOTH periodId AND staffId
                // This ensures we can ONLY retrieve the logged-in employee's entry
                const myEntry = await payrollService.getEntryForEmployee(
                    user.organizationId,
                    period.id!,
                    user.id // This is the logged-in employee's ID - MUST match
                );
                setEntry(myEntry);
            } catch (error) {
                console.error('Row load error', error);
            } finally {
                setLoading(false);
            }
        };
        fetchEntry();
    }, [period.id, user?.id, user?.organizationId]);

    if (loading) {
        return (
            <tr className="border-b border-slate-50">
                <td colSpan={6} className="px-6 py-4 text-center">
                    <div className="h-4 w-24 bg-slate-100 rounded animate-pulse mx-auto"></div>
                </td>
            </tr>
        );
    }

    if (!entry) return null; // Should ideally not happen if finalized and staff active

    return (
        <tr className="hover:bg-slate-50 transition-colors group">
            <td className="px-6 py-4">
                <div className="font-bold text-slate-900 text-sm">{period.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                    {formatDateKE(period.startDate)} - {formatDateKE(period.endDate)}
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-1">Snapshot ID: {period.id}</div>
            </td>
            <td className="px-6 py-4 text-center">
                <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 border border-green-200 uppercase tracking-wide">
                    Paid
                </span>
            </td>
            <td className="px-6 py-4 text-right font-medium text-slate-900 text-sm">
                {formatCurrency(entry.grossPayCents)}
            </td>
            <td className="px-6 py-4 text-right font-medium text-slate-600 text-sm">
                {formatCurrency(entry.deductionsTotalCents)}
            </td>
            <td className="px-6 py-4 text-right font-bold text-slate-900 text-sm">
                {formatCurrency(entry.netPayCents)}
            </td>
            <td className="px-6 py-4 text-right">
                <button
                    onClick={onView}
                    className="text-blue-600 hover:text-blue-800 font-bold text-xs hover:underline"
                >
                    View<br />breakdown
                </button>
            </td>
        </tr>
    );
};

const MyPayslips: React.FC = () => {
    const { user } = useAuth();
    const { isVerified } = useTrialStatus();

    // ALL hooks must be declared before any conditional returns
    const [loading, setLoading] = useState(true);
    const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
    const [filteredPeriods, setFilteredPeriods] = useState<PayrollPeriod[]>([]);

    // Filter State (Date Range)
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const [startDate, setStartDate] = useState(firstDay.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(lastDay.toISOString().split('T')[0]);
    const [quickSelect, setQuickSelect] = useState('custom');

    // Detail View State
    const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);
    const [payslipDetails, setPayslipDetails] = useState<PayrollEntry | null>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [error, setError] = useState('');
    const [debugInfo, setDebugInfo] = useState<{
        userId: string;
        userEmail: string;
        orgId: string;
        totalEntriesFound: number;
        totalPeriodsFound: number;
        visiblePeriodsCount: number;
        hiddenByFinalization: number;
        hiddenByTimeDelay: number;
    } | null>(null);

    // Define functions before useEffect
    const loadPeriods = async () => {
        // CRITICAL SECURITY CHECK: Ensure user ID exists before proceeding
        if (!user?.id || !user?.organizationId) {
            console.error('[MyPayslips] Missing user.id or user.organizationId - cannot load pay history');
            setError('Unable to load pay history. Please log out and log in again.');
            setLoading(false);
            return;
        }

        console.log('[MyPayslips] Loading pay history for:', {
            userId: user.id,
            userEmail: user.email,
            userName: user.name,
            organizationId: user.organizationId,
            systemRole: user.systemRole
        });

        try {
            setLoading(true);
            setError(''); // Clear any previous errors

            // SECURE APPROACH: Get periods that have entries for THIS specific employee
            // This prevents any possibility of seeing other employees' data
            console.log('[MyPayslips] Calling getPeriodsWithEmployeeEntries with staffId:', user.id);
            const periodsWithMyEntries = await payrollService.getPeriodsWithEmployeeEntries(
                user.organizationId,
                user.id // This is the logged-in employee's ID
            );

            console.log('[MyPayslips] Periods with entries for user:', periodsWithMyEntries.length);
            if (periodsWithMyEntries.length === 0) {
                console.warn('[MyPayslips] NO PAYROLL ENTRIES FOUND. This could mean:');
                console.warn('  1. No payroll has been generated for this employee');
                console.warn('  2. The staffId in payroll entries does not match user.id:', user.id);
                console.warn('  3. The organization ID is wrong:', user.organizationId);
            }
            console.log('[MyPayslips] Period details:', periodsWithMyEntries.map(p => ({
                id: p.id,
                name: p.name,
                isFinalized: p.isFinalized,
                finalizedAt: p.finalizedAt
            })));

            // VISIBILITY RULE: Only show finalized periods AND 1 hour must have passed since finalization
            // TODO: Change back to 24 hours for production
            const now = new Date();
            const visiblePeriods = periodsWithMyEntries.filter(p => {
                if (!p.isFinalized) {
                    console.log('[MyPayslips] Skipping period (not finalized):', p.name);
                    return false;
                }
                if (!p.finalizedAt) {
                    console.log('[MyPayslips] Period finalized but no finalizedAt timestamp:', p.name);
                    // Allow it if isFinalized is true but no timestamp (legacy data)
                    return true;
                }
                const finalizedTime = new Date(p.finalizedAt);
                const hoursDiff = (now.getTime() - finalizedTime.getTime()) / (1000 * 60 * 60);
                if (hoursDiff < 1) {
                    console.log('[MyPayslips] Skipping period (less than 1h since finalization):', p.name, 'hours:', hoursDiff.toFixed(1));
                }
                return hoursDiff >= 1; // Changed from 24 to 1 for testing
            });

            // Calculate debug stats
            const notFinalizedCount = periodsWithMyEntries.filter(p => !p.isFinalized).length;
            const hiddenByTimeCount = periodsWithMyEntries.filter(p => {
                if (!p.isFinalized || !p.finalizedAt) return false;
                const finalizedTime = new Date(p.finalizedAt);
                const hoursDiff = (now.getTime() - finalizedTime.getTime()) / (1000 * 60 * 60);
                return hoursDiff < 1;
            }).length;

            // Set debug info for admin visibility
            setDebugInfo({
                userId: user.id,
                userEmail: user.email || 'N/A',
                orgId: user.organizationId,
                totalEntriesFound: periodsWithMyEntries.length,
                totalPeriodsFound: periodsWithMyEntries.length,
                visiblePeriodsCount: visiblePeriods.length,
                hiddenByFinalization: notFinalizedCount,
                hiddenByTimeDelay: hiddenByTimeCount
            });

            console.log('[MyPayslips] Visible periods (finalized + 1h rule passed):', visiblePeriods.length);
            console.log('[MyPayslips] Hidden by not finalized:', notFinalizedCount);
            console.log('[MyPayslips] Hidden by time delay (< 1h):', hiddenByTimeCount);

            // Sort by start date descending (newest first)
            visiblePeriods.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

            setPeriods(visiblePeriods);
        } catch (err: any) {
            console.error('[MyPayslips] Error loading payroll periods:', err);
            // Check for Firestore permission errors
            if (err?.code === 'permission-denied') {
                setError('Access denied. Please contact your administrator.');
            } else {
                setError('Failed to load payroll periods. Please try again later.');
            }
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        if (!startDate || !endDate) return;

        const start = new Date(startDate);
        const end = new Date(endDate);
        // Set end date to end of day to include the full day
        end.setHours(23, 59, 59, 999);

        const filtered = periods.filter(p => {
            const pStart = new Date(p.startDate);
            const pEnd = new Date(p.endDate);
            // Overlap logic: Period overlaps with selected range
            return pStart <= end && pEnd >= start;
        });
        setFilteredPeriods(filtered);
    };

    useEffect(() => {
        // CRITICAL: Must have BOTH organizationId AND user.id to load pay history securely
        if (user?.organizationId && user?.id) {
            loadPeriods();
        }
    }, [user?.organizationId, user?.id]);

    useEffect(() => {
        applyFilters();
    }, [periods, startDate, endDate]);

    // CRITICAL: Verification Gating - Check AFTER all hooks
    if (!isVerified) {
        return <AccessBlockedOverlay reason="verification" />;
    }

    const handleQuickSelect = (value: string) => {
        setQuickSelect(value);
        const today = new Date();
        let newStart = startDate;
        let newEnd = endDate;

        if (value === 'thisMonth') {
            newStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
            newEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
        } else if (value === 'lastMonth') {
            newStart = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0];
            newEnd = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0];
        } else if (value === 'last3Months') {
            newStart = new Date(today.getFullYear(), today.getMonth() - 2, 1).toISOString().split('T')[0];
            newEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]; // End of this month
        } else if (value === 'ytd') {
            newStart = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
            newEnd = today.toISOString().split('T')[0];
        }

        setStartDate(newStart);
        setEndDate(newEnd);
    };

    const handleViewPayslip = async (period: PayrollPeriod) => {
        setSelectedPeriod(period);
        setLoadingDetails(true);
        setPayslipDetails(null);
        setError('');

        // CRITICAL SECURITY CHECK: Ensure user ID exists
        if (!user?.id || !user?.organizationId) {
            setError('Unable to load payslip. Please log out and log in again.');
            setLoadingDetails(false);
            return;
        }

        try {
            // SECURE APPROACH: Use getEntryForEmployee to fetch ONLY the logged-in employee's entry
            const myEntry = await payrollService.getEntryForEmployee(
                user.organizationId,
                period.id!,
                user.id // This is the logged-in employee's ID
            );

            if (myEntry) {
                setPayslipDetails(myEntry);
            } else {
                setError('Payslip data not found for this period.');
            }
        } catch (err) {
            console.error('Error loading payslip details:', err);
            setError('Failed to load payslip details.');
        } finally {
            setLoadingDetails(false);
        }
    };

    const closeDetail = () => {
        setSelectedPeriod(null);
        setPayslipDetails(null);
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="animate-spin w-8 h-8 border-4 border-[#0f766e] border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900">My Pay History</h2>
                <p className="text-slate-500">Filter by a date range, but results are shown as finalized payroll snapshots (per pay period).</p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8 shadow-sm">
                <div className="mb-4">
                    <p className="text-sm text-slate-600">
                        Filter by a date range, but results are shown as finalized payroll snapshots (per pay period). This mirrors payroll export logic — no auto-aggregation across months.
                    </p>
                </div>
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div>
                        <DateInput
                            label="From"
                            value={startDate}
                            onChange={(value) => {
                                setStartDate(value);
                                setQuickSelect('custom');
                            }}
                            className="w-full md:w-40"
                        />
                    </div>
                    <div>
                        <DateInput
                            label="To"
                            value={endDate}
                            onChange={(value) => {
                                setEndDate(value);
                                setQuickSelect('custom');
                            }}
                            className="w-full md:w-40"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Quick Select</label>
                        <select
                            value={quickSelect}
                            onChange={(e) => handleQuickSelect(e.target.value)}
                            className="w-full md:w-40 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0f766e] focus:border-[#0f766e]"
                        >
                            <option value="custom">Custom range</option>
                            <option value="thisMonth">This Month</option>
                            <option value="lastMonth">Last Month</option>
                            <option value="last3Months">Last 3 Months</option>
                            <option value="ytd">Year to Date</option>
                        </select>
                    </div>
                    <button
                        onClick={() => handleQuickSelect('thisMonth')}
                        className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                        Reset
                    </button>
                </div>


            </div>

            {/* Payslip List */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">Finalized Pay Periods in Range</h3>
                    <span className="text-xs font-bold text-amber-700 flex items-center gap-1">
                        🔒 Read-only snapshots
                    </span>
                </div>

                {filteredPeriods.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="text-4xl mb-4">📭</div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">No Pay History Found</h3>
                        <p className="text-slate-500">No finalized payroll periods found for your account in this date range.</p>
                        <p className="text-xs text-slate-400 mt-2">If you believe this is an error, please contact your administrator.</p>

                        {/* Debug info for troubleshooting */}
                        {debugInfo && (
                            <div className="mt-6 p-4 bg-slate-100 rounded-lg text-left text-xs font-mono border border-slate-200">
                                <p className="font-bold text-slate-700 mb-2">🔍 Debug Info (for admin troubleshooting):</p>
                                <ul className="space-y-1 text-slate-600">
                                    <li><span className="text-slate-500">User ID:</span> {debugInfo.userId}</li>
                                    <li><span className="text-slate-500">Email:</span> {debugInfo.userEmail}</li>
                                    <li><span className="text-slate-500">Org ID:</span> {debugInfo.orgId}</li>
                                    <li><span className="text-slate-500">Total entries found:</span> <span className={debugInfo.totalEntriesFound === 0 ? 'text-red-600 font-bold' : ''}>{debugInfo.totalEntriesFound}</span></li>
                                    <li><span className="text-slate-500">Hidden (not finalized):</span> {debugInfo.hiddenByFinalization}</li>
                                    <li><span className="text-slate-500">Hidden ({"<"}1h since finalize):</span> {debugInfo.hiddenByTimeDelay}</li>
                                    <li><span className="text-slate-500">Visible periods:</span> {debugInfo.visiblePeriodsCount}</li>
                                </ul>
                                {debugInfo.totalEntriesFound === 0 && (
                                    <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-amber-700">
                                        ⚠️ No payroll entries exist for this user ID. Check if:
                                        <ol className="list-decimal ml-4 mt-1">
                                            <li>Payroll has been generated for this employee</li>
                                            <li>The staffId in payroll entries matches this user ID</li>
                                        </ol>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="border-b border-slate-200">
                                <tr>
                                    <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase">Pay Period</th>
                                    <th className="text-center px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                                    <th className="text-right px-6 py-4 text-xs font-bold text-slate-500 uppercase">Gross</th>
                                    <th className="text-right px-6 py-4 text-xs font-bold text-slate-500 uppercase">Deductions</th>
                                    <th className="text-right px-6 py-4 text-xs font-bold text-slate-500 uppercase">Net</th>
                                    <th className="text-right px-6 py-4 text-xs font-bold text-slate-500 uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredPeriods.map((period) => (
                                    <PayHistoryRow key={period.id} period={period} user={user} onView={() => handleViewPayslip(period)} />
                                ))}
                            </tbody>
                        </table>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
                            <p className="text-xs text-slate-500 font-medium">
                                Tip: Click View breakdown to open a single pay period snapshot (exactly what the export used).
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Disclaimer */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="inline-block bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1 rounded-full mb-3">
                    Required disclaimer
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                    HURE Core prepares and validates payroll calculations. Payments and statutory remittances are handled externally. Figures shown represent payroll history, not payment execution.
                </p>
            </div>

            {/* Payslip Detail Modal */}
            {selectedPeriod && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-200 flex justify-between items-center z-10">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">Payslip Details</h3>
                                <p className="text-sm text-slate-500">{selectedPeriod.name}</p>
                            </div>
                            <button
                                onClick={closeDetail}
                                className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-6">
                            {loadingDetails ? (
                                <div className="flex justify-center py-12">
                                    <div className="animate-spin w-8 h-8 border-4 border-[#0f766e] border-t-transparent rounded-full"></div>
                                </div>
                            ) : error ? (
                                <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200">
                                    {error}
                                </div>
                            ) : payslipDetails ? (
                                <div className="space-y-6">
                                    {/* Summary Header */}
                                    <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                        <div>
                                            <div className="text-xs font-semibold text-slate-500 uppercase">Gross Pay</div>
                                            <div className="text-lg font-bold text-slate-900">{formatCurrency(payslipDetails.grossPayCents)}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs font-semibold text-slate-500 uppercase">Deductions</div>
                                            <div className="text-lg font-bold text-red-600">-{formatCurrency(payslipDetails.deductionsTotalCents)}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs font-semibold text-slate-500 uppercase">Net Pay</div>
                                            <div className="text-lg font-bold text-[#0f766e]">{formatCurrency(payslipDetails.netPayCents)}</div>
                                        </div>
                                    </div>

                                    {/* Detailed Breakdown */}
                                    <div className="space-y-6">
                                        {/* Earnings */}
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3 border-b border-slate-200 pb-2">Earnings</h4>
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-slate-600">Basic Pay</span>
                                                    <span className="font-medium text-slate-900">{formatCurrency(payslipDetails.payableBaseCents)}</span>
                                                </div>
                                                {/* Add allowances here if exist */}
                                                {payslipDetails.allowancesTotalCents > 0 && (
                                                    <div className="flex justify-between items-center text-sm">
                                                        <span className="text-slate-600">Allowances (Total)</span>
                                                        <span className="font-medium text-slate-900">{formatCurrency(payslipDetails.allowancesTotalCents)}</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-100 font-bold">
                                                    <span className="text-slate-800">Total Gross Pay</span>
                                                    <span className="text-slate-900">{formatCurrency(payslipDetails.grossPayCents)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Deductions */}
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3 border-b border-slate-200 pb-2">Deductions</h4>
                                            <div className="space-y-2">
                                                {payslipDetails.deductionDetails?.payeCents > 0 && (
                                                    <div className="flex justify-between items-center text-sm">
                                                        <span className="text-slate-600">PAYE (Tax)</span>
                                                        <span className="font-medium text-slate-900">-{formatCurrency(payslipDetails.deductionDetails.payeCents)}</span>
                                                    </div>
                                                )}
                                                {payslipDetails.deductionDetails?.nssfCents > 0 && (
                                                    <div className="flex justify-between items-center text-sm">
                                                        <span className="text-slate-600">NSSF</span>
                                                        <span className="font-medium text-slate-900">-{formatCurrency(payslipDetails.deductionDetails.nssfCents)}</span>
                                                    </div>
                                                )}
                                                {payslipDetails.deductionDetails?.shifCents > 0 && (
                                                    <div className="flex justify-between items-center text-sm">
                                                        <span className="text-slate-600">SHIF</span>
                                                        <span className="font-medium text-slate-900">-{formatCurrency(payslipDetails.deductionDetails.shifCents)}</span>
                                                    </div>
                                                )}
                                                {payslipDetails.deductionDetails?.housingLevyCents > 0 && (
                                                    <div className="flex justify-between items-center text-sm">
                                                        <span className="text-slate-600">Housing Levy</span>
                                                        <span className="font-medium text-slate-900">-{formatCurrency(payslipDetails.deductionDetails.housingLevyCents)}</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-100 font-bold">
                                                    <span className="text-slate-800">Total Deductions</span>
                                                    <span className="text-red-600">-{formatCurrency(payslipDetails.deductionsTotalCents)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Net Pay Highlight */}
                                    <div className="mt-8 bg-[#f0fdf4] border border-green-200 rounded-xl p-4 flex justify-between items-center">
                                        <span className="text-green-800 font-bold uppercase tracking-wide">Net Pay</span>
                                        <span className="text-2xl font-bold text-green-700">{formatCurrency(payslipDetails.netPayCents)}</span>
                                    </div>

                                </div>
                            ) : (
                                <div className="text-center text-slate-500 py-8">
                                    No data available.
                                </div>
                            )}
                        </div>
                        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end">
                            <button
                                onClick={closeDetail}
                                className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-white transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyPayslips;
