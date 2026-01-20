import React, { useState, useEffect } from 'react';
import { adminService } from '../../lib/services';
import type { Organization } from '../../types';

const ClinicsManager: React.FC = () => {
    const [clinics, setClinics] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [selectedClinic, setSelectedClinic] = useState<Organization | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        loadClinics();
    }, []);

    const loadClinics = async () => {
        setLoading(true);
        try {
            const orgs = await adminService.getAllOrganizations();
            setClinics(orgs);
        } catch (err) {
            console.error('Error loading clinics:', err);
        } finally {
            setLoading(false);
        }
    };

    const openReview = (clinic: Organization) => {
        setSelectedClinic(clinic);
        setRejectionReason('');
        setIsReviewModalOpen(true);
    };

    const handleReviewAction = async (action: 'approve' | 'reject') => {
        if (!selectedClinic) return;

        setProcessing(true);
        try {
            await adminService.updateAccountStatus(
                selectedClinic.id,
                action === 'approve' ? 'Active' : 'Suspended'
            );
            await loadClinics();
            setIsReviewModalOpen(false);
        } catch (err) {
            console.error('Error updating clinic:', err);
            alert('Failed to update clinic status');
        } finally {
            setProcessing(false);
        }
    };

    const formatDate = (timestamp: any): string => {
        if (!timestamp) return 'N/A';
        if (timestamp.seconds) {
            return new Date(timestamp.seconds * 1000).toLocaleDateString();
        }
        return new Date(timestamp).toLocaleDateString();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin text-4xl">⏳</div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">All Clinics <span className="text-slate-400 text-lg ml-2">({clinics.length})</span></h2>
                    <p className="text-slate-500">Master list of registered healthcare facilities.</p>
                </div>
                <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-700 hover:bg-slate-50">⬇ Export CSV</button>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                {clinics.length === 0 ? (
                    <div className="p-16 text-center">
                        <div className="text-6xl mb-4 opacity-20">🏥</div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">No Clinics Yet</h3>
                        <p className="text-slate-500">No organizations have registered.</p>
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4">Clinic Name</th>
                                <th className="px-6 py-4">Current Plan</th>
                                <th className="px-6 py-4">Verification</th>
                                <th className="px-6 py-4">Account Status</th>
                                <th className="px-6 py-4">Joined On</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {clinics.map((clinic) => (
                                <tr key={clinic.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-900">{clinic.name}</div>
                                        <div className="text-xs text-slate-500">{clinic.email}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border ${clinic.plan?.includes('Professional') ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-blue-50 text-blue-700 border-blue-100'
                                            }`}>
                                            {clinic.plan || 'Essential'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${clinic.verificationStatus === 'Verified' ? 'bg-green-100 text-green-700' :
                                            clinic.verificationStatus === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                                            }`}>
                                            {clinic.verificationStatus || 'Unverified'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`flex items-center gap-1.5 text-sm font-bold ${clinic.accountStatus === 'Active' ? 'text-green-600' :
                                            clinic.accountStatus === 'Pending' ? 'text-blue-600' : 'text-slate-400'
                                            }`}>
                                            <span className={`w-2 h-2 rounded-full ${clinic.accountStatus === 'Active' ? 'bg-green-600' :
                                                clinic.accountStatus === 'Pending' ? 'bg-blue-600' : 'bg-slate-400'
                                                }`}></span>
                                            {clinic.accountStatus || 'Pending'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{formatDate(clinic.createdAt)}</td>
                                    <td className="px-6 py-4 text-right">
                                        {clinic.accountStatus === 'Pending' ? (
                                            <button onClick={() => openReview(clinic)} className="text-blue-600 font-bold text-sm bg-blue-50 px-3 py-1 rounded-lg hover:bg-blue-100">Review</button>
                                        ) : (
                                            <button className="text-slate-400 font-bold text-sm hover:text-slate-600">Details</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Review Modal */}
            {isReviewModalOpen && selectedClinic && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsReviewModalOpen(false)} />
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg relative z-10 p-6">
                        <h3 className="text-xl font-bold text-slate-900 mb-1">Review Clinic Account</h3>
                        <p className="text-slate-500 text-sm mb-6">Reviewing details for <span className="font-bold text-slate-700">{selectedClinic.name}</span></p>

                        <div className="space-y-4 mb-6">
                            <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <div><span className="block text-xs uppercase font-bold text-slate-400">Email</span><span className="font-bold">{selectedClinic.email}</span></div>
                                <div><span className="block text-xs uppercase font-bold text-slate-400">Plan</span><span className="font-bold">{selectedClinic.plan || 'Essential'}</span></div>
                                <div><span className="block text-xs uppercase font-bold text-slate-400">Phone</span><span className="font-bold">{selectedClinic.phone || 'N/A'}</span></div>
                                <div><span className="block text-xs uppercase font-bold text-slate-400">City</span><span className="font-bold">{selectedClinic.city || 'N/A'}</span></div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Rejection Reason (Optional)</label>
                                <textarea
                                    className="w-full px-4 py-2 border rounded-xl text-sm"
                                    placeholder="Enter reason if rejecting..."
                                    rows={3}
                                    value={rejectionReason}
                                    onChange={e => setRejectionReason(e.target.value)}
                                ></textarea>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setIsReviewModalOpen(false)} disabled={processing} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl disabled:opacity-50">Cancel</button>
                            <button onClick={() => handleReviewAction('reject')} disabled={processing} className="flex-1 py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 disabled:opacity-50">Reject</button>
                            <button onClick={() => handleReviewAction('approve')} disabled={processing} className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg shadow-green-600/20 disabled:opacity-50">
                                {processing ? 'Processing...' : 'Approve'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClinicsManager;
