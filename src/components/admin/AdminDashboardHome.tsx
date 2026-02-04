import React, { useState, useEffect } from 'react';
import { adminService } from '../../lib/services';
import type { PlatformStats, AuditLogEntry } from '../../types';

const AdminDashboardHome: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<PlatformStats | null>(null);
    const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [statsData, logsData] = await Promise.all([
                adminService.getPlatformStats(),
                adminService.getAuditLogs(10)
            ]);
            setStats(statsData);
            setAuditLogs(logsData);
        } catch (error) {
            console.error('Error loading admin dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await loadData();
        setIsRefreshing(false);
    };

    const getTimeAgo = (timestamp: string) => {
        const now = new Date();
        const then = new Date(timestamp);
        const diffMs = now.getTime() - then.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    };

    const getEventTypeColor = (eventType: string) => {
        if (eventType.includes('Approve') || eventType.includes('Success')) return 'bg-green-500';
        if (eventType.includes('Reject') || eventType.includes('Fail')) return 'bg-red-500';
        return 'bg-blue-500';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Platform Overview</h2>
                    <p className="text-slate-500">Real-time insight into platform performance.</p>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className={`px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2 ${isRefreshing ? 'opacity-70 cursor-wait' : ''}`}
                >
                    <span className={isRefreshing ? 'animate-spin' : ''}>🔄</span> Refresh Data
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="p-6 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm text-xl">🏥</div>
                        <span className="text-[10px] bg-black/20 px-2 py-1 rounded-lg font-bold uppercase tracking-wider">Live</span>
                    </div>
                    <div className="text-3xl font-bold tracking-tight mb-1">{stats?.totalOrganizations || 0}</div>
                    <div className="text-sm font-medium text-white/80">Total Organizations</div>
                </div>

                <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-lg">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm text-xl">✅</div>
                        <span className="text-[10px] bg-black/20 px-2 py-1 rounded-lg font-bold uppercase tracking-wider">Live</span>
                    </div>
                    <div className="text-3xl font-bold tracking-tight mb-1">{stats?.verifiedOrganizations || 0}</div>
                    <div className="text-sm font-medium text-white/80">Verified Organizations</div>
                </div>

                <div className="p-6 rounded-3xl bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-lg">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm text-xl">👥</div>
                        <span className="text-[10px] bg-black/20 px-2 py-1 rounded-lg font-bold uppercase tracking-wider">Live</span>
                    </div>
                    <div className="text-3xl font-bold tracking-tight mb-1">{stats?.totalUsers || 0}</div>
                    <div className="text-sm font-medium text-white/80">Total Users</div>
                </div>

                <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm text-xl">⏳</div>
                        <span className="text-[10px] bg-black/20 px-2 py-1 rounded-lg font-bold uppercase tracking-wider">Live</span>
                    </div>
                    <div className="text-3xl font-bold tracking-tight mb-1">{stats?.pendingVerifications || 0}</div>
                    <div className="text-sm font-medium text-white/80">Pending Verifications</div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Plans Overview */}
                <div className="xl:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Subscription Distribution</h3>
                    <div className="space-y-4">
                        <h4 className="text-xs font-extrabold text-blue-600 uppercase tracking-widest mb-4">Active Plans</h4>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <span className="font-bold text-slate-700">Essential</span>
                                <div className="flex items-center gap-4">
                                    <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-slate-500 rounded-full" style={{ width: `${((stats?.planDistribution?.Essential || 0) / (stats?.totalOrganizations || 1)) * 100}%` }}></div>
                                    </div>
                                    <span className="font-mono font-bold text-slate-900 min-w-[40px] text-right">{stats?.planDistribution?.Essential || 0}</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-blue-50 rounded-xl border border-blue-100">
                                <span className="font-bold text-blue-800">Professional</span>
                                <div className="flex items-center gap-4">
                                    <div className="w-32 h-2 bg-blue-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-600 rounded-full" style={{ width: `${((stats?.planDistribution?.Professional || 0) / (stats?.totalOrganizations || 1)) * 100}%` }}></div>
                                    </div>
                                    <span className="font-mono font-bold text-blue-900 min-w-[40px] text-right">{stats?.planDistribution?.Professional || 0}</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-purple-50 rounded-xl border border-purple-100">
                                <span className="font-bold text-purple-800">Enterprise</span>
                                <div className="flex items-center gap-4">
                                    <div className="w-32 h-2 bg-purple-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-purple-600 rounded-full" style={{ width: `${((stats?.planDistribution?.Enterprise || 0) / (stats?.totalOrganizations || 1)) * 100}%` }}></div>
                                    </div>
                                    <span className="font-mono font-bold text-purple-900 min-w-[40px] text-right">{stats?.planDistribution?.Enterprise || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Audit */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-slate-800">Recent Audit Events</h3>
                        <a href="#/admin/audit" className="text-xs font-bold text-blue-600 hover:underline">View Log</a>
                    </div>
                    <div className="flex-grow space-y-6">
                        {auditLogs.length === 0 ? (
                            <p className="text-center text-slate-500 py-8">No recent events</p>
                        ) : (
                            auditLogs.map((event) => (
                                <div key={event.id} className="flex gap-3">
                                    <div className={`w-2 min-w-[8px] rounded-full mt-1.5 h-2 ${getEventTypeColor(event.eventType)} shadow-sm`}></div>
                                    <div>
                                        <div className="text-sm font-bold text-slate-900">{event.eventType}</div>
                                        <div className="text-xs text-slate-500">{event.description} • {getTimeAgo(event.createdAt)}</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboardHome;
