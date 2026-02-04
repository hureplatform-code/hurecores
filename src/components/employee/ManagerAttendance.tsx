import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { attendanceService, staffService } from '../../lib/services';
import type { AttendanceRecord, AttendanceStatus } from '../../types';
import { formatTimeKE, formatDateKE, formatDateWithDayKE } from '../../lib/utils/dateFormat';
import DateInput from '../common/DateInput';

interface StaffMember {
    id: string;
    fullName: string;
    email: string;
    jobTitle?: string;
    systemRole: string;
}

const ManagerAttendance: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
    const [summary, setSummary] = useState({
        present: 0,
        partial: 0,
        absent: 0,
        onLeave: 0,
        totalHours: 0
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
            // Load staff members
            const staff = await staffService.getAll(user.organizationId);
            setStaffMembers(staff);

            // Load attendance for selected date
            const records = await attendanceService.getByDateRange(
                user.organizationId,
                selectedDate,
                selectedDate
            );
            setAttendanceRecords(records);

            // Calculate summary
            const present = records.filter(r => r.status === 'Present' || r.status === 'Worked').length;
            const partial = records.filter(r => r.status === 'Partial').length;
            const absent = records.filter(r => r.status === 'Absent' || r.status === 'No-show').length;
            const onLeave = records.filter(r => r.status === 'On Leave').length;
            const totalHours = records.reduce((sum, r) => sum + (r.totalHours || 0), 0);

            setSummary({ present, partial, absent, onLeave, totalHours });
        } catch (error) {
            console.error('Error loading attendance data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: AttendanceStatus) => {
        switch (status) {
            case 'Present':
            case 'Worked': return 'bg-emerald-100 text-emerald-700';
            case 'Partial': return 'bg-amber-100 text-amber-700';
            case 'Absent':
            case 'No-show': return 'bg-rose-100 text-rose-700';
            case 'On Leave': return 'bg-blue-100 text-blue-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const getStaffAttendance = (staffId: string) => {
        return attendanceRecords.find(r => r.staffId === staffId);
    };

    const formatTime = (isoString?: string) => {
        if (!isoString) return '-';
        return formatTimeKE(isoString);
    };

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
                    <h2 className="text-2xl font-bold text-slate-900">Team Attendance</h2>
                    <p className="text-slate-500">Monitor daily attendance for your team</p>
                </div>
                <div className="mt-4 md:mt-0">
                    <DateInput
                        label=""
                        value={selectedDate}
                        onChange={(value) => setSelectedDate(value)}
                        className="w-48"
                    />
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
                    <div className="text-3xl font-bold text-emerald-600">{summary.present}</div>
                    <div className="text-sm font-medium text-emerald-700">Present</div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                    <div className="text-3xl font-bold text-amber-600">{summary.partial}</div>
                    <div className="text-sm font-medium text-amber-700">Partial</div>
                </div>
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-center">
                    <div className="text-3xl font-bold text-rose-600">{summary.absent}</div>
                    <div className="text-sm font-medium text-rose-700">Absent</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center">
                    <div className="text-3xl font-bold text-blue-600">{summary.onLeave}</div>
                    <div className="text-sm font-medium text-blue-700">On Leave</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center col-span-2 md:col-span-1">
                    <div className="text-3xl font-bold text-slate-700">{summary.totalHours.toFixed(1)}</div>
                    <div className="text-sm font-medium text-slate-600">Total Hours</div>
                </div>
            </div>

            {/* Attendance Table */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Attendance Review</h2>
                        <p className="text-sm text-slate-500">{formatDateWithDayKE(selectedDate)}</p>
                    </div>
                    <div className="flex gap-3">
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                            <tr>
                                <th className="px-6 py-4 text-left">Staff Member</th>
                                <th className="px-6 py-4 text-left">Role</th>
                                <th className="px-6 py-4 text-left">Clock In</th>
                                <th className="px-6 py-4 text-left">Clock Out</th>
                                <th className="px-6 py-4 text-left">Hours</th>
                                <th className="px-6 py-4 text-left">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {staffMembers.length > 0 ? staffMembers.map(staff => {
                                const attendance = getStaffAttendance(staff.id);
                                return (
                                    <tr key={staff.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                                                    {staff.fullName?.charAt(0) || 'U'}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-slate-900">{staff.fullName}</div>
                                                    <div className="text-xs text-slate-500">{staff.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {staff.jobTitle || staff.systemRole}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-sm text-slate-600">
                                            {formatTime(attendance?.clockIn)}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-sm text-slate-600">
                                            {formatTime(attendance?.clockOut)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-slate-900">
                                                {attendance?.totalHours?.toFixed(2) || '0.00'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline - flex px - 3 py - 1 rounded - full text - xs font - bold uppercase ${getStatusColor(attendance?.status || 'Absent')} `}>
                                                {attendance?.status || 'Not Clocked In'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <div className="text-4xl mb-3 opacity-30">👥</div>
                                        <div className="font-bold text-slate-900">No staff members found</div>
                                        <div className="text-sm text-slate-500">Add staff to your organization to track attendance</div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ManagerAttendance;
