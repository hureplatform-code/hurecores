import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { leaveService, staffService } from '../../lib/services';
import type { LeaveRequest, LeaveType, LeaveStatus, Profile } from '../../types';

const LeaveManager: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState<LeaveRequest[]>([]);
    const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
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
            const [requestsData, typesData, staffData] = await Promise.all([
                leaveService.getLeaveRequests(user.organizationId, filter !== 'all' ? { status: filter as LeaveStatus } : undefined),
                leaveService.getLeaveTypes(user.organizationId),
                staffService.getAll(user.organizationId)
            ]);
            setRequests(requestsData);
            setLeaveTypes(typesData);
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

    const openApproveModal = (request: LeaveRequest) => {
        setSelectedRequest(request);
        setShowApproveModal(true);
    };

    const openRejectModal = (request: LeaveRequest) => {
        setSelectedRequest(request);
        setShowRejectModal(true);
    };

    const pendingCount = requests.filter(r => r.status === 'Pending').length;
    const approvedCount = requests.filter(r => r.status === 'Approved').length;
    const rejectedCount = requests.filter(r => r.status === 'Rejected').length;
    const totalStaffOnLeave = requests.filter(r => {
        if (r.status !== 'Approved') return false;
        const today = new Date().toISOString().split('T')[0];
        return today >= r.startDate && today <= r.endDate;
    }).length;

    if (loading && requests.length === 0) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Leave Management</h2>
                    <p className="text-slate-500 mt-1">
                        {pendingCount > 0 ? `${pendingCount} pending request${pendingCount > 1 ? 's' : ''} require attention` : 'All requests processed'}
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                    <div className="text-3xl font-bold text-amber-600">{pendingCount}</div>
                    <div className="text-sm font-medium text-amber-700">Pending Requests</div>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
                    <div className="text-3xl font-bold text-emerald-600">{approvedCount}</div>
                    <div className="text-sm font-medium text-emerald-700">Approved</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
                    <div className="text-3xl font-bold text-red-600">{rejectedCount}</div>
                    <div className="text-sm font-medium text-red-700">Rejected</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
                    <div className="text-3xl font-bold text-blue-600">{totalStaffOnLeave}</div>
                    <div className="text-sm font-medium text-blue-700">On Leave Today</div>
                </div>
            </div>

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
                                        {request.startDate} → {request.endDate}
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
                                            <strong>Comment:</strong> {request.approvalComment}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col items-end space-y-3">
                                {getStatusBadge(request.status)}

                                {request.status === 'Pending' && (
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => openApproveModal(request)}
                                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
                                        >
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => openRejectModal(request)}
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

            {/* Approve Modal with Comment */}
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
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Comment (Optional)
                            </label>
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

            {/* Reject Modal with Reason */}
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

export default LeaveManager;
