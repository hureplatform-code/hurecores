// =====================================================
// ORGANIZATIONS MANAGER
// Post-approval lifecycle management for organizations
// Status: Active / Approved (Not Live) / Suspended
// No approval actions here - approvals happen in Approvals module
// =====================================================

import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import {
    collection,
    query,
    getDocs,
    doc,
    updateDoc,
    addDoc,
    where,
    orderBy,
    serverTimestamp
} from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import type { ApprovalStatus } from '../../types';

// =====================================================
// INTERFACES
// =====================================================

interface Organization {
    id: string;
    name: string;
    email: string;
    phone: string;
    city: string;
    orgStatus: string;
    approvalStatus?: ApprovalStatus;
    plan: string;
    createdAt: any;
    businessRegistrationNumber?: string;
    kraPin?: string;
    businessRegistrationDocUrl?: string;
    kraPinDocUrl?: string;
    enabledAt?: any;
    enabledBy?: string;
}

interface Facility {
    id: string;
    organizationId: string;
    name: string;
    city: string;
    phone?: string;
    approvalStatus: ApprovalStatus;
    licenseNumber?: string;
    licensingBody?: string;
    licenseDocUrl?: string;
    createdAt: any;
}

interface AuditLog {
    id: string;
    action: string;
    category: string;
    performedByEmail: string;
    createdAt: any;
    reason?: string;
}

interface BillingSummary {
    plan: string;
    monthlyAmount: number;
    status: string;
    lastPayment?: any;
    nextDue?: any;
}

// =====================================================
// COMPONENT
// =====================================================

const OrganizationsManager: React.FC = () => {
    const { user } = useAuth();

    // Status filter tabs
    const [statusTab, setStatusTab] = useState<'All' | 'Active' | 'Suspended' | 'Approved' | 'Rejected'>('All');
    const [planFilter, setPlanFilter] = useState<string>('All');
    const [searchQuery, setSearchQuery] = useState('');

    // Data
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);

    // Profile drawer
    const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
    const [profileTab, setProfileTab] = useState<'overview' | 'facilities' | 'billing' | 'audit'>('overview');
    const [facilities, setFacilities] = useState<Facility[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [facilitiesLoading, setFacilitiesLoading] = useState(false);

    // Action loading
    const [actionLoading, setActionLoading] = useState(false);

    // =====================================================
    // DATA LOADING
    // =====================================================

    useEffect(() => {
        loadOrganizations();
    }, []);

    const loadOrganizations = async () => {
        setLoading(true);
        try {
            const orgsQuery = query(collection(db, 'organizations'), orderBy('createdAt', 'desc'));
            const orgsSnap = await getDocs(orgsQuery);
            const orgsData = orgsSnap.docs.map(doc => {
                const data = doc.data();
                // Map legacy orgStatus to approvalStatus
                let approvalStatus: ApprovalStatus = 'Pending Review';
                if (data.approvalStatus) {
                    approvalStatus = data.approvalStatus;
                } else if (data.orgStatus === 'Active') {
                    approvalStatus = 'Active';
                } else if (data.orgStatus === 'Verified') {
                    approvalStatus = 'Approved';
                } else if (data.orgStatus === 'Suspended') {
                    approvalStatus = 'Suspended';
                } else if (data.orgStatus === 'Rejected') {
                    approvalStatus = 'Rejected';
                }

                return {
                    id: doc.id,
                    ...data,
                    approvalStatus
                } as Organization;
            });

            // We now show all organizations including 'Pending Review' if desired, 
            // but effectively 'Pending Review' are usually in Approvals.
            // However, the "All" tab should show everything.
            setOrganizations(orgsData);
        } catch (error) {
            console.error('Error loading organizations:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadOrgDetails = async (org: Organization) => {
        setFacilitiesLoading(true);

        try {
            // Load Facilities
            const locsQuery = query(
                collection(db, 'organizations', org.id, 'locations')
            );
            const locsSnap = await getDocs(locsQuery);
            const facilitiesData: Facility[] = [];

            for (const locDoc of locsSnap.docs) {
                const data = locDoc.data();

                // Check verification status
                const verQuery = query(
                    collection(db, 'verificationRequests'),
                    where('locationId', '==', locDoc.id),
                    where('type', '==', 'FACILITY')
                );
                const verSnap = await getDocs(verQuery);

                let approvalStatus: ApprovalStatus = 'Pending Review';
                let licenseInfo = {};

                if (!verSnap.empty) {
                    const verData = verSnap.docs[0].data();
                    if (verData.status === 'Active') approvalStatus = 'Active';
                    else if (verData.status === 'Approved') approvalStatus = 'Approved';
                    else if (verData.status === 'Suspended') approvalStatus = 'Suspended';

                    licenseInfo = {
                        licenseNumber: verData.licenseNumber,
                        licensingBody: verData.licensingBody,
                        licenseDocUrl: verData.documentUrl
                    };
                }

                facilitiesData.push({
                    id: locDoc.id,
                    organizationId: org.id,
                    name: data.name,
                    city: data.city || data.address?.city || 'N/A',
                    phone: data.phone,
                    approvalStatus,
                    ...licenseInfo,
                    createdAt: data.createdAt
                });
            }
            setFacilities(facilitiesData);

            // Load Audit Logs for this org
            const auditQuery = query(
                collection(db, 'auditLogs'),
                where('entityId', '==', org.id),
                orderBy('createdAt', 'desc')
            );
            const auditSnap = await getDocs(auditQuery);
            const auditData = auditSnap.docs.slice(0, 20).map(d => ({
                id: d.id,
                ...d.data()
            } as AuditLog));
            setAuditLogs(auditData);

        } catch (error) {
            console.error('Error loading org details:', error);
        } finally {
            setFacilitiesLoading(false);
        }
    };

    // =====================================================
    // ORGANIZATION ACTIONS
    // =====================================================

    const handleSuspendOrg = async (org: Organization) => {
        if (!confirm('Suspend this organization? All users will lose access.')) return;
        setActionLoading(true);

        try {
            await updateDoc(doc(db, 'organizations', org.id), {
                approvalStatus: 'Suspended',
                orgStatus: 'Suspended',
                suspendedAt: serverTimestamp(),
                suspendedBy: user?.email || 'Super Admin'
            });

            await logAuditEvent('Organization Suspended', org.id, org.name);
            await loadOrganizations();
            if (selectedOrg?.id === org.id) {
                setSelectedOrg({ ...org, approvalStatus: 'Suspended' });
            }
        } catch (error) {
            console.error('Error suspending organization:', error);
            alert('Failed to suspend organization');
        } finally {
            setActionLoading(false);
        }
    };

    const handleEnableOrg = async (org: Organization) => {
        if (!confirm('Enable platform access for this organization?')) return;
        setActionLoading(true);

        try {
            await updateDoc(doc(db, 'organizations', org.id), {
                approvalStatus: 'Active',
                orgStatus: 'Active',
                enabledAt: serverTimestamp(),
                enabledBy: user?.email || 'Super Admin'
            });

            await logAuditEvent('Organization Enabled', org.id, org.name);
            await loadOrganizations();
            if (selectedOrg?.id === org.id) {
                setSelectedOrg({ ...org, approvalStatus: 'Active' });
            }
        } catch (error) {
            console.error('Error enabling organization:', error);
            alert('Failed to enable organization');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReactivateOrg = async (org: Organization) => {
        if (!confirm('Reactivate this organization?')) return;
        setActionLoading(true);

        try {
            await updateDoc(doc(db, 'organizations', org.id), {
                approvalStatus: 'Active',
                orgStatus: 'Active',
                reactivatedAt: serverTimestamp(),
                reactivatedBy: user?.email || 'Super Admin'
            });

            await logAuditEvent('Organization Reactivated', org.id, org.name);
            await loadOrganizations();
            if (selectedOrg?.id === org.id) {
                setSelectedOrg({ ...org, approvalStatus: 'Active' });
            }
        } catch (error) {
            console.error('Error reactivating organization:', error);
            alert('Failed to reactivate organization');
        } finally {
            setActionLoading(false);
        }
    };

    // =====================================================
    // FACILITY ACTIONS
    // =====================================================

    const handleSuspendFacility = async (facility: Facility) => {
        if (!confirm('Suspend this facility?')) return;
        setActionLoading(true);

        try {
            // Update verification request
            const verQuery = query(
                collection(db, 'verificationRequests'),
                where('locationId', '==', facility.id),
                where('type', '==', 'FACILITY')
            );
            const verSnap = await getDocs(verQuery);

            if (!verSnap.empty) {
                await updateDoc(doc(db, 'verificationRequests', verSnap.docs[0].id), {
                    status: 'Suspended',
                    suspendedAt: serverTimestamp()
                });
            }

            await updateDoc(doc(db, 'organizations', facility.organizationId, 'locations', facility.id), {
                verificationStatus: 'Suspended',
                isActive: false
            });

            await logAuditEvent('Facility Suspended', facility.id, facility.name);
            if (selectedOrg) await loadOrgDetails(selectedOrg);
        } catch (error) {
            console.error('Error suspending facility:', error);
            alert('Failed to suspend facility');
        } finally {
            setActionLoading(false);
        }
    };

    const handleEnableFacility = async (facility: Facility) => {
        // Check parent org status
        if (selectedOrg?.approvalStatus !== 'Active') {
            alert('Parent organization must be Active before enabling this facility.');
            return;
        }

        if (!confirm('Enable this facility?')) return;
        setActionLoading(true);

        try {
            const verQuery = query(
                collection(db, 'verificationRequests'),
                where('locationId', '==', facility.id),
                where('type', '==', 'FACILITY')
            );
            const verSnap = await getDocs(verQuery);

            if (!verSnap.empty) {
                await updateDoc(doc(db, 'verificationRequests', verSnap.docs[0].id), {
                    status: 'Active',
                    enabledAt: serverTimestamp()
                });
            }

            await updateDoc(doc(db, 'organizations', facility.organizationId, 'locations', facility.id), {
                verificationStatus: 'Active',
                isActive: true
            });

            await logAuditEvent('Facility Enabled', facility.id, facility.name);
            if (selectedOrg) await loadOrgDetails(selectedOrg);
        } catch (error) {
            console.error('Error enabling facility:', error);
            alert('Failed to enable facility');
        } finally {
            setActionLoading(false);
        }
    };

    // =====================================================
    // AUDIT LOGGING
    // =====================================================

    const logAuditEvent = async (action: string, entityId: string, entityName: string, reason?: string) => {
        try {
            await addDoc(collection(db, 'auditLogs'), {
                action,
                category: 'Organization',
                entityType: 'Organization',
                entityId,
                entityName,
                performedBy: user?.id || 'system',
                performedByEmail: user?.email || 'Super Admin',
                reason,
                createdAt: serverTimestamp()
            });
        } catch (error) {
            console.error('Error logging audit event:', error);
        }
    };

    // =====================================================
    // FILTERING
    // =====================================================

    const getFilteredOrgs = () => {
        let filtered = organizations;

        if (statusTab !== 'All') {
            filtered = filtered.filter(o => o.approvalStatus === statusTab);
        }

        if (planFilter !== 'All') {
            filtered = filtered.filter(o => o.plan === planFilter);
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(o =>
                o.name?.toLowerCase().includes(q) ||
                o.email?.toLowerCase().includes(q) ||
                o.city?.toLowerCase().includes(q)
            );
        }

        return filtered;
    };

    const getCounts = () => ({
        all: organizations.length,
        active: organizations.filter(o => o.approvalStatus === 'Active').length,
        suspended: organizations.filter(o => o.approvalStatus === 'Suspended').length,
        approved: organizations.filter(o => o.approvalStatus === 'Approved').length,
        rejected: organizations.filter(o => o.approvalStatus === 'Rejected').length
    });

    const counts = getCounts();

    // =====================================================
    // STATUS BADGE HELPER
    // =====================================================

    const getStatusBadge = (status: ApprovalStatus) => {
        switch (status) {
            case 'Active':
                return 'bg-emerald-100 text-emerald-700';
            case 'Approved':
                return 'bg-blue-100 text-blue-700';
            case 'Suspended':
                return 'bg-slate-100 text-slate-700';
            case 'Rejected':
                return 'bg-red-100 text-red-700';
            case 'Pending Review':
                return 'bg-amber-100 text-amber-700';
            default:
                return 'bg-slate-100 text-slate-600';
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'N/A';
        if (timestamp.seconds) {
            return new Date(timestamp.seconds * 1000).toLocaleDateString();
        }
        return 'N/A';
    };

    // Open org profile
    const openOrgProfile = (org: Organization) => {
        setSelectedOrg(org);
        setProfileTab('overview');
        loadOrgDetails(org);
    };

    // =====================================================
    // RENDER
    // =====================================================

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin text-4xl">⏳</div>
            </div>
        );
    }

    return (
        <div className="flex gap-6 animate-in fade-in duration-500">
            {/* Main Content */}
            <div className={`transition-all duration-300 ${selectedOrg ? 'flex-1' : 'w-full'}`}>
                {/* Status Tabs */}
                <div className="flex items-center gap-2 mb-6">
                    <button
                        onClick={() => setStatusTab('All')}
                        className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${statusTab === 'All'
                            ? 'bg-slate-800 text-white shadow-lg'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                            }`}
                    >
                        All <span className="ml-1 opacity-70">{counts.all}</span>
                    </button>
                    <button
                        onClick={() => setStatusTab('Active')}
                        className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${statusTab === 'Active'
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                            }`}
                    >
                        Active <span className="ml-1 opacity-70">{counts.active}</span>
                    </button>
                    <button
                        onClick={() => setStatusTab('Suspended')}
                        className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${statusTab === 'Suspended'
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                            }`}
                    >
                        Suspended <span className="ml-1 opacity-70">{counts.suspended}</span>
                    </button>
                    <button
                        onClick={() => setStatusTab('Approved')}
                        className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${statusTab === 'Approved'
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                            }`}
                    >
                        Approved (Not Live) <span className="ml-1 opacity-70">{counts.approved}</span>
                    </button>
                    <button
                        onClick={() => setStatusTab('Rejected')}
                        className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${statusTab === 'Rejected'
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                            }`}
                    >
                        Rejected <span className="ml-1 opacity-70">{counts.rejected}</span>
                    </button>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-4 mb-6">
                    <select
                        value={planFilter}
                        onChange={(e) => setPlanFilter(e.target.value)}
                        className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="All">All Plans</option>
                        <option value="Essential">Essential</option>
                        <option value="Professional">Professional</option>
                        <option value="Enterprise">Enterprise</option>
                    </select>

                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="🔍 Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full max-w-md bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {/* Organizations Table */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
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
                            {getFilteredOrgs().length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        No organizations match the current filter.
                                    </td>
                                </tr>
                            ) : (
                                getFilteredOrgs().map(org => (
                                    <tr
                                        key={org.id}
                                        onClick={() => openOrgProfile(org)}
                                        className={`hover:bg-slate-50 cursor-pointer transition-colors ${selectedOrg?.id === org.id ? 'bg-blue-50' : ''
                                            }`}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-lg font-bold text-blue-600">
                                                    {org.name?.charAt(0) || '?'}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900">{org.name}</div>
                                                    <div className="text-xs text-slate-500">{org.city || 'No city'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${getStatusBadge(org.approvalStatus || 'Approved')}`}>
                                                {org.approvalStatus === 'Approved' ? 'Approved (Not Live)' : org.approvalStatus}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">{org.plan}</td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            <div>{org.email}</div>
                                            <div className="text-xs">{org.phone}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {formatDate(org.createdAt)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                                {org.approvalStatus === 'Active' && (
                                                    <button
                                                        onClick={() => handleSuspendOrg(org)}
                                                        disabled={actionLoading}
                                                        className="px-3 py-1.5 text-red-600 text-sm font-medium border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
                                                    >
                                                        Suspend
                                                    </button>
                                                )}
                                                {org.approvalStatus === 'Approved' && (
                                                    <button
                                                        onClick={() => handleEnableOrg(org)}
                                                        disabled={actionLoading}
                                                        className="px-3 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                                                    >
                                                        Enable
                                                    </button>
                                                )}
                                                {org.approvalStatus === 'Suspended' && (
                                                    <button
                                                        onClick={() => handleReactivateOrg(org)}
                                                        disabled={actionLoading}
                                                        className="px-3 py-1.5 text-emerald-600 text-sm font-medium border border-emerald-200 rounded-lg hover:bg-emerald-50 disabled:opacity-50"
                                                    >
                                                        Reactivate
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Organization Profile Drawer */}
            {selectedOrg && (
                <div className="w-[420px] bg-white rounded-2xl border border-slate-200 h-fit sticky top-8 overflow-hidden">
                    {/* Header */}
                    <div className="p-6 border-b border-slate-100">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-xl font-bold text-blue-600">
                                    {selectedOrg.name?.charAt(0) || '?'}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">{selectedOrg.name}</h3>
                                    <p className="text-sm text-slate-500">{selectedOrg.city || 'No city'}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedOrg(null)}
                                className="text-slate-400 hover:text-slate-600 p-1"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="flex items-center gap-2 mt-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${getStatusBadge(selectedOrg.approvalStatus || 'Approved')}`}>
                                {selectedOrg.approvalStatus}
                            </span>

                            {selectedOrg.approvalStatus === 'Active' && (
                                <button
                                    onClick={() => handleSuspendOrg(selectedOrg)}
                                    disabled={actionLoading}
                                    className="ml-auto px-3 py-1.5 text-red-600 text-sm font-medium border border-red-200 rounded-lg hover:bg-red-50"
                                >
                                    Suspend
                                </button>
                            )}
                            {selectedOrg.approvalStatus === 'Approved' && (
                                <button
                                    onClick={() => handleEnableOrg(selectedOrg)}
                                    disabled={actionLoading}
                                    className="ml-auto px-3 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700"
                                >
                                    Enable
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Profile Tabs */}
                    <div className="flex border-b border-slate-100">
                        {['overview', 'facilities', 'billing', 'audit'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setProfileTab(tab as any)}
                                className={`flex-1 py-3 text-sm font-medium transition-colors ${profileTab === tab
                                    ? 'text-blue-600 border-b-2 border-blue-600'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                {tab === 'overview' && 'Overview'}
                                {tab === 'facilities' && 'Facilities'}
                                {tab === 'billing' && 'Billing Summary'}
                                {tab === 'audit' && 'Audit Log'}
                            </button>
                        ))}
                    </div>

                    {/* Profile Content */}
                    <div className="p-6 max-h-[500px] overflow-y-auto">
                        {/* Overview Tab */}
                        {profileTab === 'overview' && (
                            <div className="space-y-4 text-sm">
                                <div>
                                    <span className="text-slate-500">Email</span>
                                    <p className="font-semibold text-slate-900">{selectedOrg.email}</p>
                                </div>
                                <div>
                                    <span className="text-slate-500">Phone</span>
                                    <p className="font-semibold text-slate-900">{selectedOrg.phone}</p>
                                </div>
                                <div>
                                    <span className="text-slate-500">Subscription Plan</span>
                                    <p className="font-semibold text-slate-900">{selectedOrg.plan}</p>
                                </div>
                                <div>
                                    <span className="text-slate-500">Business Registration #</span>
                                    <p className="font-semibold text-slate-900">{selectedOrg.businessRegistrationNumber || 'Not provided'}</p>
                                </div>
                                <div>
                                    <span className="text-slate-500">KRA PIN</span>
                                    <p className="font-semibold text-slate-900">{selectedOrg.kraPin || 'Not provided'}</p>
                                </div>
                                <div>
                                    <span className="text-slate-500">Joined</span>
                                    <p className="font-semibold text-slate-900">{formatDate(selectedOrg.createdAt)}</p>
                                </div>
                            </div>
                        )}

                        {/* Facilities Tab */}
                        {profileTab === 'facilities' && (
                            <div>
                                <div className="text-sm text-slate-500 mb-4">
                                    Facilities under {selectedOrg.name} ({facilities.length})
                                </div>

                                {facilitiesLoading ? (
                                    <div className="text-center py-8 text-slate-500">Loading...</div>
                                ) : facilities.length === 0 ? (
                                    <div className="text-center py-8 text-slate-500">No facilities found</div>
                                ) : (
                                    <div className="space-y-3">
                                        {facilities.map(facility => (
                                            <div key={facility.id} className="p-4 bg-slate-50 rounded-xl">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="font-semibold text-slate-900">{facility.name}</div>
                                                        <div className="text-xs text-slate-500">{facility.city}</div>
                                                        {facility.licenseNumber && (
                                                            <div className="text-xs text-slate-500 mt-1">License: {facility.licenseNumber}</div>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col items-end gap-2">
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${getStatusBadge(facility.approvalStatus)}`}>
                                                            {facility.approvalStatus === 'Approved' ? 'Not Live' : facility.approvalStatus}
                                                        </span>

                                                        {/* Facility Actions */}
                                                        {facility.approvalStatus === 'Active' && (
                                                            <button
                                                                onClick={() => handleSuspendFacility(facility)}
                                                                disabled={actionLoading}
                                                                className="text-red-600 text-xs font-medium hover:underline"
                                                            >
                                                                Suspend
                                                            </button>
                                                        )}
                                                        {facility.approvalStatus === 'Approved' && (
                                                            <button
                                                                onClick={() => handleEnableFacility(facility)}
                                                                disabled={actionLoading || selectedOrg.approvalStatus !== 'Active'}
                                                                className={`text-xs font-medium ${selectedOrg.approvalStatus !== 'Active'
                                                                    ? 'text-slate-400 cursor-not-allowed'
                                                                    : 'text-emerald-600 hover:underline'
                                                                    }`}
                                                                title={selectedOrg.approvalStatus !== 'Active' ? 'Parent org must be Active' : ''}
                                                            >
                                                                Enable
                                                            </button>
                                                        )}

                                                        {facility.licenseDocUrl && (
                                                            <a
                                                                href={facility.licenseDocUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-blue-600 text-xs font-medium hover:underline"
                                                            >
                                                                View Document
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Billing Summary Tab (Read-only) */}
                        {profileTab === 'billing' && (
                            <div className="space-y-4 text-sm">
                                <div className="p-4 bg-slate-50 rounded-xl">
                                    <div className="text-slate-500 mb-1">Current Plan</div>
                                    <div className="text-xl font-bold text-slate-900">{selectedOrg.plan}</div>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-xl">
                                    <div className="text-slate-500 mb-1">Monthly Amount</div>
                                    <div className="text-xl font-bold text-slate-900">
                                        KES {selectedOrg.plan === 'Essential' ? '2,500' : selectedOrg.plan === 'Professional' ? '5,000' : '15,000'}
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-xl">
                                    <div className="text-slate-500 mb-1">Subscription Status</div>
                                    <div className="text-lg font-semibold text-emerald-600">Active</div>
                                </div>
                                <p className="text-xs text-slate-400 text-center mt-4">
                                    View detailed billing in the Billing module
                                </p>
                            </div>
                        )}

                        {/* Audit Log Tab (Read-only) */}
                        {profileTab === 'audit' && (
                            <div>
                                {facilitiesLoading ? (
                                    <div className="text-center py-8 text-slate-500">Loading...</div>
                                ) : auditLogs.length === 0 ? (
                                    <div className="text-center py-8 text-slate-500">No audit logs found</div>
                                ) : (
                                    <div className="space-y-3">
                                        {auditLogs.map(log => (
                                            <div key={log.id} className="p-3 bg-slate-50 rounded-xl">
                                                <div className="font-semibold text-slate-900 text-sm">{log.action}</div>
                                                <div className="text-xs text-slate-500 mt-1">
                                                    By: {log.performedByEmail} • {formatDate(log.createdAt)}
                                                </div>
                                                {log.reason && (
                                                    <div className="text-xs text-slate-600 mt-1">Reason: {log.reason}</div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrganizationsManager;
