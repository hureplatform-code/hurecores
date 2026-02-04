import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { attendanceService, scheduleService, settingsService, policyDocumentsService, organizationService } from '../../lib/services';
import { getTodayDateKE, formatTimeKE, formatDateWithDayKE, formatDateFullKE, getMondayOfWeekKE } from '../../lib/utils/dateFormat';
import type { AttendanceRecord, Shift, OrganizationSettings, PolicyDocument, Organization, Location } from '../../types';

const TodayMyWork: React.FC = () => {
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

    // Action states
    const [clockingIn, setClockingIn] = useState(false);
    const [clockingOut, setClockingOut] = useState(false);
    const [startingLunch, setStartingLunch] = useState(false);
    const [endingLunch, setEndingLunch] = useState(false);
    const [startingBreak, setStartingBreak] = useState(false);
    const [endingBreak, setEndingBreak] = useState(false);

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

            // Load all data in parallel
            const [org, orgSettings, todayRecords, shifts, docs] = await Promise.all([
                organizationService.getById(user.organizationId),
                settingsService.getSettings(user.organizationId),
                attendanceService.getByDateRange(user.organizationId, today, today),
                scheduleService.getStaffSchedule(user.organizationId, user.id, { startDate: today, endDate: endOfWeek.toISOString().split('T')[0] }),
                policyDocumentsService.getForStaff(user.organizationId, user.id, user.jobTitle)
            ]);

            setOrganization(org);
            setSettings(orgSettings);

            // Get today's attendance record
            const myTodayRecord = todayRecords.find(r => r.staffId === user.id);
            setTodayRecord(myTodayRecord || null);

            // Get today's shift
            const todayShiftRecord = shifts.find(s => s.date === today);
            setTodayShift(todayShiftRecord || null);

            // Get upcoming shifts (excluding today)
            const upcoming = shifts.filter(s => s.date > today).slice(0, 5);
            setUpcomingShifts(upcoming);

            // Get location
            if (user.locationId) {
                const loc = await organizationService.getLocation(user.organizationId, user.locationId);
                setLocation(loc);
            }

            // Check pending document acknowledgements
            const pendingDocsList: PolicyDocument[] = [];
            for (const doc of docs) {
                if (doc.requiresAcknowledgement) {
                    const hasAcked = await policyDocumentsService.hasAcknowledged(user.organizationId, doc.id, user.id);
                    if (!hasAcked) pendingDocsList.push(doc);
                }
            }
            setPendingDocs(pendingDocsList);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Action handlers
    const handleClockIn = async () => {
        if (!user?.organizationId || !user?.id) return;
        setClockingIn(true);
        try {
            await attendanceService.clockIn(user.organizationId, user.id, user.locationId);
            loadData();
        } catch (error: any) {
            alert(error.message || 'Failed to clock in');
        } finally {
            setClockingIn(false);
        }
    };

    const handleClockOut = async () => {
        if (!user?.organizationId || !todayRecord) return;
        setClockingOut(true);
        try {
            await attendanceService.clockOut(user.organizationId, todayRecord.id);
            loadData();
        } catch (error: any) {
            alert(error.message || 'Failed to clock out');
        } finally {
            setClockingOut(false);
        }
    };

    const handleStartLunch = async () => {
        if (!user?.organizationId || !todayRecord) return;
        setStartingLunch(true);
        try {
            await attendanceService.startLunch(user.organizationId, todayRecord.id);
            loadData();
        } catch (error: any) {
            alert(error.message || 'Failed to start lunch');
        } finally {
            setStartingLunch(false);
        }
    };

    const handleEndLunch = async () => {
        if (!user?.organizationId || !todayRecord) return;
        setEndingLunch(true);
        try {
            await attendanceService.endLunch(user.organizationId, todayRecord.id);
            loadData();
        } catch (error: any) {
            alert(error.message || 'Failed to end lunch');
        } finally {
            setEndingLunch(false);
        }
    };

    const handleStartBreak = async () => {
        if (!user?.organizationId || !todayRecord) return;
        setStartingBreak(true);
        try {
            await attendanceService.startBreak(user.organizationId, todayRecord.id);
            loadData();
        } catch (error: any) {
            alert(error.message || 'Failed to start break');
        } finally {
            setStartingBreak(false);
        }
    };

    const handleEndBreak = async () => {
        if (!user?.organizationId || !todayRecord) return;
        setEndingBreak(true);
        try {
            await attendanceService.endBreak(user.organizationId, todayRecord.id);
            loadData();
        } catch (error: any) {
            alert(error.message || 'Failed to end break');
        } finally {
            setEndingBreak(false);
        }
    };

    // State calculations
    const isOnline = todayRecord && todayRecord.clockIn && !todayRecord.clockOut;
    const isOnLunch = todayRecord?.isOnLunch || false;
    const isOnBreak = todayRecord?.isOnBreak || false;
    const hasUsedLunch = !!todayRecord?.lunchEnd;
    const breakCount = todayRecord?.breakCount || 0;

    // Settings-based visibility
    const lunchEnabled = settings?.lunch?.enabled ?? false;
    const breaksEnabled = settings?.breaks?.enabled ?? false;
    const maxBreaksPerDay = settings?.breaks?.maxBreaksPerDay ?? 2;
    const canTakeLunch = lunchEnabled && isOnline && !isOnLunch && !isOnBreak && !hasUsedLunch;
    const canTakeBreak = breaksEnabled && isOnline && !isOnLunch && !isOnBreak && breakCount < maxBreaksPerDay;

    // Format time
    const formatTime = (isoString?: string) => {
        if (!isoString) return '--:--';
        // Use util function if available, fallback to local
        if (typeof formatTimeKE === 'function') return formatTimeKE(isoString);
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Format date
    const formatDate = (dateStr: string) => {
        if (typeof formatDateWithDayKE === 'function') return formatDateWithDayKE(dateStr);
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    };

    // Get canonical Monday for the current week (Kenya time)
    // This ensures the week view is always Mon-Sun relative to the current week
    const currentWeekMonday = getMondayOfWeekKE();

    // Helper: Get date for a specific day index (0=Mon, 1=Tue... 6=Sun)
    const getDateForWeekDay = (dayIndex: number) => {
        const date = new Date(currentWeekMonday);
        date.setDate(currentWeekMonday.getDate() + dayIndex);
        return date;
    };

    // Get day abbreviation
    const getDayAbbrev = (dayIndex: number) => {
        return getDateForWeekDay(dayIndex).toLocaleDateString('en-GB', { weekday: 'short' }).slice(0, 3);
    };

    // Get day number
    const getDayNum = (dayIndex: number) => {
        return getDateForWeekDay(dayIndex).getDate();
    };

    // Check if a day index (0-6 Mon-Sun) corresponds to today
    const isToday = (dayIndex: number) => {
        const date = getDateForWeekDay(dayIndex);
        return date.toISOString().split('T')[0] === getTodayDateKE();
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    const todayStr = typeof formatDateFullKE === 'function'
        ? formatDateFullKE(new Date())
        : new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900">Welcome back, {user?.firstName || 'there'} 👋</h2>
                <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
                    <span className="flex items-center gap-1">🏢 {organization?.name}</span>
                    {location && <span className="flex items-center gap-1">• 📍 {location.name}</span>}
                    {user?.jobTitle && <span className="flex items-center gap-1">• 🩺 {user.jobTitle}</span>}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Today at Work */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Today at Work Card */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">Today at Work</h3>

                        <div className="flex flex-col md:flex-row md:items-center gap-6">
                            {/* Shift Info */}
                            <div className="flex items-start gap-4 flex-1">
                                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-2xl">📅</div>
                                <div>
                                    <div className="font-bold text-slate-900">{todayStr}</div>
                                    {todayShift ? (
                                        <>
                                            <div className="text-sm text-slate-600">
                                                {formatTime(todayShift.startTime)} – {formatTime(todayShift.endTime)} {user?.jobTitle}
                                            </div>
                                            <div className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                                                📍 {location?.name || 'Primary Location'}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-sm text-slate-500">No shift scheduled</div>
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col gap-2 w-full md:w-48">
                                {/* Status Badge */}
                                {isOnline && (
                                    <div className={`text-center py-1.5 rounded-lg text-sm font-medium ${isOnLunch ? 'bg-amber-100 text-amber-700' :
                                        isOnBreak ? 'bg-blue-100 text-blue-700' :
                                            'bg-emerald-100 text-emerald-700'
                                        }`}>
                                        {isOnLunch ? '🍽️ On Lunch' : isOnBreak ? '☕ On Break' : '✓ Currently Clocked'}
                                    </div>
                                )}

                                {/* On Lunch - only End Lunch */}
                                {isOnLunch && (
                                    <button
                                        onClick={handleEndLunch}
                                        disabled={endingLunch}
                                        className="w-full py-3 rounded-xl font-bold text-white bg-amber-500 hover:bg-amber-600 transition-colors disabled:opacity-50"
                                    >
                                        {endingLunch ? 'Ending...' : '✓ End Lunch'}
                                    </button>
                                )}

                                {/* On Break - only End Break */}
                                {isOnBreak && (
                                    <button
                                        onClick={handleEndBreak}
                                        disabled={endingBreak}
                                        className="w-full py-3 rounded-xl font-bold text-white bg-blue-500 hover:bg-blue-600 transition-colors disabled:opacity-50"
                                    >
                                        {endingBreak ? 'Ending...' : '✓ End Break'}
                                    </button>
                                )}

                                {/* Not clocked in */}
                                {!isOnline && !isOnLunch && !isOnBreak && (
                                    <button
                                        onClick={handleClockIn}
                                        disabled={clockingIn || !user?.organizationId}
                                        className="w-full py-3 rounded-xl font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors disabled:opacity-50"
                                    >
                                        {clockingIn ? 'Clocking In...' : '👋 Clock In'}
                                    </button>
                                )}

                                {/* Clocked in, not on lunch/break */}
                                {isOnline && !isOnLunch && !isOnBreak && (
                                    <>
                                        {canTakeLunch && (
                                            <button
                                                onClick={handleStartLunch}
                                                disabled={startingLunch}
                                                className="w-full py-2.5 rounded-xl font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                {startingLunch ? 'Starting...' : '🍽️ Take Lunch'}
                                            </button>
                                        )}
                                        {canTakeBreak && (
                                            <button
                                                onClick={handleStartBreak}
                                                disabled={startingBreak}
                                                className="w-full py-2.5 rounded-xl font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                {startingBreak ? 'Starting...' : `☕ Take a Break`}
                                            </button>
                                        )}
                                        <button
                                            onClick={handleClockOut}
                                            disabled={clockingOut}
                                            className="w-full py-2.5 rounded-xl font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {clockingOut ? 'Clocking Out...' : '🏠 Clock Out'}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* View This Week Link */}
                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <button
                                onClick={() => navigate('/employee/schedule')}
                                className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                            >
                                View This Week →
                            </button>
                        </div>
                    </div>

                    {/* My Alerts / Requests */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">My Alerts / Requests</h3>

                        {pendingDocs.length === 0 ? (
                            <div className="text-center py-8">
                                <div className="text-4xl mb-3 opacity-30">✓</div>
                                <div className="font-bold text-slate-900">All caught up!</div>
                                <div className="text-sm text-slate-500">There are no alerts or requests at the moment.<br />Announcements will appear here.</div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {pendingDocs.map((doc) => (
                                    <div key={doc.id} className="flex items-start gap-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
                                        <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-lg">📋</div>
                                        <div className="flex-1">
                                            <div className="font-bold text-slate-900">{doc.name}</div>
                                            <div className="text-sm text-slate-600">{doc.description || 'Please review and acknowledge this document.'}</div>
                                        </div>
                                        <a
                                            href="#/employee/documents"
                                            className="px-3 py-1.5 text-sm font-bold text-amber-700 bg-amber-100 rounded-lg hover:bg-amber-200 transition-colors"
                                        >
                                            Review
                                        </a>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column - Schedule Calendar */}
                <div className="space-y-6">
                    {/* Mini Calendar */}
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
                                const isTodayDay = isToday(dayIndex);
                                return (
                                    <div
                                        key={dayIndex}
                                        className={`text-center py-2 rounded-lg ${isTodayDay ? 'bg-[#0f766e] text-white' : 'text-slate-600'}`}
                                    >
                                        <div className="text-xs font-medium">{getDayAbbrev(dayIndex)}</div>
                                        <div className={`text-lg font-bold ${isTodayDay ? 'text-white' : 'text-slate-900'}`}>{getDayNum(dayIndex)}</div>
                                    </div>
                                );
                            })}
                        </div>

                        <h4 className="font-bold text-slate-900 mb-3">My Work Schedule</h4>

                        {/* Upcoming Shifts */}
                        <div className="space-y-3">
                            {upcomingShifts.length > 0 ? upcomingShifts.slice(0, 3).map((shift) => (
                                <div key={shift.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                    <div>
                                        <div className="font-bold text-slate-900">{formatDate(shift.date)}</div>
                                        <div className="text-sm text-slate-500">
                                            {formatTime(shift.startTime)} – {formatTime(shift.endTime)} 📍
                                        </div>
                                    </div>
                                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${shift.status === 'Published' ? 'bg-green-100 text-green-700' :
                                        shift.status === 'Draft' ? 'bg-slate-100 text-slate-600' :
                                            'bg-blue-100 text-blue-700'
                                        }`}>
                                        {shift.shiftType || 'Shift'}
                                    </span>
                                </div>
                            )) : (
                                <div className="text-center py-4 text-slate-500 text-sm">
                                    No upcoming shifts scheduled
                                </div>
                            )}
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <button
                                onClick={() => navigate('/employee/schedule')}
                                className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                            >
                                View All Communications →
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TodayMyWork;
