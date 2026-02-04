import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { organizationService } from '../../lib/services/organization.service';
import type { Organization } from '../../types';

interface EmployeeTopBarProps {
    user: any;
    sidebarOpen: boolean;
    setSidebarOpen: (isOpen: boolean) => void;
}

const EmployeeTopBar: React.FC<EmployeeTopBarProps> = ({ user, sidebarOpen, setSidebarOpen }) => {
    const { logout } = useAuth();
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [organization, setOrganization] = useState<Organization | null>(null);

    useEffect(() => {
        if (user?.organizationId) {
            loadOrganization();
        }
    }, [user?.organizationId]);

    const loadOrganization = async () => {
        if (!user?.organizationId) return;
        try {
            const org = await organizationService.getById(user.organizationId);
            setOrganization(org);
        } catch (err) {
            console.error('Error loading organization:', err);
        }
    };

    const orgName = organization?.name || 'Your Organization';

    return (
        <header className="bg-white border-b border-slate-200 h-16 px-4 flex items-center justify-between sticky top-0 z-10 w-full">
            <div className="flex items-center">
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="lg:hidden p-2 mr-3 text-slate-500 hover:bg-slate-100 rounded-lg"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>

                <div className="hidden md:flex items-center text-slate-900 font-bold text-lg">
                    <span className="mr-2">🏥</span>
                    <span>{orgName}</span>
                </div>
            </div>

            <div className="flex items-center space-x-4">
                <div className="relative">
                    <button
                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                        className="flex items-center space-x-3 hover:bg-slate-50 py-1 px-2 rounded-lg transition-colors"
                    >
                        <div className="text-right hidden md:block">
                            <div className="text-sm font-bold text-slate-900">{user?.name || 'Guest User'}</div>
                            <div className="text-xs text-slate-500">{user?.role || 'Employee'}</div>
                        </div>
                        <div className="w-9 h-9 bg-[#ccfbf1] text-[#0f766e] rounded-lg flex items-center justify-center font-bold border border-[#99f6e4]">
                            {user?.name ? user.name.split(' ').map((n: string) => n[0]).join('') : 'G'}
                        </div>
                    </button>

                    {showProfileMenu && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1 animate-in fade-in slide-in-from-top-2">
                            <div className="px-4 py-3 border-b border-slate-100 md:hidden">
                                <div className="text-sm font-bold text-slate-900">{user?.name || 'Guest User'}</div>
                                <div className="text-xs text-slate-500">{user?.role || 'Employee'}</div>
                            </div>
                            <button
                                onClick={logout}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-bold flex items-center"
                            >
                                <span className="mr-2">🚪</span> Log Out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default EmployeeTopBar;
