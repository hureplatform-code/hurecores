import React from 'react';
import { NavLink } from 'react-router-dom';
import { StaffPermissions } from '../../types';

interface EmployeeSidebarProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    userRole: string;
    systemRole?: string;
    permissions?: StaffPermissions | null;
    userName?: string;
}

const EmployeeSidebar: React.FC<EmployeeSidebarProps> = ({
    isOpen,
    setIsOpen,
    userRole,
    systemRole,
    permissions,
    userName
}) => {
    // Check if user has admin privileges (OWNER always has full access, ADMIN has permission-based access)
    const isOwner = systemRole === 'OWNER';
    const isAdmin = systemRole === 'ADMIN';
    const hasAnyAdminPermission = permissions && Object.values(permissions).some(v => v);
    const showAdminSection = isOwner || (isAdmin && hasAnyAdminPermission);

    const personalLinks = [
        { name: 'Dashboard', path: '/employee', icon: '📊', exact: true },
        { name: 'My Attendance', path: '/employee/attendance', icon: '⏰' },
        { name: 'My Schedule', path: '/employee/schedule', icon: '📅' },
        { name: 'My Leave', path: '/employee/leave', icon: '🏖️' },
        { name: 'My Profile', path: '/employee/profile', icon: '👤' },
    ];

    // Build admin links based on permissions
    const getAdminLinks = () => {
        const links = [];

        // Dashboard is always shown for admins
        if (showAdminSection) {
            links.push({ name: 'Dashboard', path: '/employee/manager', icon: '📊' });
        }

        // Staff Management
        if (isOwner || permissions?.staffManagement) {
            links.push({ name: 'Staff Directory', path: '/employee/manager/staff', icon: '👥' });
        }

        // Scheduling
        if (isOwner || permissions?.scheduling) {
            links.push({ name: 'Team Schedule', path: '/employee/manager/schedule', icon: '📆' });
        }

        // Attendance
        if (isOwner || permissions?.attendance) {
            links.push({ name: 'Attendance', path: '/employee/manager/attendance', icon: '⏰' });
        }

        // Leave
        if (isOwner || permissions?.leave) {
            links.push({ name: 'Leave Approvals', path: '/employee/manager/leave', icon: '✅' });
        }

        // Documents & Policies
        if (isOwner || permissions?.documentsAndPolicies) {
            links.push({ name: 'Documents', path: '/employee/manager/documents', icon: '📂' });
        }

        // Payroll
        if (isOwner || permissions?.payroll) {
            links.push({ name: 'Payroll', path: '/employee/manager/payroll', icon: '💰' });
        }

        // Settings/Admin (only for owners or if explicitly granted)
        if (isOwner || permissions?.settingsAdmin) {
            links.push({ name: 'Settings', path: '/employee/manager/settings', icon: '⚙️' });
        }

        return links;
    };

    const adminLinks = getAdminLinks();

    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={`fixed inset-0 bg-slate-900/50 z-20 transition-opacity lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={() => setIsOpen(false)}
            />

            {/* Sidebar */}
            <aside
                className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                    }`}
            >
                {/* Logo */}
                <div className="h-16 flex items-center px-6 border-b border-slate-800">
                    <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 text-transparent bg-clip-text">HURE</span>
                    <span className="ml-2 text-xs font-bold bg-slate-800 px-2 py-0.5 rounded text-slate-300">Staff Portal</span>
                </div>

                {/* Navigation */}
                <div className="flex-1 overflow-y-auto py-6 px-3 space-y-8">

                    {/* Section: MY */}
                    <div>
                        <div className="px-3 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">MY</div>
                        <nav className="space-y-1">
                            {personalLinks.map((link) => (
                                <NavLink
                                    key={link.path}
                                    to={link.path}
                                    end={link.exact}
                                    onClick={() => window.innerWidth < 1024 && setIsOpen(false)}
                                    className={({ isActive }) => `flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive
                                        ? 'bg-[#0f766e] text-white shadow-lg shadow-teal-900/50'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                        }`}
                                >
                                    <span className="text-lg">{link.icon}</span>
                                    <span>{link.name}</span>
                                </NavLink>
                            ))}
                        </nav>
                    </div>

                    {/* Section: ADMIN (Conditional based on permissions) */}
                    {showAdminSection && adminLinks.length > 0 && (
                        <div>
                            <div className="px-3 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                {isOwner ? 'MANAGEMENT' : 'ADMIN'}
                            </div>
                            <nav className="space-y-1">
                                {adminLinks.map((link) => (
                                    <NavLink
                                        key={link.path}
                                        to={link.path}
                                        onClick={() => window.innerWidth < 1024 && setIsOpen(false)}
                                        className={({ isActive }) => `flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive
                                            ? 'bg-[#0f766e] text-white shadow-lg shadow-teal-900/50'
                                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                            }`}
                                    >
                                        <span className="text-lg">{link.icon}</span>
                                        <span>{link.name}</span>
                                    </NavLink>
                                ))}
                            </nav>
                        </div>
                    )}

                </div>

                {/* User Info / Footer */}
                <div className="p-4 border-t border-slate-800">
                    <div className="flex items-center space-x-3 p-3 bg-slate-800/50 rounded-xl">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold">
                            {userName?.[0]?.toUpperCase() || userRole[0]}
                        </div>
                        <div className="overflow-hidden">
                            <div className="text-sm font-bold truncate">{userName || 'Logged in as'}</div>
                            <div className="text-xs text-slate-400 truncate">
                                {isOwner ? 'Owner' : isAdmin ? 'Admin' : 'Staff'}
                            </div>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default EmployeeSidebar;
