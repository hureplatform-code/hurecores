import React from 'react';
import { NavLink } from 'react-router-dom';
import { NAVIGATION_ICONS } from '../../constants';

interface EmployerSidebarProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    userRole: string;
}

const EmployerSidebar: React.FC<EmployerSidebarProps> = ({ isOpen, setIsOpen, userRole }) => {
    const menuSections = [
        {
            title: 'Main',
            items: [
                { name: 'Dashboard', icon: NAVIGATION_ICONS.Dashboard, path: '/employer', end: true },
                { name: 'Staff Management', icon: NAVIGATION_ICONS.Staff, path: '/employer/staff' },
                { name: 'Schedule', icon: NAVIGATION_ICONS.Schedule, path: '/employer/schedule' },
                { name: 'Attendance', icon: NAVIGATION_ICONS.Attendance, path: '/employer/attendance' },
                { name: 'Leave', icon: NAVIGATION_ICONS.Leave, path: '/employer/leave' },
            ]
        },
        {
            title: 'Finance',
            items: [
                { name: 'Payroll (export)', icon: NAVIGATION_ICONS.Payroll, path: '/employer/payroll' },
                { name: 'Payroll Rules', icon: '🔒', path: '/employer/payroll-rules' },
                { name: 'Reports', icon: '📊', path: '/employer/reports' },
            ]
        },
        {
            title: 'Admin',
            items: [
                { name: 'Organization Details', icon: '🏢', path: '/employer/organization' },
                { name: 'Locations & Facilities', icon: '📍', path: '/employer/locations' },
                { name: 'Billing & Settings', icon: NAVIGATION_ICONS.Billing, path: '/employer/billing' },
                { name: 'Settings / Rules', icon: '⚙️', path: '/employer/settings-rules' },
                { name: 'Permissions', icon: '🔐', path: '/employer/permissions' },
                { name: 'Docs / Policies', icon: '📄', path: '/employer/documents' },
                { name: 'Audit log', icon: '📋', path: '/employer/audit' },
            ]
        }
    ];

    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={`fixed inset-0 bg-slate-900/50 z-20 transition-opacity lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsOpen(false)}
            />

            {/* Sidebar - Dark Teal Theme (CareStint style) */}
            <aside className={`fixed lg:static inset-y-0 left-0 z-30 transition-all duration-300 flex flex-col ${isOpen ? 'w-64' : 'w-20 lg:w-20 -translate-x-full lg:translate-x-0'}`}
                style={{ background: 'linear-gradient(180deg, #1a2e35 0%, #152428 100%)' }}
            >
                {/* Header with Logo */}
                <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#4fd1c5' }}>
                            <span className="text-[#1a2e35] font-bold text-sm">HC</span>
                        </div>
                        {isOpen && (
                            <div>
                                <span className="text-white font-bold text-lg">HURE Core</span>
                                <p className="text-xs" style={{ color: '#4fd1c5' }}>Staff management</p>
                            </div>
                        )}
                    </div>
                    <button onClick={() => setIsOpen(!isOpen)} className="lg:hidden p-2 text-white/70 hover:text-white">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Section Label */}
                {isOpen && (
                    <div className="px-4 pt-4 pb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#4fd1c5', opacity: 0.6 }}>MAIN</span>
                    </div>
                )}

                <nav className="flex-grow overflow-y-auto py-2 space-y-1">
                    {menuSections.map((section, sectionIndex) => (
                        <div key={section.title}>
                            {sectionIndex > 0 && isOpen && (
                                <div className="px-4 pt-4 pb-2">
                                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#4fd1c5', opacity: 0.6 }}>{section.title}</span>
                                </div>
                            )}
                            {sectionIndex > 0 && !isOpen && <div className="h-4" />}

                            <div className="space-y-0.5 px-2">
                                {section.items.map((item) => (
                                    <NavLink
                                        key={item.name}
                                        to={item.path}
                                        end={item.end}
                                        className={({ isActive }) => `flex items-center px-3 py-2.5 rounded-xl transition-all ${isActive
                                            ? 'text-[#1a2e35] shadow-lg'
                                            : 'text-white/70 hover:bg-white/10 hover:text-white'
                                            }`}
                                        style={({ isActive }) => isActive ? { backgroundColor: '#4fd1c5' } : {}}
                                    >
                                        <div className="shrink-0 w-6 h-6 flex items-center justify-center text-lg">
                                            {typeof item.icon === 'string' ? item.icon : item.icon}
                                        </div>
                                        {isOpen && <span className="ml-3 font-medium text-sm">{item.name}</span>}
                                    </NavLink>
                                ))}
                            </div>
                        </div>
                    ))}


                    {/* Help Section - Moved inside nav to scroll with content */}
                    {isOpen && (
                        <div className="mt-auto px-2 pb-4 pt-6">
                            <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(79, 209, 197, 0.1)' }}>
                                <p className="text-white/50 text-xs mb-2">Need help?</p>
                                <button
                                    className="w-full text-[#1a2e35] text-sm font-semibold py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center space-x-2 hover:opacity-90"
                                    style={{ backgroundColor: '#4fd1c5' }}
                                >
                                    <span>💬</span>
                                    <span>WhatsApp Support</span>
                                </button>
                            </div>
                        </div>
                    )}
                </nav>

                {/* Footer / Toggle for Desktop */}
                <div className="p-3 border-t border-white/10 hidden lg:flex justify-end">
                    <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-white/40 hover:bg-white/10 hover:text-white rounded-lg transition-colors">
                        {isOpen ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                        )}
                    </button>
                </div>
            </aside >
        </>
    );
};

export default EmployerSidebar;
