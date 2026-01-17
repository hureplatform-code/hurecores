import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { staffService } from '../../lib/services/staff.service';
import { leaveService } from '../../lib/services/leave.service';
import { organizationService } from '../../lib/services/organization.service';

const ManagerDashboard: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        pendingLeave: 0,
        expiringLicenses: 0,
        totalStaff: 0,
    });
    const [recentStaff, setRecentStaff] = useState<any[]>([]);

    useEffect(() => {
        if (user?.organizationId) {
            loadDashboardData();
        }
    }, [user?.organizationId]);

    const loadDashboardData = async () => {
        if (!user?.organizationId) return;

        setLoading(true);
        try {
            // Load various stats
            const [staff, locations] = await Promise.all([
                staffService.getAll(user.organizationId),
                organizationService.getLocations(user.organizationId)
            ]);

            // Count expiring licenses
            const expiringLicenses = locations.filter(l => {
                if (!l.licenseExpiry) return false;
                const expiry = new Date(l.licenseExpiry);
                const now = new Date();
                const daysDiff = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
                return daysDiff < 30 && daysDiff > 0;
            }).length;

            setStats({
                pendingLeave: 0, // Would come from leave service
                expiringLicenses,
                totalStaff: staff.length,
            });

            // Get recent staff for activity (show last 3 added)
            setRecentStaff(staff.slice(0, 3));
        } catch (err) {
            console.error('Error loading dashboard:', err);
        } finally {
            setLoading(false);
        }
    };

    const statsCards = [
        { title: 'Total Staff', count: stats.totalStaff, icon: '👥', color: 'bg-blue-100 text-blue-700', link: '/employee/manager/staff' },
        { title: 'Pending Leave', count: stats.pendingLeave, icon: '🏖️', color: 'bg-amber-100 text-amber-700', link: '/employee/manager/leave' },
        { title: 'Expiring Licenses', count: stats.expiringLicenses, icon: '📄', color: 'bg-red-100 text-red-700', link: '/employee/manager/documents' },
    ];

    if (loading) {
        return (
            <div className="p-8 max-w-7xl mx-auto flex items-center justify-center h-64">
                <div className="animate-spin text-4xl">⏳</div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto flex flex-col animate-in fade-in duration-500">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900">Manager Dashboard</h2>
                <p className="text-slate-500">Overview of team performance and HR tasks.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {statsCards.map((stat, i) => (
                    <NavLink
                        key={i}
                        to={stat.link}
                        className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all group"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${stat.color}`}>
                                {stat.icon}
                            </div>
                            <div className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                View
                            </div>
                        </div>
                        <div className="text-3xl font-bold text-slate-900 mb-1">{stat.count}</div>
                        <div className="text-sm font-bold text-slate-500">{stat.title}</div>
                    </NavLink>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                    <h3 className="text-xl font-bold mb-6">Team Members</h3>
                    {recentStaff.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="text-4xl mb-2 opacity-20">👥</div>
                            <p className="text-slate-500">No team members yet</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {recentStaff.map((member, i) => (
                                <div key={i} className="flex items-center space-x-4 pb-6 border-b border-slate-50 last:border-0 last:pb-0">
                                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-lg font-bold text-slate-600">
                                        {member.fullName?.split(' ').map((n: string) => n[0]).join('') || '?'}
                                    </div>
                                    <div>
                                        <div className="text-sm text-slate-900">
                                            <span className="font-bold">{member.fullName || 'Unknown'}</span>
                                        </div>
                                        <div className="text-xs text-slate-400 font-bold uppercase mt-1">
                                            {member.systemRole || 'Staff'} • {member.email}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="text-xl font-bold mb-4">Quick Stats</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-white/10">
                                <span className="text-slate-300">Total Staff</span>
                                <span className="font-bold text-green-400">{stats.totalStaff}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-white/10">
                                <span className="text-slate-300">Pending Leave</span>
                                <span className="font-bold text-amber-400">{stats.pendingLeave}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-white/10">
                                <span className="text-slate-300">Expiring Licenses</span>
                                <span className="font-bold text-red-400">{stats.expiringLicenses}</span>
                            </div>
                        </div>
                        <NavLink
                            to="/employee/manager/schedule"
                            className="block w-full mt-8 bg-white text-slate-900 font-bold py-3 rounded-xl hover:bg-blue-50 transition-colors text-center"
                        >
                            View Schedule
                        </NavLink>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManagerDashboard;
