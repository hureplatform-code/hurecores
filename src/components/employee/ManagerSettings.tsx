import React from 'react';
import { useAuth } from '../../context/AuthContext';

const ManagerSettings: React.FC = () => {
    const { user } = useAuth();

    return (
        <div className="p-6 md:p-8 max-w-4xl mx-auto">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900">Admin Settings</h2>
                <p className="text-slate-500">Manage organization settings and preferences</p>
            </div>

            {/* Organization Info */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 mb-6">
                <h3 className="font-bold text-slate-900 mb-4">Organization Information</h3>
                <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-slate-100">
                        <span className="text-slate-600">Organization ID</span>
                        <span className="font-mono text-sm text-slate-900">{user?.organizationId || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-slate-100">
                        <span className="text-slate-600">Your Role</span>
                        <span className="font-semibold text-slate-900">{user?.systemRole || user?.role}</span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                        <span className="text-slate-600">Email</span>
                        <span className="text-slate-900">{user?.email}</span>
                    </div>
                </div>
            </div>

            {/* Your Permissions */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 mb-6">
                <h3 className="font-bold text-slate-900 mb-4">Your Permissions</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                        { key: 'staffManagement', label: 'Staff Management', icon: '👥' },
                        { key: 'scheduling', label: 'Scheduling', icon: '📆' },
                        { key: 'attendance', label: 'Attendance', icon: '⏰' },
                        { key: 'leave', label: 'Leave', icon: '🏖️' },
                        { key: 'documentsAndPolicies', label: 'Documents', icon: '📂' },
                        { key: 'payroll', label: 'Payroll', icon: '💰' },
                        { key: 'settingsAdmin', label: 'Settings', icon: '⚙️' },
                    ].map(perm => {
                        const hasPermission = user?.systemRole === 'OWNER' || user?.permissions?.[perm.key];
                        return (
                            <div
                                key={perm.key}
                                className={`p-3 rounded-xl border ${hasPermission
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                        : 'bg-slate-50 border-slate-200 text-slate-400'
                                    }`}
                            >
                                <span className="mr-2">{perm.icon}</span>
                                <span className="text-sm font-medium">{perm.label}</span>
                                {hasPermission && <span className="ml-2">✓</span>}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Help Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
                <h3 className="font-bold text-blue-900 mb-2">Need Help?</h3>
                <p className="text-blue-700 text-sm">
                    Contact your organization administrator or the system super admin
                    for changes to your permissions or organization settings.
                </p>
            </div>
        </div>
    );
};

export default ManagerSettings;
