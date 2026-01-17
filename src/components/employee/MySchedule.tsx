import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { scheduleService } from '../../lib/services';
import type { Shift, ShiftAssignment } from '../../types';

const MySchedule: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [myShifts, setMyShifts] = useState<(Shift & { assignment?: ShiftAssignment })[]>([]);
    const [availableShifts, setAvailableShifts] = useState<Shift[]>([]);
    const [accepting, setAccepting] = useState<string | null>(null);

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
            // Get user's assignments and available shifts
            const [assignmentsData, availableData] = await Promise.all([
                scheduleService.getStaffSchedule(user.organizationId, user.id),
                scheduleService.getAvailableShifts(user.organizationId)
            ]);
            setMyShifts(assignmentsData);
            setAvailableShifts(availableData);
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
            await scheduleService.assignStaff(user.organizationId, shiftId, {
                staffId: user.id,
                isLocum: false
            });
            loadData();
        } catch (error: any) {
            console.error('Error accepting shift:', error);
            alert(error.message || 'Failed to accept shift');
        } finally {
            setAccepting(null);
        }
    };

    const isToday = (dateString: string) => {
        return dateString === new Date().toISOString().split('T')[0];
    };

    const isPast = (dateString: string) => {
        return new Date(dateString) < new Date(new Date().toDateString());
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    // Logic for top stats
    const upcomingShiftsCount = myShifts.filter(s => !isPast(s.date)).length;
    const nextShift = myShifts.filter(s => !isPast(s.date)).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto flex flex-col animate-in fade-in duration-500">
            {/* Header / Welcome */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
                    <p className="text-slate-500 mt-1">Here's your schedule overview for this week.</p>
                </div>

                {/* Quick Stats Cards */}
                <div className="flex gap-4">
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
                        <div className="bg-blue-50 w-10 h-10 rounded-xl flex items-center justify-center text-blue-600 font-bold">
                            📅
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-slate-900">{upcomingShiftsCount}</div>
                            <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">Upcoming Shifts</div>
                        </div>
                    </div>
                </div>
            </div>

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
                        {myShifts.filter(s => !isPast(s.date)).length > 0 ? myShifts.filter(s => !isPast(s.date)).map((shift) => (
                            <div key={shift.id} className={`bg-white p-6 rounded-2xl border shadow-sm hover:shadow-md transition-all group ${isToday(shift.date) ? 'border-blue-500 ring-4 ring-blue-50' : 'border-slate-200'}`}>
                                {isToday(shift.date) && (
                                    <div className="mb-4 inline-flex items-center space-x-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                                        <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                                        <span>Happening Today</span>
                                    </div>
                                )}

                                <div className="flex items-start gap-4">
                                    <div className="w-16 h-16 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center flex-shrink-0">
                                        <span className="text-xs font-bold text-slate-500 uppercase">
                                            {new Date(shift.date).toLocaleDateString('en-US', { weekday: 'short' })}
                                        </span>
                                        <span className="text-2xl font-bold text-slate-900 font-display">
                                            {new Date(shift.date).getDate()}
                                        </span>
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-slate-900 text-lg">
                                            {new Date(shift.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                        </div>
                                        <div className="text-slate-600 font-medium font-mono bg-slate-50 inline-block px-2 py-0.5 rounded-md mt-1 border border-slate-100">
                                            {shift.startTime} - {shift.endTime}
                                        </div>
                                        <div className="text-sm text-slate-500 mt-3 flex items-center">
                                            <span className="mr-1.5 opacity-70">📍</span> {shift.location?.name || 'Main Location'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="p-10 bg-white border border-dashed border-slate-200 rounded-3xl text-center">
                                <div className="text-4xl mb-4">☕</div>
                                <h3 className="text-slate-900 font-bold mb-1">No upcoming shifts</h3>
                                <p className="text-slate-500 text-sm">You're all caught up! Check available shifts to pick up more work.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Available Shifts */}
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
                                            {new Date(shift.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                        </div>
                                        <div className="text-blue-200 font-mono text-sm bg-white/10 px-2 py-1 rounded-lg inline-block border border-white/10">
                                            {shift.startTime} - {shift.endTime}
                                        </div>
                                        <div className="text-sm text-slate-400 mt-3 flex items-center">
                                            <span className="mr-2 opacity-70">📍</span> {shift.location?.name}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleAcceptShift(shift.id)}
                                        disabled={accepting === shift.id}
                                        className="bg-white text-slate-900 px-6 py-3 rounded-xl font-bold hover:bg-blue-50 transition-colors shadow-lg disabled:opacity-50 whitespace-nowrap"
                                    >
                                        {accepting === shift.id ? '...' : 'Accept'}
                                    </button>
                                </div>
                                <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl"></div>
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
            </div>
        </div>
    );
};

export default MySchedule;
