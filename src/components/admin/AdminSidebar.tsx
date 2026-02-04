import React from 'react';
import { NavLink } from 'react-router-dom';

interface AdminSidebarProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ isOpen, setIsOpen }) => {
    const navItems = [
        { name: 'Dashboard', path: '/admin', icon: '📊', end: true },
        { name: 'Pending Onboarding', path: '/admin/onboarding', icon: '⏳', badge: 3 },
        { name: 'Verifications', path: '/admin/verifications', icon: '✅', badge: 12 },
        { name: 'Clinics', path: '/admin/clinics', icon: '🏥' },
        { name: 'Transactions', path: '/admin/transactions', icon: '💳' },
        { name: 'Subscriptions', path: '/admin/subscriptions', icon: '📦' },
        { name: 'Audit Log', path: '/admin/audit', icon: '📋' },
    ];

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 z-20 lg:hidden backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`fixed top-0 left-0 z-30 h-screen w-72 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} shadow-2xl flex flex-col`}>
                <div className="h-20 flex items-center px-8 border-b border-slate-800 bg-slate-900">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-blue-500/20">
                            🛡️
                        </div>
                        <div>
                            <span className="text-xl font-bold font-display tracking-tight text-white">HURE <span className="text-blue-400">Admin</span></span>
                            <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">SuperAdmin Panel</span>
                        </div>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="lg:hidden ml-auto text-slate-400">✕</button>
                </div>

                <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.end}
                            onClick={() => setIsOpen(false)}
                            className={({ isActive }) => `flex items-center justify-between px-4 py-3.5 rounded-xl font-bold transition-all duration-200 group ${isActive
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                <span className="text-lg opacity-80 group-hover:opacity-100 transition-opacity">{item.icon}</span>
                                <span className="tracking-tight">{item.name}</span>
                            </div>
                            {item.badge && (
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold shadow-sm ${item.name === 'Pending Onboarding' ? 'bg-amber-500 text-amber-950' : 'bg-green-500 text-green-950'
                                    }`}>
                                    {item.badge}
                                </span>
                            )}
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">System Status</span>
                        </div>
                        <div className="text-xs font-mono text-slate-500">
                            v2.4.0 • Stable<br />
                            Server: US-East-1
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default AdminSidebar;
