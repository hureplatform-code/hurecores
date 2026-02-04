import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { leaveService, leaveEntitlementService } from '../../lib/services';
import type { LeaveRequest, LeaveEntitlement, LeaveStatus } from '../../types';
import DateInput from '../common/DateInput';
import { formatDateKE } from '../../lib/utils/dateFormat';

const MyLeave: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState<LeaveRequest[]>([]);
    const [entitlements, setEntitlements] = useState<any[]>([]); // Using any[] to handle computed properties flexibly
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        leaveTypeId: '',
        startDate: '',
        endDate: '',
        reason: ''
    });

    const [calculatedDays, setCalculatedDays] = useState(0);

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user?.organizationId, user?.id]);

    // Auto-calculate days when dates change
    useEffect(() => {
        if (formData.startDate && formData.endDate) {
            const start = new Date(formData.startDate);
            const end = new Date(formData.endDate);
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end
            setCalculatedDays(diffDays);
        } else {
            setCalculatedDays(0);
        }
    }, [formData.startDate, formData.endDate]);

    const loadData = async () => {
        setLoading(true);
        if (!user?.organizationId || !user?.id) {
            setLoading(false);
            return;
        }

        try {
            // Fetch requests
            const requestsData = await leaveService.getMyLeaveRequests(user.organizationId, user.id);
            setRequests(requestsData);

            // Fetch balances/entitlements
            let balances = await leaveService.getStaffBalances(user.organizationId, user.id);

            // Self-healing: If no balances, try to initialize from defaults
            if (balances.length === 0) {
                const leaveTypes = await leaveService.getLeaveTypes(user.organizationId);
                if (leaveTypes.length > 0) {
                    // Organization has policies, but staff has no balances. Initialize them.
                    await leaveEntitlementService.initializeStaffEntitlements(user.organizationId, user.id);
                    // Re-fetch
                    balances = await leaveService.getStaffBalances(user.organizationId, user.id);
                }
            }

            // Map to expected structure for UI (renaming fields if necessary)
            // Filter out orphaned entitlements (where leave type was deleted)
            const mappedEntitlements = balances
                .filter(b => b.leaveType && b.leaveType.name) // Only include entitlements with valid leave types
                .map(b => ({
                    ...b,
                    leaveTypeName: b.leaveType?.name || 'Unknown',
                    // leaveService returns 'allocated' and 'remaining', so no extra math needed
                }));

            setEntitlements(mappedEntitlements);

            // Default to first active AND ELIGIBLE entitlement if available
            const eligibleEntitlements = mappedEntitlements.filter(ent =>
                ent.leaveType?.appliesToAll ||
                (user?.jobTitle && ent.leaveType?.appliesToRoles?.includes(user.jobTitle))
            );

            if (eligibleEntitlements.length > 0 && !formData.leaveTypeId) {
                setFormData(prev => ({ ...prev, leaveTypeId: eligibleEntitlements[0].leaveTypeId }));
            }
        } catch (error) {
            console.error('Error loading leave data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.organizationId || !user?.id) return;

        setError('');

        // Validation
        if (!formData.leaveTypeId) {
            setError('Please select a leave type');
            return;
        }
        if (!formData.startDate || !formData.endDate) {
            setError('Please select start and end dates');
            return;
        }
        if (calculatedDays <= 0) {
            setError('End date must be after start date');
            return;
        }

        // Check balance
        const selectedEntitlement = entitlements.find(e => e.leaveTypeId === formData.leaveTypeId);
        if (selectedEntitlement && calculatedDays > selectedEntitlement.remaining) {
            setError(`Insufficient balance. You have ${selectedEntitlement.remaining} days remaining.`);
            return;
        }

        setSubmitting(true);

        try {
            const result = await leaveService.submitRequest(user.organizationId, {
                staffId: user.id,
                leaveTypeId: formData.leaveTypeId,
                startDate: formData.startDate,
                endDate: formData.endDate,
                reason: formData.reason,
                daysRequested: calculatedDays
            });

            if (result.success) {
                setFormData({ leaveTypeId: entitlements[0]?.leaveTypeId || '', startDate: '', endDate: '', reason: '' });
                loadData();
            } else {
                setError(result.error || 'Failed to submit request');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to submit request');
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusBadge = (status: LeaveStatus) => {
        const styles: Record<LeaveStatus, string> = {
            'Approved': 'bg-[#d1fae5] text-[#065f46] border-[#6ee7b7]',
            'Pending': 'bg-[#fef3c7] text-[#92400e] border-[#fcd34d]',
            'Rejected': 'bg-[#fee2e2] text-[#991b1b] border-[#fca5a5]',
            'Cancelled': 'bg-slate-100 text-slate-600 border-slate-200'
        };
        return (
            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase border ${styles[status]}`}>
                {status}
            </span>
        );
    };

    const getBalanceStatus = (remaining: number, allocated: number) => {
        if (allocated >= 999) return { color: 'bg-blue-50 text-blue-700 border-blue-200', status: 'Unlimited' };

        const percentage = (remaining / allocated) * 100;
        if (percentage > 50) return { color: 'bg-[#d1fae5] text-[#065f46] border-[#6ee7b7]', status: 'Good' };
        if (percentage > 20) return { color: 'bg-[#fef3c7] text-[#92400e] border-[#fcd34d]', status: 'Low' };
        return { color: 'bg-[#fee2e2] text-[#991b1b] border-[#fca5a5]', status: 'Critical' };
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
                <h2 className="text-2xl font-bold text-slate-900">My Leave</h2>
                <p className="text-slate-500">View balance and submit time-off requests.</p>
            </div>

            {/* Leave Balances Grid */}
            {entitlements.length > 0 ? (
                <div className="mb-8">
                    <h3 className="text-sm font-bold text-slate-600 uppercase mb-4">My Leave Balances</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {entitlements.map((ent) => {
                            const status = getBalanceStatus(ent.remaining, ent.allocated);
                            return (
                                <div key={ent.id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg transition-shadow">
                                    <div className="text-xs font-semibold text-slate-500 uppercase mb-2 truncate">
                                        {ent.leaveTypeName}
                                    </div>
                                    {ent.allocated >= 999 ? (
                                        <>
                                            <div className="text-xl font-bold text-slate-900 mb-1">
                                                Unlimited
                                            </div>
                                            <div className="text-xs text-slate-500 mb-2">
                                                Approval required
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-3xl font-bold text-slate-900 mb-1">
                                            {ent.remaining} <span className="text-sm font-normal text-slate-500">/ {ent.allocated} days</span>
                                        </div>
                                    )}
                                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${status.color} mt-2 border`}>
                                        {status.status}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="mb-8 p-6 bg-amber-50 border border-amber-200 rounded-2xl text-center">
                    <div className="text-4xl mb-3">📋</div>
                    <h3 className="text-lg font-bold text-amber-900 mb-2">No Leave Types Available</h3>
                    <p className="text-sm text-amber-700">Your organization hasn't set up leave entitlements yet. Contact HR to get started.</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Request Form */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-6">📝 Request Time Off</h3>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Leave Type *</label>
                            <select
                                value={formData.leaveTypeId}
                                onChange={(e) => setFormData(prev => ({ ...prev, leaveTypeId: e.target.value }))}
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0f766e] focus:border-[#0f766e]"
                                required
                                disabled={entitlements.length === 0}
                            >
                                <option value="">Select type...</option>
                                {entitlements
                                    .filter(ent =>
                                        ent.leaveType?.appliesToAll ||
                                        (user?.jobTitle && ent.leaveType?.appliesToRoles?.includes(user.jobTitle))
                                    )
                                    .map(ent => (
                                        <option key={ent.id} value={ent.leaveTypeId}>
                                            {ent.leaveTypeName}
                                        </option>
                                    ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <DateInput
                                    label="Start Date"
                                    required
                                    value={formData.startDate}
                                    onChange={(value) => setFormData(prev => ({ ...prev, startDate: value }))}
                                />
                            </div>
                            <div>
                                <DateInput
                                    label="End Date"
                                    required
                                    value={formData.endDate}
                                    onChange={(value) => setFormData(prev => ({ ...prev, endDate: value }))}
                                />
                            </div>
                        </div>

                        {calculatedDays > 0 && (
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                <div className="text-sm font-semibold text-blue-900">Total days requested:</div>
                                <div className="text-2xl font-bold text-blue-600">{calculatedDays} days</div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Reason</label>
                            <textarea
                                value={formData.reason}
                                onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0f766e] focus:border-[#0f766e] resize-none"
                                rows={3}
                                placeholder="Optional description..."
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submitting || entitlements.length === 0}
                            className="w-full bg-[#1e293b] text-white py-3 rounded-xl font-semibold hover:bg-[#0f172a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {submitting ? 'Submitting...' : 'Submit Request'}
                        </button>
                    </form>
                </div>

                {/* Request History */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-200">
                        <h3 className="text-lg font-bold text-slate-900">📋 Request History</h3>
                    </div>

                    {requests.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="text-4xl mb-4">📅</div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Leave Requests Yet</h3>
                            <p className="text-slate-500">Submit your first time-off request using the form.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
                                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Type</th>
                                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Duration</th>
                                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Dates</th>
                                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {requests.map((req) => (
                                        <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                {getStatusBadge(req.status)}
                                            </td>
                                            <td className="px-6 py-4 text-slate-900 font-medium">
                                                {req.leaveType?.name || 'Unknown'}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">
                                                {req.daysRequested || 0} days
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 text-sm">
                                                {formatDateKE(req.startDate)} - {formatDateKE(req.endDate)}
                                            </td>
                                            <td className="px-6 py-4">
                                                {req.status === 'Pending' && (
                                                    <button
                                                        onClick={() => {
                                                            if (confirm('Are you sure you want to withdraw this request?')) {
                                                                leaveService.cancelRequest(user!.organizationId!, req.id).then(() => loadData());
                                                            }
                                                        }}
                                                        className="text-amber-600 hover:text-amber-700 text-sm font-medium"
                                                    >
                                                        Withdraw
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MyLeave;
