import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { staffService } from '../../lib/services/staff.service';
import { leaveService } from '../../lib/services/leave.service';
import { organizationService } from '../../lib/services/organization.service';
import { attendanceService } from '../../lib/services/attendance.service';

const ManagerDashboard: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        pendingLeave: 0,
        expiringLicenses: 0,
        totalStaff: 0,
        presentToday: 0,
        totalHoursToday: 0,
    });
    const [recentStaff, setRecentStaff] = useState<any[]>([]);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Determine permissions
    const isOwner = user?.systemRole === 'OWNER';
    const permissions = user?.permissions;

    useEffect(() => {
        if (user?.organizationId) {
            loadDashboardData();
        }

        // Update time every minute
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000);

        return () => clearInterval(timer);
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

            // Load today's attendance
            let presentToday = 0;
            let totalHoursToday = 0;
            try {
                const today = new Date().toISOString().split('T')[0];
                const todayAttendance = await attendanceService.getByDateRange(
                    user.organizationId,
                    today,
                    today
                );
                presentToday = todayAttendance.filter(r =>
                    r.status === 'Present' || r.status === 'Worked' || r.status === 'Partial'
                ).length;
                totalHoursToday = todayAttendance.reduce((sum, r) => sum + (r.totalHours || 0), 0);
            } catch (err) {
                console.error('Error loading attendance:', err);
            }

            // Load pending leave count
            let pendingLeave = 0;
            try {
                const leaveRequests = await leaveService.getPendingRequests(user.organizationId);
                pendingLeave = leaveRequests.length;
            } catch (err) {
                console.error('Error loading leave:', err);
            }

            // Count expiring licenses
            const expiringLicenses = locations.filter(l => {
                if (!l.licenseExpiry) return false;
                const expiry = new Date(l.licenseExpiry);
                const now = new Date();
                const daysDiff = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
                return daysDiff < 30 && daysDiff > 0;
            }).length;

            setStats({
                pendingLeave,
                expiringLicenses,
                totalStaff: staff.length,
                presentToday,
                totalHoursToday,
            });

            // Get recent staff for activity (show last 5 added)
            setRecentStaff(staff.slice(0, 5));
        } catch (err) {
            console.error('Error loading dashboard:', err);
        } finally {
            setLoading(false);
        }
    };

    // Build stats cards based on permissions
    const getStatsCards = () => {
        const cards = [];

        // Staff Management
        if (isOwner || permissions?.staffManagement) {
            cards.push({
                title: 'Total Staff',
                count: stats.totalStaff,
                icon: '👥',
                color: 'bg-blue-100 text-blue-700',
                link: '/employee/manager/staff'
            });
        }

        // Attendance
        if (isOwner || permissions?.attendance) {
            cards.push({
                title: 'Present Today',
                count: stats.presentToday,
                icon: '✅',
                color: 'bg-emerald-100 text-emerald-700',
                link: '/employee/manager/attendance'
            });
        }

        // Leave
        if (isOwner || permissions?.leave) {
            cards.push({
                title: 'Pending Leave',
                count: stats.pendingLeave,
                icon: '🏖️',
                color: 'bg-amber-100 text-amber-700',
                link: '/employee/manager/leave'
            });
        }

        // Documents
        if (isOwner || permissions?.documentsAndPolicies) {
            cards.push({
                title: 'Expiring Licenses',
                count: stats.expiringLicenses,
                icon: '📄',
                color: 'bg-red-100 text-red-700',
                link: '/employee/manager/documents'
            });
        }

        return cards;
    };

    const statsCards = getStatsCards();

    if (loading) {
        return (
            <div className="p-8 max-w-7xl mx-auto flex items-center justify-center h-64">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto flex flex-col animate-in fade-in duration-500">
            {/* Header with Welcome */}
            <div className="mb-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">
                            Good {currentTime.getHours() < 12 ? 'Morning' : currentTime.getHours() < 17 ? 'Afternoon' : 'Evening'}, {user?.name?.split(' ')[0] || 'Manager'}! 👋
                        </h2>
                        <p className="text-slate-500">Here's what's happening with your team today.</p>
                    </div>
                    <div className="mt-4 md:mt-0 text-right">
                        <div className="text-2xl font-bold text-slate-900">
                            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-sm text-slate-500">
                            {currentTime.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            {statsCards.length > 0 && (
                <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${Math.min(statsCards.length, 4)} gap-6 mb-12`}>
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
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Team Members */}
                {(isOwner || permissions?.staffManagement) && (
                    <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold">Team Members</h3>
                            <NavLink
                                to="/employee/manager/staff"
                                className="text-sm font-bold text-blue-600 hover:text-blue-700"
                            >
                                View All →
                            </NavLink>
                        </div>
                        {recentStaff.length === 0 ? (
                            <div className="text-center py-8">
                                <div className="text-4xl mb-2 opacity-20">👥</div>
                                <p className="text-slate-500">No team members yet</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {recentStaff.map((member, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                                        <div className="flex items-center space-x-4">
                                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                                                {member.fullName?.charAt(0) || '?'}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900">{member.fullName || 'Unknown'}</div>
                                                <div className="text-xs text-slate-500">
                                                    {member.jobTitle || member.systemRole} • {member.email}
                                                </div>
                                            </div>
                                        </div>
                                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${member.staffStatus === 'Active'
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-slate-100 text-slate-600'
                                            }`}>
                                            {member.staffStatus || 'Active'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Quick Stats Panel */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl"></div>
                    <div className="relative z-10">
                        <h3 className="text-xl font-bold mb-6">Today's Overview</h3>
                        <div className="space-y-4">
                            {(isOwner || permissions?.attendance) && (
                                <>
                                    <div className="flex justify-between items-center py-3 border-b border-white/10">
                                        <span className="text-slate-300">Present</span>
                                        <span className="font-bold text-emerald-400">{stats.presentToday} staff</span>
                                    </div>
                                    <div className="flex justify-between items-center py-3 border-b border-white/10">
                                        <span className="text-slate-300">Hours Worked</span>
                                        <span className="font-bold text-blue-400">{stats.totalHoursToday.toFixed(1)} hrs</span>
                                    </div>
                                </>
                            )}
                            {(isOwner || permissions?.leave) && (
                                <div className="flex justify-between items-center py-3 border-b border-white/10">
                                    <span className="text-slate-300">Pending Leave</span>
                                    <span className="font-bold text-amber-400">{stats.pendingLeave}</span>
                                </div>
                            )}
                            {(isOwner || permissions?.staffManagement) && (
                                <div className="flex justify-between items-center py-3">
                                    <span className="text-slate-300">Total Staff</span>
                                    <span className="font-bold text-white">{stats.totalStaff}</span>
                                </div>
                            )}
                        </div>

                        {(isOwner || permissions?.scheduling) && (
                            <NavLink
                                to="/employee/manager/schedule"
                                className="block w-full mt-8 bg-white text-slate-900 font-bold py-3 px-4 rounded-xl hover:bg-blue-50 transition-colors text-center"
                            >
                                📅 View Schedule
                            </NavLink>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManagerDashboard;
