import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { scheduleService, staffService, locationService } from '../../lib/services';
import DateInput from '../common/DateInput';
import type { Shift, ShiftAssignment } from '../../types';

interface StaffMember {
    id: string;
    fullName: string;
    email: string;
    jobTitle?: string;
}

interface Location {
    id: string;
    name: string;
}

const ManagerSchedule: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newShift, setNewShift] = useState({
        locationId: '',
        date: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '17:00',
        staffNeeded: 1,
        notes: ''
    });

    useEffect(() => {
        if (user?.organizationId) {
            loadData();
        }
    }, [user?.organizationId, selectedDate]);

    const loadData = async () => {
        if (!user?.organizationId) return;

        setLoading(true);
        try {
            // Load shifts for selected week
            const startOfWeek = new Date(selectedDate);
            startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(endOfWeek.getDate() + 6);

            const loadedShifts = await scheduleService.getShifts(
                user.organizationId,
                {
                    startDate: startOfWeek.toISOString().split('T')[0],
                    endDate: endOfWeek.toISOString().split('T')[0]
                }
            );
            setShifts(loadedShifts || []);

            // Load staff members
            const staff = await staffService.getAll(user.organizationId);
            setStaffMembers(staff);

            // Load locations
            const locs = await locationService.getByOrganization(user.organizationId);
            setLocations(locs);

            if (locs.length > 0 && !newShift.locationId) {
                setNewShift(prev => ({ ...prev, locationId: locs[0].id }));
            }
        } catch (error) {
            console.error('Error loading schedule data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateShift = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.organizationId) return;

        setCreating(true);
        try {
            await scheduleService.createShift(user.organizationId, {
                locationId: newShift.locationId,
                date: newShift.date,
                startTime: newShift.startTime,
                endTime: newShift.endTime,
                staffNeeded: newShift.staffNeeded,
                notes: newShift.notes
            });
            setShowCreateModal(false);
            setNewShift({
                locationId: locations[0]?.id || '',
                date: selectedDate,
                startTime: '09:00',
                endTime: '17:00',
                staffNeeded: 1,
                notes: ''
            });
            loadData();
        } catch (error: any) {
            console.error('Error creating shift:', error);
            alert(error.message || 'Failed to create shift');
        } finally {
            setCreating(false);
        }
    };

    const getWeekDays = () => {
        const startOfWeek = new Date(selectedDate);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

        const days = [];
        for (let i = 0; i < 7; i++) {
            const day = new Date(startOfWeek);
            day.setDate(day.getDate() + i);
            days.push(day);
        }
        return days;
    };

    const getShiftsForDay = (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        return shifts.filter(s => s.date === dateStr);
    };

    const weekDays = getWeekDays();

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Team Schedule</h2>
                    <p className="text-slate-500">Create and manage team shifts</p>
                </div>
                <div className="flex gap-3 mt-4 md:mt-0">
                    <DateInput
                        label=""
                        value={selectedDate}
                        onChange={(value) => setSelectedDate(value)}
                        className="w-48"
                    />
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                        <span>➕</span> Add Shift
                    </button>
                </div>
            </div>

            {/* Week View */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="grid grid-cols-7 border-b border-slate-200">
                    {weekDays.map((day, idx) => (
                        <div
                            key={idx}
                            className={`p-4 text-center border-r last:border-r-0 border-slate-100 ${day.toISOString().split('T')[0] === new Date().toISOString().split('T')[0]
                                ? 'bg-blue-50'
                                : 'bg-slate-50'
                                }`}
                        >
                            <div className="text-xs font-bold text-slate-500 uppercase">
                                {day.toLocaleDateString('en-GB', { weekday: 'short' })}
                            </div>
                            <div className={`text-lg font-bold ${day.toISOString().split('T')[0] === new Date().toISOString().split('T')[0]
                                ? 'text-blue-600'
                                : 'text-slate-900'
                                }`}>
                                {day.getDate()}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7 min-h-[300px]">
                    {weekDays.map((day, idx) => {
                        const dayShifts = getShiftsForDay(day);
                        return (
                            <div
                                key={idx}
                                className="p-2 border-r last:border-r-0 border-slate-100 min-h-[200px]"
                            >
                                {dayShifts.length > 0 ? (
                                    <div className="space-y-2">
                                        {dayShifts.map(shift => (
                                            <div
                                                key={shift.id}
                                                className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg text-xs"
                                            >
                                                <div className="font-bold">
                                                    {shift.startTime} - {shift.endTime}
                                                </div>
                                                <div className="opacity-80">
                                                    {shift.staffNeeded} staff needed
                                                </div>
                                                {shift.notes && (
                                                    <div className="opacity-70 mt-1 truncate">
                                                        {shift.notes}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-xs text-slate-400 text-center pt-4">
                                        No shifts
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Staff Summary */}
            <div className="mt-8 bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
                <h3 className="font-bold text-slate-900 mb-4">Team Members ({staffMembers.length})</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {staffMembers.slice(0, 12).map(staff => (
                        <div key={staff.id} className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                                {staff.fullName?.charAt(0) || 'U'}
                            </div>
                            <div className="overflow-hidden">
                                <div className="font-medium text-slate-900 text-sm truncate">{staff.fullName}</div>
                                <div className="text-xs text-slate-500 truncate">{staff.jobTitle || 'Staff'}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Create Shift Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-slate-900 mb-6">Create New Shift</h3>
                        <form onSubmit={handleCreateShift} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                                <select
                                    value={newShift.locationId}
                                    onChange={(e) => setNewShift({ ...newShift, locationId: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    {locations.map(loc => (
                                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <DateInput
                                    label="Date"
                                    required
                                    value={newShift.date}
                                    onChange={(value) => setNewShift({ ...newShift, date: value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Start Time</label>
                                    <input
                                        type="time"
                                        value={newShift.startTime}
                                        onChange={(e) => setNewShift({ ...newShift, startTime: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">End Time</label>
                                    <input
                                        type="time"
                                        value={newShift.endTime}
                                        onChange={(e) => setNewShift({ ...newShift, endTime: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Staff Needed</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={newShift.staffNeeded}
                                    onChange={(e) => setNewShift({ ...newShift, staffNeeded: parseInt(e.target.value) })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Notes (Optional)</label>
                                <textarea
                                    value={newShift.notes}
                                    onChange={(e) => setNewShift({ ...newShift, notes: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 resize-none"
                                    rows={2}
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-600 font-medium rounded-xl hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {creating ? 'Creating...' : 'Create Shift'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManagerSchedule;
