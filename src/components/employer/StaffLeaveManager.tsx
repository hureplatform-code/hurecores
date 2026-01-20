import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { leaveEntitlementService } from '../../lib/services';
import type { LeaveEntitlement, Profile } from '../../types';

interface StaffLeaveManagerProps {
    staffId: string;
    organizationId: string;
}

const StaffLeaveManager: React.FC<StaffLeaveManagerProps> = ({ staffId, organizationId }) => {
    const { user } = useAuth();
    const [entitlements, setEntitlements] = useState<LeaveEntitlement[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<number>(0);
    const [editReason, setEditReason] = useState('');
    const [saving, setSaving] = useState(false);

    const loadEntitlements = async () => {
        setLoading(true);
        try {
            const data = await leaveEntitlementService.getStaffEntitlements(organizationId, staffId);
            setEntitlements(data);

            // If no entitlements but we are here, maybe try to init?
            if (data.length === 0) {
                await leaveEntitlementService.initializeStaffEntitlements(organizationId, staffId);
                const retryData = await leaveEntitlementService.getStaffEntitlements(organizationId, staffId);
                setEntitlements(retryData);
            }
        } catch (error) {
            console.error('Failed to load leave entitlements:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadEntitlements();
    }, [staffId, organizationId]);

    const handleEdit = (ent: LeaveEntitlement) => {
        setEditingId(ent.id);
        setEditValue(ent.allocatedDays);
        setEditReason(ent.overrideReason || '');
    };

    const handleSave = async (entId: string) => {
        setSaving(true);
        try {
            await leaveEntitlementService.updateAllocation(
                organizationId,
                entId,
                editValue,
                editReason || 'Admin override',
                user?.uid || 'admin'
            );
            setEditingId(null);
            loadEntitlements();
        } catch (error) {
            console.error('Failed to update allocation:', error);
            alert('Failed to update allocation');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-4 text-center text-slate-500">Loading leave data...</div>;

    return (
        <div className="space-y-4">
            <h3 className="font-bold text-slate-900 border-b pb-2">Leave Allocations</h3>

            {entitlements.length === 0 ? (
                <p className="text-sm text-slate-500 italic">No leave entitlements set for this staff member.</p>
            ) : (
                <div className="space-y-3">
                    {entitlements.map(ent => (
                        <div key={ent.id} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <div className="font-bold text-slate-900">{ent.leaveType?.name || 'Unknown Type'}</div>
                                    <div className="text-xs text-slate-500">
                                        {ent.usedDays} used • {Math.max(0, ent.allocatedDays + (ent.carriedForwardDays || 0) - ent.usedDays - (ent.pendingDays || 0))} remaining
                                    </div>
                                </div>
                                {editingId !== ent.id && (
                                    <button
                                        onClick={() => handleEdit(ent)}
                                        className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded"
                                    >
                                        Edit
                                    </button>
                                )}
                            </div>

                            {editingId === ent.id ? (
                                <div className="mt-3 bg-white p-3 rounded-lg border border-blue-200 animate-in fade-in slide-in-from-top-1">
                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Total Allocated Days</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={editValue}
                                                onChange={(e) => setEditValue(Number(e.target.value))}
                                                className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Reason for change</label>
                                            <input
                                                type="text"
                                                value={editReason}
                                                onChange={(e) => setEditReason(e.target.value)}
                                                placeholder="e.g. Agreement, Bonus"
                                                className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => setEditingId(null)}
                                            disabled={saving}
                                            className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => handleSave(ent.id)}
                                            disabled={saving}
                                            className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                                        >
                                            {saving ? 'Saving...' : 'Save Changes'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-4 text-sm mt-2">
                                    <div className="flex items-center gap-1.5" title="Total days allocated for this year">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                                        <span className="text-slate-600">Total: <span className="font-semibold text-slate-900">{ent.allocatedDays} items</span></span>
                                    </div>
                                    {(ent.isOverridden) && (
                                        <span className="text-amber-600 text-xs bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                                            Modified
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default StaffLeaveManager;
