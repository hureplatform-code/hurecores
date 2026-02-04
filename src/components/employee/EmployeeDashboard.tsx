import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { attendanceService, policyDocumentsService, organizationService } from '../../lib/services';
import { leaveService } from '../../lib/services/leave.service';
import { getTodayDateKE, formatDateFullKE, formatTimeKE } from '../../lib/utils/dateFormat';
import type { AttendanceRecord, OrganizationSettings, PolicyDocument, Organization, Location, LeaveRequest } from '../../types';

const EmployeeDashboard: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
    const [pendingDocs, setPendingDocs] = useState<PolicyDocument[]>([]);
    const [upcomingLeave, setUpcomingLeave] = useState<LeaveRequest[]>([]);
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
            const today = getTodayDateKE();

            // Load data in parallel
            const [org, todayRecords, docs, leaves] = await Promise.all([
                organizationService.getById(user.organizationId),
                attendanceService.getByDateRange(user.organizationId, today, today),
                policyDocumentsService.getForStaff(user.organizationId, user.id, user.jobTitle),
                leaveService.getMyLeaveRequests(user.organizationId, user.id)
            ]);

            setOrganization(org);

            const myTodayRecord = todayRecords.find(r => r.staffId === user.id);
            setTodayRecord(myTodayRecord || null);

            // Filter pending docs
            const pendingDocsList: PolicyDocument[] = [];
            for (const doc of docs) {
                if (doc.requiresAcknowledgement) {
                    const hasAcked = await policyDocumentsService.hasAcknowledged(user.organizationId, doc.id, user.id);
                    if (!hasAcked) pendingDocsList.push(doc);
                }
            }
            setPendingDocs(pendingDocsList);

            // Filter upcoming leave (future dates, not rejected/cancelled)
            const todayDate = new Date().toISOString().split('T')[0];
            const futureLeaves = leaves
                .filter(l => l.startDate >= todayDate && l.status !== 'Rejected' && l.status !== 'Cancelled')
                .sort((a, b) => a.startDate.localeCompare(b.startDate))
                .slice(0, 5); // Show top 5
            setUpcomingLeave(futureLeaves);

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
            // Redirect to attendance after clock in
            navigate('/employee/attendance');
        } catch (error: any) {
            alert(error.message || 'Failed to clock in');
        } finally {
            setClockingIn(false);
        }
    };

    const isOnline = todayRecord && todayRecord.clockIn && !todayRecord.clockOut;

    // Date formatting
    const todayFullStr = new Date().toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="animate-spin w-8 h-8 border-4 border-slate-600 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto font-inter">
            {/* Header / Breadcrumb placeholder */}
            <div className="mb-6">
                <div className="text-xs font-semibold text-slate-400 mb-1">{organization?.name} • Staff Dashboard</div>
                <h2 className="text-2xl font-bold text-slate-900">Today at Work</h2>
                <p className="text-slate-500">{todayFullStr}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LEFT COLUMN */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Clock In Section */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center justify-between shadow-sm">
                        <p className="text-slate-600 font-medium">
                            {isOnline
                                ? "You are currently clocked in."
                                : "If you are working today, you may clock in."}
                        </p>

                        {isOnline ? (
                            <button
                                onClick={() => navigate('/employee/attendance')}
                                className="px-6 py-2 bg-emerald-100 text-emerald-700 text-sm font-bold rounded-lg hover:bg-emerald-200 transition-colors"
                            >
                                View Status
                            </button>
                        ) : (
                            <button
                                onClick={handleClockIn}
                                disabled={clockingIn}
                                className="px-6 py-2 bg-slate-100 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-200 border border-slate-200 transition-colors disabled:opacity-50"
                            >
                                {clockingIn ? 'Clocking In...' : 'Clock In'}
                            </button>
                        )}
                    </div>

                    {/* Announcements & Alerts */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 min-h-[200px] shadow-sm">
                        <h3 className="font-bold text-slate-900 mb-4">Announcements & Alerts</h3>

                        {pendingDocs.length > 0 ? (
                            <div className="space-y-3">
                                {pendingDocs.map(doc => (
                                    <div key={doc.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100">
                                        <div>
                                            <div className="font-bold text-slate-800 text-sm">{doc.name}</div>
                                            <div className="text-xs text-slate-500">Action Required: Acknowledge Policy</div>
                                        </div>
                                        <button
                                            onClick={() => navigate('/employee/documents')}
                                            className="text-xs font-bold text-amber-700 hover:text-amber-800 underline"
                                        >
                                            Review
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-center h-full">
                                <div className="text-2xl mb-2 text-slate-300">✓</div>
                                <div className="font-medium text-slate-500">All caught up</div>
                                <div className="text-xs text-slate-400">There are no announcements or pending actions.</div>
                            </div>
                        )}
                    </div>

                </div>

                {/* RIGHT COLUMN */}
                <div className="space-y-6">
                    {/* Upcoming Leave */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm min-h-[300px]">
                        <h3 className="font-bold text-slate-900 mb-4">Upcoming Leave</h3>

                        {upcomingLeave.length > 0 ? (
                            <div className="space-y-4">
                                {upcomingLeave.map(request => (
                                    <div key={request.id} className="border border-slate-100 rounded-xl p-4 bg-slate-50">
                                        <div className="mb-2">
                                            {request.status === 'Pending' && (
                                                <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">Pending</span>
                                            )}
                                            {request.status === 'Approved' && (
                                                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">Approved</span>
                                            )}
                                        </div>
                                        <div className="font-bold text-slate-900 text-sm mb-1">{request.leaveType?.name || 'Leave Request'}</div>
                                        <div className="text-xs text-slate-500">
                                            {new Date(request.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – {new Date(request.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </div>
                                        {request.status === 'Approved' ? (
                                            <div className="text-xs text-emerald-600 mt-2">You are scheduled to be on leave.</div>
                                        ) : (
                                            <div className="text-xs text-slate-400 mt-2">Awaiting approval</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-8 text-center">
                                <p className="text-sm text-slate-500">No upcoming leave recorded.</p>
                                <button
                                    onClick={() => navigate('/employee/leave')}
                                    className="mt-4 text-xs font-bold text-blue-600 hover:text-blue-700"
                                >
                                    + Request Leave
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmployeeDashboard;
