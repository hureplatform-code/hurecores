import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { attendanceService, organizationService, scheduleService } from '../../lib/services';
import type { AttendanceRecord, AttendanceStatus, Location, Shift } from '../../types';
import { JOB_TITLES } from '../../types';
import { formatDateKE } from '../../lib/utils/dateFormat';
import DateInput from '../common/DateInput';

// Roles for locum selection
const LOCUM_ROLES = JOB_TITLES.filter(role =>
    !['HR', 'Administrator', 'Accounts / Finance', 'Operations Manager', 'IT / Systems', 'Support Staff', 'Other (custom)'].includes(role)
);

interface LocumShiftWithAttendance extends Shift {
    attendanceStatus?: 'Scheduled' | 'Worked' | 'No-show';
    attendanceId?: string;
}

const AttendanceView: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [locumShifts, setLocumShifts] = useState<LocumShiftWithAttendance[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [selectedLocation, setSelectedLocation] = useState<string>('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [showManualModal, setShowManualModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'employees' | 'external'>('employees');
    const [summary, setSummary] = useState({ present: 0, partial: 0, absent: 0, onLeave: 0, totalHours: 0, locumScheduled: 0 });

    useEffect(() => {
        // Set default date range to current month
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        setDateRange({
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0]
        });
    }, []);

    useEffect(() => {
        if (user?.organizationId && dateRange.start && dateRange.end) {
            loadData();
        }
    }, [user?.organizationId, dateRange, selectedLocation, activeTab]);

    const loadData = async () => {
        if (!user?.organizationId) return;

        setLoading(true);
        try {
            const [recordsData, locationsData, summaryData, shiftsData] = await Promise.all([
                attendanceService.getByDateRange(
                    user.organizationId,
                    dateRange.start,
                    dateRange.end,
                    selectedLocation || undefined
                ),
                organizationService.getLocations(user.organizationId),
                attendanceService.getTodaySummary(user.organizationId, selectedLocation || undefined),
                scheduleService.getShifts(user.organizationId, {
                    startDate: dateRange.start,
                    endDate: dateRange.end,
                    locationId: selectedLocation || undefined
                })
            ]);

            // Separate employee attendance from external
            const employeeRecords = recordsData.filter(r => !r.isExternal);
            const externalRecords = recordsData.filter(r => r.isExternal);

            // Process locum shifts - merge with any existing external attendance
            const locumShiftsWithStatus: LocumShiftWithAttendance[] = shiftsData
                .filter(shift => shift.assignments?.some(a => a.isLocum))
                .map(shift => {
                    // Find matching external attendance record
                    const matchingAttendance = externalRecords.find(
                        r => r.date === shift.date &&
                            r.shiftId === shift.id
                    );
                    return {
                        ...shift,
                        attendanceStatus: matchingAttendance?.status as 'Scheduled' | 'Worked' | 'No-show' || 'Scheduled',
                        attendanceId: matchingAttendance?.id
                    };
                });

            setRecords(employeeRecords);
            setLocumShifts(locumShiftsWithStatus);
            setLocations(locationsData);
            setSummary({
                present: summaryData.presentCount,
                partial: summaryData.partialCount,
                absent: summaryData.absentCount,
                onLeave: summaryData.onLeaveCount,
                totalHours: summaryData.totalHoursWorked,
                locumScheduled: locumShiftsWithStatus.length
            });
        } catch (error) {
            console.error('Error loading attendance:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: AttendanceStatus | 'Scheduled') => {
        const styles: Record<string, string> = {
            'Present': 'bg-emerald-100 text-emerald-700',
            'Worked': 'bg-emerald-100 text-emerald-700',
            'Scheduled': 'bg-blue-100 text-blue-700',
            'Partial': 'bg-amber-100 text-amber-700',
            'Absent': 'bg-red-100 text-red-700',
            'No-show': 'bg-red-100 text-red-700',
            'On Leave': 'bg-purple-100 text-purple-700'
        };
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status] || 'bg-slate-100 text-slate-600'}`}>
                {status}
            </span>
        );
    };

    const formatTime = (timeString?: string) => {
        if (!timeString) return '-';
        // Handle both ISO strings and HH:MM format
        if (timeString.includes('T')) {
            return new Date(timeString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        }
        return timeString;
    };

    const handleUpdateLocumStatus = async (shift: LocumShiftWithAttendance, newStatus: 'Worked' | 'No-show') => {
        if (!user?.organizationId) return;

        try {
            const locumAssignment = shift.assignments?.find(a => a.isLocum);
            if (!locumAssignment) return;

            // Calculate hours from shift times
            const startParts = shift.startTime.split(':');
            const endParts = shift.endTime.split(':');
            const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
            const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
            const hours = (endMinutes - startMinutes) / 60;

            if (shift.attendanceId) {
                // Update existing attendance
                await attendanceService.update(user.organizationId, shift.attendanceId, {
                    status: newStatus,
                    totalHours: newStatus === 'Worked' ? hours : 0
                });
            } else {
                // Create new attendance from shift
                await attendanceService.createManualEntry(user.organizationId, {
                    locationId: shift.locationId,
                    date: shift.date,
                    clockIn: `${shift.date}T${shift.startTime}:00`,
                    clockOut: `${shift.date}T${shift.endTime}:00`,
                    status: newStatus,
                    totalHours: newStatus === 'Worked' ? hours : 0,
                    isExternal: true,
                    externalLocumName: locumAssignment.locumName || 'Unknown Locum',
                    externalLocumRole: shift.roleRequired || 'Locum'
                });
            }

            loadData();
        } catch (error) {
            console.error('Error updating locum status:', error);
            alert('Failed to update locum status');
        }
    };

    const handleManualEntry = async (data: {
        staffId: string;
        locationId: string;
        date: string;
        clockIn: string;
        clockOut: string;
        status: AttendanceStatus;
    }) => {
        if (!user?.organizationId) return;

        try {
            // Calculate hours
            const clockInTime = new Date(`${data.date}T${data.clockIn}`);
            const clockOutTime = new Date(`${data.date}T${data.clockOut}`);
            const hours = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);

            await attendanceService.createManualEntry(user.organizationId, {
                staffId: data.staffId,
                locationId: data.locationId,
                date: data.date,
                clockIn: clockInTime.toISOString(),
                clockOut: clockOutTime.toISOString(),
                status: data.status,
                totalHours: Math.max(0, hours),
                isExternal: false
            });
            setShowManualModal(false);
            loadData();
        } catch (error) {
            console.error('Error adding manual entry:', error);
            alert('Failed to add manual entry');
        }
    };

    if (loading && records.length === 0) {
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
                    <h2 className="text-2xl font-bold text-[#1a2e35]">Attendance</h2>
                    <p className="text-slate-500 mt-1">
                        {activeTab === 'employees' ? records.length : locumShifts.length} records
                    </p>
                </div>
                {activeTab === 'employees' && (
                    <button
                        onClick={() => setShowManualModal(true)}
                        className="bg-[#1a2e35] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#152428] transition-colors shadow-md border border-transparent"
                    >
                        <span className="text-[#4fd1c5]">+ Manual Entry</span>
                    </button>
                )}
            </div>

            {/* Info Banner for External Tab */}
            {activeTab === 'external' && (
                <div className="bg-[#e0f2f1] border border-[#4fd1c5]/30 rounded-xl p-4 mb-6">
                    <div className="flex items-start space-x-3">
                        <span className="text-xl">ℹ️</span>
                        <div>
                            <p className="text-sm font-medium text-[#0f766e]">External Locum Attendance</p>
                            <p className="text-sm text-[#134e4a] mt-1">
                                Locum attendance is derived from scheduled shifts. When you assign a locum to a shift in the Schedule Manager,
                                their attendance appears here automatically. Mark them as "Worked" or "No-show" after the shift completes.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Today's Summary - Clickable Cards */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
                <button
                    onClick={() => setActiveTab('employees')}
                    className="bg-[#e0f2f1] border border-[#4fd1c5]/30 rounded-xl p-4 text-center hover:shadow-lg hover:border-[#2FB7A3] transition-all cursor-pointer"
                >
                    <div className="text-2xl font-bold text-[#0f766e]">{summary.present}</div>
                    <div className="text-sm text-[#134e4a]">Present Today</div>
                </button>
                <button
                    onClick={() => setActiveTab('employees')}
                    className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center hover:shadow-lg hover:border-amber-400 transition-all cursor-pointer"
                >
                    <div className="text-2xl font-bold text-amber-700">{summary.partial}</div>
                    <div className="text-sm text-amber-600">Partial</div>
                </button>
                <button
                    onClick={() => setActiveTab('employees')}
                    className="bg-red-50 border border-red-200 rounded-xl p-4 text-center hover:shadow-lg hover:border-red-400 transition-all cursor-pointer"
                >
                    <div className="text-2xl font-bold text-red-700">{summary.absent}</div>
                    <div className="text-sm text-red-600">Absent</div>
                </button>
                <button
                    onClick={() => setActiveTab('employees')}
                    className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center hover:shadow-lg hover:border-purple-400 transition-all cursor-pointer"
                >
                    <div className="text-2xl font-bold text-purple-700">{summary.onLeave}</div>
                    <div className="text-sm text-purple-600">On Leave</div>
                </button>
                <button
                    onClick={() => setActiveTab('external')}
                    className="bg-[#e0f2f1] border border-[#4fd1c5]/30 rounded-xl p-4 text-center hover:shadow-lg hover:border-[#2FB7A3] transition-all cursor-pointer"
                >
                    <div className="text-2xl font-bold text-[#1a2e35]">{summary.locumScheduled}</div>
                    <div className="text-sm text-[#134e4a]">Locum Shifts</div>
                </button>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-slate-700">{summary.totalHours.toFixed(1)}</div>
                    <div className="text-sm text-slate-600">Hours Worked</div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl mb-6 w-fit">
                <button
                    onClick={() => setActiveTab('employees')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'employees'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                        }`}
                >
                    Employees
                </button>
                <button
                    onClick={() => setActiveTab('external')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'external'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                        }`}
                >
                    External / Locums
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 flex flex-wrap gap-4 items-end">
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Start Date</label>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Start Date</label>
                    <DateInput
                        value={dateRange.start}
                        onChange={(value) => setDateRange(prev => ({ ...prev, start: value }))}
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">End Date</label>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">End Date</label>
                    <DateInput
                        value={dateRange.end}
                        onChange={(value) => setDateRange(prev => ({ ...prev, end: value }))}
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Location</label>
                    <select
                        value={selectedLocation}
                        onChange={(e) => setSelectedLocation(e.target.value)}
                        className="px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#4fd1c5]"
                    >
                        <option value="">All Locations</option>
                        {locations.map(loc => (
                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                        ))}
                    </select>
                </div>
                <button
                    onClick={loadData}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium text-slate-700"
                >
                    Apply Filter
                </button>
            </div>

            {/* Employee Attendance Table */}
            {activeTab === 'employees' && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Staff</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Date</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Clock In</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Clock Out</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Hours</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Status</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Type</th>
                                <th className="text-center px-6 py-4 text-sm font-semibold text-slate-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {records.map((record) => (
                                <tr key={record.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-900">{record.staff?.fullName || 'Unknown'}</div>
                                        <div className="text-sm text-slate-500">{record.staff?.jobTitle || ''}</div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">{formatDateKE(record.date)}</td>
                                    <td className="px-6 py-4 text-slate-600">{formatTime(record.clockIn)}</td>
                                    <td className="px-6 py-4 text-slate-600">{formatTime(record.clockOut)}</td>
                                    <td className="px-6 py-4 text-slate-600">{record.totalHours?.toFixed(1) || '0'}</td>
                                    <td className="px-6 py-4">{getStatusBadge(record.status)}</td>
                                    <td className="px-6 py-4">
                                        {record.isManualEntry ? (
                                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold">Manual</span>
                                        ) : (
                                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">System</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex justify-center space-x-2">
                                            <button
                                                onClick={() => alert('Edit functionality coming soon!')}
                                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (window.confirm(`Delete attendance record for ${record.staff?.fullName} on ${formatDateKE(record.date)}?`)) {
                                                        alert('Delete functionality coming soon!');
                                                    }
                                                }}
                                                className="text-red-600 hover:text-red-800 text-sm font-medium"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {records.length === 0 && (
                        <div className="p-12 text-center">
                            <div className="text-4xl mb-4">⏰</div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">No employee attendance records</h3>
                            <p className="text-slate-500">No records found for the selected date range</p>
                        </div>
                    )}
                </div>
            )}

            {/* External / Locum Attendance Table */}
            {activeTab === 'external' && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Locum</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Date</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Shift Time</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Location</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Role</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Status</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {locumShifts.map((shift) => {
                                const locumAssignment = shift.assignments?.find(a => a.isLocum);
                                if (!locumAssignment) return null;

                                const isPast = new Date(shift.date) < new Date(new Date().toDateString());

                                return (
                                    <tr key={shift.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-sm">
                                                    🔄
                                                </div>
                                                <div>
                                                    <div className="font-medium text-slate-900">{locumAssignment.locumName}</div>
                                                    <div className="text-sm text-slate-500">External Locum</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">{formatDateKE(shift.date)}</td>
                                        <td className="px-6 py-4 text-slate-600">{shift.startTime} - {shift.endTime}</td>
                                        <td className="px-6 py-4 text-slate-600">{shift.location?.name || 'Unknown'}</td>
                                        <td className="px-6 py-4 text-slate-600">{shift.roleRequired || '-'}</td>
                                        <td className="px-6 py-4">{getStatusBadge(shift.attendanceStatus || 'Scheduled')}</td>
                                        <td className="px-6 py-4">
                                            {shift.attendanceStatus === 'Scheduled' && isPast ? (
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => handleUpdateLocumStatus(shift, 'Worked')}
                                                        className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold hover:bg-emerald-200"
                                                    >
                                                        Mark Worked
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdateLocumStatus(shift, 'No-show')}
                                                        className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-200"
                                                    >
                                                        No-show
                                                    </button>
                                                </div>
                                            ) : shift.attendanceStatus === 'Scheduled' ? (
                                                <span className="text-sm text-slate-400">Pending</span>
                                            ) : (
                                                <span className="text-sm text-slate-500">Recorded</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {locumShifts.length === 0 && (
                        <div className="p-12 text-center">
                            <div className="text-4xl mb-4">🔄</div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">No locum shifts scheduled</h3>
                            <p className="text-slate-500 mb-4">Locum attendance is derived from scheduled shifts.</p>
                            <p className="text-sm text-slate-400">
                                Go to <span className="font-semibold">Schedule Manager</span> → Create a shift → Assign a locum
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Manual Entry Modal */}
            {showManualModal && (
                <ManualEntryModal
                    locations={locations}
                    onClose={() => setShowManualModal(false)}
                    onSave={handleManualEntry}
                />
            )}
        </div>
    );
};

// Manual Entry Modal Component
const ManualEntryModal: React.FC<{
    locations: Location[];
    onClose: () => void;
    onSave: (data: any) => void;
}> = ({ locations, onClose, onSave }) => {
    const { user } = useAuth();
    const [allStaff, setAllStaff] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        staffId: '',
        locationId: '',
        date: new Date().toISOString().split('T')[0],
        clockIn: '09:00',
        clockOut: '17:00',
        status: 'Present' as AttendanceStatus
    });

    useEffect(() => {
        const loadStaff = async () => {
            if (!user?.organizationId) return;
            const { staffService } = await import('../../lib/services');
            const staffData = await staffService.getAll(user.organizationId);
            setAllStaff(staffData.filter(s => s.staffStatus === 'Active'));
        };
        loadStaff();
    }, [user?.organizationId]);

    // Filter staff by selected location
    const filteredStaff = formData.locationId
        ? allStaff.filter(s => s.locationId === formData.locationId)
        : allStaff;

    const handleLocationChange = (locationId: string) => {
        setFormData(prev => ({ 
            ...prev, 
            locationId,
            // Reset staff selection when location changes
            staffId: ''
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 m-4">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-900">Manual Attendance Entry</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Location</label>
                        <select
                            value={formData.locationId}
                            onChange={(e) => handleLocationChange(e.target.value)}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl"
                        >
                            <option value="">Select Location</option>
                            {locations.map(loc => (
                                <option key={loc.id} value={loc.id}>{loc.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Staff Member *</label>
                        <select
                            required
                            value={formData.staffId}
                            onChange={(e) => setFormData(prev => ({ ...prev, staffId: e.target.value }))}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl"
                            disabled={!formData.locationId}
                        >
                            <option value="">
                                {formData.locationId ? 'Select Staff' : 'Please select a location first'}
                            </option>
                            {filteredStaff.map(s => (
                                <option key={s.id} value={s.id}>{s.fullName} - {s.jobTitle}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <DateInput
                            label="Date"
                            required
                            value={formData.date}
                            onChange={(value) => setFormData(prev => ({ ...prev, date: value }))}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Clock In</label>
                            <input
                                type="time"
                                value={formData.clockIn}
                                onChange={(e) => setFormData(prev => ({ ...prev, clockIn: e.target.value }))}
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Clock Out</label>
                            <input
                                type="time"
                                value={formData.clockOut}
                                onChange={(e) => setFormData(prev => ({ ...prev, clockOut: e.target.value }))}
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Status *</label>
                        <select
                            value={formData.status}
                            onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as AttendanceStatus }))}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl"
                        >
                            <option value="Present">Present</option>
                            <option value="Partial">Partial</option>
                            <option value="Absent">Absent</option>
                            <option value="On Leave">On Leave</option>
                        </select>
                    </div>

                    <div className="flex space-x-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
                        >
                            Add Entry
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AttendanceView;
