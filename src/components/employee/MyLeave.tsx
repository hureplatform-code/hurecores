import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { leaveService } from '../../lib/services';
import type { LeaveRequest, LeaveType, LeaveBalance, LeaveStatus } from '../../types';

const MyLeave: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState<LeaveRequest[]>([]);
    const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
    const [balances, setBalances] = useState<LeaveBalance[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        leaveTypeId: '',
        startDate: '',
        endDate: '',
        reason: ''
    });

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user?.organizationId, user?.id]);

    const loadData = async () => {
        setLoading(true);
        if (!user?.organizationId || !user?.id) {
            setLoading(false);
            return;
        }

        try {
            const [requestsData, typesData, balancesData] = await Promise.all([
                leaveService.getMyLeaveRequests(user.organizationId, user.id),
                leaveService.getLeaveTypes(user.organizationId),
                leaveService.getMyBalances(user.organizationId, user.id)
            ]);
            setRequests(requestsData);
            setLeaveTypes(typesData);
            setBalances(balancesData);

            // Default to first leave type if available and not yet set
            if (typesData.length > 0 && !formData.leaveTypeId) {
                setFormData(prev => ({ ...prev, leaveTypeId: typesData[0].id }));
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
        setSubmitting(true);

        try {
            const result = await leaveService.submitRequest(user.organizationId, {
                staffId: user.id,
                leaveTypeId: formData.leaveTypeId,
                startDate: formData.startDate,
                endDate: formData.endDate,
                reason: formData.reason
            });

            if (result.success) {
                setFormData({ leaveTypeId: leaveTypes[0]?.id || '', startDate: '', endDate: '', reason: '' });
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

    const handleCancel = async (requestId: string) => {
        if (!user?.organizationId) return;
        if (!confirm('Cancel this leave request?')) return;

        try {
            await leaveService.cancelRequest(user.organizationId, requestId);
            loadData();
        } catch (error) {
            console.error('Error cancelling request:', error);
        }
    };

    const getStatusBadge = (status: LeaveStatus) => {
        const styles: Record<LeaveStatus, string> = {
            'Approved': 'bg-emerald-100 text-emerald-700 border-emerald-200',
            'Pending': 'bg-amber-100 text-amber-700 border-amber-200',
            'Rejected': 'bg-rose-100 text-rose-700 border-rose-200',
            'Cancelled': 'bg-slate-100 text-slate-600 border-slate-200'
        };
        return (
            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase border ${styles[status]}`}>
                {status}
            </span>
        );
    };

    // Get primary balance (Annual Leave) for display
    const primaryBalance = balances.find(b => b.leaveType?.name?.toLowerCase().includes('annual')) || balances[0];

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto flex flex-col animate-in fade-in duration-500">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900">My Leave</h2>
                <p className="text-slate-500">View balance and submit time-off requests.</p>
            </div>

            {!user?.organizationId && (
                <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-amber-800">
                    <span className="text-xl">⚠️</span>
                    <div>
                        <p className="font-bold text-sm">Account Verification Needed</p>
                        <p className="text-xs opacity-90">Your account needs to be verified by an admin to submit leave requests.</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Sidebar Stats & Form */}
                <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-500 delay-100">
                    {/* Balance Card */}
                    {primaryBalance ? (
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden group">
                            <div className="relative z-10 transition-transform duration-300 group-hover:scale-[1.02]">
                                <h3 className="text-lg font-bold opacity-90 mb-1">{primaryBalance.leaveType?.name || 'Annual Leave'} Balance</h3>
                                <div className="text-5xl font-bold mb-4 tracking-tight">
                                    {primaryBalance.remaining} <span className="text-xl font-normal opacity-70">days</span>
                                </div>
                                <div className="w-full bg-white/20 h-2.5 rounded-full mb-3 backdrop-blur-sm">
                                    <div
                                        className="bg-white h-2.5 rounded-full shadow-lg transition-all duration-1000"
                                        style={{ width: `${Math.min(100, (primaryBalance.remaining / (primaryBalance.allocated || 1)) * 100)}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between text-xs font-bold uppercase tracking-wide opacity-80">
                                    <span>Used: {primaryBalance.used}</span>
                                    <span>Total: {primaryBalance.allocated}</span>
                                </div>
                            </div>
                            {/* Decorative circles */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-400 opacity-20 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl"></div>
                        </div>
                    ) : (
                        <div className="bg-slate-100 rounded-[2rem] p-8 text-slate-500 text-center border border-slate-200">
                            <p className="font-bold">No Leave Balance Found</p>
                            <p className="text-xs mt-1">Contact HR to assign leave types.</p>
                        </div>
                    )}

                    {/* All Balances */}
                    {balances.length > 1 && (
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-900 mb-4 px-2">Other Balances</h3>
                            <div className="space-y-3">
                                {balances.filter(b => b.id !== primaryBalance?.id).map((balance) => (
                                    <div key={balance.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <span className="font-bold text-slate-700 text-sm">{balance.leaveType?.name}</span>
                                        <div className="text-right">
                                            <div className="font-bold text-slate-900">{balance.remaining} days</div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase">Remaining</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Request Form */}
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                        <h3 className="text-lg font-bold text-slate-900 mb-6 px-2 pt-2">📅 Request Time Off</h3>

                        {error && (
                            <div className="bg-rose-50 border border-rose-100 text-rose-700 px-4 py-3 rounded-xl mb-4 text-sm font-medium">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 ml-1">Leave Type</label>
                                <select
                                    value={formData.leaveTypeId}
                                    onChange={(e) => setFormData({ ...formData, leaveTypeId: e.target.value })}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-slate-50 focus:bg-white"
                                    required
                                    disabled={!user?.organizationId}
                                >
                                    <option value="" disabled>Select type...</option>
                                    {leaveTypes.map((type) => (
                                        <option key={type.id} value={type.id}>{type.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 ml-1">Start Date</label>
                                    <input
                                        type="date"
                                        required
                                        min={new Date().toISOString().split('T')[0]}
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-slate-50 focus:bg-white text-sm"
                                        disabled={!user?.organizationId}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 ml-1">End Date</label>
                                    <input
                                        type="date"
                                        required
                                        min={formData.startDate || new Date().toISOString().split('T')[0]}
                                        value={formData.endDate}
                                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-slate-50 focus:bg-white text-sm"
                                        disabled={!user?.organizationId}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 ml-1">Reason</label>
                                <textarea
                                    rows={3}
                                    required
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none resize-none transition-all bg-slate-50 focus:bg-white"
                                    placeholder="Brief description..."
                                    disabled={!user?.organizationId}
                                ></textarea>
                            </div>
                            <button
                                type="submit"
                                disabled={submitting || !user?.organizationId}
                                className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:transform-none disabled:shadow-none"
                            >
                                {submitting ? 'Submitting...' : 'Submit Request'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* History Table */}
                <div className="lg:col-span-2 animate-in slide-in-from-bottom-8 duration-500 delay-200">
                    <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden h-full flex flex-col">
                        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-xl font-bold text-slate-900">Request History</h3>
                            <button onClick={() => loadData()} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors">
                                🔄
                            </button>
                        </div>
                        <div className="overflow-x-auto flex-1">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-5">Status</th>
                                        <th className="px-6 py-5">Type</th>
                                        <th className="px-6 py-5">Duration</th>
                                        <th className="px-6 py-5">Dates</th>
                                        <th className="px-6 py-5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {requests.length > 0 ? requests.map((req) => (
                                        <tr key={req.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4">
                                                {getStatusBadge(req.status)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-900">{req.leaveType?.name || 'Leave'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-mono text-slate-600 font-bold">{req.daysRequested}</span> <span className="text-xs text-slate-400">days</span>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-slate-500">
                                                <div className="flex items-center gap-2">
                                                    <span>{new Date(req.startDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                                                    <span className="text-slate-300">→</span>
                                                    <span>{new Date(req.endDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {req.status === 'Pending' && (
                                                    <button
                                                        onClick={() => handleCancel(req.id)}
                                                        className="text-white bg-rose-500 hover:bg-rose-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm hover:shadow"
                                                    >
                                                        Cancel
                                                    </button>
                                                )}
                                                {req.status === 'Rejected' && req.rejectionReason && (
                                                    <span className="text-xs font-bold text-rose-600 border border-rose-200 bg-rose-50 px-2 py-1 rounded cursor-help" title={req.rejectionReason}>
                                                        View Reason
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={5} className="p-16 text-center">
                                                <div className="text-4xl mb-4 opacity-20">🏖️</div>
                                                <h4 className="font-bold text-slate-900 text-lg mb-1">No Leave Requests</h4>
                                                <p className="text-slate-500 text-sm">You haven't submitted any time off requests yet.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MyLeave;
