import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { staffService } from '../../lib/services/staff.service';
import { organizationService } from '../../lib/services/organization.service';
import type { Profile, SystemRole } from '../../types';

const PermissionsManager: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'Roles' | 'Assignments'>('Assignments');
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

    // Data state
    const [staff, setStaff] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [adminSeats, setAdminSeats] = useState({ used: 0, max: 5 });
    const [updatingRole, setUpdatingRole] = useState<string | null>(null);

    // New Role Form State
    const [newRole, setNewRole] = useState({ name: '', description: '', permissions: [] as string[] });

    const availablePermissions = [
        { id: 'team_schedule', label: 'View Team Schedule' },
        { id: 'manage_schedule', label: 'Create & Edit Shifts' },
        { id: 'staff_list', label: 'View Staff Directory' },
        { id: 'manage_staff', label: 'Add/Edit Staff Members' },
        { id: 'approve_leave', label: 'Approve/Reject Leave' },
        { id: 'team_attendance', label: 'View Attendance Records' },
        { id: 'payroll', label: 'Access Payroll Data' },
        { id: 'settings', label: 'Manage Org Settings' },
    ];

    const systemRoles: { value: SystemRole; label: string }[] = [
        { value: 'OWNER', label: 'Owner' },
        { value: 'ADMIN', label: 'Admin' },
        { value: 'EMPLOYEE', label: 'Staff' },
    ];

    useEffect(() => {
        if (user?.organizationId) {
            loadData();
        }
    }, [user?.organizationId]);

    const loadData = async () => {
        if (!user?.organizationId) return;

        setLoading(true);
        setError('');
        try {
            const [staffData, seatData] = await Promise.all([
                staffService.getAll(user.organizationId),
                staffService.checkAdminSeatAvailability(user.organizationId)
            ]);
            setStaff(staffData);
            setAdminSeats({ used: seatData.used, max: seatData.max });
        } catch (err: any) {
            console.error('Error loading staff:', err);
            setError('Failed to load staff data');
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (userId: string, newRole: SystemRole) => {
        if (!user?.organizationId) return;

        setUpdatingRole(userId);
        try {
            const result = await staffService.update(userId, { systemRole: newRole }, user.organizationId);
            if (result.success) {
                await loadData();
            } else {
                setError(result.error || 'Failed to update role');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to update role');
        } finally {
            setUpdatingRole(null);
        }
    };

    const handleCreateRole = (e: React.FormEvent) => {
        e.preventDefault();
        // Custom roles would be saved to Firestore
        setIsRoleModalOpen(false);
        setNewRole({ name: '', description: '', permissions: [] });
        alert('Custom roles feature coming soon!');
    };

    const togglePermission = (id: string) => {
        if (newRole.permissions.includes(id)) {
            setNewRole({ ...newRole, permissions: newRole.permissions.filter(p => p !== id) });
        } else {
            setNewRole({ ...newRole, permissions: [...newRole.permissions, id] });
        }
    };

    const getRoleLabel = (role: SystemRole): string => {
        return systemRoles.find(r => r.value === role)?.label || role;
    };

    const getPermissionCount = (profile: Profile): string | number => {
        if (profile.systemRole === 'OWNER') return 'Full Access';
        if (profile.permissions) {
            return Object.values(profile.permissions).filter(Boolean).length;
        }
        return profile.systemRole === 'ADMIN' ? 12 : 3;
    };

    if (loading) {
        return (
            <div className="p-8 max-w-7xl mx-auto flex items-center justify-center h-64">
                <div className="animate-spin text-4xl">⏳</div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto h-full flex flex-col animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Roles & Permissions</h2>
                    <p className="text-slate-500">Control access levels for your staff.</p>
                </div>
                <div className="flex items-center space-x-4">
                    <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-sm font-bold">
                        {adminSeats.used} / {adminSeats.max} Admin Seats Used
                    </span>
                    <button
                        onClick={() => setIsRoleModalOpen(true)}
                        className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                    >
                        + Create New Role
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
                    {error}
                </div>
            )}

            <div className="flex space-x-2 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('Assignments')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'Assignments' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                >
                    Staff Assignments
                </button>
                <button
                    onClick={() => setActiveTab('Roles')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'Roles' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                >
                    Role Definitions
                </button>
            </div>

            {activeTab === 'Assignments' && (
                <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                    {staff.length === 0 ? (
                        <div className="p-16 text-center">
                            <div className="text-6xl mb-4 opacity-20">👥</div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">No Staff Members Yet</h3>
                            <p className="text-slate-500">Add staff members to manage their roles and permissions.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500">
                                <tr>
                                    <th className="px-6 py-4">Staff Member</th>
                                    <th className="px-6 py-4">Assigned Role</th>
                                    <th className="px-6 py-4">Permissions Count</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {staff.map((member) => (
                                    <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-900">{member.fullName}</div>
                                            <div className="text-xs text-slate-500">{member.email}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm font-semibold text-slate-700 focus:border-blue-500 outline-none disabled:opacity-50"
                                                value={member.systemRole}
                                                disabled={updatingRole === member.id || member.id === user?.id}
                                                onChange={(e) => handleRoleChange(member.id, e.target.value as SystemRole)}
                                            >
                                                {systemRoles.map(role => (
                                                    <option key={role.value} value={role.value}>{role.label}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">{getPermissionCount(member)}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => {
                                                    const perms = member.permissions;
                                                    const permList = perms ? Object.entries(perms).filter(([_, v]) => v).map(([k]) => k).join(', ') : 'No custom permissions';
                                                    alert(`${member.fullName}\nRole: ${getRoleLabel(member.systemRole)}\nPermissions: ${permList}`);
                                                }}
                                                className="text-blue-600 font-bold text-sm hover:underline"
                                            >
                                                View Access
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {activeTab === 'Roles' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[
                        { name: 'Owner', desc: 'Full access to all features.', type: 'System' },
                        { name: 'Admin', desc: 'Can manage most settings except billing.', type: 'System' },
                        { name: 'Staff', desc: 'Basic access to own schedule and profile.', type: 'System' },
                    ].map((role, i) => (
                        <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 transition-colors">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="font-bold text-lg text-slate-900">{role.name}</h3>
                                <span className="bg-slate-100 text-slate-500 text-xs font-bold px-2 py-1 rounded uppercase">{role.type}</span>
                            </div>
                            <p className="text-slate-500 text-sm mb-6">{role.desc}</p>
                            <button className="w-full py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50">Edit Permissions</button>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Role Modal */}
            {isRoleModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsRoleModalOpen(false)} />
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b bg-slate-50">
                            <h3 className="text-xl font-bold text-slate-900">Create Custom Role</h3>
                            <p className="text-sm text-slate-500">Define a new role and its permissions.</p>
                        </div>

                        <form onSubmit={handleCreateRole} className="p-6 overflow-y-auto space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Role Name</label>
                                <input required type="text" className="w-full px-4 py-2 border rounded-xl"
                                    value={newRole.name} onChange={e => setNewRole({ ...newRole, name: e.target.value })}
                                    placeholder="e.g. Finance Assistant"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Description</label>
                                <textarea className="w-full px-4 py-2 border rounded-xl" rows={2}
                                    value={newRole.description} onChange={e => setNewRole({ ...newRole, description: e.target.value })}
                                    placeholder="Briefly describe this role..."
                                ></textarea>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-3">Permissions</label>
                                <div className="space-y-3">
                                    {availablePermissions.map(perm => (
                                        <label key={perm.id} className="flex items-center space-x-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                                            <input
                                                type="checkbox"
                                                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                                checked={newRole.permissions.includes(perm.id)}
                                                onChange={() => togglePermission(perm.id)}
                                            />
                                            <span className="text-slate-700 font-medium">{perm.label} <span className="text-xs text-slate-400 font-mono ml-1">({perm.id})</span></span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <button type="submit" className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg">Save New Role</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PermissionsManager;
