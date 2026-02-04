import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { scheduleService, staffService, organizationService, leaveService, settingsService } from '../../lib/services';
import type { Shift, ShiftAssignment, Profile, Location } from '../../types';
import { JOB_TITLES } from '../../types';
import KenyaPhoneInput from '../common/KenyaPhoneInput';
import { formatDateKE } from '../../lib/utils/dateFormat';
import DateInput from '../common/DateInput';

interface LocumForm {
    name: string;
    phone: string;
    rateCents: number;
    supervisorId: string;
    notes: string;
}

// Roles that can be assigned to shifts (excludes administrative roles)
const SHIFT_ROLES = JOB_TITLES.filter(role =>
    !['HR', 'Administrator', 'Accounts / Finance', 'Operations Manager', 'IT / Systems', 'Support Staff', 'Other (custom)'].includes(role)
);

const ScheduleManager: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [staff, setStaff] = useState<Profile[]>([]);
    const [selectedLocation, setSelectedLocation] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
    const [schedulingEnabled, setSchedulingEnabled] = useState(true);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
    const [showLocumModal, setShowLocumModal] = useState(false);

    // Create Shift form state
    const [newShift, setNewShift] = useState({
        locationId: '',
        date: selectedDate,
        startTime: '08:00',
        endTime: '17:00',
        roleRequired: '',
        staffNeeded: 1,
        notes: ''
    });

    // Repeat shift state
    const [repeatEnabled, setRepeatEnabled] = useState(false);
    const [repeatDays, setRepeatDays] = useState<number[]>([]); // 0=Sun, 1=Mon, etc.
    const [repeatEndDate, setRepeatEndDate] = useState('');

    // Edit Shift form state
    const [editShift, setEditShift] = useState({
        date: '',
        startTime: '',
        endTime: '',
        roleRequired: '',
        staffNeeded: 1,
        notes: ''
    });

    const [locumForm, setLocumForm] = useState<LocumForm>({
        name: '',
        phone: '',
        rateCents: 0,
        supervisorId: '',
        notes: ''
    });

    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // View shift confirmation dialog state
    const [showViewShiftDialog, setShowViewShiftDialog] = useState(false);
    const [createdShiftDate, setCreatedShiftDate] = useState<string>('');
    const [createdShiftCount, setCreatedShiftCount] = useState(0);
    const [phoneValid, setPhoneValid] = useState(false);

    useEffect(() => {
        loadData();
    }, [user?.organizationId, selectedDate, selectedLocation]);

    const loadData = async () => {
        if (!user?.organizationId) return;

        setLoading(true);
        try {
            // Calculate week range (Monday start)
            const date = new Date(selectedDate);
            const day = date.getDay();
            const diff = date.getDate() - day + (day === 0 ? -6 : 1);
            const startOfWeek = new Date(date);
            startOfWeek.setDate(diff);
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);

            const [shiftsData, locationsData, staffData, settingsData] = await Promise.all([
                scheduleService.getShifts(user.organizationId, {
                    startDate: startOfWeek.toISOString().split('T')[0],
                    endDate: endOfWeek.toISOString().split('T')[0],
                    locationId: selectedLocation || undefined
                }),
                organizationService.getLocations(user.organizationId),
                staffService.getAll(user.organizationId),
                settingsService.getSettings(user.organizationId)
            ]);

            setShifts(shiftsData);
            setLocations(locationsData);
            setStaff(staffData.filter(s => s.staffStatus === 'Active'));
            setSchedulingEnabled(settingsData.scheduling?.enabled ?? true);
        } catch (error) {
            console.error('Error loading schedule:', error);
        } finally {
            setLoading(false);
        }
    };

    // Generate dates for repeat shifts
    const generateRepeatDates = (startDate: string, endDate: string, days: number[]): string[] => {
        const dates: string[] = [];
        const start = new Date(startDate);
        const end = new Date(endDate);

        // Always include the initial date
        dates.push(startDate);

        // Add subsequent dates based on selected days
        const current = new Date(start);
        current.setDate(current.getDate() + 1); // Start from next day

        while (current <= end) {
            if (days.includes(current.getDay())) {
                dates.push(current.toISOString().split('T')[0]);
            }
            current.setDate(current.getDate() + 1);
        }

        return dates;
    };

    const handleCreateShift = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.organizationId) return;

        setError('');
        setSuccessMessage('');

        try {
            let datesToCreate = [newShift.date];

            // If repeat is enabled, generate all dates
            if (repeatEnabled && repeatDays.length > 0 && repeatEndDate) {
                datesToCreate = generateRepeatDates(newShift.date, repeatEndDate, repeatDays);
            }

            // Create shifts for all dates
            let createdCount = 0;
            for (const date of datesToCreate) {
                await scheduleService.createShift(user.organizationId, {
                    ...newShift,
                    date
                });
                createdCount++;
            }

            setShowCreateModal(false);

            // Store the created shift info for the confirmation dialog
            const shiftDate = newShift.date;

            // Reset form
            setNewShift({
                locationId: '',
                date: selectedDate,
                startTime: '08:00',
                endTime: '17:00',
                roleRequired: '',
                staffNeeded: 1,
                notes: ''
            });
            setRepeatEnabled(false);
            setRepeatDays([]);
            setRepeatEndDate('');

            // Show confirmation dialog to ask if user wants to view the created shift(s)
            setCreatedShiftDate(shiftDate);
            setCreatedShiftCount(createdCount);
            setShowViewShiftDialog(true);
            // Note: loadData() is called after dialog choice in handleViewCreatedShift/handleSkipViewShift
        } catch (err: any) {
            setError(err.message || 'Failed to create shift');
        }
    };

    // Handle navigation to created shift's week
    const handleViewCreatedShift = () => {
        setSelectedDate(createdShiftDate);
        setShowViewShiftDialog(false);
        setSuccessMessage(`Navigated to shift on ${formatDateKE(createdShiftDate)}`);
        setTimeout(() => setSuccessMessage(''), 3000);
        // Reload data to show the newly created shift
        loadData();
    };

    const handleSkipViewShift = () => {
        setShowViewShiftDialog(false);
        setSuccessMessage(`Created ${createdShiftCount} shift${createdShiftCount > 1 ? 's' : ''} successfully!`);
        setTimeout(() => setSuccessMessage(''), 3000);
        // Reload data to show the newly created shift (if in current week)
        loadData();
    };

    const openEditModal = (shift: Shift) => {
        setSelectedShift(shift);
        setEditShift({
            date: shift.date,
            startTime: shift.startTime,
            endTime: shift.endTime,
            roleRequired: shift.roleRequired || '',
            staffNeeded: shift.staffNeeded,
            notes: shift.notes || ''
        });
        setShowEditModal(true);
    };

    const handleUpdateShift = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.organizationId || !selectedShift) return;

        setError('');
        try {
            await scheduleService.updateShift(user.organizationId, selectedShift.id, editShift);
            setShowEditModal(false);
            setSelectedShift(null);
            setSuccessMessage('Shift updated successfully!');
            setTimeout(() => setSuccessMessage(''), 3000);
            loadData();
        } catch (err: any) {
            setError(err.message || 'Failed to update shift');
        }
    };

    const handleDeleteShift = async (shiftId: string) => {
        if (!user?.organizationId) return;
        if (!confirm('Are you sure you want to delete this shift? This action cannot be undone.')) return;

        try {
            await scheduleService.deleteShift(user.organizationId, shiftId);
            setSuccessMessage('Shift deleted successfully!');
            setTimeout(() => setSuccessMessage(''), 3000);
            loadData();
        } catch (err: any) {
            alert(err.message || 'Failed to delete shift');
        }
    };

    const handleAssignStaff = async (staffId: string) => {
        if (!user?.organizationId || !selectedShift) return;

        const result = await scheduleService.assignStaff(user.organizationId, selectedShift.id, {
            staffId,
            isLocum: false
        });

        if (result.success) {
            loadData();
            setShowAssignModal(false);
            setSelectedShift(null);
        } else {
            alert(result.error);
        }
    };

    const handleAssignLocum = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.organizationId || !selectedShift) return;

        const result = await scheduleService.assignStaff(user.organizationId, selectedShift.id, {
            isLocum: true,
            locumName: locumForm.name,
            locumPhone: locumForm.phone,
            locumRateCents: locumForm.rateCents,
            supervisorId: locumForm.supervisorId,
            notes: locumForm.notes
        });

        if (result.success) {
            loadData();
            setShowLocumModal(false);
            setSelectedShift(null);
            setLocumForm({ name: '', phone: '', rateCents: 0, supervisorId: '', notes: '' });
        } else {
            alert(result.error);
        }
    };

    const handleRemoveAssignment = async (assignmentId: string) => {
        if (!user?.organizationId) return;
        if (!confirm('Remove this assignment?')) return;

        await scheduleService.removeAssignment(user.organizationId, assignmentId);
        loadData();
    };

    const openAssignModal = (shift: Shift) => {
        setSelectedShift(shift);
        setShowAssignModal(true);
    };

    const openLocumModal = (shift: Shift) => {
        setSelectedShift(shift);
        setShowLocumModal(true);
    };

    // Group shifts by date for week view
    const shiftsByDate: Record<string, Shift[]> = {};
    shifts.forEach(shift => {
        if (!shiftsByDate[shift.date]) {
            shiftsByDate[shift.date] = [];
        }
        shiftsByDate[shift.date].push(shift);
    });

    // Generate week dates (Monday start)
    const getWeekDates = () => {
        // Parse date with T12:00:00 to avoid timezone issues
        const date = new Date(selectedDate + 'T12:00:00');
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        const startOfWeek = new Date(date);
        startOfWeek.setDate(diff);

        const dates = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(startOfWeek);
            d.setDate(startOfWeek.getDate() + i);
            // Format to YYYY-MM-DD in local timezone
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const dayOfMonth = String(d.getDate()).padStart(2, '0');
            dates.push(`${year}-${month}-${dayOfMonth}`);
        }
        return dates;
    };

    const weekDates = getWeekDates();
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    // Get available staff for assignment (filtered by job title matching role required)
    const getAvailableStaff = (shift: Shift) => {
        const assignedIds = shift.assignments?.map(a => a.staffId) || [];
        let availableStaff = staff.filter(s => !assignedIds.includes(s.id));

        // Filter by job title if role is specified
        if (shift.roleRequired) {
            availableStaff = availableStaff.filter(s =>
                s.jobTitle?.toLowerCase() === shift.roleRequired?.toLowerCase()
            );
        }

        return availableStaff;
    };

    // Toggle day selection for repeat
    const toggleRepeatDay = (day: number) => {
        setRepeatDays(prev =>
            prev.includes(day)
                ? prev.filter(d => d !== day)
                : [...prev, day]
        );
    };

    if (loading && shifts.length === 0) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="animate-spin w-8 h-8 border-4 border-[#4fd1c5] border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-[#1a2e35]">Schedule Manager</h2>
                    <p className="text-slate-500 mt-1">{shifts.length} shifts this week</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-[#1a2e35] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#152428] transition-colors shadow-md flex items-center gap-2"
                >
                    <span className="text-[#4fd1c5] font-bold">+</span>
                    <span className="text-[#4fd1c5]">Create Shift</span>
                </button>
            </div>

            {!schedulingEnabled ? (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center max-w-2xl mx-auto">
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">⚠️</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Shift Scheduling is Disabled</h3>
                    <p className="text-slate-600 mb-6">
                        Scheduling features are currently disabled for your organization.
                        Enable them in Settings to start managing shifts and assignments.
                    </p>
                    <a
                        href="/employer/settings"
                        className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-slate-900 hover:bg-slate-800 transition-colors"
                    >
                        Go to Settings
                    </a>
                </div>
            ) : (
                <>

                    {/* Success Message */}
                    {successMessage && (
                        <div className="bg-[#e0f2f1] border border-[#4fd1c5]/30 text-[#0f766e] px-4 py-3 rounded-xl mb-4 flex items-center justify-between">
                            <span>✓ {successMessage}</span>
                            <button onClick={() => setSuccessMessage('')} className="text-[#0f766e] hover:text-[#1a2e35]">✕</button>
                        </div>
                    )}

                    {/* Filters */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 flex flex-wrap gap-4 items-end">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Week Of</label>
                            <DateInput
                                value={selectedDate}
                                onChange={(value) => setSelectedDate(value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Location</label>
                            <select
                                value={selectedLocation}
                                onChange={(e) => setSelectedLocation(e.target.value)}
                                className="px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#4fd1c5] outline-none"
                            >
                                <option value="">All Locations</option>
                                {locations.map(loc => (
                                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Week View */}
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                        <div className="grid grid-cols-7 border-b border-slate-200">
                            {weekDates.map((date, i) => {
                                // Get today's date in local timezone YYYY-MM-DD format
                                const today = new Date();
                                const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                                const isToday = date === todayStr;
                                // Parse with T12:00:00 to avoid timezone shift
                                const dateDay = new Date(date + 'T12:00:00').getDate();
                                return (
                                    <div key={date} className={`p-4 text-center border-r border-slate-100 last:border-r-0 ${isToday ? 'bg-[#e0f2f1]' : ''}`}>
                                        <div className="text-xs font-semibold text-slate-500 uppercase">{dayNames[i]}</div>
                                        <div className={`text-lg font-bold ${isToday ? 'text-[#0f766e]' : 'text-slate-900'}`}>
                                            {dateDay}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="grid grid-cols-7 min-h-[400px]">
                            {weekDates.map((date) => {
                                const dayShifts = shiftsByDate[date] || [];
                                // Parse with T12:00:00 to avoid timezone issues
                                const isPast = new Date(date + 'T12:00:00') < new Date(new Date().toDateString());

                                return (
                                    <div key={date} className={`border-r border-slate-100 last:border-r-0 p-2 ${isPast ? 'bg-slate-50' : ''}`}>
                                        {dayShifts.map(shift => {
                                            const assignedCount = shift.assignments?.length || 0;
                                            const isFull = assignedCount >= shift.staffNeeded;

                                            return (
                                                <div
                                                    key={shift.id}
                                                    className={`mb-2 p-3 rounded-xl border ${isFull
                                                        ? 'bg-[#e0f2f1] border-[#4fd1c5]/30'
                                                        : 'bg-amber-50 border-amber-200'
                                                        }`}
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <div className="text-xs font-bold text-slate-700">
                                                            {shift.startTime} - {shift.endTime}
                                                        </div>
                                                        {!isPast && (
                                                            <div className="flex gap-1">
                                                                <button
                                                                    onClick={() => openEditModal(shift)}
                                                                    className="text-blue-500 hover:text-blue-700 text-xs"
                                                                    title="Edit Shift"
                                                                >
                                                                    ✏️
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteShift(shift.id)}
                                                                    className="text-red-500 hover:text-red-700 text-xs"
                                                                    title="Delete Shift"
                                                                >
                                                                    🗑️
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-slate-600 mt-1">
                                                        {shift.location?.name || 'Unknown'}
                                                    </div>
                                                    {shift.roleRequired && (
                                                        <div className="text-xs text-slate-500 mt-1 bg-white/50 px-2 py-0.5 rounded inline-block">{shift.roleRequired}</div>
                                                    )}
                                                    <div className={`text-xs mt-2 font-semibold ${isFull ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                        {assignedCount}/{shift.staffNeeded} assigned
                                                    </div>

                                                    {/* Assigned staff */}
                                                    {shift.assignments && shift.assignments.length > 0 && (
                                                        <div className="mt-2 space-y-1">
                                                            {shift.assignments.map(assignment => (
                                                                <div key={assignment.id} className="flex items-center justify-between text-xs">
                                                                    <span className={assignment.isLocum ? 'text-purple-600' : 'text-slate-600'}>
                                                                        {assignment.isLocum ? `🔄 ${assignment.locumName}` : assignment.staff?.fullName}
                                                                    </span>
                                                                    {!isPast && (
                                                                        <button
                                                                            onClick={() => handleRemoveAssignment(assignment.id)}
                                                                            className="text-red-500 hover:text-red-700"
                                                                        >
                                                                            ✕
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Assign buttons */}
                                                    {!isPast && !isFull && (
                                                        <div className="mt-2 flex gap-1">
                                                            <button
                                                                onClick={() => openAssignModal(shift)}
                                                                className="flex-1 text-xs bg-blue-600 text-white py-1 px-2 rounded hover:bg-blue-700"
                                                            >
                                                                + Staff
                                                            </button>
                                                            <button
                                                                onClick={() => openLocumModal(shift)}
                                                                className="flex-1 text-xs bg-purple-600 text-white py-1 px-2 rounded hover:bg-purple-700"
                                                            >
                                                                + Locum
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}

                                        {dayShifts.length === 0 && !isPast && (
                                            <div className="text-center py-8 text-slate-400 text-xs">
                                                No shifts
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Create Shift Modal */}
                    {showCreateModal && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
                            <div className="bg-white rounded-2xl w-full max-w-md p-6 m-4 my-8">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold text-slate-900">Create Shift</h2>
                                    <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                                </div>

                                {error && (
                                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4">
                                        {error}
                                    </div>
                                )}

                                <form onSubmit={handleCreateShift} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Location *</label>
                                        <select
                                            required
                                            value={newShift.locationId}
                                            onChange={(e) => setNewShift(prev => ({ ...prev, locationId: e.target.value }))}
                                            className="w-full px-4 py-3 border border-slate-300 rounded-xl"
                                        >
                                            <option value="">Select Location</option>
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
                                            onChange={(value) => setNewShift(prev => ({ ...prev, date: value }))}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Start Time *</label>
                                            <input
                                                type="time"
                                                required
                                                value={newShift.startTime}
                                                onChange={(e) => setNewShift(prev => ({ ...prev, startTime: e.target.value }))}
                                                className="w-full px-4 py-3 border border-slate-300 rounded-xl"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">End Time *</label>
                                            <input
                                                type="time"
                                                required
                                                value={newShift.endTime}
                                                onChange={(e) => setNewShift(prev => ({ ...prev, endTime: e.target.value }))}
                                                className="w-full px-4 py-3 border border-slate-300 rounded-xl"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Role Required</label>
                                            <select
                                                value={newShift.roleRequired}
                                                onChange={(e) => setNewShift(prev => ({ ...prev, roleRequired: e.target.value }))}
                                                className="w-full px-4 py-3 border border-slate-300 rounded-xl"
                                            >
                                                <option value="">Any Role</option>
                                                {SHIFT_ROLES.map(role => (
                                                    <option key={role} value={role}>{role}</option>
                                                ))}
                                            </select>
                                            <p className="text-xs text-slate-400 mt-1">Staff will be filtered by this role when assigning</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Staff Needed *</label>
                                            <input
                                                type="number"
                                                min="1"
                                                required
                                                value={newShift.staffNeeded}
                                                onChange={(e) => setNewShift(prev => ({ ...prev, staffNeeded: parseInt(e.target.value) }))}
                                                className="w-full px-4 py-3 border border-slate-300 rounded-xl"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Notes</label>
                                        <textarea
                                            value={newShift.notes}
                                            onChange={(e) => setNewShift(prev => ({ ...prev, notes: e.target.value }))}
                                            className="w-full px-4 py-3 border border-slate-300 rounded-xl"
                                            rows={2}
                                            placeholder="Optional notes for this shift..."
                                        />
                                    </div>

                                    {/* Repeat Section */}
                                    <div className="border-t border-slate-200 pt-4">
                                        <label className="flex items-center space-x-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={repeatEnabled}
                                                onChange={(e) => setRepeatEnabled(e.target.checked)}
                                                className="w-5 h-5 text-blue-600 rounded"
                                            />
                                            <span className="text-sm font-semibold text-slate-700">Repeat this shift</span>
                                        </label>

                                        {repeatEnabled && (
                                            <div className="mt-4 space-y-4 bg-slate-50 p-4 rounded-xl">
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-600 mb-2">Repeat on days</label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {[
                                                            { label: 'Mon', value: 1 },
                                                            { label: 'Tue', value: 2 },
                                                            { label: 'Wed', value: 3 },
                                                            { label: 'Thu', value: 4 },
                                                            { label: 'Fri', value: 5 },
                                                            { label: 'Sat', value: 6 },
                                                            { label: 'Sun', value: 0 },
                                                        ].map(({ label, value }) => (
                                                            <button
                                                                key={label}
                                                                type="button"
                                                                onClick={() => toggleRepeatDay(value)}
                                                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${repeatDays.includes(value)
                                                                    ? 'bg-blue-600 text-white'
                                                                    : 'bg-white border border-slate-300 text-slate-600 hover:border-blue-500'
                                                                    }`}
                                                            >
                                                                {label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <DateInput
                                                        label="Repeat until"
                                                        value={repeatEndDate}
                                                        onChange={(value) => setRepeatEndDate(value)}
                                                        min={newShift.date}
                                                    />
                                                </div>
                                                {repeatDays.length > 0 && repeatEndDate && (
                                                    <p className="text-xs text-blue-600">
                                                        Will create {generateRepeatDates(newShift.date, repeatEndDate, repeatDays).length} shifts
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex space-x-3 mt-6">
                                        <button
                                            type="button"
                                            onClick={() => setShowCreateModal(false)}
                                            className="flex-1 py-3 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-50"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
                                        >
                                            {repeatEnabled && repeatDays.length > 0 && repeatEndDate
                                                ? `Create ${generateRepeatDates(newShift.date, repeatEndDate, repeatDays).length} Shifts`
                                                : 'Create Shift'
                                            }
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Edit Shift Modal */}
                    {showEditModal && selectedShift && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-2xl w-full max-w-md p-6 m-4">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold text-slate-900">Edit Shift</h2>
                                    <button onClick={() => { setShowEditModal(false); setSelectedShift(null); }} className="text-slate-400 hover:text-slate-600">✕</button>
                                </div>

                                {error && (
                                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4">
                                        {error}
                                    </div>
                                )}

                                <form onSubmit={handleUpdateShift} className="space-y-4">
                                    <div>
                                        <DateInput
                                            label="Date"
                                            required
                                            value={editShift.date}
                                            onChange={(value) => setEditShift(prev => ({ ...prev, date: value }))}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Start Time *</label>
                                            <input
                                                type="time"
                                                required
                                                value={editShift.startTime}
                                                onChange={(e) => setEditShift(prev => ({ ...prev, startTime: e.target.value }))}
                                                className="w-full px-4 py-3 border border-slate-300 rounded-xl"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">End Time *</label>
                                            <input
                                                type="time"
                                                required
                                                value={editShift.endTime}
                                                onChange={(e) => setEditShift(prev => ({ ...prev, endTime: e.target.value }))}
                                                className="w-full px-4 py-3 border border-slate-300 rounded-xl"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Role Required</label>
                                            <select
                                                value={editShift.roleRequired}
                                                onChange={(e) => setEditShift(prev => ({ ...prev, roleRequired: e.target.value }))}
                                                className="w-full px-4 py-3 border border-slate-300 rounded-xl"
                                            >
                                                <option value="">Any Role</option>
                                                {SHIFT_ROLES.map(role => (
                                                    <option key={role} value={role}>{role}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Staff Needed *</label>
                                            <input
                                                type="number"
                                                min="1"
                                                required
                                                value={editShift.staffNeeded}
                                                onChange={(e) => setEditShift(prev => ({ ...prev, staffNeeded: parseInt(e.target.value) }))}
                                                className="w-full px-4 py-3 border border-slate-300 rounded-xl"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Notes</label>
                                        <textarea
                                            value={editShift.notes}
                                            onChange={(e) => setEditShift(prev => ({ ...prev, notes: e.target.value }))}
                                            className="w-full px-4 py-3 border border-slate-300 rounded-xl"
                                            rows={2}
                                        />
                                    </div>

                                    <div className="flex space-x-3 mt-6">
                                        <button
                                            type="button"
                                            onClick={() => { setShowEditModal(false); setSelectedShift(null); }}
                                            className="flex-1 py-3 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-50"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
                                        >
                                            Save Changes
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Assign Staff Modal */}
                    {showAssignModal && selectedShift && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-2xl w-full max-w-md p-6 m-4 max-h-[80vh] overflow-y-auto">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold text-slate-900">Assign Staff</h2>
                                    <button onClick={() => { setShowAssignModal(false); setSelectedShift(null); }} className="text-slate-400 hover:text-slate-600">✕</button>
                                </div>

                                <div className="bg-slate-50 rounded-xl p-4 mb-4">
                                    <div className="font-medium text-slate-900">{selectedShift.startTime} - {selectedShift.endTime}</div>
                                    <div className="text-sm text-slate-500">{selectedShift.date} • {selectedShift.location?.name}</div>
                                    {selectedShift.roleRequired && (
                                        <div className="mt-2">
                                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                                Role: {selectedShift.roleRequired}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {selectedShift.roleRequired && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                                        <p className="text-sm text-amber-700">
                                            ℹ️ Only showing staff with job title matching "{selectedShift.roleRequired}"
                                        </p>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    {getAvailableStaff(selectedShift).length === 0 ? (
                                        <div className="text-center py-8">
                                            <p className="text-slate-500">No available staff</p>
                                            {selectedShift.roleRequired && (
                                                <p className="text-sm text-slate-400 mt-2">
                                                    No staff with job title "{selectedShift.roleRequired}" found.
                                                    <br />Consider adding a locum or changing the role requirement.
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        getAvailableStaff(selectedShift).map(member => (
                                            <button
                                                key={member.id}
                                                onClick={() => handleAssignStaff(member.id)}
                                                className="w-full flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors"
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                                                        {member.fullName?.charAt(0)}
                                                    </div>
                                                    <div className="text-left">
                                                        <div className="font-medium text-slate-900">{member.fullName}</div>
                                                        <div className="text-sm text-slate-500">{member.jobTitle || 'Staff'}</div>
                                                    </div>
                                                </div>
                                                <span className="text-blue-600 font-semibold">Assign</span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Assign Locum Modal */}
                    {showLocumModal && selectedShift && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-2xl w-full max-w-md p-6 m-4">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold text-slate-900">Assign External Locum</h2>
                                    <button onClick={() => { setShowLocumModal(false); setSelectedShift(null); }} className="text-slate-400 hover:text-slate-600">✕</button>
                                </div>

                                <form onSubmit={handleAssignLocum} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Locum Name *</label>
                                        <input
                                            type="text"
                                            required
                                            value={locumForm.name}
                                            onChange={(e) => setLocumForm(prev => ({ ...prev, name: e.target.value }))}
                                            className="w-full px-4 py-3 border border-slate-300 rounded-xl"
                                            placeholder="e.g., Dr. Jane Smith"
                                        />
                                    </div>

                                    <div>
                                        <KenyaPhoneInput
                                            value={locumForm.phone}
                                            onChange={(normalized, isValid) => {
                                                setLocumForm(prev => ({ ...prev, phone: normalized }));
                                                setPhoneValid(isValid);
                                            }}
                                            label="Phone"
                                            required={false}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Rate (KES per shift)</label>
                                        <input
                                            type="number"
                                            value={locumForm.rateCents / 100 || ''}
                                            onChange={(e) => setLocumForm(prev => ({ ...prev, rateCents: Number(e.target.value) * 100 }))}
                                            className="w-full px-4 py-3 border border-slate-300 rounded-xl"
                                            placeholder="e.g., 3000"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Supervisor</label>
                                        <select
                                            value={locumForm.supervisorId}
                                            onChange={(e) => setLocumForm(prev => ({ ...prev, supervisorId: e.target.value }))}
                                            className="w-full px-4 py-3 border border-slate-300 rounded-xl"
                                        >
                                            <option value="">Select Supervisor</option>
                                            {staff.filter(s => s.systemRole === 'OWNER' || s.systemRole === 'ADMIN').map(member => (
                                                <option key={member.id} value={member.id}>{member.fullName}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex space-x-3 mt-6">
                                        <button
                                            type="button"
                                            onClick={() => { setShowLocumModal(false); setSelectedShift(null); }}
                                            className="flex-1 py-3 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-50"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700"
                                        >
                                            Assign Locum
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* View Created Shift Confirmation Dialog */}
                    {showViewShiftDialog && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-2xl w-full max-w-md p-6 m-4 text-center">
                                <div className="text-4xl mb-4">✅</div>
                                <h2 className="text-xl font-bold text-slate-900 mb-2">
                                    Shift{createdShiftCount > 1 ? 's' : ''} Created Successfully!
                                </h2>
                                <p className="text-slate-600 mb-6">
                                    {createdShiftCount > 1
                                        ? `${createdShiftCount} shifts have been created starting from ${formatDateKE(createdShiftDate)}.`
                                        : `Your shift on ${formatDateKE(createdShiftDate)} has been created.`
                                    }
                                </p>
                                <p className="text-slate-700 font-medium mb-6">
                                    Would you like to view the shift{createdShiftCount > 1 ? 's' : ''} you created?
                                </p>
                                <div className="flex space-x-3">
                                    <button
                                        onClick={handleSkipViewShift}
                                        className="flex-1 py-3 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-50"
                                    >
                                        No, Stay Here
                                    </button>
                                    <button
                                        onClick={handleViewCreatedShift}
                                        className="flex-1 py-3 bg-[#1a2e35] text-[#4fd1c5] rounded-xl font-semibold hover:bg-[#152428]"
                                    >
                                        Yes, View Shift{createdShiftCount > 1 ? 's' : ''}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                </>
            )}
        </div>
    );
};

export default ScheduleManager;
