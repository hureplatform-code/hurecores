// =====================================================
// AUDIT LOG MANAGER
// Displays all platform audit events with proper context
// Required fields: Action, Entity Type, Entity Name, Actor, Timestamp
// =====================================================

import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import {
    collection,
    query,
    getDocs,
    orderBy,
    limit
} from 'firebase/firestore';

// =====================================================
// INTERFACES
// =====================================================

interface AuditLogEntry {
    id: string;
    action: string;
    category?: string;
    entityType: string;
    entityName: string;
    performedBy?: string;
    performedByEmail: string;
    reason?: string;
    details?: {
        plan?: string;
        amount?: number;
        paymentMethod?: string;
        oldPricing?: any;
        newPricing?: any;
    };
    createdAt: any;
}

// =====================================================
// COMPONENT
// =====================================================

const AuditLogManager: React.FC = () => {
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState<string>('All');
    const [searchQuery, setSearchQuery] = useState('');

    // =====================================================
    // DATA LOADING
    // =====================================================

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        setLoading(true);
        try {
            const logsQuery = query(
                collection(db, 'auditLogs'),
                orderBy('createdAt', 'desc'),
                limit(100)
            );
            const logsSnap = await getDocs(logsQuery);

            const logsData = logsSnap.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as AuditLogEntry))
                // Filter out generic "By: System" rows with no action context
                .filter(log => {
                    // Must have action
                    if (!log.action || log.action.trim() === '') return false;
                    // Must have entity name (not just "Unknown" or empty)
                    if (!log.entityName || log.entityName === 'Unknown') return false;
                    // Must have proper actor info
                    if (!log.performedByEmail && log.performedBy === 'system') {
                        // Only allow system logs if they have meaningful action
                        return log.action.includes('suspended') ||
                            log.action.includes('expired') ||
                            log.action.includes('activated');
                    }
                    return true;
                });

            setLogs(logsData);
        } catch (error) {
            console.error('Error loading audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    // =====================================================
    // FILTERING
    // =====================================================

    const getFilteredLogs = () => {
        let filtered = logs;

        if (filterType !== 'All') {
            filtered = filtered.filter(log => log.entityType === filterType);
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(log =>
                log.action?.toLowerCase().includes(q) ||
                log.entityName?.toLowerCase().includes(q) ||
                log.performedByEmail?.toLowerCase().includes(q)
            );
        }

        return filtered;
    };

    // =====================================================
    // HELPERS
    // =====================================================

    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'N/A';
        if (timestamp.seconds) {
            const date = new Date(timestamp.seconds * 1000);
            return date.toLocaleString();
        }
        return 'N/A';
    };

    const getEntityTypeBadge = (type: string) => {
        switch (type) {
            case 'Organization': return 'bg-blue-100 text-blue-700';
            case 'Facility': return 'bg-teal-100 text-teal-700';
            case 'Subscription': return 'bg-purple-100 text-purple-700';
            case 'Pricing': return 'bg-amber-100 text-amber-700';
            default: return 'bg-slate-100 text-slate-600';
        }
    };

    const getActionIcon = (action: string) => {
        const lowerAction = action.toLowerCase();
        if (lowerAction.includes('approved') || lowerAction.includes('enabled') || lowerAction.includes('activated') || lowerAction.includes('reactivated')) {
            return '✅';
        }
        if (lowerAction.includes('suspended') || lowerAction.includes('rejected')) {
            return '⛔';
        }
        if (lowerAction.includes('pricing') || lowerAction.includes('plan')) {
            return '💰';
        }
        if (lowerAction.includes('created') || lowerAction.includes('registered')) {
            return '➕';
        }
        return '📋';
    };

    // =====================================================
    // RENDER
    // =====================================================

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin text-4xl">⏳</div>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-500">
            {/* Filters */}
            <div className="flex items-center gap-4 mb-6">
                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="All">All Entity Types</option>
                    <option value="Organization">Organization</option>
                    <option value="Facility">Facility</option>
                    <option value="Subscription">Subscription</option>
                    <option value="Pricing">Pricing</option>
                </select>

                <input
                    type="text"
                    placeholder="🔍 Search logs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 max-w-md bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <div className="text-sm text-slate-500">
                    {getFilteredLogs().length} entries
                </div>
            </div>

            {/* Audit Log Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                        <tr>
                            <th className="px-6 py-4">Action</th>
                            <th className="px-6 py-4">Entity Type</th>
                            <th className="px-6 py-4">Entity Name</th>
                            <th className="px-6 py-4">Actor</th>
                            <th className="px-6 py-4">Timestamp</th>
                            <th className="px-6 py-4">Context</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {getFilteredLogs().length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                    No audit logs found.
                                </td>
                            </tr>
                        ) : (
                            getFilteredLogs().map(log => (
                                <tr key={log.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span>{getActionIcon(log.action)}</span>
                                            <span className="font-medium text-slate-900">{log.action}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getEntityTypeBadge(log.entityType)}`}>
                                            {log.entityType}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-medium text-slate-700">{log.entityName}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm">
                                            {log.performedByEmail ? (
                                                <span className="text-slate-700">{log.performedByEmail}</span>
                                            ) : (
                                                <span className="text-slate-400 italic">System</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">
                                        {formatDate(log.createdAt)}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">
                                        <div className="max-w-[200px]">
                                            {log.details?.plan && <span>Plan: {log.details.plan}</span>}
                                            {log.details?.amount && <span className="ml-2">Amount: KES {log.details.amount.toLocaleString()}</span>}
                                            {log.reason && (
                                                <div className="text-xs text-slate-400 mt-1 truncate" title={log.reason}>
                                                    Reason: {log.reason}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AuditLogManager;
