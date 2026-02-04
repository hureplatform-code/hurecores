// ... (imports remain)
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { scheduleService, settingsService } from '../../lib/services';
import { getTodayDateKE, formatTimeKE, formatDateWithDayKE, formatDateFullKE } from '../../lib/utils/dateFormat';
import type { Shift, ShiftAssignment, OrganizationSettings } from '../../types';

const MySchedule: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [myShifts, setMyShifts] = useState<(Shift & { assignment?: ShiftAssignment })[]>([]);
    const [availableShifts, setAvailableShifts] = useState<Shift[]>([]);
    const [accepting, setAccepting] = useState<string | null>(null);
    const [settings, setSettings] = useState<OrganizationSettings | null>(null);
    // settings state is sufficient

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
            // Get user's assignments, available shifts, AND org settings
            const [assignmentsData, availableData, settingsData] = await Promise.all([
                scheduleService.getStaffSchedule(user.organizationId, user.id),
                scheduleService.getAvailableShifts(user.organizationId),
                settingsService.getSettings(user.organizationId)
            ]);
            setMyShifts(assignmentsData);
            setAvailableShifts(availableData);
            setSettings(settingsData);
        } catch (error) {
            console.error('Error loading schedule:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptShift = async (shiftId: string) => {
        if (!user?.organizationId || !user?.id) return;

        setAccepting(shiftId);
        try {
            const result = await scheduleService.assignStaff(user.organizationId, shiftId, {
                staffId: user.id,
                isLocum: false
            });

            if (result.success) {
                // Success! Reload data to show updated shifts
                await loadData();
                alert('✅ Shift accepted successfully!');
            } else {
                // Assignment failed, show error to user
                alert(result.error || 'Failed to accept shift');
            }
        } catch (error: any) {
            console.error('Error accepting shift:', error);
            alert(error.message || 'Failed to accept shift');
        } finally {
            setAccepting(null);
        }
    };

    const isToday = (dateString: string) => {
        return dateString === getTodayDateKE();
    };

    const isPast = (dateString: string) => {
        return dateString < getTodayDateKE();
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="animate-spin w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    // --- RENDER HELPERS ---


    // No Scheduling View
    const NoSchedulingView = () => (
        <div className="bg-white rounded-[2rem] p-12 border border-slate-200 text-center shadow-sm max-w-2xl mx-auto animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl grayscale opacity-70">📅</span>
            </div>
            <p className="text-slate-700 font-semibold text-lg mb-2">
                This organization does not currently use shift scheduling in HURE for your role.
            </p>
            <p className="text-slate-500 mb-8 max-w-md mx-auto leading-relaxed">
                If shift scheduling is enabled in the future, your assigned shifts will appear here.
            </p>

            <div className="pt-6 border-t border-slate-100">
                <p className="text-slate-600">
                    For daily time tracking, use <a href="/employee/attendance" className="text-teal-600 font-bold hover:text-teal-700 hover:underline transition-colors">My Attendance</a>
                </p>
            </div>
        </div>
    );



    // --- RENDER ---
    const upcomingShifts = myShifts.filter(s => !isPast(s.date));
    const hasUpcomingShifts = upcomingShifts.length > 0;
    const schedulingEnabled = settings?.scheduling?.enabled ?? true;
    
    // Show NoSchedulingView if: scheduling is disabled OR employee has no assigned shifts
    const showNoSchedulingView = !schedulingEnabled || !hasUpcomingShifts;

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto flex flex-col animate-in fade-in duration-500 font-inter">
            {/* Header / Welcome */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">My Schedule</h1>
                    <p className="text-slate-500 mt-1">Your upcoming assigned shifts and available opportunities.</p>
                </div>
            </div>

            {/* Content based on settings and assigned shifts */}
            {showNoSchedulingView ? (
                <NoSchedulingView />
            ) : (
                <>
                    {/* Quick Stats Cards (Only relevant in Shift Mode) */}
                    {/* <div className="flex gap-4 mb-8"> ... (Commented out to match mock cleaner look, or verify if client wants this?) 
                            Actually the mock doesn't show these stats cards, so I'll hide them to match the "ui my client gave" strictly,
                            OR I can keep them if they add value. 
                            The user said "this is the ui my client gave please add fix it" -> referring to the toggle. 
                            I'll keep the logic but maybe simplify headers.
                            The previous header "Welcome back" is replaced by "My Schedule" to match mock.
                        */}

                    {!user?.organizationId && (
                        <div className="mb-8 p-6 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800">
                            <h3 className="font-bold text-lg mb-2">⚠️ Profile Incomplete</h3>
                            <p>We couldn't load your organization profile. This usually happens if you haven't been assigned to an organization yet or if permissions are restricted.</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Scheduled Shifts */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold text-slate-900">📅 Upcoming Shifts</h3>
                            </div>

                            <div className="space-y-4">
                                {upcomingShifts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((shift) => (
                                    <div key={shift.id} className={`bg-white p-6 rounded-2xl border shadow-sm hover:shadow-md transition-all group ${isToday(shift.date) ? 'border-teal-400 ring-4 ring-teal-50' : 'border-slate-200'}`}>
                                        {isToday(shift.date) && (
                                            <div className="mb-4 inline-flex items-center space-x-2 bg-teal-100 text-teal-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                                                <span className="w-2 h-2 bg-teal-600 rounded-full animate-pulse"></span>
                                                <span>Happening Today</span>
                                            </div>
                                        )}

                                        <div className="flex items-start gap-4">
                                            <div className="w-16 h-16 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center flex-shrink-0">
                                                <span className="text-xs font-bold text-slate-500 uppercase">
                                                    {typeof formatDateWithDayKE === 'function' ? formatDateWithDayKE(shift.date).split(',')[0].slice(0, 3) : new Date(shift.date).toLocaleDateString('en-GB', { weekday: 'short' })}
                                                </span>
                                                <span className="text-2xl font-bold text-slate-900 font-display">
                                                    {new Date(shift.date).getDate()}
                                                </span>
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-bold text-slate-900 text-lg">
                                                    {typeof formatDateFullKE === 'function' ? formatDateFullKE(shift.date) : new Date(shift.date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                                                </div>
                                                <div className="text-slate-600 font-medium font-mono bg-slate-50 inline-block px-2 py-0.5 rounded-md mt-1 border border-slate-100">
                                                    {typeof formatTimeKE === 'function' ? formatTimeKE(shift.startTime) : shift.startTime} - {typeof formatTimeKE === 'function' ? formatTimeKE(shift.endTime) : shift.endTime}
                                                </div>
                                                <div className="text-sm text-slate-500 mt-3 flex items-center">
                                                    <span className="mr-1.5 opacity-70">📍</span> {shift.location?.name || 'Main Location'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Available Shifts - Only if settings allow open shifts */}
                        {settings?.scheduling?.allowOpenShifts && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-bold text-slate-900">✨ Available to Pick Up</h3>
                                    <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-lg">{availableShifts.length} New</span>
                                </div>

                                <div className="space-y-4">
                                    {availableShifts.length > 0 ? availableShifts.map((shift) => (
                                        <div key={shift.id} className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                                            <div className="relative z-10 flex justify-between items-center gap-4">
                                                <div>
                                                    <div className="font-bold text-lg mb-1">
                                                        {typeof formatDateFullKE === 'function' ? formatDateFullKE(shift.date) : new Date(shift.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
                                                    </div>
                                                    <div className="text-blue-200 font-mono text-sm bg-white/10 px-2 py-1 rounded-lg inline-block border border-white/10">
                                                        {typeof formatTimeKE === 'function' ? formatTimeKE(shift.startTime) : shift.startTime} - {typeof formatTimeKE === 'function' ? formatTimeKE(shift.endTime) : shift.endTime}
                                                    </div>
                                                    <div className="text-sm text-slate-400 mt-3 flex items-center">
                                                        <span className="mr-2 opacity-70">📍</span> {shift.location?.name}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleAcceptShift(shift.id);
                                                    }}
                                                    disabled={accepting === shift.id}
                                                    className="bg-white text-slate-900 px-6 py-3 rounded-xl font-bold hover:bg-teal-100 transition-colors shadow-lg disabled:opacity-50 whitespace-nowrap"
                                                >
                                                    {accepting === shift.id ? '...' : 'Accept'}
                                                </button>
                                            </div>
                                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-teal-500/20 rounded-full blur-3xl"></div>
                                            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl"></div>
                                        </div>
                                    )) : (
                                        <div className="p-10 bg-slate-50 border border-dashed border-slate-200 rounded-3xl text-center">
                                            <div className="text-4xl mb-4 opacity-50">📅</div>
                                            <h3 className="text-slate-900 font-bold mb-1">No shifts available</h3>
                                            <p className="text-slate-500 text-sm">Check back later for new opportunities.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default MySchedule;
