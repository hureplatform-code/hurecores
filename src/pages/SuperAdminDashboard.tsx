import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, orderBy, deleteDoc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import ApprovalsManager from '../components/admin/ApprovalsManager';
import OrganizationsManager from '../components/admin/OrganizationsManager';
import BillingManager from '../components/admin/BillingManager';
import AuditLogManager from '../components/admin/AuditLogManager';
import SettingsManager from '../components/admin/SettingsManager';
import StatutoryRulesManager from '../components/admin/StatutoryRulesManager';
import SiteContentManager from '../components/admin/SiteContentManager';
import { PrivacyMask, PrivacyToggle } from '../components/common/PrivacyControl';

// Types
interface Organization {
    id: string;
    name: string;
    email: string;
    phone: string;
    city: string;
    orgStatus: 'Pending' | 'Active' | 'Suspended' | 'Unverified' | 'Verified' | 'Rejected';
    plan: string;
    createdAt: any;
    staffCount?: number;
    businessRegistrationNumber?: string;
    kraPin?: string;
    businessRegistrationDocUrl?: string;
    rejectionReason?: string;
}

interface UserProfile {
    id: string;
    fullName: string;
    email: string;
    organizationId: string;
    systemRole: string;
    isSuperAdmin: boolean;
    createdAt: any;
}

interface AuditLogEntry {
    id: string;
    action: string;
    category: string;
    performedBy: string;
    performedByEmail: string;
    organizationId?: string;
    createdAt: any;
}

interface StatCardProps {
    title: string;
    value: string | number;
    icon: string;
    color: string;
    trend?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, trend }) => (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
        <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl ${color}`}>
                {icon}
            </div>
            <div>
                <div className="text-slate-500 text-sm font-medium">{title}</div>
                <div className="text-2xl font-bold text-slate-900">{value}</div>
                {trend && <div className="text-xs text-emerald-600 font-medium mt-1">{trend}</div>}
            </div>
        </div>
    </div>
);

const SuperAdminDashboard: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'approvals' | 'organizations' | 'billing' | 'statutory' | 'audit' | 'settings' | 'content'>('overview');
    const [initialApprovalFilter, setInitialApprovalFilter] = useState<'Pending Review' | 'All'>('Pending Review');

    // Data
    const [stats, setStats] = useState({
        totalClinics: 0,
        pendingOnboarding: 0,
        activeSubscriptions: 0,
        totalUsers: 0,
        totalRevenue: 0,
        monthlyGrowth: '0%'
    });

    const [pendingOrgs, setPendingOrgs] = useState<Organization[]>([]);
    const [allClinics, setAllClinics] = useState<Organization[]>([]);
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showRevenue, setShowRevenue] = useState(false);

    // Billing config state
    const [billingConfig, setBillingConfig] = useState({
        essentialPrice: 2500,
        professionalPrice: 5000,
        enterprisePrice: 15000,
        currency: 'KES',
        trialDays: 14
    });

    useEffect(() => {
        if (user && !user.isSuperAdmin) {
            navigate('/dashboard');
        }
        loadData();
    }, [user]);

    // Helper function to determine effective approval status (matching ApprovalsManager logic)
    const getEffectiveApprovalStatus = (data: any): string => {
        // If approvalStatus field exists, use it (takes precedence)
        if (data.approvalStatus) {
            return data.approvalStatus;
        }
        // Otherwise, map legacy orgStatus to approvalStatus
        if (data.orgStatus === 'Active') return 'Active';
        if (data.orgStatus === 'Verified') return 'Approved';
        if (data.orgStatus === 'Suspended') return 'Suspended';
        if (data.orgStatus === 'Rejected') return 'Rejected';
        if (data.orgStatus === 'Pending') return 'Pending Review';
        return 'Pending Review'; // Default
    };

    const loadData = async () => {
        setLoading(true);
        try {
            // 1. Get All Clinics first (we'll derive pending from this)
            const allQuery = query(collection(db, 'organizations'), orderBy('createdAt', 'desc'));
            const allSnap = await getDocs(allQuery);
            const all = allSnap.docs.map(d => ({ id: d.id, ...d.data() } as Organization));
            setAllClinics(all);

            // 2. Calculate pending using the same logic as ApprovalsManager
            // This ensures the count matches what's shown in the Approvals tab
            const pending = allSnap.docs.filter(d => {
                const data = d.data();
                const effectiveStatus = getEffectiveApprovalStatus(data);
                return effectiveStatus === 'Pending Review';
            }).map(d => ({ id: d.id, ...d.data() } as Organization));
            setPendingOrgs(pending);

            // 3. Get All Users
            const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
            const usersSnap = await getDocs(usersQuery);
            const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile));
            setAllUsers(users);

            // 4. Get Audit Logs
            const auditQuery = query(collection(db, 'auditLogs'), orderBy('createdAt', 'desc'));
            const auditSnap = await getDocs(auditQuery);
            const logs = auditSnap.docs.slice(0, 50).map(d => ({ id: d.id, ...d.data() } as AuditLogEntry));
            setAuditLogs(logs);

            // 5. Calculate Stats - use effective status for accurate counts
            const activeOrgs = allSnap.docs.filter(d => {
                const data = d.data();
                const effectiveStatus = getEffectiveApprovalStatus(data);
                return effectiveStatus === 'Active';
            }).length;
            const planPrices: Record<string, number> = { Essential: 2500, Professional: 5000, Enterprise: 15000 };
            const revenue = all.reduce((sum, org) => sum + (planPrices[org.plan] || 0), 0);

            setStats({
                totalClinics: all.length,
                pendingOnboarding: pending.length,
                activeSubscriptions: activeOrgs,
                totalUsers: users.length,
                totalRevenue: revenue,
                monthlyGrowth: '+12%'
            });

        } catch (error) {
            console.error("Error loading super admin data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOrg = async (orgId: string, approve: boolean) => {
        if (!confirm(approve ? 'Approve and activate this organization?' : 'Reject this organization?')) return;

        try {
            await updateDoc(doc(db, 'organizations', orgId), {
                orgStatus: approve ? 'Active' : 'Suspended',
                approvalStatus: approve ? 'Active' : 'Rejected',
                accountStatus: approve ? 'Active' : 'Rejected'
            });

            loadData();
            alert(approve ? 'Organization activated successfully.' : 'Organization rejected.');
        } catch (error) {
            console.error("Error updating org:", error);
            alert("Failed to update status.");
        }
    };

    const handleSuspendOrg = async (orgId: string) => {
        if (!confirm('Suspend this organization? Users will lose access.')) return;
        try {
            await updateDoc(doc(db, 'organizations', orgId), { 
                orgStatus: 'Suspended',
                approvalStatus: 'Suspended'
            });
            loadData();
        } catch (error) {
            alert('Failed to suspend organization');
        }
    };

    const handleReactivateOrg = async (orgId: string) => {
        if (!confirm('Reactivate this organization?')) return;
        try {
            await updateDoc(doc(db, 'organizations', orgId), { 
                orgStatus: 'Active',
                approvalStatus: 'Active'
            });
            loadData();
        } catch (error) {
            alert('Failed to reactivate organization');
        }
    };

    const handleToggleSuperAdmin = async (userId: string, currentStatus: boolean) => {
        if (!confirm(currentStatus ? 'Remove SuperAdmin access?' : 'Grant SuperAdmin access to this user?')) return;
        try {
            await updateDoc(doc(db, 'users', userId), { isSuperAdmin: !currentStatus });
            loadData();
        } catch (error) {
            alert('Failed to update user');
        }
    };

    const filteredClinics = allClinics.filter(org =>
        org.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.city?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredUsers = allUsers.filter(u =>
        u.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin text-5xl mb-4">⚡</div>
                    <p className="text-slate-500">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    const tabs = [
        { id: 'overview', label: '📊 Overview', badge: 0 },
        { id: 'approvals', label: '✅ Approvals', badge: stats.pendingOnboarding },
        { id: 'organizations', label: '🏢 Organization Details', badge: 0 },
        { id: 'billing', label: '💳 Billing', badge: 0 },
        { id: 'statutory', label: '📜 Statutory Rules', badge: 0 },
        { id: 'content', label: '📝 Site Content', badge: 0 },
        { id: 'audit', label: '📋 Audit Log', badge: 0 },
        { id: 'settings', label: '⚙️ Settings', badge: 0 }
    ];

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans">
            {/* Sidebar - Dark Teal Theme (matching Employer) */}
            <div
                className="w-72 text-white fixed h-full hidden md:flex flex-col"
                style={{ background: 'linear-gradient(180deg, #1a2e35 0%, #152428 100%)' }}
            >
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#4fd1c5' }}>
                            <span className="text-[#1a2e35] font-bold text-lg">HC</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white">HURE Core</h1>
                            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#4fd1c5' }}>Super Admin</span>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id as any);
                                setSearchQuery('');
                                if (tab.id === 'approvals') setInitialApprovalFilter('All');
                            }}
                            className={`w-full text-left px-4 py-3 rounded-xl transition-all flex justify-between items-center ${activeTab === tab.id
                                ? 'text-[#1a2e35] shadow-lg'
                                : 'text-white/70 hover:bg-white/10 hover:text-white'
                                }`}
                            style={activeTab === tab.id ? { backgroundColor: '#4fd1c5' } : {}}
                        >
                            <span>{tab.label}</span>
                            {tab.badge > 0 && (
                                <span className="bg-amber-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-white/10">
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-3" style={{ backgroundColor: 'rgba(79, 209, 197, 0.1)' }}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[#1a2e35] font-bold" style={{ backgroundColor: '#4fd1c5' }}>
                            SA
                        </div>
                        <div className="flex-1">
                            <div className="text-sm font-bold text-white">{user?.name || 'Super Admin'}</div>
                            <div className="text-xs text-slate-400">{user?.email}</div>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/50 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                    >
                        <span>🚪</span> Sign Out
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 md:ml-72 p-8">
                {/* Header */}
                <header className="flex justify-between items-center mb-10">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900">
                            {activeTab === 'overview' && 'Dashboard Overview'}
                            {activeTab === 'approvals' && 'Approvals'}
                            {activeTab === 'organizations' && 'Organizations'}
                            {activeTab === 'billing' && 'Billing'}
                            {activeTab === 'statutory' && 'Statutory Payroll Rules'}
                            {activeTab === 'content' && 'Landing Page Content'}
                            {activeTab === 'audit' && 'Audit Log'}
                            {activeTab === 'settings' && 'Settings'}
                        </h2>
                        <p className="text-slate-500 mt-1">
                            {activeTab === 'approvals'
                                ? 'Verify organizations and facilities before enabling platform access.'
                                : activeTab === 'organizations'
                                    ? 'Manage Kenya statutory tax and deduction rates for payroll calculations.'
                                    : activeTab === 'content'
                                        ? 'Manage content for the public landing page.'
                                        : activeTab === 'billing'
                                            ? 'Welcome back, Super Admin.'
                                            : 'Welcome back, Super Admin.'}
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        {(activeTab === 'clinics' || activeTab === 'users') && (
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                            />
                        )}
                    </div>
                </header>

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        {/* Requires Your Action Section */}
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-4">Requires Your Action</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {/* Pending Approvals */}
                                <button
                                    onClick={() => { setActiveTab('approvals'); setInitialApprovalFilter('Pending Review'); }}
                                    className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all text-left group cursor-pointer"
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-xl">📋</div>
                                        <span className="text-sm font-semibold text-slate-700">Pending Approvals</span>
                                    </div>
                                    <div className="text-3xl font-bold text-slate-900">{stats.pendingOnboarding}</div>
                                    <div className="text-xs text-slate-500 mt-1">Clinics pending review</div>
                                    <div className="text-xs font-semibold text-blue-600 mt-3 group-hover:underline">Review →</div>
                                </button>

                                {/* Payment Issues */}
                                <button
                                    onClick={() => setActiveTab('billing')}
                                    className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-red-300 hover:shadow-lg transition-all text-left group cursor-pointer"
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-xl">💳</div>
                                        <span className="text-sm font-semibold text-slate-700">Payment Issues</span>
                                    </div>
                                    <div className="text-3xl font-bold text-slate-900">
                                        {allClinics.filter(c => c.orgStatus === 'Suspended').length}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">Failed or overdue payments</div>
                                    <div className="text-xs font-semibold text-red-600 mt-3 group-hover:underline">Review →</div>
                                </button>

                                {/* Trials Expiring */}
                                <button
                                    onClick={() => setActiveTab('billing')}
                                    className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-amber-300 hover:shadow-lg transition-all text-left group cursor-pointer"
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-xl">⏳</div>
                                        <span className="text-sm font-semibold text-slate-700">Trials Expiring</span>
                                    </div>
                                    <div className="text-3xl font-bold text-slate-900">
                                        {allClinics.filter(c => c.plan === 'Trial' || (getEffectiveApprovalStatus(c) === 'Approved')).length}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">Trials ending soon</div>
                                    <div className="text-xs font-semibold text-amber-600 mt-3 group-hover:underline">Review →</div>
                                </button>

                                {/* Flagged Clinics */}
                                <button
                                    onClick={() => setActiveTab('organizations')}
                                    className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-orange-300 hover:shadow-lg transition-all text-left group cursor-pointer"
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-xl">⚠️</div>
                                        <span className="text-sm font-semibold text-slate-700">Flagged Clinics</span>
                                    </div>
                                    <div className="text-3xl font-bold text-slate-900">
                                        {allClinics.filter(c => {
                                            const status = getEffectiveApprovalStatus(c);
                                            return status === 'Suspended' || status === 'Rejected';
                                        }).length}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">Suspended or reported</div>
                                    <div className="text-xs font-semibold text-orange-600 mt-3 group-hover:underline">Review →</div>
                                </button>
                            </div>
                        </div>

                        {/* Platform Snapshot Section */}
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-4">Platform Snapshot</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {/* Active Clinics */}
                                <button
                                    onClick={() => setActiveTab('organizations')}
                                    className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-teal-300 hover:shadow-lg transition-all text-left group cursor-pointer"
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center text-xl">🏥</div>
                                        <span className="text-sm font-semibold text-slate-700">Active Clinics</span>
                                    </div>
                                    <div className="text-3xl font-bold text-slate-900">
                                        {allClinics.filter(c => {
                                            const status = getEffectiveApprovalStatus(c);
                                            return status === 'Active' || status === 'Approved';
                                        }).length}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">Currently live and operational</div>
                                    <div className="text-xs font-semibold text-teal-600 mt-3 group-hover:underline">Review →</div>
                                </button>

                                {/* Paying Clinics */}
                                <button
                                    onClick={() => setActiveTab('billing')}
                                    className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-green-300 hover:shadow-lg transition-all text-left group cursor-pointer"
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-xl">💰</div>
                                        <span className="text-sm font-semibold text-slate-700">Paying Clinics</span>
                                    </div>
                                    <div className="text-3xl font-bold text-slate-900">{stats.activeSubscriptions}</div>
                                    <div className="text-xs text-slate-500 mt-1">With paid active subscriptions</div>
                                    <div className="text-xs font-semibold text-green-600 mt-3 group-hover:underline">Review →</div>
                                </button>

                                {/* Trials Running */}
                                <button
                                    onClick={() => setActiveTab('billing')}
                                    className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all text-left group cursor-pointer"
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-xl">🎁</div>
                                        <span className="text-sm font-semibold text-slate-700">Trials Running</span>
                                    </div>
                                    <div className="text-3xl font-bold text-slate-900">
                                        {allClinics.filter(c => c.plan === 'Trial' || getEffectiveApprovalStatus(c) === 'Approved').length}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">Clinics in trial period</div>
                                    <div className="text-xs font-semibold text-blue-600 mt-3 group-hover:underline">Review →</div>
                                </button>

                                {/* Suspended Clinics */}
                                <button
                                    onClick={() => setActiveTab('organizations')}
                                    className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-red-300 hover:shadow-lg transition-all text-left group cursor-pointer"
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-xl">🔒</div>
                                        <span className="text-sm font-semibold text-slate-700">Suspended Clinics</span>
                                    </div>
                                    <div className="text-3xl font-bold text-slate-900">
                                        {allClinics.filter(c => getEffectiveApprovalStatus(c) === 'Suspended').length}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">Currently suspended or flagged</div>
                                    <div className="text-xs font-semibold text-red-600 mt-3 group-hover:underline">Review →</div>
                                </button>
                            </div>
                        </div>

                        {/* Revenue This Month */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-slate-800">Revenue This Month</h3>
                                <PrivacyToggle isVisible={showRevenue} onToggle={() => setShowRevenue(!showRevenue)} label={showRevenue ? 'Hide' : 'Show'} />
                            </div>
                            <button
                                onClick={() => setActiveTab('billing')}
                                className="w-full bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-8 text-white relative overflow-hidden hover:from-slate-700 hover:to-slate-800 transition-all cursor-pointer group text-left"
                            >
                                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white rounded-full blur-3xl opacity-5"></div>
                                <div className="relative z-10">
                                    <div className="text-sm font-medium text-slate-400 mb-2">Revenue This Month</div>
                                    <div className="text-4xl font-bold mb-2">
                                        <PrivacyMask isVisible={showRevenue} className="text-white">
                                            KES {stats.totalRevenue.toLocaleString()}
                                        </PrivacyMask>
                                    </div>
                                    <div className="text-sm text-emerald-400 font-medium">
                                        <div className="flex items-center gap-1">
                                            <PrivacyMask isVisible={showRevenue}>
                                                {stats.monthlyGrowth} from last month
                                            </PrivacyMask>
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute right-6 top-1/2 -translate-y-1/2">
                                    <span className="bg-white/10 px-4 py-2 rounded-lg text-sm font-semibold group-hover:bg-white/20 transition-colors">
                                        View Breakdown →
                                    </span>
                                </div>
                            </button>
                        </div>
                    </div>
                )}

                {/* Approvals Tab */}
                {activeTab === 'approvals' && <ApprovalsManager initialFilter={initialApprovalFilter} key={initialApprovalFilter} />}

                {/* Organizations Tab */}
                {activeTab === 'organizations' && <OrganizationsManager />}

                {/* Billing Tab */}
                {activeTab === 'billing' && <BillingManager />}

                {/* Statutory Rules Tab */}
                {activeTab === 'statutory' && <StatutoryRulesManager />}

                {/* Site Content Tab */}
                {activeTab === 'content' && <SiteContentManager />}

                {/* Audit Log Tab */}
                {activeTab === 'audit' && <AuditLogManager />}

                {/* Settings Tab */}
                {activeTab === 'settings' && <SettingsManager />}
            </main>
        </div>
    );
};

export default SuperAdminDashboard;
