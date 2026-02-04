import React, { useState, useEffect } from 'react';
import { adminService } from '../../lib/services';
import { emailService } from '../../lib/services';
import type { VerificationRequest, VerificationStatus } from '../../types';

const VerificationsManager: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
    const [filter, setFilter] = useState<'Pending' | 'all'>('Pending');
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        loadData();
    }, [filter]);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = filter === 'Pending'
                ? await adminService.getPendingVerifications()
                : await adminService.getAllVerifications();
            setVerifications(data);
        } catch (error) {
            console.error('Error loading verifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (request: VerificationRequest) => {
        const orgName = request.organization?.name || 'Organization';
        if (!confirm(`Are you sure you want to approve this verification for ${orgName}?`)) return;

        setProcessing(true);
        try {
            const result = await adminService.approveVerification(request.id);
            if (result.success) {
                // Send notification email
                if (request.organization?.email) {
                    await emailService.sendVerificationNotification(
                        request.organization.email,
                        request.organization.name || 'Admin',
                        'Verified',
                        request.type === 'ORG' ? 'Organization' : 'Facility',
                        request.type === 'FACILITY' ? (request.location?.name || 'Facility') : (request.organization?.name || 'Organization')
                    );
                }
                loadData();
            } else {
                alert(result.error);
            }
        } catch (error) {
            console.error('Error approving:', error);
        } finally {
            setProcessing(false);
        }
    };

    const openRejectModal = (request: VerificationRequest) => {
        setSelectedRequest(request);
        setRejectionReason('');
        setShowRejectModal(true);
    };

    const handleReject = async () => {
        if (!selectedRequest) return;
        if (!rejectionReason.trim()) {
            alert('Please provide a reason for rejection');
            return;
        }

        setProcessing(true);
        try {
            const result = await adminService.rejectVerification(selectedRequest.id, rejectionReason);
            if (result.success) {
                // Send notification email
                if (selectedRequest.organization?.email) {
                    await emailService.sendVerificationNotification(
                        selectedRequest.organization.email,
                        selectedRequest.organization.name || 'Admin',
                        'Rejected',
                        selectedRequest.type === 'ORG' ? 'Organization' : 'Facility',
                        selectedRequest.type === 'FACILITY' ? (selectedRequest.location?.name || 'Facility') : (selectedRequest.organization?.name || 'Organization'),
                        rejectionReason
                    );
                }
                setShowRejectModal(false);
                setSelectedRequest(null);
                setRejectionReason('');
                loadData();
            } else {
                alert(result.error);
            }
        } catch (error) {
            console.error('Error rejecting:', error);
        } finally {
            setProcessing(false);
        }
    };

    const getStatusBadge = (status: VerificationStatus) => {
        const styles: Record<VerificationStatus, string> = {
            'Pending': 'bg-amber-100 text-amber-700 border-amber-200',
            'Verified': 'bg-emerald-100 text-emerald-700 border-emerald-200',
            'Rejected': 'bg-red-100 text-red-700 border-red-200',
            'Unverified': 'bg-slate-100 text-slate-600 border-slate-200'
        };
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase border ${styles[status]}`}>
                {status}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Verifications</h2>
                    <p className="text-slate-500">Review and approve organization and facility documents.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilter('Pending')}
                        className={`px-4 py-2 rounded-xl font-semibold ${filter === 'Pending' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                    >
                        Pending ({verifications.filter(v => v.status === 'Pending').length})
                    </button>
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-xl font-semibold ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                    >
                        All
                    </button>
                </div>
            </div>

            {verifications.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm flex flex-col items-center justify-center h-96">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-4xl mb-6 shadow-sm">✅</div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">No Pending Approvals</h3>
                    <p className="text-slate-500 max-w-sm mx-auto">You're all caught up! There are no documents waiting for review.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {verifications.map((item) => (
                        <div key={item.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-start gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold shadow-sm ${item.type === 'ORG' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                                    {item.type === 'ORG' ? '🏢' : '🏥'}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-lg font-bold text-slate-900">{item.organization?.name || 'Organization'}</h3>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${item.type === 'ORG' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-purple-50 text-purple-700 border border-purple-100'}`}>
                                            {item.type === 'ORG' ? 'Organization' : 'Facility'}
                                        </span>
                                        {getStatusBadge(item.status)}
                                    </div>
                                    <div className="text-sm text-slate-600 space-y-1">
                                        {item.type === 'FACILITY' && item.locationName && (
                                            <div className='font-semibold text-slate-800'>{item.locationName}</div>
                                        )}
                                        <div className="flex gap-4">
                                            {item.identifier && (
                                                <span className="font-mono bg-slate-100 px-1 rounded">{item.identifier}</span>
                                            )}
                                            {item.authority && (
                                                <>
                                                    <span className="text-slate-400">•</span>
                                                    <span>{item.authority}</span>
                                                </>
                                            )}
                                        </div>
                                        <div className="text-xs text-slate-400 mt-1">
                                            Submitted: {new Date(item.createdAt).toLocaleDateString()}
                                        </div>
                                        {item.status === 'Rejected' && item.rejectionReason && (
                                            <div className="text-xs text-red-600 bg-red-50 rounded px-2 py-1 mt-2">
                                                <strong>Reason:</strong> {item.rejectionReason}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {item.documentUrl && (
                                    <a
                                        href={item.documentUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 text-sm"
                                    >
                                        View Document
                                    </a>
                                )}
                                {item.status === 'Pending' && (
                                    <>
                                        <button
                                            onClick={() => openRejectModal(item)}
                                            disabled={processing}
                                            className="px-4 py-2 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 text-sm disabled:opacity-50"
                                        >
                                            Reject
                                        </button>
                                        <button
                                            onClick={() => handleApprove(item)}
                                            disabled={processing}
                                            className="px-4 py-2 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-md shadow-green-600/20 text-sm disabled:opacity-50"
                                        >
                                            Approve
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && selectedRequest && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 m-4">
                        <h2 className="text-xl font-bold text-slate-900 mb-4">Reject Verification</h2>

                        <div className="bg-slate-50 rounded-xl p-4 mb-4">
                            <p className="font-medium text-slate-900">{selectedRequest.organization?.name || 'Organization'}</p>
                            <p className="text-sm text-slate-500">{selectedRequest.type === 'ORG' ? 'Organization' : 'Facility'} Verification</p>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Reason for Rejection <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl resize-none"
                                rows={4}
                                placeholder="Please provide a clear reason..."
                                required
                            />
                        </div>

                        <div className="flex space-x-3">
                            <button
                                onClick={() => { setShowRejectModal(false); setSelectedRequest(null); }}
                                disabled={processing}
                                className="flex-1 py-3 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={processing}
                                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50"
                            >
                                {processing ? 'Processing...' : 'Reject'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VerificationsManager;
