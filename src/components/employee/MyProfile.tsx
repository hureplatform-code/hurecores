import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const MyProfile: React.FC = () => {
    const { user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Safety check for user data
    const safeUser = user || {
        name: 'Guest User',
        email: 'guest@example.com',
        role: 'Guest',
        organizationId: null
    };

    const [formData, setFormData] = useState({
        jobTitle: user?.jobTitle || 'Staff Member',
        phone: user?.phone || '',
        emergencyContact: user?.emergencyContactName || '',
        emergencyPhone: user?.emergencyContactPhone || ''
    });

    // Update form data when user loads
    // Note: detailed profile fields like phone/emergency might need a separate fetch if not in auth context

    const handleSave = async () => {
        setIsSaving(true);
        // Simulate save - strictly UI demo since backend connection depends on permission fix
        setTimeout(() => {
            setIsSaving(false);
            setIsEditing(false);
        }, 1000);
    };

    return (
        <div className="p-6 md:p-8 max-w-6xl mx-auto flex flex-col animate-in fade-in duration-500">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900">My Profile</h2>
                <p className="text-slate-500">Manage your personal information and emergency contacts.</p>
            </div>

            {!user?.organizationId && (
                <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-amber-800">
                    <span className="text-xl">⚠️</span>
                    <div>
                        <p className="font-bold text-sm">Profile Incomplete or Permission Denied</p>
                        <p className="text-xs opacity-90">Please ensure Firestore Rules are deployed in Firebase Console to view full profile data.</p>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden relative">
                {/* Header / Banner */}
                <div className="h-56 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-3xl opacity-20 transform translate-x-1/2 -translate-y-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500 rounded-full blur-3xl opacity-20 transform -translate-x-1/2 translate-y-1/2"></div>
                </div>

                <div className="px-8 pb-10">
                    <div className="relative flex flex-col md:flex-row justify-between items-end -mt-20 mb-10 gap-6">
                        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 text-center md:text-left w-full md:w-auto">
                            <div className="w-40 h-40 rounded-[2rem] border-4 border-white shadow-2xl bg-gradient-to-br from-white to-blue-50 flex items-center justify-center text-5xl font-bold text-blue-600 relative z-10">
                                {safeUser.name ? safeUser.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'U'}
                            </div>
                            <div className="mb-2">
                                <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-2">{safeUser.name}</h1>
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-slate-500 font-medium text-sm">
                                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-bold uppercase tracking-wide text-xs">{safeUser.role || 'Staff'}</span>
                                    <span className="hidden md:inline">•</span>
                                    <span>{user?.organizationId ? 'Verified Member' : 'Unverified Account'}</span>
                                    {user?.email && (
                                        <>
                                            <span className="hidden md:inline">•</span>
                                            <span>{user.email}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className={`bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-6 py-3 rounded-xl font-bold text-sm shadow-sm hover:shadow-md transition-all whitespace-nowrap ${isEditing ? 'bg-slate-100' : ''}`}
                        >
                            {isEditing ? 'Cancel Editing' : '✏️ Edit Profile'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 border-t border-slate-100 pt-10">
                        {/* Personal Info */}
                        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 delay-100">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                                <span className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-bold">👤</span>
                                <h3 className="text-xl font-bold text-slate-900">Personal Details</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Job Title</label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={formData.jobTitle}
                                            onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                                            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                        />
                                    ) : (
                                        <div className="font-semibold text-slate-900 text-lg bg-slate-50 px-4 py-3 rounded-xl border border-slate-100">{formData.jobTitle}</div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Phone Number</label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                            placeholder="+254..."
                                        />
                                    ) : (
                                        <div className="font-semibold text-slate-900 text-lg bg-slate-50 px-4 py-3 rounded-xl border border-slate-100">{formData.phone || 'Not set'}</div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Employment Type</label>
                                    <div className="font-semibold text-slate-900 text-lg bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                        Full-Time
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Start Date</label>
                                    <div className="font-semibold text-slate-900 text-lg bg-slate-50 px-4 py-3 rounded-xl border border-slate-100">
                                        {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Emergency Contact */}
                        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 delay-200">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                                <span className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600 font-bold">🚑</span>
                                <h3 className="text-xl font-bold text-slate-900">Emergency Contact</h3>
                            </div>

                            <div className="bg-red-50/50 p-6 rounded-2xl border border-red-100 space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-red-400 uppercase tracking-widest mb-2">Primary Contact Name</label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={formData.emergencyContact}
                                            onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                                            className="w-full px-4 py-3 border border-red-200 rounded-xl text-sm font-medium focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all bg-white"
                                            placeholder="Full Name"
                                        />
                                    ) : (
                                        <div className="font-bold text-slate-900 text-lg">{formData.emergencyContact || 'Not set'}</div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-red-400 uppercase tracking-widest mb-2">Emergency Phone</label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={formData.emergencyPhone}
                                            onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                                            className="w-full px-4 py-3 border border-red-200 rounded-xl text-sm font-medium focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all bg-white"
                                            placeholder="+254..."
                                        />
                                    ) : (
                                        <div className="font-bold text-slate-900 text-lg">{formData.emergencyPhone || 'Not set'}</div>
                                    )}
                                </div>
                            </div>

                            {isEditing && (
                                <div className="pt-4 flex justify-end">
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="bg-slate-900 text-white px-8 py-4 rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg disabled:opacity-70 flex items-center gap-2"
                                    >
                                        {isSaving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                                        {isSaving ? 'Saving Changes...' : 'Save Changes'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MyProfile;
