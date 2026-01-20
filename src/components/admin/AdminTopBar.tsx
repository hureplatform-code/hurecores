import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { formatDateKE } from '../../lib/utils/dateFormat';

interface AdminTopBarProps {
    toggleSidebar: () => void;
}

const AdminTopBar: React.FC<AdminTopBarProps> = ({ toggleSidebar }) => {
    const { logout, user } = useAuth();

    return (
        <header className="bg-white border-b border-slate-200 h-16 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30">
            <div className="flex items-center gap-4">
                <button
                    onClick={toggleSidebar}
                    className="p-2 -ml-2 text-slate-500 hover:bg-slate-50 rounded-lg lg:hidden"
                >
                    <span className="text-xl">☰</span>
                </button>
                <div className="text-sm text-slate-500 hidden md:block">
                    {formatDateKE(new Date())}
                </div>
            </div>

            <div className="flex items-center gap-6">
                {/* Quick visual indicator of Super Admin status */}
                <div className="hidden md:flex flex-col items-end">
                    <span className="text-sm font-bold text-slate-900">{user?.name || 'Super Admin'}</span>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md uppercase tracking-wide">System Owner</span>
                </div>

                <div className="h-8 w-[1px] bg-slate-200 hidden md:block"></div>

                <button
                    onClick={logout}
                    className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl font-bold text-sm transition-all group"
                >
                    <span>Logout</span>
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                </button>
            </div>
        </header>
    );
};

export default AdminTopBar;
