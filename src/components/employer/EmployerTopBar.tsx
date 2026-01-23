import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTrialStatus } from '../../context/TrialContext';
import { notificationService } from '../../lib/services/notification.service';
import type { Organization, Location } from '../../types';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    link?: string;
    read: boolean;
    createdAt: any;
}

interface EmployerTopBarProps {
    organization?: Organization | null;
    locations?: Location[];
    selectedLocationId?: string;
    onLocationChange?: (locationId: string) => void;
    sidebarOpen: boolean;
    setSidebarOpen: (isOpen: boolean) => void;
}

const EmployerTopBar: React.FC<EmployerTopBarProps> = ({
    organization,
    locations = [],
    selectedLocationId,
    onLocationChange,
    sidebarOpen,
    setSidebarOpen
}) => {
    const { user, logout } = useAuth();
    const { isTrial, daysRemaining } = useTrialStatus(); // Use context
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotifications, setShowNotifications] = useState(false);
    const notifRef = useRef<HTMLDivElement>(null);

    const planName = organization?.plan || 'Professional';
    const orgName = organization?.name || 'Your Organization';

    useEffect(() => {
        if (user?.organizationId) {
            loadNotifications();
        }
    }, [user?.organizationId]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadNotifications = async () => {
        if (!user?.organizationId || !user?.id) return;
        try {
            const notifs = await notificationService.getUserNotifications(user.organizationId, user.id);
            setNotifications(notifs.slice(0, 10)); // Show last 10
            setUnreadCount(notifs.filter(n => !n.read).length);
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    };

    const handleMarkAllRead = async () => {
        if (!user?.organizationId || !user?.id) return;
        await notificationService.markAllAsRead(user.organizationId, user.id);
        loadNotifications();
    };

    const handleNotificationClick = async (notif: Notification) => {
        if (!notif.read && user?.organizationId) {
            await notificationService.markAsRead(user.organizationId, notif.id);
            loadNotifications();
        }
        if (notif.link) {
            window.location.href = notif.link;
        }
        setShowNotifications(false);
    };

    const formatTime = (timestamp: any) => {
        if (!timestamp) return '';
        const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    return (
        <header className="bg-white h-16 border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 z-10">
            <div className="flex items-center">
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="mr-4 lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" /></svg>
                </button>

                <div className="flex flex-col">
                    <h1 className="text-lg font-bold text-[#1a2e35] leading-tight">{orgName}</h1>
                    <div className="flex items-center space-x-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 rounded border ${isTrial
                            ? 'text-[#2FB7A3] bg-[#2FB7A3]/10 border-[#2FB7A3]/30'
                            : 'text-[#0f766e] bg-[#e0f2f1] border-[#4fd1c5]/30'
                            }`}>
                            {planName} {isTrial ? `Trial (${daysRemaining} days left)` : 'Plan'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex items-center space-x-4">
                {/* Location Dropdown */}
                {locations.length > 0 && (
                    <div className="hidden md:flex items-center bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                        <span className="text-lg mr-2">📍</span>
                        <select
                            className="bg-transparent text-sm font-semibold text-slate-700 focus:outline-none"
                            value={selectedLocationId || 'all'}
                            onChange={(e) => onLocationChange?.(e.target.value)}
                        >
                            <option value="all">All Locations</option>
                            {locations.map(loc => (
                                <option key={loc.id} value={loc.id}>{loc.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Notification Bell */}
                <div className="relative" ref={notifRef}>
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        {unreadCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {/* Notification Dropdown */}
                    {showNotifications && (
                        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50">
                            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                                <h3 className="font-bold text-slate-900">Notifications</h3>
                                {unreadCount > 0 && (
                                    <button
                                        onClick={handleMarkAllRead}
                                        className="text-xs text-[#0f766e] font-medium hover:underline hover:text-[#0d9488]"
                                    >
                                        Mark all read
                                    </button>
                                )}
                            </div>
                            <div className="max-h-80 overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="p-8 text-center">
                                        <div className="text-4xl mb-2">🔔</div>
                                        <p className="text-slate-500 text-sm">No notifications yet</p>
                                    </div>
                                ) : (
                                    notifications.map(notif => (
                                        <button
                                            key={notif.id}
                                            onClick={() => handleNotificationClick(notif)}
                                            className={`w-full text-left p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors ${!notif.read ? 'bg-teal-50/50' : ''}`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`w-2 h-2 rounded-full mt-2 ${!notif.read ? 'bg-teal-500' : 'bg-transparent'}`} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-slate-900 text-sm truncate">{notif.title}</p>
                                                    <p className="text-slate-500 text-xs mt-0.5 line-clamp-2">{notif.message}</p>
                                                    <p className="text-slate-400 text-[10px] mt-1">{formatTime(notif.createdAt)}</p>
                                                </div>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="h-8 w-px bg-slate-200 mx-2 hidden md:block"></div>

                <div className="flex items-center space-x-3 group relative">
                    <div className="text-right hidden md:block">
                        <div className="text-sm font-bold text-slate-900">{user?.name || 'User'}</div>
                        <div className="text-xs text-slate-500">{user?.role || user?.systemRole || 'Owner'}</div>
                    </div>
                    <button className="relative">
                        <div className="w-9 h-9 rounded-full border border-slate-200 shadow-sm bg-gradient-to-br from-[#1a2e35] to-[#152428] flex items-center justify-center text-[#4fd1c5] font-bold text-sm">
                            {user?.name?.charAt(0) || 'U'}
                        </div>
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#4fd1c5] border-2 border-white rounded-full"></div>
                    </button>

                    {/* Dropdown Menu */}
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                        <button
                            onClick={logout}
                            className="w-full text-left px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 first:rounded-t-xl last:rounded-b-xl flex items-center"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default EmployerTopBar;
