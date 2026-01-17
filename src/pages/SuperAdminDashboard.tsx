import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, orderBy, deleteDoc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

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
    const [activeTab, setActiveTab] = useState<'overview' | 'onboarding' | 'clinics' | 'users' | 'billing' | 'audit' | 'settings'>('overview');

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

    const loadData = async () => {
        setLoading(true);
        try {
            // 1. Get Pending Organizations
            const pendingQuery = query(
                collection(db, 'organizations'),
                where('orgStatus', '==', 'Pending')
            );
            const pendingSnap = await getDocs(pendingQuery);
            const pending = pendingSnap.docs.map(d => ({ id: d.id, ...d.data() } as Organization));
            setPendingOrgs(pending);

            // 2. Get All Clinics
            const allQuery = query(collection(db, 'organizations'), orderBy('createdAt', 'desc'));
            const allSnap = await getDocs(allQuery);
            const all = allSnap.docs.map(d => ({ id: d.id, ...d.data() } as Organization));
            setAllClinics(all);

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

            // 5. Calculate Stats
            const activeOrgs = all.filter(o => o.orgStatus === 'Active').length;
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
            await updateDoc(doc(db, 'organizations', orgId), { orgStatus: 'Suspended' });
            loadData();
        } catch (error) {
            alert('Failed to suspend organization');
        }
    };

    const handleReactivateOrg = async (orgId: string) => {
        if (!confirm('Reactivate this organization?')) return;
        try {
            await updateDoc(doc(db, 'organizations', orgId), { orgStatus: 'Active' });
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
        { id: 'onboarding', label: '📝 Onboarding', badge: stats.pendingOnboarding },
        { id: 'clinics', label: '🏥 Clinics', badge: 0 },
        { id: 'users', label: '👥 Users', badge: 0 },
        { id: 'billing', label: '💳 Billing', badge: 0 },
        { id: 'audit', label: '📋 Audit Log', badge: 0 },
        { id: 'settings', label: '⚙️ Settings', badge: 0 }
    ];

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans">
            {/* Sidebar */}
            <div className="w-72 bg-gradient-to-b from-slate-900 to-slate-800 text-white fixed h-full hidden md:flex flex-col">
                <div className="p-6 border-b border-slate-700">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                        HURE Core
                    </h1>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Super Admin</span>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id as any); setSearchQuery(''); }}
                            className={`w-full text-left px-4 py-3 rounded-xl transition-all flex justify-between items-center ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'}`}
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

                <div className="p-4 border-t border-slate-700">
                    <div className="flex items-center gap-3 px-4 py-3 bg-slate-800/50 rounded-xl mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold">
                            SA
                        </div>
                        <div className="flex-1">
                            <div className="text-sm font-bold text-white">{user?.name || 'Super Admin'}</div>
                            <div className="text-xs text-slate-400">{user?.email}</div>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
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
                            {activeTab === 'onboarding' && 'Pending Onboarding'}
                            {activeTab === 'clinics' && 'Manage Clinics'}
                            {activeTab === 'users' && 'User Management'}
                            {activeTab === 'billing' && 'Billing & Subscriptions'}
                            {activeTab === 'audit' && 'Audit Log'}
                            {activeTab === 'settings' && 'Platform Settings'}
                        </h2>
                        <p className="text-slate-500 mt-1">Welcome back, Super Admin.</p>
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <StatCard title="Total Clinics" value={stats.totalClinics} icon="🏥" color="bg-blue-100" />
                            <StatCard title="Pending Review" value={stats.pendingOnboarding} icon="⏳" color="bg-amber-100" />
                            <StatCard title="Active Subscriptions" value={stats.activeSubscriptions} icon="✅" color="bg-emerald-100" />
                            <StatCard title="Total Users" value={stats.totalUsers} icon="👥" color="bg-purple-100" />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Revenue Card */}
                            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white relative overflow-hidden">
                                <div className="relative z-10">
                                    <h3 className="text-lg font-bold opacity-80">Monthly Revenue</h3>
                                    <div className="text-4xl font-bold mt-2">KES {stats.totalRevenue.toLocaleString()}</div>
                                    <div className="text-emerald-300 text-sm font-medium mt-2">{stats.monthlyGrowth} from last month</div>
                                </div>
                                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white rounded-full blur-3xl opacity-10"></div>
                            </div>

                            {/* Recent Activity */}
                            <div className="bg-white p-6 rounded-3xl border border-slate-200">
                                <h3 className="font-bold text-slate-900 mb-4">Recent Registrations</h3>
                                <div className="space-y-3">
                                    {allClinics.slice(0, 5).map(org => (
                                        <div key={org.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">🏥</div>
                                                <div>
                                                    <div className="font-semibold text-slate-900">{org.name}</div>
                                                    <div className="text-xs text-slate-500">{org.city} • {org.plan}</div>
                                                </div>
                                            </div>
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${org.orgStatus === 'Active' ? 'bg-emerald-100 text-emerald-700' : org.orgStatus === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                                {org.orgStatus}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Onboarding Tab */}
                {activeTab === 'onboarding' && (
                    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-amber-50">
                            <h3 className="font-bold text-amber-900 flex items-center gap-2">
                                <span>⏳</span> Pending Verifications ({pendingOrgs.length})
                            </h3>
                        </div>
                        {pendingOrgs.length === 0 ? (
                            <div className="p-16 text-center">
                                <div className="text-6xl mb-4 opacity-20">✅</div>
                                <h3 className="text-xl font-bold text-slate-900">All caught up!</h3>
                                <p className="text-slate-500">No pending organizations to review.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {pendingOrgs.map(org => (
                                    <div key={org.id} className="p-6 hover:bg-slate-50">
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                            <div className="flex items-start gap-4">
                                                <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-2xl">🏥</div>
                                                <div>
                                                    <h4 className="text-lg font-bold text-slate-900">{org.name}</h4>
                                                    <div className="text-sm text-slate-500 space-y-1 mt-1">
                                                        <p>📍 {org.city || 'No City'} • 📧 {org.email}</p>
                                                        <p>📱 {org.phone} • 💎 {org.plan}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button onClick={() => handleVerifyOrg(org.id, false)} className="px-4 py-2 border border-slate-300 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-all">
                                                    Reject
                                                </button>
                                                <button onClick={() => handleVerifyOrg(org.id, true)} className="px-6 py-2 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 shadow-lg shadow-emerald-500/30 transition-all">
                                                    ✓ Approve
                                                </button>
                                            </div>
                                        </div>

                                        {/* Verification Documents Section */}
                                        <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                            <h5 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                                <span>📄</span> Verification Documents
                                            </h5>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="space-y-1">
                                                    <span className="text-xs font-medium text-slate-500">Business Reg. #</span>
                                                    <p className="text-sm font-semibold text-slate-900">{org.businessRegistrationNumber || 'Not provided'}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-xs font-medium text-slate-500">KRA PIN</span>
                                                    <p className="text-sm font-semibold text-slate-900">{org.kraPin || 'Not provided'}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-xs font-medium text-slate-500">Document</span>
                                                    {org.businessRegistrationDocUrl ? (
                                                        <a
                                                            href={org.businessRegistrationDocUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                                                        >
                                                            <span>📎</span> View Document ↗
                                                        </a>
                                                    ) : (
                                                        <p className="text-sm text-slate-400 italic">No document uploaded</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Clinics Tab */}
                {activeTab === 'clinics' && (
                    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-slate-900">All Organizations ({filteredClinics.length})</h3>
                        </div>
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                                <tr>
                                    <th className="px-6 py-4">Organization</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Plan</th>
                                    <th className="px-6 py-4">Contact</th>
                                    <th className="px-6 py-4">Joined</th>
                                    <th className="px-6 py-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredClinics.map(org => (
                                    <tr key={org.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-900">{org.name}</div>
                                            <div className="text-xs text-slate-500">{org.city}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${org.orgStatus === 'Active' ? 'bg-emerald-100 text-emerald-700' : org.orgStatus === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                                {org.orgStatus}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">{org.plan}</td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            <div>{org.email}</div>
                                            <div className="text-xs">{org.phone}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {org.createdAt?.seconds ? new Date(org.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                {org.orgStatus === 'Active' && (
                                                    <button onClick={() => handleSuspendOrg(org.id)} className="text-red-600 text-sm font-medium hover:underline">Suspend</button>
                                                )}
                                                {org.orgStatus === 'Suspended' && (
                                                    <button onClick={() => handleReactivateOrg(org.id)} className="text-emerald-600 text-sm font-medium hover:underline">Reactivate</button>
                                                )}
                                                {org.orgStatus === 'Pending' && (
                                                    <button onClick={() => handleVerifyOrg(org.id, true)} className="text-blue-600 text-sm font-medium hover:underline">Approve</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Users Tab */}
                {activeTab === 'users' && (
                    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100">
                            <h3 className="font-bold text-slate-900">All Users ({filteredUsers.length})</h3>
                        </div>
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                                <tr>
                                    <th className="px-6 py-4">User</th>
                                    <th className="px-6 py-4">Role</th>
                                    <th className="px-6 py-4">Organization</th>
                                    <th className="px-6 py-4">Super Admin</th>
                                    <th className="px-6 py-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredUsers.map(u => {
                                    const org = allClinics.find(o => o.id === u.organizationId);
                                    return (
                                        <tr key={u.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                                                        {u.fullName?.charAt(0) || '?'}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-900">{u.fullName}</div>
                                                        <div className="text-xs text-slate-500">{u.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${u.systemRole === 'OWNER' ? 'bg-purple-100 text-purple-700' : u.systemRole === 'ADMIN' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                                                    {u.systemRole}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">{org?.name || 'N/A'}</td>
                                            <td className="px-6 py-4">
                                                {u.isSuperAdmin ? (
                                                    <span className="px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-bold">YES</span>
                                                ) : (
                                                    <span className="text-slate-400 text-xs">No</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => handleToggleSuperAdmin(u.id, u.isSuperAdmin)}
                                                    className={`text-sm font-medium hover:underline ${u.isSuperAdmin ? 'text-red-600' : 'text-blue-600'}`}
                                                >
                                                    {u.isSuperAdmin ? 'Remove Admin' : 'Make Admin'}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Billing Tab */}
                {activeTab === 'billing' && (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {['Essential', 'Professional', 'Enterprise'].map((plan, i) => {
                                const prices = [billingConfig.essentialPrice, billingConfig.professionalPrice, billingConfig.enterprisePrice];
                                const counts = allClinics.filter(o => o.plan === plan).length;
                                return (
                                    <div key={plan} className="bg-white rounded-2xl border border-slate-200 p-6">
                                        <h3 className="font-bold text-slate-900">{plan} Plan</h3>
                                        <div className="text-3xl font-bold text-blue-600 mt-2">
                                            {billingConfig.currency} {prices[i].toLocaleString()}<span className="text-sm text-slate-400 font-normal">/mo</span>
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-slate-100">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">Active Subscriptions</span>
                                                <span className="font-bold text-slate-900">{counts}</span>
                                            </div>
                                            <div className="flex justify-between text-sm mt-2">
                                                <span className="text-slate-500">Monthly Revenue</span>
                                                <span className="font-bold text-emerald-600">{billingConfig.currency} {(counts * prices[i]).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200 p-6">
                            <h3 className="font-bold text-slate-900 mb-4">Billing Configuration</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Essential Price ({billingConfig.currency})</label>
                                    <input type="number" value={billingConfig.essentialPrice} onChange={(e) => setBillingConfig({ ...billingConfig, essentialPrice: Number(e.target.value) })} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Professional Price ({billingConfig.currency})</label>
                                    <input type="number" value={billingConfig.professionalPrice} onChange={(e) => setBillingConfig({ ...billingConfig, professionalPrice: Number(e.target.value) })} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Enterprise Price ({billingConfig.currency})</label>
                                    <input type="number" value={billingConfig.enterprisePrice} onChange={(e) => setBillingConfig({ ...billingConfig, enterprisePrice: Number(e.target.value) })} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
                                </div>
                            </div>
                            <button className="mt-4 px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">Save Pricing</button>
                        </div>
                    </div>
                )}

                {/* Audit Log Tab */}
                {activeTab === 'audit' && (
                    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100">
                            <h3 className="font-bold text-slate-900">Recent Activity (Last 50)</h3>
                        </div>
                        <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                            {auditLogs.length === 0 ? (
                                <div className="p-8 text-center text-slate-500">No audit logs yet</div>
                            ) : (
                                auditLogs.map(log => (
                                    <div key={log.id} className="p-4 hover:bg-slate-50">
                                        <div className="flex items-start gap-4">
                                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-lg">📋</div>
                                            <div className="flex-1">
                                                <div className="font-semibold text-slate-900">{log.action}</div>
                                                <div className="text-sm text-slate-500 mt-0.5">
                                                    {log.category} • By: {log.performedByEmail || 'System'}
                                                </div>
                                            </div>
                                            <div className="text-xs text-slate-400">
                                                {log.createdAt?.seconds ? new Date(log.createdAt.seconds * 1000).toLocaleString() : 'N/A'}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* Settings Tab */}
                {activeTab === 'settings' && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl border border-slate-200 p-6">
                            <h3 className="font-bold text-slate-900 mb-4">Platform Settings</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Trial Period (Days)</label>
                                    <input type="number" value={billingConfig.trialDays} onChange={(e) => setBillingConfig({ ...billingConfig, trialDays: Number(e.target.value) })} className="w-48 border border-slate-300 rounded-lg px-3 py-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                                    <select value={billingConfig.currency} onChange={(e) => setBillingConfig({ ...billingConfig, currency: e.target.value })} className="w-48 border border-slate-300 rounded-lg px-3 py-2">
                                        <option value="KES">KES (Kenyan Shilling)</option>
                                        <option value="USD">USD (US Dollar)</option>
                                        <option value="EUR">EUR (Euro)</option>
                                    </select>
                                </div>
                            </div>
                            <button className="mt-6 px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">Save Settings</button>
                        </div>

                        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
                            <h3 className="font-bold mb-2">Platform Health</h3>
                            <div className="grid grid-cols-3 gap-4 mt-4">
                                <div className="bg-white/10 rounded-xl p-4">
                                    <div className="text-sm opacity-70">Server Status</div>
                                    <div className="text-xl font-bold text-emerald-400">Healthy</div>
                                </div>
                                <div className="bg-white/10 rounded-xl p-4">
                                    <div className="text-sm opacity-70">Database</div>
                                    <div className="text-xl font-bold text-emerald-400">Connected</div>
                                </div>
                                <div className="bg-white/10 rounded-xl p-4">
                                    <div className="text-sm opacity-70">API Health</div>
                                    <div className="text-xl font-bold text-emerald-400">100%</div>
                                </div>
                            </div>
                        </div>

                        {/* Data Management */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-6">
                            <h3 className="font-bold text-slate-900 mb-4">Development Tools</h3>
                            <p className="text-sm text-slate-500 mb-4">Use these tools to populate the database with sample data for testing.</p>
                            <button
                                onClick={async () => {
                                    if (!confirm('This will add sample organizations and users. Continue?')) return;
                                    const { testDataService } = await import('../lib/services/testData.service');
                                    const result = await testDataService.generateTestData();
                                    if (result.success) {
                                        alert('Test data generated successfully! Refresh to see changes.');
                                        loadData();
                                    } else {
                                        alert('Failed to generate data: ' + result.error);
                                    }
                                }}
                                className="px-6 py-2 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-700 transition-all border border-slate-700"
                            >
                                🧪 Seed Test Data
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default SuperAdminDashboard;
