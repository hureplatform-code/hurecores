import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { leaveService, staffService } from '../../lib/services';
import type { LeaveRequest, LeaveType, LeaveStatus, Profile } from '../../types';

const ManagerLeave: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState<LeaveRequest[]>([]);
    const [staff, setStaff] = useState<Profile[]>([]);
    const [filter, setFilter] = useState<'all' | LeaveStatus>('Pending');
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
    const [approvalComment, setApprovalComment] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');

    useEffect(() => {
        loadData();
    }, [user?.organizationId, filter]);

    const loadData = async () => {
        if (!user?.organizationId) return;

        setLoading(true);
        try {
            const [requestsData, staffData] = await Promise.all([
                leaveService.getLeaveRequests(user.organizationId, filter !== 'all' ? { status: filter as LeaveStatus } : undefined),
                staffService.getAll(user.organizationId)
            ]);
            setRequests(requestsData);
            setStaff(staffData);
        } catch (error) {
            console.error('Error loading leave data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: LeaveStatus) => {
        const styles: Record<LeaveStatus, string> = {
            'Pending': 'bg-amber-100 text-amber-700',
            'Approved': 'bg-emerald-100 text-emerald-700',
            'Rejected': 'bg-red-100 text-red-700',
            'Cancelled': 'bg-slate-100 text-slate-600'
        };
        return (
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${styles[status]}`}>
                {status}
            </span>
        );
    };

    const handleApprove = async () => {
        if (!selectedRequest || !user?.organizationId) return;

        const result = await leaveService.approveRequest(user.organizationId, selectedRequest.id, approvalComment);
        if (result.success) {
            setShowApproveModal(false);
            setSelectedRequest(null);
            setApprovalComment('');
            loadData();
        } else {
            alert(result.error);
        }
    };

    const handleReject = async () => {
        if (!selectedRequest || !user?.organizationId) return;

        if (!rejectionReason.trim()) {
            alert('Please provide a reason for rejection');
            return;
        }

        const result = await leaveService.rejectRequest(user.organizationId, selectedRequest.id, rejectionReason);
        if (result.success) {
            setShowRejectModal(false);
            setSelectedRequest(null);
            setRejectionReason('');
            loadData();
        } else {
            alert(result.error);
        }
    };

    const pendingCount = requests.filter(r => r.status === 'Pending').length;
    const approvedCount = requests.filter(r => r.status === 'Approved').length;
    const onLeaveToday = requests.filter(r => {
        if (r.status !== 'Approved') return false;
        const today = new Date().toISOString().split('T')[0];
        return today >= r.startDate && today <= r.endDate;
    });

    if (loading && requests.length === 0) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900">Team Leave</h2>
                <p className="text-slate-500 mt-1">Manage and review leave requests from your team</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                    <div className="text-3xl font-bold text-amber-600">{pendingCount}</div>
                    <div className="text-sm font-medium text-amber-700">Pending Review</div>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
                    <div className="text-3xl font-bold text-emerald-600">{approvedCount}</div>
                    <div className="text-sm font-medium text-emerald-700">Total Approved</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
                    <div className="text-3xl font-bold text-blue-600">{onLeaveToday.length}</div>
                    <div className="text-sm font-medium text-blue-700">On Leave Today</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                    <div className="text-3xl font-bold text-slate-600">{staff.filter(s => s.staffStatus === 'Active').length}</div>
                    <div className="text-sm font-medium text-slate-700">Total Team</div>
                </div>
            </div>

            {/* Staff on Leave Today */}
            {onLeaveToday.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-6">
                    <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                        <span>🏖️</span> Currently On Leave
                    </h3>
                    <div className="flex flex-wrap gap-3">
                        {onLeaveToday.map(r => (
                            <div key={r.id} className="bg-white px-4 py-2 rounded-xl border border-blue-200 flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                                    {r.staff?.fullName?.charAt(0) || '?'}
                                </div>
                                <div>
                                    <div className="font-medium text-slate-900 text-sm">{r.staff?.fullName}</div>
                                    <div className="text-xs text-slate-500">Until {r.endDate}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Filter Tabs */}
            <div className="flex space-x-2 mb-6">
                {(['Pending', 'Approved', 'Rejected', 'all'] as const).map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`px-4 py-2 rounded-xl font-medium transition-colors ${filter === status
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        {status === 'all' ? 'All' : status}
                        {status === 'Pending' && pendingCount > 0 && (
                            <span className="ml-2 bg-white text-blue-600 px-2 py-0.5 rounded-full text-xs font-bold">
                                {pendingCount}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Leave Requests */}
            <div className="space-y-4">
                {requests.map((request) => (
                    <div key={request.id} className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                            <div className="flex items-start space-x-4">
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg">
                                    {request.staff?.fullName?.charAt(0) || '?'}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900">{request.staff?.fullName || 'Unknown Staff'}</h3>
                                    <p className="text-sm text-slate-500">{request.staff?.jobTitle || 'Staff'}</p>
                                    <div className="mt-2 flex items-center space-x-4 text-sm">
                                        <span className="font-medium text-slate-700">{request.leaveType?.name || 'Leave'}</span>
                                        <span className="text-slate-400">•</span>
                                        <span className="text-slate-600">{request.daysRequested} day{request.daysRequested > 1 ? 's' : ''}</span>
                                    </div>
                                    <div className="mt-1 text-sm text-slate-500">
                                        {new Date(request.startDate).toLocaleDateString()} → {new Date(request.endDate).toLocaleDateString()}
                                    </div>
                                    {request.reason && (
                                        <p className="mt-2 text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                                            <strong>Reason:</strong> {request.reason}
                                        </p>
                                    )}
                                    {request.rejectionReason && (
                                        <p className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                                            <strong>Rejected:</strong> {request.rejectionReason}
                                        </p>
                                    )}
                                    {request.approvalComment && (
                                        <p className="mt-2 text-sm text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">
                                            <strong>Approved:</strong> {request.approvalComment}
                                        </p>
                                    )}
                                    {request.reviewedAt && (
                                        <p className="mt-2 text-xs text-slate-400">
                                            Reviewed on {new Date(request.reviewedAt).toLocaleDateString()}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col items-end space-y-3">
                                {getStatusBadge(request.status)}

                                {request.status === 'Pending' && (user?.permissions?.leave || user?.systemRole === 'OWNER') && (
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => { setSelectedRequest(request); setShowApproveModal(true); }}
                                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
                                        >
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => { setSelectedRequest(request); setShowRejectModal(true); }}
                                            className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
                                        >
                                            Reject
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {requests.length === 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                        <div className="text-4xl mb-4">📅</div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">No leave requests</h3>
                        <p className="text-slate-500">
                            {filter === 'Pending'
                                ? 'No pending leave requests to review'
                                : `No ${filter === 'all' ? '' : filter.toLowerCase()} leave requests found`
                            }
                        </p>
                    </div>
                )}
            </div>

            {/* Approve Modal */}
            {showApproveModal && selectedRequest && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 m-4">
                        <h2 className="text-xl font-bold text-slate-900 mb-4">Approve Leave Request</h2>
                        <div className="bg-slate-50 rounded-xl p-4 mb-4">
                            <p className="font-medium text-slate-900">{selectedRequest.staff?.fullName}</p>
                            <p className="text-sm text-slate-500">
                                {selectedRequest.leaveType?.name} • {selectedRequest.daysRequested} days
                            </p>
                            <p className="text-sm text-slate-500">
                                {selectedRequest.startDate} → {selectedRequest.endDate}
                            </p>
                        </div>
                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Comment (Optional)</label>
                            <textarea
                                value={approvalComment}
                                onChange={(e) => setApprovalComment(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl resize-none"
                                rows={3}
                                placeholder="Add a comment for the staff member..."
                            />
                        </div>
                        <div className="flex space-x-3">
                            <button
                                onClick={() => { setShowApproveModal(false); setSelectedRequest(null); setApprovalComment(''); }}
                                className="flex-1 py-3 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleApprove}
                                className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700"
                            >
                                Approve Leave
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && selectedRequest && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 m-4">
                        <h2 className="text-xl font-bold text-slate-900 mb-4">Reject Leave Request</h2>
                        <div className="bg-slate-50 rounded-xl p-4 mb-4">
                            <p className="font-medium text-slate-900">{selectedRequest.staff?.fullName}</p>
                            <p className="text-sm text-slate-500">
                                {selectedRequest.leaveType?.name} • {selectedRequest.daysRequested} days
                            </p>
                        </div>
                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Reason for Rejection <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl resize-none"
                                rows={3}
                                placeholder="Please provide a reason for rejecting this request..."
                                required
                            />
                        </div>
                        <div className="flex space-x-3">
                            <button
                                onClick={() => { setShowRejectModal(false); setSelectedRequest(null); setRejectionReason(''); }}
                                className="flex-1 py-3 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReject}
                                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700"
                            >
                                Reject Leave
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManagerLeave;
