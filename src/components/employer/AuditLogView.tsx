import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { auditService } from '../../lib/services';
import DateInput from '../common/DateInput';

interface AuditLogEntry {
    id: string;
    action: string;
    entityType: string;
    entityId?: string;
    entityName?: string;
    actorId: string;
    actorEmail?: string;
    actorName?: string;
    details?: Record<string, any>;
    timestamp: string;
    ipAddress?: string;
}

const AuditLogView: React.FC = () => {
    const { user } = useAuth();
    const [entries, setEntries] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({
        action: '',
        entityType: '',
        startDate: '',
        endDate: ''
    });

    useEffect(() => {
        loadAuditLog();
    }, [user?.organizationId]);

    const loadAuditLog = async () => {
        if (!user?.organizationId) return;

        setLoading(true);
        try {
            const logs = await auditService.getAuditLogs(user.organizationId, {
                startDate: filter.startDate || undefined,
                endDate: filter.endDate || undefined,
                action: filter.action || undefined,
                entityType: filter.entityType || undefined
            });
            setEntries(logs);
        } catch (error) {
            console.error('Error loading audit log:', error);
            setEntries([]);
        } finally {
            setLoading(false);
        }
    };

    const getActionBadge = (action: string) => {
        const colors: Record<string, string> = {
            'CREATE': 'bg-emerald-100 text-emerald-700',
            'UPDATE': 'bg-blue-100 text-blue-700',
            'DELETE': 'bg-red-100 text-red-700',
            'LOGIN': 'bg-purple-100 text-purple-700',
            'LOGOUT': 'bg-slate-100 text-slate-600',
            'APPROVE': 'bg-green-100 text-green-700',
            'REJECT': 'bg-orange-100 text-orange-700',
            'MARK_PAID': 'bg-teal-100 text-teal-700',
            'FINALIZE': 'bg-indigo-100 text-indigo-700'
        };
        return colors[action] || 'bg-slate-100 text-slate-600';
    };

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        return {
            date: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            time: date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Audit Log</h2>
                <p className="text-slate-500 mt-1">Track all actions and changes in your organization</p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Action Type</label>
                        <select
                            value={filter.action}
                            onChange={e => setFilter(p => ({ ...p, action: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        >
                            <option value="">All Actions</option>
                            <option value="CREATE">Create</option>
                            <option value="UPDATE">Update</option>
                            <option value="DELETE">Delete</option>
                            <option value="LOGIN">Login</option>
                            <option value="APPROVE">Approve</option>
                            <option value="REJECT">Reject</option>
                            <option value="MARK_PAID">Mark Paid</option>
                            <option value="FINALIZE">Finalize</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Entity Type</label>
                        <select
                            value={filter.entityType}
                            onChange={e => setFilter(p => ({ ...p, entityType: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        >
                            <option value="">All Types</option>
                            <option value="staff">Staff</option>
                            <option value="schedule">Schedule</option>
                            <option value="attendance">Attendance</option>
                            <option value="leave">Leave</option>
                            <option value="payroll">Payroll</option>
                            <option value="organization">Organization</option>
                        </select>
                    </div>
                    <div>
                        <DateInput
                            label="From Date"
                            value={filter.startDate}
                            onChange={(value) => setFilter(p => ({ ...p, startDate: value }))}
                        />
                    </div>
                    <div>
                        <DateInput
                            label="To Date"
                            value={filter.endDate}
                            onChange={(value) => setFilter(p => ({ ...p, endDate: value }))}
                        />
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={loadAuditLog}
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
                        >
                            Apply Filters
                        </button>
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={async () => {
                                setLoading(true);
                                await auditService.logAction(user?.organizationId || '', 'TEST', 'manual_test', { details: { description: 'User verified audit logs' } });
                                setTimeout(loadAuditLog, 1000); // Wait for propagation
                            }}
                            className="w-full px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-300"
                        >
                            + Test Log
                        </button>
                    </div>
                </div>
            </div>

            {/* Audit Log Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Timestamp</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Action</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Entity</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Actor</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {entries.map((entry) => {
                            const { date, time } = formatTimestamp(entry.timestamp);
                            return (
                                <tr key={entry.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-slate-900">{date}</div>
                                        <div className="text-xs text-slate-500">{time}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getActionBadge(entry.action)}`}>
                                            {entry.action}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-slate-900">{entry.entityType}</div>
                                        {entry.entityName && (
                                            <div className="text-xs text-slate-500">{entry.entityName}</div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-slate-900">{entry.actorName || entry.actorEmail || 'System'}</div>
                                        {entry.actorEmail && entry.actorName && (
                                            <div className="text-xs text-slate-500">{entry.actorEmail}</div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        {entry.details ? (
                                            <div className="text-xs space-y-1">
                                                {Object.entries(entry.details).map(([key, value]) => (
                                                    <div key={key} className="flex gap-1">
                                                        <span className="font-semibold text-slate-700 capitalize">{key.replace(/_/g, ' ')}:</span>
                                                        <span className="text-slate-600 break-all">
                                                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : '—'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {entries.length === 0 && (
                    <div className="p-12 text-center">
                        <div className="text-4xl mb-4">📋</div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">No audit log entries</h3>
                        <p className="text-slate-500">Actions in your organization will be recorded here</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AuditLogView;
