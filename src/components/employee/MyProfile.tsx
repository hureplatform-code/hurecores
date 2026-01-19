import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Profile } from '../../types';

const MyProfile: React.FC = () => {
    const { user } = useAuth();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'details' | 'documents'>('details');

    useEffect(() => {
        const fetchProfile = async () => {
            if (user?.id) {
                try {
                    const docRef = doc(db, 'users', user.id);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        setProfile(docSnap.data() as Profile);
                    } else {
                        // Fallback to auth user data if profile doc doesn't exist
                        setProfile(user as unknown as Profile);
                    }
                } catch (error) {
                    console.error("Error fetching profile:", error);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchProfile();
    }, [user]);

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="animate-spin w-8 h-8 border-4 border-[#0f766e] border-t-transparent rounded-full"></div>
            </div>
        );
    }

    const safeProfile = profile || {} as Profile;
    const license = safeProfile.license;
    const practiceApproval = safeProfile.practiceApproval;

    // Helper for status badges
    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            'Verified': 'bg-[#d1fae5] text-[#065f46] border-[#6ee7b7]',
            'Approved': 'bg-[#d1fae5] text-[#065f46] border-[#6ee7b7]',
            'Active': 'bg-[#d1fae5] text-[#065f46] border-[#6ee7b7]',
            'Pending': 'bg-[#fef3c7] text-[#92400e] border-[#fcd34d]',
            'Expired': 'bg-[#fee2e2] text-[#991b1b] border-[#fca5a5]',
            'Rejected': 'bg-[#fee2e2] text-[#991b1b] border-[#fca5a5]',
        };
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border ${styles[status] || styles['Pending']}`}>
                {status === 'Verified' || status === 'Approved' || status === 'Active' ? '✓ ' : ''}
                {status || 'Pending'}
            </span>
        );
    };

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto flex flex-col animate-in fade-in duration-500">
            {/* Header */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden mb-8">
                <div className="h-48 bg-gradient-to-r from-[#0f766e] to-[#115e59] relative">
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                </div>
                <div className="px-8 pb-8 relative">
                    <div className="flex flex-col md:flex-row items-end -mt-16 gap-6">
                        <div className="w-32 h-32 rounded-2xl border-4 border-white shadow-xl bg-white flex items-center justify-center text-4xl font-bold text-[#0f766e] relative z-10">
                            {safeProfile.fullName ? safeProfile.fullName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'U'}
                        </div>
                        <div className="flex-1 pb-2">
                            <h1 className="text-3xl font-bold text-slate-900 mb-1">{safeProfile.fullName}</h1>
                            <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-slate-500">
                                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full uppercase tracking-wide text-xs">
                                    {safeProfile.jobTitle || safeProfile.systemRole}
                                </span>
                                <span>•</span>
                                <span>{safeProfile.email}</span>
                                {safeProfile.organizationId && (
                                    <>
                                        <span>•</span>
                                        <span className="text-[#0f766e] flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                            Verified Member
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-xl font-semibold text-sm shadow-sm transition-all">
                                Edit Profile
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Professional Credentials & Practice Approval */}
                <div className="lg:col-span-2 space-y-8">

                    {/* Professional Credentials (Primary) */}
                    <div className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-blue-50 bg-blue-50/30 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <span className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg">🪪</span>
                                <h3 className="text-lg font-bold text-slate-900">Professional Credentials</h3>
                            </div>
                            {license && getStatusBadge(license.verificationStatus)}
                        </div>

                        <div className="p-6">
                            {license ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">License Type</label>
                                        <div className="font-semibold text-slate-900">{license.type}</div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">License Number</label>
                                        <div className="font-family-mono text-slate-900 bg-slate-50 px-3 py-1 rounded border border-slate-200 inline-block">
                                            {license.number}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Issuing Authority</label>
                                        <div className="font-semibold text-slate-900">{license.authority}</div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Status</label>
                                        <div className="font-semibold text-slate-900 flex items-center gap-2">
                                            {license.verificationStatus === 'Verified' ? '✅ Valid' : '⚠️ Pending Verification'}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Expiry Date</label>
                                        <div className="font-semibold text-slate-900">{new Date(license.expiryDate).toLocaleDateString()}</div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Verification</label>
                                        <div className="text-sm text-slate-500">Verified by Admin</div>
                                    </div>

                                    <div className="md:col-span-2 pt-4 border-t border-slate-100">
                                        <button className="text-blue-600 text-sm font-semibold hover:underline flex items-center gap-2">
                                            📄 View License Document
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-slate-500 mb-4">No professional license information added.</p>
                                    <button className="text-blue-600 font-semibold hover:underline">Add Credentials</button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Practice Approval */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <span className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-lg">✅</span>
                                <h3 className="text-lg font-bold text-slate-900">Practice Approval</h3>
                            </div>
                            {getStatusBadge(practiceApproval?.organizationApproved ? 'Approved' : 'Pending')}
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Approved Organization</label>
                                    <div className="font-semibold text-slate-900">Rusinga Nursing Home</div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Approved Location(s)</label>
                                    <div className="font-semibold text-slate-900">Main Facility</div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Role at Facility</label>
                                    <div className="font-semibold text-slate-900">{safeProfile.jobTitle || 'Nurse'} (Full-Time)</div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Approval Status</label>
                                    <div className="font-semibold text-emerald-700 font-bold">APPROVED ✓</div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Approved On</label>
                                    <div className="font-semibold text-slate-900">04 January 2026</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Personal & Employment (Secondary) */}
                <div className="space-y-8">
                    {/* Personal Information */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                            <span className="text-slate-400">👤</span>
                            <h3 className="font-bold text-slate-900">Personal Information</h3>
                        </div>
                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Phone Number</label>
                                <div className="font-medium text-slate-900">{safeProfile.phone || 'Not set'}</div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Email</label>
                                <div className="font-medium text-slate-900">{safeProfile.email}</div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Emergency Contact</label>
                                <div className="font-medium text-slate-900">{safeProfile.emergencyContactName || 'Not set'}</div>
                                {safeProfile.emergencyContactPhone && <div className="text-sm text-slate-500">{safeProfile.emergencyContactPhone}</div>}
                            </div>
                        </div>
                    </div>

                    {/* Employment Details */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                            <span className="text-slate-400">💼</span>
                            <h3 className="font-bold text-slate-900">Employment Details</h3>
                        </div>
                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Job Title</label>
                                <div className="font-medium text-slate-900 flex items-center justify-between">
                                    {safeProfile.jobTitle || 'Staff'}
                                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500">Employer Managed</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Employment Type</label>
                                <div className="font-medium text-slate-900 flex items-center justify-between">
                                    {safeProfile.employmentType}
                                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500">Employer Managed</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Department</label>
                                <div className="font-medium text-slate-900 flex items-center justify-between">
                                    {safeProfile.department || 'General'}
                                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500">Employer Managed</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Start Date</label>
                                <div className="font-medium text-slate-900 flex items-center justify-between">
                                    {safeProfile.hireDate ? new Date(safeProfile.hireDate).toLocaleDateString() : 'Not set'}
                                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500">Employer Managed</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* My Documents (Placeholder) */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                            <span className="text-slate-400">📂</span>
                            <h3 className="font-bold text-slate-900">My Documents</h3>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                <span className="text-sm font-medium text-slate-700">Employment Contract</span>
                                <button className="text-xs font-bold text-[#0f766e] hover:underline">View</button>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                <span className="text-sm font-medium text-slate-700">Code of Conduct</span>
                                <button className="text-xs font-bold text-[#0f766e] hover:underline">Acknowledge</button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default MyProfile;
