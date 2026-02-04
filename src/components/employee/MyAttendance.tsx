// ... (imports remain)
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { attendanceService, settingsService, staffService } from '../../lib/services';
import { getTodayDateKE, formatDateWithDayKE, getWeekNumber } from '../../lib/utils/dateFormat';
import type { AttendanceRecord, AttendanceStatus, OrganizationSettings, Profile } from '../../types';

// Helper for duration formatting
const formatDurationMs = (ms: number): string => {
    if (ms < 0) ms = 0;
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
};

// Start Week Helper (Standard ISO week starts Mon)
const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
};

interface WeekGroup {
    weekNumber: number;
    weekStart: string;
    weekEnd: string;
    records: AttendanceRecord[];
    totalHours: number;
    daysWorked: number;
    missedClockOuts: number;
}

interface MonthGroup {
    monthName: string; // e.g., "January"
    monthIndex: number; // 0-11
    weeks: WeekGroup[];
    totalHours: number;
    daysWorked: number;
    missedClockOuts: number;
}

interface YearGroup {
    year: number;
    months: MonthGroup[];
    totalHours: number;
    daysWorked: number;
    missedClockOuts: number;
}

const MyAttendance: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);

    // Hierarchical Data State
    const [historyGroups, setHistoryGroups] = useState<YearGroup[]>([]);

    // Fold/Expand State
    const [expandedYears, setExpandedYears] = useState<number[]>([]);
    const [expandedMonths, setExpandedMonths] = useState<string[]>([]); // "Year-MonthIndex"
    const [expandedWeeks, setExpandedWeeks] = useState<string[]>([]); // "Year-WeekNum"

    const [summary, setSummary] = useState({ totalHours: 0, daysWorked: 0, onTimePercentage: 0, missedClockOuts: 0 });
    const [settings, setSettings] = useState<OrganizationSettings | null>(null);

    // Jump To Filters
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());

    // Action states
    const [clockingIn, setClockingIn] = useState(false);
    const [clockingOut, setClockingOut] = useState(false);
    const [startingLunch, setStartingLunch] = useState(false);
    const [endingLunch, setEndingLunch] = useState(false);
    const [startingBreak, setStartingBreak] = useState(false);
    const [endingBreak, setEndingBreak] = useState(false);

    // Live timer
    const [currentTime, setCurrentTime] = useState(new Date());

    // Derived Status
    const isOnline = todayRecord && todayRecord.clockIn && !todayRecord.clockOut;
    const isOnLunch = todayRecord?.isOnLunch || false;
    const isOnBreak = todayRecord?.isOnBreak || false;
    const hasUsedLunch = todayRecord?.lunchEnd ? true : false;
    const breakCount = todayRecord?.breakCount || 0;
    const isHourly = profile?.employmentType === 'Hourly';

    // Settings Checks
    const lunchEnabled = settings?.lunch?.enabled ?? false;
    const breaksEnabled = settings?.breaks?.enabled ?? false;
    const maxBreaksPerDay = settings?.breaks?.maxBreaksPerDay ?? 2;
    const canTakeLunch = lunchEnabled && isOnline && !isOnLunch && !isOnBreak && !hasUsedLunch;
    const canTakeBreak = breaksEnabled && isOnline && !isOnLunch && !isOnBreak && breakCount < maxBreaksPerDay;

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const getLiveDuration = () => {
        if (!todayRecord?.clockIn || !isOnline) return '00:00:00';
        const start = new Date(todayRecord.clockIn).getTime();
        const now = currentTime.getTime();
        const diff = Math.max(0, now - start);
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const getSecondsProgress = () => {
        const seconds = currentTime.getSeconds();
        return (seconds / 60) * 100;
    };

    // Calculate hours for a record
    const calculateRecordHours = (record: AttendanceRecord) => {
        if (record.totalHours) return record.totalHours;
        if (record.clockIn && record.clockOut) {
            const start = new Date(record.clockIn).getTime();
            const end = new Date(record.clockOut).getTime();
            let duration = end - start;
            if (record.lunchStart && record.lunchEnd) duration -= (new Date(record.lunchEnd).getTime() - new Date(record.lunchStart).getTime());
            if (record.breaks) {
                record.breaks.forEach((b: any) => {
                    if (b.startTime && b.endTime) duration -= (new Date(b.endTime).getTime() - new Date(b.startTime).getTime());
                });
            }
            return duration / 3600000;
        }
        return 0;
    };

    const loadData = async () => {
        setLoading(true);
        if (!user?.organizationId || !user?.id) {
            setLoading(false);
            return;
        }

        try {
            const today = getTodayDateKE();

            // 1. Initial Load (Settings, Profile, Today)
            const [orgSettings, currentUserProfile, todayRecords] = await Promise.all([
                settingsService.getSettings(user.organizationId),
                staffService.getById(user.id),
                attendanceService.getByDateRange(user.organizationId, today, today)
            ]);

            setSettings(orgSettings);
            setProfile(currentUserProfile);
            setTodayRecord(todayRecords.find(r => r.staffId === user.id) || null);

            // 2. Fetch Large History (Last 12 months for good measure, or all if feasible. User wants folding.)
            // Let's go back 1 year by default.
            const startDate = new Date();
            startDate.setFullYear(startDate.getFullYear() - 1);
            const historyRecords = await attendanceService.getByDateRange(
                user.organizationId,
                startDate.toISOString().split('T')[0],
                today
            );

            const myRecords = historyRecords.filter(r => r.staffId === user.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            processHistoryData(myRecords);

        } catch (error) {
            console.error('Error loading attendance:', error);
        } finally {
            setLoading(false);
        }
    };

    const processHistoryData = (records: AttendanceRecord[]) => {
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();
        const currentWeekNum = getWeekNumber(today);

        // Grouping Structure
        const years: Record<number, YearGroup> = {};

        records.forEach(record => {
            const d = new Date(record.date);
            const year = d.getFullYear();
            const month = d.getMonth();
            const weekNum = getWeekNumber(d);

            if (!years[year]) {
                years[year] = { year, months: [], totalHours: 0, daysWorked: 0, missedClockOuts: 0 };
            }

            // Find or Create Month
            let monthGroup = years[year].months.find(m => m.monthIndex === month);
            if (!monthGroup) {
                monthGroup = {
                    monthName: d.toLocaleDateString('en-GB', { month: 'long' }),
                    monthIndex: month,
                    weeks: [],
                    totalHours: 0,
                    daysWorked: 0,
                    missedClockOuts: 0
                };
                years[year].months.push(monthGroup);
            }

            // Find or Create Week
            let weekGroup = monthGroup.weeks.find(w => w.weekNumber === weekNum);
            if (!weekGroup) {
                const weekStart = getWeekStart(d).toISOString().split('T')[0];
                const weekEnd = new Date(new Date(weekStart).setDate(new Date(weekStart).getDate() + 6)).toISOString().split('T')[0];
                weekGroup = { weekNumber: weekNum, weekStart, weekEnd, records: [], totalHours: 0, daysWorked: 0, missedClockOuts: 0 };
                monthGroup.weeks.push(weekGroup);
            }

            // Calculations
            const hours = calculateRecordHours(record);
            const isMissedOut = !!(record.clockIn && !record.clockOut && record.date < getTodayDateKE());
            const days = (record.status === 'Present' || record.status === 'Partial' || record.status === 'Worked') ? 1 : 0;

            weekGroup.records.push(record);
            weekGroup.totalHours += hours;
            weekGroup.daysWorked += days;
            if (isMissedOut) weekGroup.missedClockOuts++;

            monthGroup.totalHours += hours;
            monthGroup.daysWorked += days;
            if (isMissedOut) monthGroup.missedClockOuts++;

            years[year].totalHours += hours;
            years[year].daysWorked += days;
            if (isMissedOut) years[year].missedClockOuts++;
        });

        // Convert to Arrays & Sort
        const sortedYears = Object.values(years).sort((a, b) => b.year - a.year).map(y => {
            y.months.sort((a, b) => b.monthIndex - a.monthIndex);
            y.months.forEach(m => m.weeks.sort((a, b) => b.weekNumber - a.weekNumber));
            return y;
        });

        setHistoryGroups(sortedYears);

        // Update Summary (Lifetime stats from fetched range)
        const totalHours = sortedYears.reduce((sum, y) => sum + y.totalHours, 0);
        const daysWorked = sortedYears.reduce((sum, y) => sum + y.daysWorked, 0);
        const missedClockOuts = sortedYears.reduce((sum, y) => sum + y.missedClockOuts, 0);
        // Recalc on-time % roughly
        const onTimeCount = records.filter(r => r.status === 'Present').length;
        const onTimePercentage = records.length > 0 ? Math.round((onTimeCount / records.length) * 100) : 100;

        setSummary({ totalHours, daysWorked, onTimePercentage, missedClockOuts });

        // Set Default Expanded State (Current)
        setExpandedYears([currentYear]);
        setExpandedMonths([`${currentYear}-${currentMonth}`]);
        setExpandedWeeks([`${currentYear}-${currentWeekNum}`]);
    };

    // Toggle Handlers
    const toggleYear = (year: number) => {
        setExpandedYears(prev => prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]);
    };
    const toggleMonth = (year: number, month: number) => {
        const key = `${year}-${month}`;
        setExpandedMonths(prev => prev.includes(key) ? prev.filter(m => m !== key) : [...prev, key]);
    };
    const toggleWeek = (year: number, week: number) => {
        const key = `${year}-${week}`;
        setExpandedWeeks(prev => prev.includes(key) ? prev.filter(w => w !== key) : [...prev, key]);
    };

    // Jump To Handler
    const handleJumpTo = () => {
        if (!historyGroups.some(y => y.year === selectedYear)) {
            alert('No records found for selected year.');
            return;
        }
        setExpandedYears(prev => [...prev, selectedYear]);
        setExpandedMonths(prev => [...prev, `${selectedYear}-${selectedMonth}`]);
        // Ideally scroll to element - simplified by just expanding
        alert(`Jumped to ${new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}. Filters applied.`);
    };

    // Reuse existing action handlers (clockIn, etc.)
    useEffect(() => { loadData(); }, [user?.organizationId, user?.id]);
    const handleClockIn = async () => { /* ... reuse logic ... */ if (!user?.organizationId || !user?.id) return; setClockingIn(true); try { await attendanceService.clockIn(user.organizationId, user.id, user.locationId); loadData(); } catch (e: any) { alert(e.message || 'Failed'); } finally { setClockingIn(false); } };
    const handleClockOut = async () => { if (!todayRecord) return; setClockingOut(true); try { await attendanceService.clockOut(user.organizationId, todayRecord.id); loadData(); } catch (e: any) { alert(e.message); } finally { setClockingOut(false); } };
    const handleStartLunch = async () => { if (!todayRecord) return; setStartingLunch(true); try { await attendanceService.startLunch(user.organizationId, todayRecord.id); loadData(); } catch (e: any) { alert(e.message); } finally { setStartingLunch(false); } };
    const handleEndLunch = async () => { if (!todayRecord) return; setEndingLunch(true); try { await attendanceService.endLunch(user.organizationId, todayRecord.id); loadData(); } catch (e: any) { alert(e.message); } finally { setEndingLunch(false); } };
    const handleStartBreak = async () => { if (!todayRecord) return; setStartingBreak(true); try { await attendanceService.startBreak(user.organizationId, todayRecord.id); loadData(); } catch (e: any) { alert(e.message); } finally { setStartingBreak(false); } };
    const handleEndBreak = async () => { if (!todayRecord) return; setEndingBreak(true); try { await attendanceService.endBreak(user.organizationId, todayRecord.id); loadData(); } catch (e: any) { alert(e.message); } finally { setEndingBreak(false); } };

    const getStatusColor = (status: AttendanceStatus) => {
        switch (status) {
            case 'Present':
            case 'Worked': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'Partial': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'Absent':
            case 'No-show': return 'bg-rose-100 text-rose-700 border-rose-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="animate-spin w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto flex flex-col animate-in fade-in duration-500 font-inter">
            {/* Header Status Section (Recycled from existing) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                {/* Status Card - reused from existing code logic */}
                <div className={`p-8 rounded-[2rem] border shadow-lg flex flex-col items-center text-center relative overflow-hidden transition-all duration-500 ${isOnLunch ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200' : isOnBreak ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200' : isOnline ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
                    {isOnline && <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl"></div>}
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 z-10">{isOnLunch ? '🍽️ On Lunch' : isOnBreak ? '☕ On Break' : 'Current Status'}</div>
                    <div className="relative w-56 h-56 mb-8 flex items-center justify-center">
                        <div className={`absolute inset-0 rounded-full border-8 opacity-20 ${isOnLunch ? 'border-amber-400' : isOnBreak ? 'border-blue-400' : isOnline ? 'border-emerald-400' : 'border-slate-200'}`}></div>
                        {isOnline && !isOnLunch && !isOnBreak && (
                            <svg className="absolute inset-0 w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" className="text-emerald-500 transition-all duration-1000 ease-linear" strokeDasharray="289.026" strokeDashoffset={289.026 - (289.026 * getSecondsProgress()) / 100} />
                            </svg>
                        )}
                        <div className="relative z-10 flex flex-col items-center justify-center w-48 h-48 rounded-full bg-white shadow-sm border-4 border-slate-50">
                            <div className={`text-3xl font-bold font-mono tracking-wider ${isOnLunch ? 'text-amber-600' : isOnBreak ? 'text-blue-600' : isOnline ? 'text-emerald-600' : 'text-slate-400'}`}>{isOnline ? getLiveDuration() : '--:--:--'}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase mt-2">Duration</div>
                        </div>
                    </div>
                    <div className="w-full max-w-sm z-10 space-y-3">
                        {isOnLunch && <button onClick={handleEndLunch} disabled={endingLunch} className="w-full py-3 rounded-xl font-bold bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-500/20 disabled:opacity-50">{endingLunch ? 'Ending...' : '✓ End Lunch'}</button>}
                        {isOnBreak && <button onClick={handleEndBreak} disabled={endingBreak} className="w-full py-3 rounded-xl font-bold bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-500/20 disabled:opacity-50">{endingBreak ? 'Ending...' : '✓ End Break'}</button>}
                        {!isOnline && !isOnLunch && !isOnBreak && <button onClick={handleClockIn} disabled={clockingIn || !user?.organizationId} className="w-full py-3 rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50">{clockingIn ? 'Clocking In...' : '👋 Clock In Now'}</button>}
                        {isOnline && !isOnLunch && !isOnBreak && (
                            <>
                                {canTakeLunch && <button onClick={handleStartLunch} disabled={startingLunch} className="w-full py-2.5 rounded-xl font-bold bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200 disabled:opacity-50">{startingLunch ? 'Starting...' : '🍽️ Take Lunch'}</button>}
                                {canTakeBreak && <button onClick={handleStartBreak} disabled={startingBreak} className="w-full py-2.5 rounded-xl font-bold bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200 disabled:opacity-50">{startingBreak ? 'Starting...' : `☕ Take Break (${breakCount}/${maxBreaksPerDay})`}</button>}
                                <button onClick={handleClockOut} disabled={clockingOut} className="w-full py-3 rounded-xl font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-200 disabled:opacity-50">{clockingOut ? 'Clocking Out...' : '🏠 Clock Out'}</button>
                            </>
                        )}
                    </div>
                </div>

                {/* Stats Summary Panel */}
                <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-center space-y-6">
                    <h3 className="text-xl font-bold text-slate-900">Overall Performance</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl">
                            <span className="font-bold text-slate-600">Total Hours Worked</span>
                            <span className="text-xl font-bold text-slate-900">{summary.totalHours.toFixed(1)} hrs</span>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl">
                            <span className="font-bold text-slate-600">Days Worked</span>
                            <span className="text-xl font-bold text-slate-900">{summary.daysWorked} days</span>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl">
                            <span className="font-bold text-slate-600">On-Time %</span>
                            <span className="text-xl font-bold text-emerald-600">{summary.onTimePercentage}%</span>
                        </div>
                        {summary.missedClockOuts > 0 && <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm font-bold flex items-center gap-2">⚠️ {summary.missedClockOuts} Missed Clock-Outs</div>}
                    </div>
                </div>
            </div>

            {/* Attendance History */}
            <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h3 className="text-xl font-bold text-slate-900">Attendance History</h3>
                    <div className="flex gap-2 items-center bg-white p-2 border border-slate-200 rounded-xl shadow-sm">
                        <span className="text-xs font-bold text-slate-400 uppercase pl-2">Jump to:</span>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                            className="text-sm font-bold text-slate-700 border-none bg-transparent focus:ring-0 cursor-pointer"
                        >
                            {Array.from({ length: 12 }).map((_, i) => (
                                <option key={i} value={i}>{new Date(2000, i, 1).toLocaleDateString('en-GB', { month: 'short' })}</option>
                            ))}
                        </select>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="text-sm font-bold text-slate-700 border-none bg-transparent focus:ring-0 cursor-pointer"
                        >
                            {Array.from({ length: 5 }).map((_, i) => {
                                const y = new Date().getFullYear() - i;
                                return <option key={y} value={y}>{y}</option>;
                            })}
                        </select>
                        <button onClick={handleJumpTo} className="bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-slate-800">Go</button>
                    </div>
                </div>

                {historyGroups.length > 0 ? (
                    <div className="space-y-4">
                        {historyGroups.map(yearGroup => (
                            <div key={yearGroup.year} className="border border-slate-200 rounded-2xl bg-white overflow-hidden">
                                {/* Year Header */}
                                <div
                                    onClick={() => toggleYear(yearGroup.year)}
                                    className="p-4 bg-slate-50 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={`transform transition-transform ${expandedYears.includes(yearGroup.year) ? 'rotate-90' : ''}`}>▶</span>
                                        <span className="text-lg font-bold text-slate-900">{yearGroup.year}</span>
                                    </div>
                                    <div className="flex gap-4 text-xs font-medium text-slate-500">
                                        <span>{yearGroup.totalHours.toFixed(1)} hrs</span>
                                        <span>{yearGroup.daysWorked} days</span>
                                        {(yearGroup.missedClockOuts > 0) && <span className="text-red-500 font-bold">{yearGroup.missedClockOuts} missed clock-outs</span>}
                                    </div>
                                </div>

                                {/* Months List */}
                                {expandedYears.includes(yearGroup.year) && (
                                    <div className="border-t border-slate-100">
                                        {yearGroup.months.map(monthGroup => (
                                            <div key={monthGroup.monthIndex} className="border-b border-slate-100 last:border-0">
                                                {/* Month Header */}
                                                <div
                                                    onClick={() => toggleMonth(yearGroup.year, monthGroup.monthIndex)}
                                                    className="p-3 pl-8 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className={`transform transition-transform text-slate-400 text-xs ${expandedMonths.includes(`${yearGroup.year}-${monthGroup.monthIndex}`) ? 'rotate-90' : ''}`}>▶</span>
                                                        <span className="font-bold text-slate-800">{monthGroup.monthName}</span>
                                                    </div>
                                                    <div className="flex gap-4 text-xs text-slate-400">
                                                        <span>{monthGroup.totalHours.toFixed(1)} hrs</span>
                                                        <span>{monthGroup.daysWorked} days</span>
                                                        {(monthGroup.missedClockOuts > 0) && <span className="text-red-500 font-bold">{monthGroup.missedClockOuts} missed</span>}
                                                    </div>
                                                </div>

                                                {/* Weeks List */}
                                                {expandedMonths.includes(`${yearGroup.year}-${monthGroup.monthIndex}`) && (
                                                    <div className="bg-slate-50/30">
                                                        {monthGroup.weeks.map(weekGroup => (
                                                            <div key={weekGroup.weekNumber} className="border-t border-slate-100 first:border-0">
                                                                {/* Week Header */}
                                                                <div
                                                                    onClick={() => toggleWeek(yearGroup.year, weekGroup.weekNumber)}
                                                                    className="p-2 pl-12 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`transform transition-transform text-slate-300 text-[10px] ${expandedWeeks.includes(`${yearGroup.year}-${weekGroup.weekNumber}`) ? 'rotate-90' : ''}`}>▶</span>
                                                                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Week {weekGroup.weekNumber}</span>
                                                                        <span className="text-[10px] text-slate-400">({new Date(weekGroup.weekStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {new Date(weekGroup.weekEnd).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})</span>
                                                                    </div>
                                                                    <div className="flex gap-3 text-[10px] text-slate-400 font-mono">
                                                                        <span>{weekGroup.totalHours.toFixed(1)}h</span>
                                                                    </div>
                                                                </div>

                                                                {/* Records Table */}
                                                                {expandedWeeks.includes(`${yearGroup.year}-${weekGroup.weekNumber}`) && (
                                                                    <div className="pl-12 pr-4 pb-4">
                                                                        <table className="w-full text-left bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                                                                            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                                                                                <tr>
                                                                                    <th className="px-4 py-2">Date</th>
                                                                                    <th className="px-4 py-2">In / Out</th>
                                                                                    <th className="px-4 py-2">Total</th>
                                                                                    <th className="px-4 py-2">Status</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="divide-y divide-slate-100 text-sm">
                                                                                {weekGroup.records.map(record => (
                                                                                    <tr key={record.id} className="hover:bg-slate-50">
                                                                                        <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                                                                                            {formatDateWithDayKE(record.date)}
                                                                                        </td>
                                                                                        <td className="px-4 py-3 font-mono text-xs text-slate-600">
                                                                                            <div>In: {record.clockIn ? new Date(record.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}</div>
                                                                                            <div className="opacity-70">Out: {record.clockOut ? new Date(record.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}</div>
                                                                                        </td>
                                                                                        <td className="px-4 py-3 font-bold text-slate-700">
                                                                                            {formatDurationMs(calculateRecordHours(record) * 3600000)}
                                                                                        </td>
                                                                                        <td className="px-4 py-3">
                                                                                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getStatusColor(record.status)}`}>
                                                                                                {record.status}
                                                                                            </span>
                                                                                        </td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-12 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                        <div className="text-4xl mb-3 opacity-30">📅</div>
                        <div className="text-slate-900 font-bold">No attendance history</div>
                        <div className="text-slate-500 text-sm">Records will appear here once you clock in.</div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyAttendance;
