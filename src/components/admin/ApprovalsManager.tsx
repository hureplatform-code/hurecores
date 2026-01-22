// =====================================================
// APPROVALS MANAGER
// Handles Organization and Facility approval workflows
// Status model: Pending Review → Approved (Not Live) → Active (Live)
// Also supports: Rejected, Suspended
// =====================================================

import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    updateDoc,
    addDoc,
    orderBy,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { storageService } from '../../lib/services/storage.service';
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
    rejectionReason?: string;
    suspensionReason?: string;
    approvedAt?: any;
    approvedBy?: string;
    enabledAt?: any;
    enabledBy?: string;
}

interface Facility {
    id: string;
    organizationId: string;
    organizationName?: string;
    name: string;
    city: string;
    phone?: string;
    approvalStatus: ApprovalStatus;
    licenseNumber?: string;
    licensingBody?: string;
    licenseDocumentUrl?: string;
    expiryDate?: string;
    rejectionReason?: string;
    suspensionReason?: string;
    createdAt: any;
    approvedAt?: any;
    approvedBy?: string;
}

// =====================================================
// COMPONENT
// =====================================================

interface ApprovalsManagerProps {
    initialFilter?: ApprovalStatus | 'All';
}

const ApprovalsManager: React.FC<ApprovalsManagerProps> = ({ initialFilter = 'Pending Review' }) => {
    const { user } = useAuth();
    const [activeSubTab, setActiveSubTab] = useState<'organizations' | 'facilities'>('organizations');
    const [statusFilter, setStatusFilter] = useState<ApprovalStatus | 'All'>(initialFilter);
    const [searchQuery, setSearchQuery] = useState('');

    // Data
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [facilities, setFacilities] = useState<Facility[]>([]);
    const [loading, setLoading] = useState(true);

    // Detail panel
    const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
    const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);

    // Action modals
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showSuspendModal, setShowSuspendModal] = useState(false);
    const [actionReason, setActionReason] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    // =====================================================
    // DATA LOADING
    // =====================================================

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load Organizations
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
                } else if (data.orgStatus === 'Pending') {
                    approvalStatus = 'Pending Review';
                }

                return {
                    id: doc.id,
                    ...data,
                    approvalStatus
                } as Organization;
            });
            setOrganizations(orgsData);

            // Load Facilities (Iterate through orgs to avoid collectionGroup index requirement)
            const facilitiesData: Facility[] = [];

            await Promise.all(orgsData.map(async (org) => {
                const locsQuery = query(collection(db, 'organizations', org.id, 'locations'));
                const locsSnap = await getDocs(locsQuery);

                for (const locDoc of locsSnap.docs) {
                    const data = locDoc.data();

                    // Check if facility has verification request
                    const verQuery = query(
                        collection(db, 'verificationRequests'),
                        where('locationId', '==', locDoc.id),
                        where('type', '==', 'FACILITY')
                    );
                    const verSnap = await getDocs(verQuery);

                    let approvalStatus: ApprovalStatus = 'Pending Review';

                    // First, get license info from location data (source of truth)
                    let licenseInfo = {
                        licenseNumber: data.licenseNumber || '',
                        licensingBody: data.licensingBody || '',
                        licenseDocumentUrl: data.licenseDocumentUrl || '',
                        expiryDate: data.licenseExpiry || ''
                    };

                    if (!verSnap.empty) {
                        const verData = verSnap.docs[0].data();
                        if (verData.status === 'Approved') approvalStatus = 'Approved';
                        else if (verData.status === 'Active') approvalStatus = 'Active';
                        else if (verData.status === 'Rejected') approvalStatus = 'Rejected';
                        else if (verData.status === 'Suspended') approvalStatus = 'Suspended';

                        // Merge verification data - use verData if available, fallback to location data
                        licenseInfo = {
                            licenseNumber: verData.licenseNumber || verData.identifier || data.licenseNumber || '',
                            licensingBody: verData.licensingBody || verData.authority || data.licensingBody || '',
                            licenseDocumentUrl: verData.documentUrl || data.licenseDocumentUrl || '',
                            expiryDate: verData.expiryDate || data.licenseExpiry || ''
                        };
                    } else {
                        // If no verification request, infer status from location data or default to Pending
                        if (data.verificationStatus === 'Approved') approvalStatus = 'Approved';
                        else if (data.verificationStatus === 'Active') approvalStatus = 'Active';
                        else if (data.status === 'Pending') approvalStatus = 'Pending Review';
                        // else default to Pending Review so it shows up
                    }

                    facilitiesData.push({
                        id: locDoc.id,
                        organizationId: org.id,
                        organizationName: org.name || 'Unknown',
                        name: data.name,
                        city: data.city || data.address?.city || 'N/A',
                        phone: data.phone,
                        approvalStatus,
                        ...licenseInfo,
                        createdAt: data.createdAt
                    });
                }
            }));

            // Sort manually since we fetched in parallel
            facilitiesData.sort((a, b) => {
                const tA = a.createdAt?.seconds || 0;
                const tB = b.createdAt?.seconds || 0;
                return tB - tA;
            });

            setFacilities(facilitiesData);

        } catch (error) {
            console.error('Error loading approvals data:', error);
        } finally {
            setLoading(false);
        }
    };

    // =====================================================
    // ORGANIZATION ACTIONS
    // =====================================================

    const handleApproveOrg = async (org: Organization) => {
        if (!confirm('Approve this organization? They can access the platform once you Enable Access.')) return;
        setActionLoading(true);

        try {
            await updateDoc(doc(db, 'organizations', org.id), {
                approvalStatus: 'Approved',
                orgStatus: 'Verified',
                approvedAt: serverTimestamp(),
                approvedBy: user?.email || 'Super Admin'
            });

            await logAuditEvent('Organization Approved', org.id, org.name);
            await loadData();
            setSelectedOrg(null);
            // Reset filter to 'All' so user can see the approved org in the list
            setStatusFilter('All');
        } catch (error) {
            console.error('Error approving organization:', error);
            alert('Failed to approve organization');
        } finally {
            setActionLoading(false);
        }
    };

    const handleEnableOrg = async (org: Organization) => {
        if (!confirm('Enable platform access for this organization? They will become fully active.')) return;
        setActionLoading(true);

        try {
            await updateDoc(doc(db, 'organizations', org.id), {
                approvalStatus: 'Active',
                orgStatus: 'Active',
                enabledAt: serverTimestamp(),
                enabledBy: user?.email || 'Super Admin'
            });

            await logAuditEvent('Organization Enabled', org.id, org.name);
            await loadData();
            setSelectedOrg(null);
        } catch (error) {
            console.error('Error enabling organization:', error);
            alert('Failed to enable organization');
        } finally {
            setActionLoading(false);
        }
    };

    // Handler to view document with signed URL
    const handleViewDocument = async (documentUrl: string) => {
        if (!documentUrl) {
            alert('No document URL available');
            return;
        }

        // Extract path from public URL
        const path = storageService.extractPathFromUrl(documentUrl);

        if (path) {
            // Try to generate signed URL for secure access
            const result = await storageService.getSignedUrl(path, 'documents', 3600);
            if (result.success && result.url) {
                window.open(result.url, '_blank');
                return;
            }
        }

        // Fallback to original URL
        window.open(documentUrl, '_blank');
    };

    const handleRejectOrg = async () => {
        if (!selectedOrg || !actionReason.trim()) {
            alert('Please provide a rejection reason');
            return;
        }
        setActionLoading(true);

        try {
            await updateDoc(doc(db, 'organizations', selectedOrg.id), {
                approvalStatus: 'Rejected',
                orgStatus: 'Rejected',
                rejectionReason: actionReason
            });

            await logAuditEvent('Organization Rejected', selectedOrg.id, selectedOrg.name, actionReason);
            await loadData();
            setSelectedOrg(null);
            setShowRejectModal(false);
            setActionReason('');
        } catch (error) {
            console.error('Error rejecting organization:', error);
            alert('Failed to reject organization');
        } finally {
            setActionLoading(false);
        }
    };

    const handleSuspendOrg = async () => {
        if (!selectedOrg || !actionReason.trim()) {
            alert('Please provide a suspension reason');
            return;
        }
        setActionLoading(true);

        try {
            await updateDoc(doc(db, 'organizations', selectedOrg.id), {
                approvalStatus: 'Suspended',
                orgStatus: 'Suspended',
                suspensionReason: actionReason
            });

            await logAuditEvent('Organization Suspended', selectedOrg.id, selectedOrg.name, actionReason);
            await loadData();
            setSelectedOrg(null);
            setShowSuspendModal(false);
            setActionReason('');
        } catch (error) {
            console.error('Error suspending organization:', error);
            alert('Failed to suspend organization');
        } finally {
            setActionLoading(false);
        }
    };

    // =====================================================
    // FACILITY ACTIONS
    // =====================================================

    const handleApproveFacility = async (facility: Facility) => {
        // Check parent org is at least Approved
        const parentOrg = organizations.find(o => o.id === facility.organizationId);
        if (!parentOrg || (parentOrg.approvalStatus !== 'Approved' && parentOrg.approvalStatus !== 'Active')) {
            alert('Parent organization must be approved before approving this facility.');
            return;
        }

        if (!confirm('Approve this facility?')) return;
        setActionLoading(true);

        try {
            // Update verification request if exists
            const verQuery = query(
                collection(db, 'verificationRequests'),
                where('locationId', '==', facility.id),
                where('type', '==', 'FACILITY')
            );
            const verSnap = await getDocs(verQuery);

            if (!verSnap.empty) {
                await updateDoc(doc(db, 'verificationRequests', verSnap.docs[0].id), {
                    status: 'Approved',
                    approvedAt: serverTimestamp(),
                    approvedBy: user?.email || 'Super Admin'
                });
            }

            // Update location
            await updateDoc(doc(db, 'organizations', facility.organizationId, 'locations', facility.id), {
                verificationStatus: 'Approved'
            });

            await logAuditEvent('Facility Approved', facility.id, facility.name);
            await loadData();
            setSelectedFacility(null);
        } catch (error) {
            console.error('Error approving facility:', error);
            alert('Failed to approve facility');
        } finally {
            setActionLoading(false);
        }
    };

    const handleEnableFacility = async (facility: Facility) => {
        // Check parent org is Active
        const parentOrg = organizations.find(o => o.id === facility.organizationId);
        if (!parentOrg || parentOrg.approvalStatus !== 'Active') {
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
                    enabledAt: serverTimestamp(),
                    enabledBy: user?.email || 'Super Admin'
                });
            }

            await updateDoc(doc(db, 'organizations', facility.organizationId, 'locations', facility.id), {
                verificationStatus: 'Active',
                isActive: true
            });

            await logAuditEvent('Facility Enabled', facility.id, facility.name);
            await loadData();
            setSelectedFacility(null);
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
                category: 'Approval',
                entityType: activeSubTab === 'organizations' ? 'Organization' : 'Facility',
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

        if (statusFilter !== 'All') {
            filtered = filtered.filter(o => o.approvalStatus === statusFilter);
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

    const getFilteredFacilities = () => {
        let filtered = facilities;

        if (statusFilter !== 'All') {
            filtered = filtered.filter(f => f.approvalStatus === statusFilter);
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(f =>
                f.name?.toLowerCase().includes(q) ||
                f.organizationName?.toLowerCase().includes(q) ||
                f.city?.toLowerCase().includes(q)
            );
        }

        return filtered;
    };

    const getCounts = () => {
        const orgCounts = {
            pending: organizations.filter(o => o.approvalStatus === 'Pending Review').length,
            approved: organizations.filter(o => o.approvalStatus === 'Approved').length,
            active: organizations.filter(o => o.approvalStatus === 'Active').length,
            rejected: organizations.filter(o => o.approvalStatus === 'Rejected').length,
            suspended: organizations.filter(o => o.approvalStatus === 'Suspended').length
        };

        const facCounts = {
            pending: facilities.filter(f => f.approvalStatus === 'Pending Review').length,
            approved: facilities.filter(f => f.approvalStatus === 'Approved').length,
            active: facilities.filter(f => f.approvalStatus === 'Active').length,
            rejected: facilities.filter(f => f.approvalStatus === 'Rejected').length,
            suspended: facilities.filter(f => f.approvalStatus === 'Suspended').length
        };

        return { org: orgCounts, fac: facCounts };
    };

    const counts = getCounts();

    // =====================================================
    // STATUS BADGE HELPER
    // =====================================================

    const getStatusBadge = (status: ApprovalStatus) => {
        switch (status) {
            case 'Pending Review':
                return 'bg-amber-100 text-amber-700';
            case 'Approved':
                return 'bg-blue-100 text-blue-700';
            case 'Active':
                return 'bg-emerald-100 text-emerald-700';
            case 'Rejected':
                return 'bg-red-100 text-red-700';
            case 'Suspended':
                return 'bg-slate-100 text-slate-700';
            default:
                return 'bg-slate-100 text-slate-600';
        }
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
            <div className="flex-1">
                {/* Sub-tabs */}
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => { setActiveSubTab('organizations'); setStatusFilter('Pending Review'); }}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${activeSubTab === 'organizations'
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                            }`}
                    >
                        Organizations
                        {counts.org.pending > 0 && (
                            <span className="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full">{counts.org.pending}</span>
                        )}
                    </button>
                    <button
                        onClick={() => { setActiveSubTab('facilities'); setStatusFilter('Pending Review'); }}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${activeSubTab === 'facilities'
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                            }`}
                    >
                        Facilities
                        {counts.fac.pending > 0 && (
                            <span className="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full">{counts.fac.pending}</span>
                        )}
                    </button>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-4 mb-6">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="Pending Review">Pending Review</option>
                        <option value="Approved">Approved (Not Live)</option>
                        <option value="Active">Active (Live)</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Suspended">Suspended</option>
                        <option value="All">All</option>
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

                {/* Organizations List */}
                {activeSubTab === 'organizations' && (
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                        {getFilteredOrgs().length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="text-5xl mb-4 opacity-20">✅</div>
                                <h3 className="text-lg font-bold text-slate-900">No organizations</h3>
                                <p className="text-slate-500">No organizations match the current filter.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {getFilteredOrgs().map(org => (
                                    <div
                                        key={org.id}
                                        onClick={() => setSelectedOrg(org)}
                                        className={`p-5 hover:bg-slate-50 cursor-pointer transition-colors ${selectedOrg?.id === org.id ? 'bg-blue-50' : ''
                                            }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start gap-4">
                                                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-xl">🏥</div>
                                                <div>
                                                    <h4 className="font-bold text-slate-900">{org.name}</h4>
                                                    <div className="text-sm text-slate-500 mt-1 space-y-0.5">
                                                        <p>✉️ {org.email}</p>
                                                        <p>📞 {org.phone} • 💎 {org.plan}</p>
                                                    </div>
                                                    <div className="flex gap-2 mt-2 text-xs text-slate-500">
                                                        <span>Business Reg #: <strong className="text-slate-700">{org.businessRegistrationNumber || 'N/A'}</strong></span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-end gap-2">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${getStatusBadge(org.approvalStatus || 'Pending Review')}`}>
                                                    {org.approvalStatus || 'Pending Review'}
                                                </span>

                                                {/* Quick Actions */}
                                                <div className="flex gap-2">
                                                    {(() => {
                                                        // Count available documents
                                                        const docCount = [org.businessRegistrationDocUrl, org.kraPinDocUrl].filter(Boolean).length;
                                                        if (docCount > 0) {
                                                            return (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelectedOrg(org);
                                                                    }}
                                                                    className="text-blue-600 text-xs font-medium hover:underline"
                                                                >
                                                                    View Documents ({docCount}) →
                                                                </button>
                                                            );
                                                        }
                                                        return (
                                                            <span className="text-slate-400 text-xs">No documents</span>
                                                        );
                                                    })()}
                                                </div>

                                                {org.approvalStatus === 'Pending Review' && (
                                                    <div className="flex gap-2 mt-2">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setSelectedOrg(org); setShowRejectModal(true); }}
                                                            className="px-3 py-1.5 border border-slate-300 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-100"
                                                        >
                                                            Reject
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleApproveOrg(org); }}
                                                            className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                                                        >
                                                            Approve
                                                        </button>
                                                    </div>
                                                )}

                                                {org.approvalStatus === 'Approved' && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleEnableOrg(org); }}
                                                        className="px-4 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 mt-2"
                                                    >
                                                        Enable Access
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Facilities List */}
                {activeSubTab === 'facilities' && (
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                        {getFilteredFacilities().length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="text-5xl mb-4 opacity-20">🏥</div>
                                <h3 className="text-lg font-bold text-slate-900">No facilities</h3>
                                <p className="text-slate-500">No facilities match the current filter.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {getFilteredFacilities().map(facility => (
                                    <div
                                        key={facility.id}
                                        onClick={() => setSelectedFacility(facility)}
                                        className={`p-5 hover:bg-slate-50 cursor-pointer transition-colors ${selectedFacility?.id === facility.id ? 'bg-blue-50' : ''
                                            }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start gap-4">
                                                <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center text-xl">🏛️</div>
                                                <div>
                                                    <h4 className="font-bold text-slate-900">{facility.name}</h4>
                                                    <p className="text-sm text-slate-500 mt-0.5">
                                                        Parent: <span className="text-slate-700">{facility.organizationName}</span>
                                                    </p>
                                                    <p className="text-sm text-slate-500">📍 {facility.city}</p>
                                                    <div className="flex gap-2 mt-2 text-xs text-slate-500">
                                                        <span>License #: <strong className="text-slate-700">{facility.licenseNumber || 'N/A'}</strong></span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-end gap-2">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${getStatusBadge(facility.approvalStatus)}`}>
                                                    {facility.approvalStatus}
                                                </span>

                                                {/* View Documents Link for Facilities */}
                                                <div className="flex gap-2">
                                                    {facility.licenseDocumentUrl ? (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedFacility(facility);
                                                            }}
                                                            className="text-blue-600 text-xs font-medium hover:underline"
                                                        >
                                                            View Documents (1) →
                                                        </button>
                                                    ) : (
                                                        <span className="text-slate-400 text-xs">No documents</span>
                                                    )}
                                                </div>

                                                {facility.approvalStatus === 'Pending Review' && (
                                                    <div className="flex gap-2 mt-2">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleApproveFacility(facility); }}
                                                            className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                                                        >
                                                            Approve
                                                        </button>
                                                    </div>
                                                )}

                                                {facility.approvalStatus === 'Approved' && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleEnableFacility(facility); }}
                                                        className="px-4 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 mt-2"
                                                    >
                                                        Enable
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Detail Panel - Organization */}
            {selectedOrg && (
                <div className="w-96 bg-white rounded-2xl border border-slate-200 p-6 h-fit sticky top-8">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">{selectedOrg.name}</h3>
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold uppercase mt-1 ${getStatusBadge(selectedOrg.approvalStatus || 'Pending Review')}`}>
                                {selectedOrg.approvalStatus || 'Pending Review'}
                            </span>
                        </div>
                        <button onClick={() => setSelectedOrg(null)} className="text-slate-400 hover:text-slate-600">✕</button>
                    </div>

                    <div className="space-y-4 text-sm">
                        <div>
                            <span className="text-slate-500">Business Reg #</span>
                            <p className="font-semibold text-slate-900">{selectedOrg.businessRegistrationNumber || 'Not provided'}</p>
                        </div>
                        <div>
                            <span className="text-slate-500">KRA PIN</span>
                            <p className="font-semibold text-slate-900">{selectedOrg.kraPin || 'Not provided'}</p>
                        </div>
                        <div>
                            <span className="text-slate-500">Contact Email</span>
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

                        {/* Documents */}
                        <div className="pt-4 border-t border-slate-100">
                            <span className="text-slate-500 font-medium">Verification Documents</span>
                            <div className="mt-2 space-y-2">
                                {selectedOrg.businessRegistrationDocUrl ? (
                                    <button
                                        onClick={() => handleViewDocument(selectedOrg.businessRegistrationDocUrl!)}
                                        className="flex justify-between items-center p-2 bg-slate-50 rounded-lg hover:bg-slate-100 w-full text-left"
                                    >
                                        <span className="text-slate-700">Business Registration</span>
                                        <span className="text-blue-600 font-medium">View →</span>
                                    </button>
                                ) : (
                                    <p className="text-slate-400 italic">No documents uploaded</p>
                                )}
                                {selectedOrg.kraPinDocUrl && (
                                    <button
                                        onClick={() => handleViewDocument(selectedOrg.kraPinDocUrl!)}
                                        className="flex justify-between items-center p-2 bg-slate-50 rounded-lg hover:bg-slate-100 w-full text-left"
                                    >
                                        <span className="text-slate-700">KRA PIN Certificate</span>
                                        <span className="text-blue-600 font-medium">View →</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-6 pt-4 border-t border-slate-100 flex gap-3">
                        {selectedOrg.approvalStatus === 'Pending Review' && (
                            <>
                                <button
                                    onClick={() => setShowRejectModal(true)}
                                    className="flex-1 py-2 border border-slate-300 text-slate-600 font-medium rounded-lg hover:bg-slate-100"
                                >
                                    Reject
                                </button>
                                <button
                                    onClick={() => handleApproveOrg(selectedOrg)}
                                    disabled={actionLoading}
                                    className="flex-1 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                >
                                    Approve
                                </button>
                            </>
                        )}

                        {selectedOrg.approvalStatus === 'Approved' && (
                            <>
                                <button
                                    onClick={() => setShowSuspendModal(true)}
                                    className="flex-1 py-2 border border-slate-300 text-slate-600 font-medium rounded-lg hover:bg-slate-100"
                                >
                                    Suspend
                                </button>
                                <button
                                    onClick={() => handleEnableOrg(selectedOrg)}
                                    disabled={actionLoading}
                                    className="flex-1 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                                >
                                    Enable Access
                                </button>
                            </>
                        )}

                        {selectedOrg.approvalStatus === 'Active' && (
                            <button
                                onClick={() => setShowSuspendModal(true)}
                                className="w-full py-2 bg-red-100 text-red-700 font-medium rounded-lg hover:bg-red-200"
                            >
                                Suspend Organization
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Detail Panel - Facility */}
            {selectedFacility && (
                <div className="w-96 bg-white rounded-2xl border border-slate-200 p-6 h-fit sticky top-8">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">{selectedFacility.name}</h3>
                            <p className="text-sm text-slate-500">Parent: {selectedFacility.organizationName}</p>
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold uppercase mt-1 ${getStatusBadge(selectedFacility.approvalStatus)}`}>
                                {selectedFacility.approvalStatus}
                            </span>
                        </div>
                        <button onClick={() => setSelectedFacility(null)} className="text-slate-400 hover:text-slate-600">✕</button>
                    </div>

                    <div className="space-y-4 text-sm">
                        <div>
                            <span className="text-slate-500">Location</span>
                            <p className="font-semibold text-slate-900">{selectedFacility.city || 'N/A'}</p>
                        </div>
                        <div>
                            <span className="text-slate-500">Phone</span>
                            <p className="font-semibold text-slate-900">{selectedFacility.phone || 'Not provided'}</p>
                        </div>
                        <div>
                            <span className="text-slate-500">License #</span>
                            <p className="font-semibold text-slate-900">{selectedFacility.licenseNumber || 'N/A'}</p>
                        </div>
                        <div>
                            <span className="text-slate-500">Licensing Body</span>
                            <p className="font-semibold text-slate-900">{selectedFacility.licensingBody || 'N/A'}</p>
                        </div>
                        <div>
                            <span className="text-slate-500">License Expiry</span>
                            <p className="font-semibold text-slate-900">{selectedFacility.expiryDate || 'N/A'}</p>
                        </div>

                        {/* Documents */}
                        <div className="pt-4 border-t border-slate-100">
                            <span className="text-slate-500 font-medium">Facility Documents</span>
                            <div className="mt-2 space-y-2">
                                {selectedFacility.licenseDocumentUrl ? (
                                    <button
                                        onClick={() => handleViewDocument(selectedFacility.licenseDocumentUrl!)}
                                        className="flex justify-between items-center p-2 bg-slate-50 rounded-lg hover:bg-slate-100 w-full text-left"
                                    >
                                        <span className="text-slate-700">📄 License Document</span>
                                        <span className="text-blue-600 font-medium">View →</span>
                                    </button>
                                ) : (
                                    <p className="text-slate-400 italic">No documents uploaded</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-6 pt-4 border-t border-slate-100 flex gap-3">
                        {selectedFacility.approvalStatus === 'Pending Review' && (
                            <button
                                onClick={() => handleApproveFacility(selectedFacility)}
                                disabled={actionLoading}
                                className="flex-1 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                Approve
                            </button>
                        )}

                        {selectedFacility.approvalStatus === 'Approved' && (
                            <button
                                onClick={() => handleEnableFacility(selectedFacility)}
                                disabled={actionLoading}
                                className="flex-1 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                            >
                                Enable
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md m-4">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">Reject Organization</h3>
                        <p className="text-sm text-slate-500 mb-4">
                            Please provide a reason for rejection. This will be sent to the employer.
                        </p>
                        <textarea
                            value={actionReason}
                            onChange={(e) => setActionReason(e.target.value)}
                            placeholder="Enter rejection reason..."
                            className="w-full border border-slate-200 rounded-xl p-3 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={() => { setShowRejectModal(false); setActionReason(''); }}
                                className="flex-1 py-2 border border-slate-300 text-slate-600 font-medium rounded-lg hover:bg-slate-100"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRejectOrg}
                                disabled={actionLoading || !actionReason.trim()}
                                className="flex-1 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
                            >
                                {actionLoading ? 'Rejecting...' : 'Reject'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Suspend Modal */}
            {showSuspendModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md m-4">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">Suspend Organization</h3>
                        <p className="text-sm text-slate-500 mb-4">
                            Please provide a reason for suspension. This will be sent to the employer.
                        </p>
                        <textarea
                            value={actionReason}
                            onChange={(e) => setActionReason(e.target.value)}
                            placeholder="Enter suspension reason..."
                            className="w-full border border-slate-200 rounded-xl p-3 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={() => { setShowSuspendModal(false); setActionReason(''); }}
                                className="flex-1 py-2 border border-slate-300 text-slate-600 font-medium rounded-lg hover:bg-slate-100"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSuspendOrg}
                                disabled={actionLoading || !actionReason.trim()}
                                className="flex-1 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
                            >
                                {actionLoading ? 'Suspending...' : 'Suspend'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ApprovalsManager;
