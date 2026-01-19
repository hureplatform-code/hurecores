import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { attendanceService, settingsService, staffService } from '../../lib/services';
import type { AttendanceRecord, AttendanceStatus, OrganizationSettings, Profile } from '../../types';

const MyAttendance: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
    const [history, setHistory] = useState<AttendanceRecord[]>([]);
    const [summary, setSummary] = useState({ totalHours: 0, daysWorked: 0, onTimePercentage: 0, missedClockOuts: 0 });
    const [settings, setSettings] = useState<OrganizationSettings | null>(null);

    // Action states
    const [clockingIn, setClockingIn] = useState(false);
    const [clockingOut, setClockingOut] = useState(false);
    const [startingLunch, setStartingLunch] = useState(false);
    const [endingLunch, setEndingLunch] = useState(false);
    const [startingBreak, setStartingBreak] = useState(false);
    const [endingBreak, setEndingBreak] = useState(false);

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user?.organizationId, user?.id]);

    const loadData = async () => {
        setLoading(true);
        if (!user?.organizationId || !user?.id) {
            setLoading(false);
            return;
        }

        try {
            const today = new Date().toISOString().split('T')[0];

            // Load settings, profile, and today's record in parallel
            const [orgSettings, currentUserProfile, todayRecords] = await Promise.all([
                settingsService.getSettings(user.organizationId),
                staffService.getById(user.id),
                attendanceService.getByDateRange(user.organizationId, today, today)
            ]);

            setSettings(orgSettings);
            setProfile(currentUserProfile);

            const myTodayRecord = todayRecords.find(r => r.staffId === user.id);
            setTodayRecord(myTodayRecord || null);

            // Get history (last 30 days)
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);
            const historyRecords = await attendanceService.getByDateRange(
                user.organizationId,
                startDate.toISOString().split('T')[0],
                today
            );
            const myHistory = historyRecords.filter(r => r.staffId === user.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setHistory(myHistory);

            // Calculate summary
            const totalHours = myHistory.reduce((sum, r) => sum + (r.totalHours || 0), 0);
            const daysWorked = myHistory.filter(r => r.status === 'Present' || r.status === 'Partial').length;
            const onTimeCount = myHistory.filter(r => r.status === 'Present').length;
            const onTimePercentage = myHistory.length > 0 ? Math.round((onTimeCount / myHistory.length) * 100) : 100;

            // Calculate missed clock-outs (records with clockIn but no clockOut from previous days)
            const missedClockOuts = myHistory.filter(r =>
                r.clockIn &&
                !r.clockOut &&
                r.date < today // Only consider past days
            ).length;

            setSummary({ totalHours, daysWorked, onTimePercentage, missedClockOuts });
        } catch (error) {
            console.error('Error loading attendance:', error);
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
        } catch (error: any) {
            console.error('Error clocking in:', error);

            // Handle specific error codes
            if (error.code === 'LICENSE_EXPIRED') {
                alert('⚠️ Cannot Clock In: Your professional license has expired. Please update your profile.');
            } else if (error.code === 'MISSING_ORG_ID') {
                alert('⚠️ System Error: Your account is not properly linked to the organization. Please contact support.');
            } else if (error.code === 'ALREADY_CLOCKED_IN') {
                alert('⚠️ You are already clocked in.');
            } else {
                alert(error.message || 'Failed to clock in');
            }
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
            console.error('Error clocking out:', error);
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
            console.error('Error starting lunch:', error);
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
            console.error('Error ending lunch:', error);
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
            console.error('Error starting break:', error);
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
            console.error('Error ending break:', error);
            alert(error.message || 'Failed to end break');
        } finally {
            setEndingBreak(false);
        }
    };

    const getStatusColor = (status: AttendanceStatus) => {
        switch (status) {
            case 'Present':
            case 'Worked': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'Partial': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'Absent':
            case 'No-show': return 'bg-rose-100 text-rose-700 border-rose-200';
            case 'On Leave': return 'bg-blue-100 text-blue-700 border-blue-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    // Calculate current states
    const isOnline = todayRecord && todayRecord.clockIn && !todayRecord.clockOut;
    const isOnLunch = todayRecord?.isOnLunch || false;
    const isOnBreak = todayRecord?.isOnBreak || false;
    const hasUsedLunch = todayRecord?.lunchEnd ? true : false;
    const breakCount = todayRecord?.breakCount || 0;

    // Check if hourly staff
    const isHourly = profile?.employmentType === 'Hourly';

    // Calculate if actions are available based on settings
    const lunchEnabled = settings?.lunch?.enabled ?? false;
    const breaksEnabled = settings?.breaks?.enabled ?? false;
    const maxBreaksPerDay = settings?.breaks?.maxBreaksPerDay ?? 2;
    const canTakeLunch = lunchEnabled && isOnline && !isOnLunch && !isOnBreak && !hasUsedLunch;
    const canTakeBreak = breaksEnabled && isOnline && !isOnLunch && !isOnBreak && breakCount < maxBreaksPerDay;

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="animate-spin w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto flex flex-col animate-in fade-in duration-500">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900">My Attendance</h2>
                <p className="text-slate-500">Manage your daily time logs and view history.</p>
            </div>

            {!user?.organizationId && (
                <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-amber-800">
                    <span className="text-xl">⚠️</span>
                    <div>
                        <p className="font-bold text-sm">Account Verification Needed</p>
                        <p className="text-xs opacity-90">Your account needs to be verified by an admin to track attendance.</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                {/* Status Card */}
                <div className={`p-8 rounded-[2rem] border shadow-lg flex flex-col items-center text-center relative overflow-hidden transition-all duration-500 ${isOnLunch ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200' :
                    isOnBreak ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200' :
                        isOnline ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200' :
                            'bg-white border-slate-200'
                    }`}>
                    {isOnline && <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl"></div>}

                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 z-10">
                        {isOnLunch ? '🍽️ On Lunch' : isOnBreak ? '☕ On Break' : 'Current Status'}
                    </div>

                    <div className={`relative w-48 h-48 rounded-full border-8 flex items-center justify-center mb-8 transition-colors duration-500 ${isOnLunch ? 'border-amber-200 bg-white' :
                        isOnBreak ? 'border-blue-200 bg-white' :
                            isOnline ? 'border-emerald-200 bg-white' :
                                'border-slate-100 bg-slate-50'
                        } shadow-inner`}>
                        {isOnline && !isOnLunch && !isOnBreak && <div className="absolute inset-0 rounded-full animate-ping bg-emerald-400 opacity-10"></div>}
                        <div className="z-10 flex flex-col items-center">
                            <div className={`text-5xl font-bold font-display ${isOnLunch ? 'text-amber-600' :
                                isOnBreak ? 'text-blue-600' :
                                    isOnline ? 'text-emerald-600' :
                                        'text-slate-400'
                                }`}>
                                {isOnline ? ((Date.now() - new Date(todayRecord?.clockIn || 0).getTime()) / 3600000).toFixed(1) : '--'}
                            </div>
                            <div className="text-xs font-bold text-slate-400 uppercase mt-2">Hours Active</div>
                            {isOnline && !isOnLunch && !isOnBreak && <div className="mt-2 flex items-center text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full animate-pulse">• LIVE</div>}
                            {isOnLunch && <div className="mt-2 flex items-center text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">🍽️ LUNCH</div>}
                            {isOnBreak && <div className="mt-2 flex items-center text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">☕ BREAK</div>}
                        </div>
                    </div>

                    <div className="w-full max-w-sm z-10 space-y-3">
                        {/* If on lunch - show End Lunch only */}
                        {isOnLunch && (
                            <button
                                onClick={handleEndLunch}
                                disabled={endingLunch}
                                className="w-full py-4 rounded-2xl font-bold text-xl transition-all transform hover:-translate-y-1 active:translate-y-0 active:scale-95 bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-500/20 disabled:opacity-50"
                            >
                                {endingLunch ? 'Ending Lunch...' : '✓ End Lunch'}
                            </button>
                        )}

                        {/* If on break - show End Break only */}
                        {isOnBreak && (
                            <button
                                onClick={handleEndBreak}
                                disabled={endingBreak}
                                className="w-full py-4 rounded-2xl font-bold text-xl transition-all transform hover:-translate-y-1 active:translate-y-0 active:scale-95 bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-500/20 disabled:opacity-50"
                            >
                                {endingBreak ? 'Ending Break...' : '✓ End Break'}
                            </button>
                        )}

                        {/* Not clocked in - show Clock In */}
                        {!isOnline && !isOnLunch && !isOnBreak && (
                            <button
                                onClick={handleClockIn}
                                disabled={clockingIn || !user?.organizationId}
                                className="w-full py-4 rounded-2xl font-bold text-xl shadow-xl transition-all transform hover:-translate-y-1 active:translate-y-0 active:scale-95 bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                            >
                                {clockingIn ? 'Clocking In...' : '👋 Clock In Now'}
                            </button>
                        )}

                        {/* Clocked in, not on lunch/break - show action buttons */}
                        {isOnline && !isOnLunch && !isOnBreak && (
                            <>
                                {/* Take Lunch - only if enabled and not used */}
                                {canTakeLunch && (
                                    <button
                                        onClick={handleStartLunch}
                                        disabled={startingLunch}
                                        className="w-full py-3 rounded-2xl font-bold text-lg transition-all transform hover:-translate-y-1 active:translate-y-0 active:scale-95 bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200 disabled:opacity-50"
                                    >
                                        {startingLunch ? 'Starting Lunch...' : '🍽️ Take Lunch'}
                                    </button>
                                )}

                                {/* Take Break - only if enabled and breaks remaining */}
                                {canTakeBreak && (
                                    <button
                                        onClick={handleStartBreak}
                                        disabled={startingBreak}
                                        className="w-full py-3 rounded-2xl font-bold text-lg transition-all transform hover:-translate-y-1 active:translate-y-0 active:scale-95 bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200 disabled:opacity-50"
                                    >
                                        {startingBreak ? 'Starting Break...' : `☕ Take Break (${breakCount}/${maxBreaksPerDay})`}
                                    </button>
                                )}

                                {/* Clock Out - always available when clocked in */}
                                <button
                                    onClick={handleClockOut}
                                    disabled={clockingOut}
                                    className="w-full py-4 rounded-2xl font-bold text-xl transition-all transform hover:-translate-y-1 active:translate-y-0 active:scale-95 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-200 disabled:opacity-50"
                                >
                                    {clockingOut ? 'Clocking Out...' : '🏠 Clock Out'}
                                </button>
                            </>
                        )}
                    </div>

                    <p className="text-sm text-slate-500 mt-6 font-medium">
                        {isOnLunch
                            ? `Lunch started at ${todayRecord?.lunchStart ? new Date(todayRecord.lunchStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}`
                            : isOnBreak
                                ? `Break started at ${todayRecord?.currentBreakStart ? new Date(todayRecord.currentBreakStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}`
                                : isOnline
                                    ? `Started shift at ${todayRecord?.clockIn ? new Date(todayRecord.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}`
                                    : 'Ready to start your day? Clock in above.'
                        }
                    </p>
                </div>

                {/* Summary Stats */}
                <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-center space-y-6">
                    <h3 className="text-xl font-bold text-slate-900">Monthly Performance</h3>
                    <div className="space-y-4">
                        {isHourly && (
                            <div className="flex justify-between items-center p-5 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors">
                                <div className="flex items-center space-x-4">
                                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-xl">⏱️</div>
                                    <span className="font-bold text-slate-600">Total Hours</span>
                                </div>
                                <span className="text-2xl font-bold text-slate-900 font-display">{summary.totalHours.toFixed(1)} <span className="text-sm font-medium text-slate-400">hrs</span></span>
                            </div>
                        )}

                        <div className="flex justify-between items-center p-5 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors">
                            <div className="flex items-center space-x-4">
                                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-xl">✅</div>
                                <span className="font-bold text-slate-600">On-Time Arrival</span>
                            </div>
                            <span className="text-2xl font-bold text-green-600 font-display">{summary.onTimePercentage}%</span>
                        </div>

                        <div className="flex justify-between items-center p-5 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors">
                            <div className="flex items-center space-x-4">
                                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-xl">🗓️</div>
                                <span className="font-bold text-slate-600">Days Worked</span>
                            </div>
                            <span className="text-2xl font-bold text-slate-900 font-display">{summary.daysWorked} <span className="text-sm font-medium text-slate-400">days</span></span>
                        </div>

                        {summary.missedClockOuts > 0 && (
                            <div className="flex justify-between items-center p-5 bg-red-50 rounded-2xl hover:bg-red-100 transition-colors border border-red-100">
                                <div className="flex items-center space-x-4">
                                    <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-xl text-red-600">⚠️</div>
                                    <span className="font-bold text-red-800">Missed Clock-Outs</span>
                                </div>
                                <span className="text-2xl font-bold text-red-600 font-display">{summary.missedClockOuts}</span>
                            </div>
                        )}
                    </div>

                    {/* Today's Activity */}
                    {todayRecord && (
                        <div className="pt-4 border-t border-slate-100">
                            <h4 className="text-sm font-bold text-slate-500 uppercase mb-3">Today's Activity</h4>
                            <div className="space-y-2 text-sm">
                                {todayRecord.clockIn && (
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Clock In</span>
                                        <span className="font-mono font-bold text-slate-900">{new Date(todayRecord.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                )}
                                {todayRecord.lunchStart && (
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Lunch</span>
                                        <span className="font-mono font-bold text-amber-600">
                                            {new Date(todayRecord.lunchStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            {todayRecord.lunchEnd && ` - ${new Date(todayRecord.lunchEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${todayRecord.lunchDurationMinutes}min)`}
                                        </span>
                                    </div>
                                )}
                                {todayRecord.breaks && todayRecord.breaks.length > 0 && todayRecord.breaks.map((b, i) => (
                                    <div key={i} className="flex justify-between">
                                        <span className="text-slate-600">Break {i + 1}</span>
                                        <span className="font-mono font-bold text-blue-600">
                                            {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            {b.endTime && ` - ${new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${b.durationMinutes}min)`}
                                        </span>
                                    </div>
                                ))}
                                {todayRecord.clockOut && (
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Clock Out</span>
                                        <span className="font-mono font-bold text-slate-900">{new Date(todayRecord.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* History & Legend */}
            <div>
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-slate-900">Attendance History</h3>
                    <div className="flex space-x-3 mt-4 md:mt-0 text-xs font-bold uppercase overflow-x-auto pb-2 md:pb-0">
                        <div className="flex items-center bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-100">Present</div>
                        <div className="flex items-center bg-amber-50 text-amber-700 px-3 py-1 rounded-full border border-amber-100">Partial</div>
                        <div className="flex items-center bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-100">On Leave</div>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-[1.5rem] shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 text-xs uppercase font-bold text-slate-500 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-5">Date</th>
                                <th className="px-6 py-5">Clock In</th>
                                <th className="px-6 py-5">Clock Out</th>
                                <th className="px-6 py-5">Hours</th>
                                <th className="px-6 py-5">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {history.length > 0 ? history.slice(0, 10).map((record) => (
                                <tr key={record.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-900">
                                            {new Date(record.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-slate-600 text-sm">
                                        {record.clockIn ? new Date(record.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
                                    </td>
                                    <td className="px-6 py-4 font-mono text-slate-600 text-sm">
                                        {record.clockOut ? new Date(record.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-900 bg-slate-100 inline-block px-2 py-1 rounded-md text-xs">{record.totalHours?.toFixed(2) || '0.00'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase border ${getStatusColor(record.status)}`}>
                                            {record.status}
                                        </span>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center">
                                        <div className="text-4xl mb-3 opacity-30">📅</div>
                                        <div className="text-slate-900 font-bold">No attendance history</div>
                                        <div className="text-slate-500 text-sm">Records will appear here once you clock in.</div>
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

export default MyAttendance;
