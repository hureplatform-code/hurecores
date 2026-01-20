import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { attendanceService, scheduleService, settingsService, policyDocumentsService, organizationService } from '../../lib/services';
import { getTodayDateKE, formatDateFullKE, formatTimeKE, getMondayOfWeekKE } from '../../lib/utils/dateFormat';
import type { AttendanceRecord, Shift, OrganizationSettings, PolicyDocument, Organization, Location } from '../../types';

const EmployeeDashboard: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [location, setLocation] = useState<Location | null>(null);
    const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
    const [todayShift, setTodayShift] = useState<Shift | null>(null);
    const [upcomingShifts, setUpcomingShifts] = useState<Shift[]>([]);
    const [settings, setSettings] = useState<OrganizationSettings | null>(null);
    const [pendingDocs, setPendingDocs] = useState<PolicyDocument[]>([]);
    const [clockingIn, setClockingIn] = useState(false);

    useEffect(() => {
        if (user?.organizationId) {
            loadData();
        }
    }, [user?.organizationId, user?.id]);

    const loadData = async () => {
        if (!user?.organizationId || !user?.id) return;
        setLoading(true);
        try {
            // Use Kenya timezone for accurate "today" calculation
            const today = getTodayDateKE();
            const endOfWeek = new Date();
            endOfWeek.setDate(endOfWeek.getDate() + 7);

            // Load data in parallel
            const [org, orgSettings, todayRecords, shifts, docs] = await Promise.all([
                organizationService.getById(user.organizationId),
                settingsService.getSettings(user.organizationId),
                attendanceService.getByDateRange(user.organizationId, today, today),
                scheduleService.getStaffSchedule(user.organizationId, user.id, { startDate: today, endDate: endOfWeek.toISOString().split('T')[0] }),
                policyDocumentsService.getForStaff(user.organizationId, user.id, user.jobTitle)
            ]);

            setOrganization(org);
            setSettings(orgSettings);
            const myTodayRecord = todayRecords.find(r => r.staffId === user.id);
            setTodayRecord(myTodayRecord || null);
            setTodayShift(shifts.find(s => s.date === today) || null);
            setUpcomingShifts(shifts.filter(s => s.date > today).slice(0, 5));

            if (user.locationId) {
                const loc = await organizationService.getLocation(user.organizationId, user.locationId);
                setLocation(loc);
            }

            const pendingDocsList: PolicyDocument[] = [];
            for (const doc of docs) {
                if (doc.requiresAcknowledgement) {
                    const hasAcked = await policyDocumentsService.hasAcknowledged(user.organizationId, doc.id, user.id);
                    if (!hasAcked) pendingDocsList.push(doc);
                }
            }
            setPendingDocs(pendingDocsList);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClockIn = async () => {
        if (!user?.organizationId || !user?.id) return;
        setClockingIn(true);
        try {
            await attendanceService.clockIn(user.organizationId, user.id, user.locationId);
            loadData();
            // Redirect to attendance after clock in to manage breaks/lunch
            navigate('/employee/attendance');
        } catch (error: any) {
            alert(error.message || 'Failed to clock in');
        } finally {
            setClockingIn(false);
        }
    };

    const isOnline = todayRecord && todayRecord.clockIn && !todayRecord.clockOut;

    // Use enhanced date formatter
    const todayStr = typeof formatDateFullKE === 'function'
        ? formatDateFullKE(new Date())
        : new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

    // Teal theme colors
    const themeColor = {
        primary: 'bg-[#0f766e]',
        secondary: 'bg-[#ccfbf1]',
        text: 'text-[#0f766e]',
        border: 'border-[#14b8a6]'
    };

    // Week View Helpers
    const currentWeekMonday = getMondayOfWeekKE();
    const getDateForWeekDay = (dayIndex: number) => {
        const date = new Date(currentWeekMonday);
        date.setDate(currentWeekMonday.getDate() + dayIndex);
        return date;
    };
    const getDayAbbrev = (dayIndex: number) => getDateForWeekDay(dayIndex).toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3);
    const getDayNum = (dayIndex: number) => getDateForWeekDay(dayIndex).getDate();
    const isDayToday = (dayIndex: number) => getDateForWeekDay(dayIndex).toISOString().split('T')[0] === getTodayDateKE();

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="animate-spin w-8 h-8 border-4 border-[#0f766e] border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900">My Dashboard</h2>
                <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                    <span className="font-medium text-[#0f766e]">Today: {todayStr}</span>
                    {location && <span>• 📍 {location.name}</span>}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Today at Work Card */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-bl-full z-0"></div>
                        <div className="relative z-10">
                            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-lg bg-[#ccfbf1] flex items-center justify-center text-[#0f766e] text-lg">📅</span>
                                Today's Shift
                            </h3>

                            <div className="flex flex-col md:flex-row items-center gap-6">
                                <div className="flex-1">
                                    {todayShift ? (
                                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="bg-[#ccfbf1] text-[#0f766e] px-2 py-0.5 rounded text-xs font-bold uppercase">{todayShift.shiftType || 'Standard'}</span>
                                                <span className="text-xs font-mono text-slate-500">{todayShift.id.slice(0, 6)}</span>
                                            </div>
                                            <div className="text-2xl font-bold text-slate-900 mb-1">
                                                {formatTimeKE(todayShift.startTime)} - {formatTimeKE(todayShift.endTime)}
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                                <span>🩺 {user?.jobTitle || 'Staff'}</span>
                                                <span>•</span>
                                                <span>📍 {location?.name || 'Primary Location'}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-slate-50 rounded-xl p-6 text-center border border-slate-100 border-dashed">
                                            <p className="text-slate-500 font-medium">No specific shift scheduled for today.</p>
                                            <p className="text-xs text-slate-400 mt-1">You can still clock in if permitted.</p>
                                        </div>
                                    )}
                                </div>

                                <div className="w-full md:w-64">
                                    {isOnline ? (
                                        <div className="text-center p-5 bg-[#ecfdf5] rounded-xl border border-[#a7f3d0]">
                                            <div className="w-12 h-12 bg-[#10b981] text-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-md animate-pulse">
                                                ⏱️
                                            </div>
                                            <h4 className="font-bold text-[#065f46] mb-1">Currently Active</h4>
                                            <p className="text-xs text-[#064e3b] mb-4">You are clocked in. Manage your breaks and lunch in Attendance.</p>
                                            <button
                                                onClick={() => navigate('/employee/attendance')}
                                                className="w-full py-2 bg-white text-[#059669] text-sm font-bold rounded-lg hover:bg-emerald-50 border border-[#a7f3d0] transition-colors"
                                            >
                                                Go to My Attendance →
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={handleClockIn}
                                            disabled={clockingIn || !user?.organizationId}
                                            className="w-full py-4 bg-[#0f766e] hover:bg-[#115e59] text-white rounded-xl font-bold shadow-lg shadow-teal-700/20 transform transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:transform-none flex flex-col items-center justify-center gap-1"
                                        >
                                            <span className="text-xl">👋 Clock In</span>
                                            <span className="text-xs font-normal opacity-80">Start your workday</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Announcements / Alerts */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 text-lg">📢</span>
                            Announcements & Alerts
                        </h3>

                        {pendingDocs.length > 0 ? (
                            <div className="space-y-3">
                                {pendingDocs.map(doc => (
                                    <div key={doc.id} className="flex items-center justify-between p-4 bg-amber-50 rounded-xl border border-amber-100">
                                        <div>
                                            <div className="font-bold text-slate-900 text-sm">{doc.name}</div>
                                            <div className="text-xs text-slate-500">Action Required: Acknowledge</div>
                                        </div>
                                        <button onClick={() => navigate('/employee/documents')} className="text-xs font-bold text-amber-700 hover:text-amber-800 bg-white px-3 py-1.5 rounded-lg border border-amber-200">Review</button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-slate-500 text-sm">No new announcements or pending actions.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Mini Calendar / Week View */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <button
                                onClick={() => navigate('/employee/schedule')}
                                className="text-sm font-medium text-[#0f766e] hover:text-teal-700 transition-colors"
                            >
                                View This Week
                            </button>
                            <span className="text-sm text-slate-400">All locations</span>
                        </div>

                        {/* Week Days - Monday (0) to Sunday (6) */}
                        <div className="grid grid-cols-7 gap-1 mb-4">
                            {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
                                const isToday = isDayToday(dayIndex);
                                return (
                                    <div
                                        key={dayIndex}
                                        className={`text-center py-2 rounded-lg ${isToday ? 'bg-[#0f766e] text-white' : 'text-slate-600'}`}
                                    >
                                        <div className="text-xs font-medium">{getDayAbbrev(dayIndex)}</div>
                                        <div className={`text-lg font-bold ${isToday ? 'text-white' : 'text-slate-900'}`}>{getDayNum(dayIndex)}</div>
                                    </div>
                                );
                            })}
                        </div>

                        <h4 className="font-bold text-slate-900 mb-3">My Scheduled Shifts</h4>

                        {upcomingShifts.length > 0 ? (
                            <div className="space-y-3">
                                {upcomingShifts.map(shift => (
                                    <div key={shift.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors bg-slate-50">
                                        <div className="flex-shrink-0 w-10 text-center bg-white border border-slate-100 rounded-lg py-1 shadow-sm">
                                            <div className="text-[10px] font-bold text-slate-500 uppercase">{new Date(shift.date).toLocaleDateString('en-US', { weekday: 'short' })}</div>
                                            <div className="text-sm font-bold text-slate-900">{new Date(shift.date).getDate()}</div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-bold text-slate-900 truncate">
                                                {formatTimeKE(shift.startTime)} - {formatTimeKE(shift.endTime)}
                                            </div>
                                            <div className="text-xs text-slate-500 truncate">{shift.shiftType || 'Shift'}</div>
                                        </div>
                                        <div className={`w-2 h-2 rounded-full ${shift.status === 'Published' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                No upcoming shifts this week.
                            </p>
                        )}
                    </div>

                    {/* Quick Links */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <h3 className="font-bold text-slate-900 mb-4">Quick Links</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => navigate('/employee/leave')} className="p-3 bg-blue-50 hover:bg-blue-100 rounded-xl text-center transition-colors">
                                <div className="text-2xl mb-1">🌴</div>
                                <div className="text-xs font-bold text-blue-700">Request Leave</div>
                            </button>
                            <button onClick={() => navigate('/employee/documents')} className="p-3 bg-purple-50 hover:bg-purple-100 rounded-xl text-center transition-colors">
                                <div className="text-2xl mb-1">📄</div>
                                <div className="text-xs font-bold text-purple-700">Policies</div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmployeeDashboard;
