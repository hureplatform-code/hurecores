import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { staffService } from '../../lib/services/staff.service';
import { organizationService } from '../../lib/services/organization.service';
import { roleService, CustomRole } from '../../lib/services/role.service';
import type { Profile, SystemRole, StaffPermissions } from '../../types';

const PermissionsManager: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'Roles' | 'Assignments'>('Assignments');
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

    // Data state
    const [staff, setStaff] = useState<Profile[]>([]);
    const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [adminSeats, setAdminSeats] = useState({ used: 0, max: 5 });
    const [updatingRole, setUpdatingRole] = useState<string | null>(null);

    // Manage Access State
    const [managingUser, setManagingUser] = useState<Profile | null>(null);
    const [userPermissions, setUserPermissions] = useState<string[]>([]);

    // New Role Form State
    const [newRole, setNewRole] = useState({ name: '', description: '', permissions: [] as string[] });

    const availablePermissions = [
        { id: 'scheduling', label: 'Manage Scheduling' },
        { id: 'staffManagement', label: 'Manage Staff Directory' },
        { id: 'leave', label: 'Manage Leave Requests' },
        { id: 'attendance', label: 'Manage Attendance' },
        { id: 'payroll', label: 'Access Payroll' },
        { id: 'settingsAdmin', label: 'Manage Organization Settings' },
        { id: 'reportsAccess', label: 'View Reports' },
        { id: 'documentsAndPolicies', label: 'Manage Documents & Policies' }
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
            // Load core data (Critical)
            const [staffData, seatData] = await Promise.all([
                staffService.getAll(user.organizationId),
                staffService.checkAdminSeatAvailability(user.organizationId)
            ]);
            setStaff(staffData);
            setAdminSeats({ used: seatData.used, max: seatData.max });

            // Load roles (Non-critical, may fail if rules not deployed/synced)
            try {
                const rolesData = await roleService.getRoles(user.organizationId);
                setCustomRoles(rolesData);
            } catch (roleErr) {
                console.warn('Failed to load custom roles (likely waiting for permission propagation):', roleErr);
                // Don't set main error, just log it. Features will just be missing temporarily.
            }
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

    const handleCreateRole = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.organizationId) return;

        setLoading(true);
        try {
            // Convert string[] back to StaffPermissions map
            const permissionsMap = availablePermissions.reduce((acc, perm) => {
                acc[perm.id] = newRole.permissions.includes(perm.id);
                return acc;
            }, {} as Record<string, boolean>) as unknown as StaffPermissions;

            if (updatingRole && updatingRole !== 'VIEW_ONLY') {
                // Update existing custom role
                await roleService.updateRole(user.organizationId, updatingRole, {
                    name: newRole.name,
                    description: newRole.description,
                    permissions: permissionsMap
                });
            } else {
                // Create new role
                await roleService.createRole(
                    user.organizationId,
                    newRole.name,
                    newRole.description,
                    permissionsMap
                );
            }

            await loadData();
            setIsRoleModalOpen(false);
            setNewRole({ name: '', description: '', permissions: [] });
            setUpdatingRole(null);
        } catch (error) {
            console.error('Error saving role:', error);
            alert('Failed to save role');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteRole = async (roleId: string) => {
        if (!user?.organizationId || !confirm('Are you sure you want to delete this role definition?')) return;
        try {
            await roleService.deleteRole(user.organizationId, roleId);
            loadData();
        } catch (error) {
            console.error('Error deleting role:', error);
            alert('Failed to delete role');
        }
    };

    const openManageAccess = (profile: Profile) => {
        setManagingUser(profile);
        // Initialize with existing permissions or defaults based on role if needed
        let currentPerms: string[] = [];

        if (profile.permissions && Object.values(profile.permissions).some(v => v)) {
            // Parse existing permissions
            currentPerms = Object.entries(profile.permissions)
                .filter(([_, v]) => v)
                .map(([k]) => k);
        } else if (profile.systemRole === 'ADMIN' || profile.systemRole === 'OWNER') {
            // Default to ALL permissions for Admin/Owner if no specific overrides exist
            currentPerms = availablePermissions.map(p => p.id);
        }

        setUserPermissions(currentPerms);
    };

    const toggleUserPermission = (permId: string) => {
        if (userPermissions.includes(permId)) {
            setUserPermissions(userPermissions.filter(id => id !== permId));
        } else {
            setUserPermissions([...userPermissions, permId]);
        }
    };

    const handleSaveUserPermissions = async () => {
        if (!managingUser || !user?.organizationId) return;

        try {
            // Convert array back to map
            const permissionsMap = availablePermissions.reduce((acc, perm) => {
                acc[perm.id] = userPermissions.includes(perm.id);
                return acc;
            }, {} as Record<string, boolean>);

            const result = await staffService.updatePermissions(managingUser.id, permissionsMap as unknown as StaffPermissions);

            if (result.success) {
                setManagingUser(null);
                loadData(); // Refresh list
            } else {
                alert(result.error || 'Failed to update permissions');
            }
        } catch (error) {
            console.error('Error saving permissions:', error);
            alert('Failed to save permissions');
        }
    };

    const togglePermission = (id: string) => {
        // Prevent editing if it's a fixed system role being viewed/cloned (unless we are creating a new one)
        if (updatingRole === 'VIEW_ONLY') return;

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
        if (profile.permissions && Object.values(profile.permissions).some(v => v)) {
            return Object.values(profile.permissions).filter(Boolean).length;
        }
        return profile.systemRole === 'ADMIN' ? 'All (Default)' : 'Basic';
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
                                    <th className="px-6 py-4">Status</th>
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
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {getPermissionCount(member)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => openManageAccess(member)}
                                                className="text-blue-600 font-bold text-sm hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Edit Permissions
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
                    {/* System Roles */}
                    {[
                        { name: 'Owner', desc: 'Full access to all features.', type: 'System', editable: false },
                        { name: 'Admin', desc: 'Can manage most settings except billing.', type: 'System', editable: false },
                        { name: 'Staff', desc: 'Basic access to own schedule and profile.', type: 'System', editable: false },
                    ].map((role, i) => (
                        <div key={`system-${i}`} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 transition-colors">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="font-bold text-lg text-slate-900">{role.name}</h3>
                                <span className="bg-slate-100 text-slate-500 text-xs font-bold px-2 py-1 rounded uppercase">{role.type}</span>
                            </div>
                            <p className="text-slate-500 text-sm mb-6 min-h-[40px]">{role.desc}</p>
                            <button
                                onClick={() => {
                                    const defaultPerms = (role.name === 'Admin' || role.name === 'Owner')
                                        ? availablePermissions.map(p => p.id)
                                        : role.name === 'Staff' ? ['attendance', 'scheduling', 'leave'] : [];

                                    setNewRole({
                                        name: `${role.name} (Custom)`,
                                        description: role.desc,
                                        permissions: defaultPerms
                                    });
                                    setUpdatingRole(null); // Set to null to treat as NEW role creation
                                    setIsRoleModalOpen(true);
                                }}
                                className="w-full py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50"
                            >
                                Customize / Copy
                            </button>
                        </div>
                    ))}

                    {/* Custom Roles */}
                    {customRoles.map((role) => (
                        <div key={role.id} className="bg-white p-6 rounded-2xl border border-blue-200 shadow-sm hover:shadow-md transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="font-bold text-lg text-slate-900">{role.name}</h3>
                                <div className="flex space-x-2">
                                    <span className="bg-blue-100 text-blue-600 text-xs font-bold px-2 py-1 rounded uppercase">Custom</span>
                                </div>
                            </div>
                            <p className="text-slate-500 text-sm mb-6 min-h-[40px]">{role.description || 'No description provided.'}</p>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => {
                                        // Parse permissions from map to array
                                        const perms = Object.entries(role.permissions || {})
                                            .filter(([_, enabled]) => enabled)
                                            .map(([key]) => key);

                                        setNewRole({
                                            name: role.name,
                                            description: role.description || '',
                                            permissions: perms
                                        });
                                        setUpdatingRole(role.id);
                                        setIsRoleModalOpen(true);
                                    }}
                                    className="flex-1 py-2 border border-blue-200 bg-blue-50 rounded-xl text-sm font-bold text-blue-700 hover:bg-blue-100"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDeleteRole(role.id)}
                                    className="px-3 py-2 border border-red-100 bg-red-50 rounded-xl text-sm font-bold text-red-600 hover:bg-red-100"
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    ))}

                    {/* Add New Role Card */}
                    <button
                        onClick={() => {
                            setNewRole({ name: '', description: '', permissions: [] });
                            setUpdatingRole(null);
                            setIsRoleModalOpen(true);
                        }}
                        className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50 transition-all flex flex-col items-center justify-center text-center group h-full min-h-[200px]"
                    >
                        <div className="text-4xl mb-3 text-slate-400 group-hover:text-blue-500 transition-colors">+</div>
                        <h3 className="font-bold text-lg text-slate-600 group-hover:text-blue-700">Create New Role</h3>
                    </button>
                </div>
            )}

            {/* Create Role Modal */}
            {isRoleModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsRoleModalOpen(false)} />
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b bg-slate-50">
                            <h3 className="text-xl font-bold text-slate-900">
                                {updatingRole === 'VIEW_ONLY' ? 'View Role Details' : (updatingRole ? 'Edit Custom Role' : 'Create Custom Role')}
                            </h3>
                            <p className="text-sm text-slate-500">
                                {updatingRole === 'VIEW_ONLY' ? 'View permissions for this system role.' : 'Define a new role and its permissions.'}
                            </p>
                        </div>

                        <form onSubmit={handleCreateRole} className="p-6 overflow-y-auto space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Role Name</label>
                                <input required type="text" className="w-full px-4 py-2 border rounded-xl"
                                    value={newRole.name} onChange={e => setNewRole({ ...newRole, name: e.target.value })}
                                    placeholder="e.g. Finance Assistant"
                                    disabled={updatingRole === 'VIEW_ONLY'}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Description</label>
                                <textarea className="w-full px-4 py-2 border rounded-xl" rows={2}
                                    value={newRole.description} onChange={e => setNewRole({ ...newRole, description: e.target.value })}
                                    placeholder="Briefly describe this role..."
                                    disabled={updatingRole === 'VIEW_ONLY'}
                                ></textarea>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-3">Permissions</label>
                                <div className="space-y-3">
                                    {availablePermissions.map(perm => (
                                        <label key={perm.id} className="flex items-center space-x-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                                            <input
                                                type="checkbox"
                                                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                                                checked={newRole.permissions.includes(perm.id)}
                                                onChange={() => togglePermission(perm.id)}
                                                disabled={updatingRole === 'VIEW_ONLY'}
                                            />
                                            <span className="text-slate-700 font-medium">{perm.label} <span className="text-xs text-slate-400 font-mono ml-1">({perm.id})</span></span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="flex space-x-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsRoleModalOpen(false)}
                                    className="flex-1 py-3 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50"
                                >
                                    Close
                                </button>
                                {updatingRole !== 'VIEW_ONLY' && (
                                    <button type="submit" className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg">
                                        Save New Role
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Manage Access Modal */}
            {managingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setManagingUser(null)} />
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b bg-slate-50">
                            <h3 className="text-xl font-bold text-slate-900">Edit User Permissions</h3>
                            <p className="text-sm text-slate-500">
                                Editing permissions for <strong className="text-slate-900">{managingUser.fullName}</strong>
                            </p>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6">
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                                <p className="text-sm text-blue-800">
                                    ℹ️ <strong>Override Mode:</strong> Selections here will override the default permissions for their {getRoleLabel(managingUser.systemRole)} role.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-3">Effective Permissions</label>
                                <div className="space-y-3">
                                    {availablePermissions.map(perm => {
                                        const isChecked = userPermissions.includes(perm.id);
                                        return (
                                            <label key={perm.id} className={`flex items-center space-x-3 p-3 border rounded-xl cursor-pointer transition-colors ${isChecked ? 'bg-blue-50 border-blue-200' : 'border-slate-200 hover:bg-slate-50'}`}>
                                                <input
                                                    type="checkbox"
                                                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                                    checked={isChecked}
                                                    onChange={() => toggleUserPermission(perm.id)}
                                                />
                                                <div>
                                                    <span className={`block font-medium ${isChecked ? 'text-blue-900' : 'text-slate-700'}`}>{perm.label}</span>
                                                    <span className="text-xs text-slate-400 font-mono">{perm.id}</span>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex space-x-3 pt-2">
                                <button
                                    onClick={() => setManagingUser(null)}
                                    className="flex-1 py-3 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveUserPermissions}
                                    className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PermissionsManager;
