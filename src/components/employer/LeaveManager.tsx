import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { leaveService, staffService, organizationService, scheduleService } from '../../lib/services';
import type { LeaveRequest, LeaveType, LeaveStatus, Profile, Location } from '../../types';
import { JOB_TITLES } from '../../types';
import DateInput from '../common/DateInput';
import { formatDateKE } from '../../lib/utils/dateFormat';

// Kenya Default Leave Types
const KENYA_DEFAULT_LEAVES = [
    { name: 'Annual Leave', daysAllowed: 21, isPaid: true, requiresApproval: true, requiresDocument: false, notes: 'Employment Act' },
    { name: 'Sick Leave - Paid', daysAllowed: 14, isPaid: true, requiresApproval: true, requiresDocument: true, notes: '7 full + 7 half (policy configurable)' },
    { name: 'Sick Leave - Unpaid', daysAllowed: 999, isPaid: false, requiresApproval: true, requiresDocument: true, notes: 'After paid sick leave exhausted' },
    { name: 'Maternity Leave', daysAllowed: 90, isPaid: true, requiresApproval: true, requiresDocument: true, notes: 'Female employees' },
    { name: 'Paternity Leave', daysAllowed: 14, isPaid: true, requiresApproval: true, requiresDocument: true, notes: 'Male employees' },
    { name: 'Compassionate Leave', daysAllowed: 5, isPaid: true, requiresApproval: true, requiresDocument: false, notes: 'Bereavement / family emergency' },
    { name: 'Study Leave', daysAllowed: 10, isPaid: true, requiresApproval: true, requiresDocument: true, notes: 'Employer-defined' },
    { name: 'Unpaid Leave', daysAllowed: 999, isPaid: false, requiresApproval: true, requiresDocument: false, notes: 'No balance limit' },
];

const LeaveManager: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState<LeaveRequest[]>([]);
    const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
    const [staff, setStaff] = useState<Profile[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);

    // Filters
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        locationId: '',
        leaveTypeId: '',
        staffId: '',
        role: '',
        status: '' as LeaveStatus | ''
    });

    // Modals
    const [activeTab, setActiveTab] = useState<'requests' | 'policies'>('requests');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showPolicyModal, setShowPolicyModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Create Request Form
    const [newRequest, setNewRequest] = useState({
        staffId: '',
        leaveTypeId: '',
        startDate: '',
        endDate: '',
        isHalfDay: false,
        halfDayType: 'AM' as 'AM' | 'PM',
        reason: ''
    });

    useEffect(() => {
        // Don't set default date filters - show ALL requests by default
        // This prevents long leave requests (spanning multiple months) from being filtered out
    }, []);

    useEffect(() => {
        if (user?.organizationId) loadData();
    }, [user?.organizationId, filters]);

    const loadData = async () => {
        if (!user?.organizationId) return;
        setLoading(true);
        try {
            const [requestsData, typesData, staffData, locationsData] = await Promise.all([
                leaveService.getLeaveRequests(user.organizationId, {
                    startDate: filters.startDate || undefined,
                    endDate: filters.endDate || undefined,
                    staffId: filters.staffId || undefined,
                    leaveTypeId: filters.leaveTypeId || undefined,
                    status: filters.status || undefined
                }),
                leaveService.getLeaveTypes(user.organizationId),
                staffService.getAll(user.organizationId),
                organizationService.getLocations(user.organizationId)
            ]);

            let filtered = requestsData;
            if (filters.role) {
                filtered = filtered.filter(r => r.staff?.jobTitle === filters.role);
            }
            if (filters.locationId) {
                filtered = filtered.filter(r => r.staff?.locationId === filters.locationId);
            }

            setRequests(filtered);
            setLeaveTypes(typesData);
            setStaff(staffData.filter(s => s.staffStatus === 'Active'));
            setLocations(locationsData);
        } catch (err) {
            console.error('Error loading leave data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.organizationId) return;
        setError('');

        try {
            const result = await leaveService.createRequest(user.organizationId, {
                staffId: newRequest.staffId,
                leaveTypeId: newRequest.leaveTypeId,
                startDate: newRequest.startDate,
                endDate: newRequest.endDate,
                reason: newRequest.reason
            });

            if (result.success) {
                setSuccess('Leave request created successfully');
                setShowCreateModal(false);
                setNewRequest({ staffId: '', leaveTypeId: '', startDate: '', endDate: '', isHalfDay: false, halfDayType: 'AM', reason: '' });
                loadData();
            } else {
                setError(result.error || 'Failed to create request');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to create request');
        }
    };

    const handleApprove = async (request: LeaveRequest) => {
        if (!user?.organizationId) return;
        try {
            const result = await leaveService.approveRequest(user.organizationId, request.id);
            if (result.success) {
                setSuccess('Leave request approved');
                loadData();
            } else {
                setError(result.error || 'Failed to approve');
            }
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleReject = async () => {
        if (!user?.organizationId || !selectedRequest || !rejectionReason.trim()) {
            setError('Rejection reason is required');
            return;
        }
        try {
            const result = await leaveService.rejectRequest(user.organizationId, selectedRequest.id, rejectionReason);
            if (result.success) {
                setSuccess('Leave request rejected');
                setShowRejectModal(false);
                setRejectionReason('');
                setSelectedRequest(null);
                loadData();
            } else {
                setError(result.error || 'Failed to reject');
            }
        } catch (err: any) {
            setError(err.message);
        }
    };

    const getStatusBadge = (status: LeaveStatus) => {
        const styles: Record<LeaveStatus, string> = {
            'Pending': 'bg-amber-100 text-amber-700',
            'Approved': 'bg-emerald-100 text-emerald-700',
            'Rejected': 'bg-red-100 text-red-700',
            'Cancelled': 'bg-slate-100 text-slate-600'
        };
        return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status]}`}>{status}</span>;
    };

    const getPayrollImpact = (request: LeaveRequest) => {
        const leaveType = leaveTypes.find(t => t.id === request.leaveTypeId);
        if (leaveType?.isPaid) {
            return <span className="text-xs text-emerald-600 font-medium">✓ Counts as PAID units</span>;
        }
        return <span className="text-xs text-red-600 font-medium">✗ Counts as UNPAID (reduces pay)</span>;
    };

    const pendingCount = requests.filter(r => r.status === 'Pending').length;

    if (loading && requests.length === 0) {
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
                    <h2 className="text-2xl font-bold text-slate-900">Leave Management</h2>
                    <p className="text-slate-500 mt-1">{requests.length} requests • {pendingCount} pending approval</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-blue-700"
                >
                    + Create Leave Request
                </button>
            </div>


            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex justify-between">
                    <span>{error}</span>
                    <button onClick={() => setError('')}>✕</button>
                </div>
            )}

            {success && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl mb-6 flex justify-between">
                    <span>✓ {success}</span>
                    <button onClick={() => setSuccess('')}>✕</button>
                </div>
            )}

            {/* Tabs */}
            <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl mb-6 w-fit">
                <button onClick={() => setActiveTab('requests')} className={`px-4 py-2 rounded-lg text-sm font-semibold ${activeTab === 'requests' ? 'bg-white shadow-sm' : 'text-slate-600'}`}>
                    Leave Requests
                </button>
                <button onClick={() => setActiveTab('policies')} className={`px-4 py-2 rounded-lg text-sm font-semibold ${activeTab === 'policies' ? 'bg-white shadow-sm' : 'text-slate-600'}`}>
                    Leave Policies
                </button>
            </div>

            {/* Navigation Helper - Only show in requests tab */}
            {/* Navigation Helper - Removed per request */}
            {/* {activeTab === 'requests' && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                    ...
                </div>
            )} */}

            {activeTab === 'requests' && (
                <>
                    {/* Filters */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                            <div>
                                <DateInput
                                    label="From Date"
                                    value={filters.startDate}
                                    onChange={(value) => setFilters(p => ({ ...p, startDate: value }))}
                                />
                            </div>
                            <div>
                                <DateInput
                                    label="To Date"
                                    value={filters.endDate}
                                    onChange={(value) => setFilters(p => ({ ...p, endDate: value }))}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Location</label>
                                <select value={filters.locationId} onChange={e => setFilters(p => ({ ...p, locationId: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                                    <option value="">All Locations</option>
                                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Leave Type</label>
                                <select value={filters.leaveTypeId} onChange={e => setFilters(p => ({ ...p, leaveTypeId: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                                    <option value="">All Types</option>
                                    {leaveTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Role</label>
                                <select value={filters.role} onChange={e => setFilters(p => ({ ...p, role: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                                    <option value="">All Roles</option>
                                    {JOB_TITLES.filter(j => j !== 'Other (custom)').map(j => <option key={j} value={j}>{j}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Employee</label>
                                <select value={filters.staffId} onChange={e => setFilters(p => ({ ...p, staffId: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                                    <option value="">All Employees</option>
                                    {staff.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Requests Table */}
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Employee</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Leave Type</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Dates</th>
                                    <th className="text-center px-6 py-4 text-sm font-semibold text-slate-600">Days</th>
                                    <th className="text-center px-6 py-4 text-sm font-semibold text-slate-600">Status</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Payroll Impact</th>
                                    <th className="text-center px-6 py-4 text-sm font-semibold text-slate-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {requests.map(req => (
                                    <tr key={req.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-900">{req.staff?.fullName || 'Unknown'}</div>
                                            <div className="text-sm text-slate-500">{req.staff?.jobTitle || ''}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${req.leaveType?.isPaid ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                                                {req.leaveType?.name || 'Unknown'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 text-sm">{formatDateKE(req.startDate)} → {formatDateKE(req.endDate)}</td>
                                        <td className="px-6 py-4 text-center font-medium">{req.daysRequested}</td>
                                        <td className="px-6 py-4 text-center">{getStatusBadge(req.status)}</td>
                                        <td className="px-6 py-4">{getPayrollImpact(req)}</td>
                                        <td className="px-6 py-4 text-center">
                                            {req.status === 'Pending' && (
                                                <div className="flex justify-center space-x-2">
                                                    <button onClick={() => handleApprove(req)} className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold hover:bg-emerald-200">Approve</button>
                                                    <button onClick={() => { setSelectedRequest(req); setShowRejectModal(true); }} className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-200">Reject</button>
                                                </div>
                                            )}
                                            {req.status !== 'Pending' && (
                                                <span className="text-xs text-slate-400">{req.reviewedBy ? `By ${req.reviewer?.fullName || 'Admin'}` : '-'}</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {requests.length === 0 && (
                            <div className="p-12 text-center">
                                <div className="text-4xl mb-4">📅</div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">No leave requests</h3>
                                <p className="text-slate-500">No requests match your filters</p>
                            </div>
                        )}
                    </div>
                </>
            )}

            {activeTab === 'policies' && (
                <LeavePoliciesTab leaveTypes={leaveTypes} onRefresh={loadData} />
            )}

            {/* Create Request Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 m-4">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">Create Leave Request</h2>
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <form onSubmit={handleCreateRequest} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Employee *</label>
                                <select required value={newRequest.staffId} onChange={e => setNewRequest(p => ({ ...p, staffId: e.target.value }))} className="w-full px-4 py-3 border border-slate-300 rounded-xl">
                                    <option value="">Select Employee</option>
                                    {staff.map(s => <option key={s.id} value={s.id}>{s.fullName} - {s.jobTitle}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Leave Type *</label>
                                <select required value={newRequest.leaveTypeId} onChange={e => setNewRequest(p => ({ ...p, leaveTypeId: e.target.value }))} className="w-full px-4 py-3 border border-slate-300 rounded-xl">
                                    <option value="">Select Leave Type</option>
                                    {leaveTypes.map(t => <option key={t.id} value={t.id}>{t.name} ({t.isPaid ? 'Paid' : 'Unpaid'})</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <DateInput
                                        label="Start Date"
                                        required
                                        value={newRequest.startDate}
                                        onChange={(value) => setNewRequest(p => ({ ...p, startDate: value }))}
                                    />
                                </div>
                                <div>
                                    <DateInput
                                        label="End Date"
                                        required
                                        value={newRequest.endDate}
                                        onChange={(value) => setNewRequest(p => ({ ...p, endDate: value }))}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="flex items-center space-x-2">
                                    <input type="checkbox" checked={newRequest.isHalfDay} onChange={e => setNewRequest(p => ({ ...p, isHalfDay: e.target.checked }))} className="w-4 h-4" />
                                    <span className="text-sm text-slate-700">Half Day</span>
                                </label>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Reason</label>
                                <textarea value={newRequest.reason} onChange={e => setNewRequest(p => ({ ...p, reason: e.target.value }))} className="w-full px-4 py-3 border border-slate-300 rounded-xl" rows={2} placeholder="Optional reason..." />
                            </div>
                            <div className="flex space-x-3 mt-6">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-3 border border-slate-300 rounded-xl font-semibold">Cancel</button>
                                <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700">Create Request</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && selectedRequest && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 m-4">
                        <h2 className="text-xl font-bold mb-4">Reject Leave Request</h2>
                        <p className="text-sm text-slate-600 mb-4">Rejecting {selectedRequest.staff?.fullName}'s request for {selectedRequest.daysRequested} days.</p>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Rejection Reason *</label>
                            <textarea required value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-xl" rows={3} placeholder="Reason for rejection..." />
                        </div>
                        <div className="flex space-x-3 mt-6">
                            <button onClick={() => { setShowRejectModal(false); setRejectionReason(''); }} className="flex-1 py-3 border border-slate-300 rounded-xl font-semibold">Cancel</button>
                            <button onClick={handleReject} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700">Reject</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Leave Policies Tab Component - Fully Editable
const LeavePoliciesTab: React.FC<{ leaveTypes: LeaveType[]; onRefresh: () => void }> = ({ leaveTypes, onRefresh }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingType, setEditingType] = useState<LeaveType | null>(null);
    const [formData, setFormData] = useState<Partial<LeaveType>>({
        name: '',
        daysAllowed: 21,
        isPaid: true,
        requiresApproval: true,
        requiresDocument: false,
        carryForwardAllowed: false,
        notes: ''
    });

    // Reset form when modal opens/closes
    useEffect(() => {
        if (!showModal) {
            setEditingType(null);
            setFormData({
                name: '',
                daysAllowed: 21,
                isPaid: true,
                requiresApproval: true,
                requiresDocument: false,
                carryForwardAllowed: false,
                notes: ''
            });
        } else if (editingType) {
            setFormData({ ...editingType });
        }
    }, [showModal, editingType]);

    const handleInitializeDefaults = async () => {
        if (!user?.organizationId) return;

        const confirmed = window.confirm(
            '📋 Initialize Default Leave Types\n\n' +
            'This will create 9 Kenya-standard leave types. Continue?'
        );

        if (!confirmed) return;

        setLoading(true);
        try {
            await leaveService.createDefaultLeaveTypes(user.organizationId);
            onRefresh();
        } catch (error) {
            console.error('Error creating default leave types:', error);
            alert('❌ Error creating leave types.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (typeId: string) => {
        if (!user?.organizationId || !confirm('Are you sure you want to delete this leave policy? This cannot be undone.')) return;

        try {
            await leaveService.deleteLeaveType(user.organizationId, typeId);
            onRefresh();
        } catch (error) {
            console.error('Error deleting leave type:', error);
            alert('Failed to delete leave type.');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.organizationId) return;

        setLoading(true);
        try {
            if (editingType) {
                // Update
                await leaveService.updateLeaveType(user.organizationId, editingType.id, formData);
            } else {
                // Create
                await leaveService.createLeaveType(user.organizationId, formData as any);
            }
            setShowModal(false);
            onRefresh();
        } catch (error) {
            console.error('Error saving leave type:', error);
            alert('Failed to save leave type.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-700 max-w-2xl">
                    <strong>Organization Leave Policies:</strong> Define the leave types available to your staff.
                    These defaults apply to all employees unless overridden individually.
                </p>
                <div className="flex space-x-3">
                    {leaveTypes.length === 0 && (
                        <button
                            onClick={handleInitializeDefaults}
                            disabled={loading}
                            className="text-sm text-blue-700 underline hover:text-blue-800 disabled:opacity-50"
                        >
                            Initialize Defaults
                        </button>
                    )}
                    <button
                        onClick={() => setShowModal(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors"
                    >
                        + Add Policy
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Leave Type</th>
                            <th className="text-center px-6 py-4 text-sm font-semibold text-slate-600">Days/Year</th>
                            <th className="text-center px-6 py-4 text-sm font-semibold text-slate-600">Paid</th>
                            <th className="text-center px-6 py-4 text-sm font-semibold text-slate-600">Approval</th>
                            <th className="text-center px-6 py-4 text-sm font-semibold text-slate-600">Document</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Notes</th>
                            <th className="text-center px-6 py-4 text-sm font-semibold text-slate-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {leaveTypes.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="text-center py-8 text-slate-500">No leave policies found. Add one to get started.</td>
                            </tr>
                        ) : (
                            leaveTypes.map(lt => (
                                <tr key={lt.id} className="hover:bg-slate-50 group">
                                    <td className="px-6 py-4 font-medium text-slate-900">{lt.name}</td>
                                    <td className="px-6 py-4 text-center">{lt.daysAllowed === 999 ? 'Unlimited' : lt.daysAllowed}</td>
                                    <td className="px-6 py-4 text-center">{lt.isPaid ? <span className="text-emerald-600">✓</span> : <span className="text-slate-300">-</span>}</td>
                                    <td className="px-6 py-4 text-center">{lt.requiresApproval ? <span className="text-blue-600">✓</span> : <span className="text-slate-300">-</span>}</td>
                                    <td className="px-6 py-4 text-center">{lt.requiresDocument ? <span className="text-amber-600">✓</span> : <span className="text-slate-300">-</span>}</td>
                                    <td className="px-6 py-4 text-sm text-slate-500 truncate max-w-xs">{lt.notes || '-'}</td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex justify-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => { setEditingType(lt); setShowModal(true); }}
                                                className="p-1 text-slate-500 hover:text-blue-600"
                                                title="Edit"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={() => handleDelete(lt.id)}
                                                className="p-1 text-slate-500 hover:text-red-600"
                                                title="Delete"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Config Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-lg p-6 m-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">{editingType ? 'Edit Policy' : 'New Leave Policy'}</h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Policy Name *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Days Allowed *</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                                        value={formData.daysAllowed}
                                        onChange={e => setFormData({ ...formData, daysAllowed: parseInt(e.target.value) })}
                                    />
                                    <p className="text-xs text-slate-500 mt-1">Set 999 for unlimited.</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Max Carry Forward</label>
                                    <input
                                        type="number"
                                        min="0"
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                                        value={formData.maxCarryForwardDays || 0}
                                        onChange={e => setFormData({ ...formData, maxCarryForwardDays: parseInt(e.target.value) })}
                                        disabled={!formData.carryForwardAllowed}
                                    />
                                </div>
                            </div>

                            <div className="space-y-3 pt-2">
                                <label className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded text-blue-600"
                                        checked={formData.isPaid}
                                        onChange={e => setFormData({ ...formData, isPaid: e.target.checked })}
                                    />
                                    <span className="text-sm font-medium text-slate-700">Paid Leave (Payroll Impact)</span>
                                </label>
                                <label className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded text-blue-600"
                                        checked={formData.requiresApproval}
                                        onChange={e => setFormData({ ...formData, requiresApproval: e.target.checked })}
                                    />
                                    <span className="text-sm font-medium text-slate-700">Requires Manager Approval</span>
                                </label>
                                <label className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded text-blue-600"
                                        checked={formData.requiresDocument}
                                        onChange={e => setFormData({ ...formData, requiresDocument: e.target.checked })}
                                    />
                                    <span className="text-sm font-medium text-slate-700">Requires Attachment (e.g. sick note)</span>
                                </label>
                                <label className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded text-blue-600"
                                        checked={formData.carryForwardAllowed}
                                        onChange={e => setFormData({ ...formData, carryForwardAllowed: e.target.checked })}
                                    />
                                    <span className="text-sm font-medium text-slate-700">Allow Carry Forward to Next Year</span>
                                </label>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Notes/Description</label>
                                <textarea
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                                    rows={2}
                                    value={formData.notes || ''}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>

                            <div className="flex space-x-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-2 border border-slate-300 rounded-lg font-semibold hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {loading ? 'Saving...' : 'Save Policy'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LeaveManager;
