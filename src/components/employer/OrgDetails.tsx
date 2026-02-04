import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { organizationService, storageService } from '../../lib/services';
import type { Organization, Location, VerificationStatus, SubscriptionStatus } from '../../types';
import { formatDateKE } from '../../lib/utils/dateFormat';
import DateInput from '../common/DateInput';

const OrgDetails: React.FC<{ selectedLocationId?: string }> = ({ selectedLocationId }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [org, setOrg] = useState<Organization | null>(null);
    const [locations, setLocations] = useState<Location[]>([]);
    const [subscription, setSubscription] = useState<{ status: SubscriptionStatus } | null>(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [uploading, setUploading] = useState(false);

    // Org verification form
    const [orgForm, setOrgForm] = useState({
        businessRegNumber: '',
        kraPin: '',
        documentUrl: ''
    });

    // Facility form
    const [showFacilityModal, setShowFacilityModal] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
    const [facilityForm, setFacilityForm] = useState({
        licenseNumber: '',
        licensingBody: '',
        expiryDate: '',
        documentUrl: ''
    });

    useEffect(() => {
        loadData();
    }, [user?.organizationId]);

    const loadData = async () => {
        if (!user?.organizationId) return;

        setLoading(true);
        try {
            const [orgData, locationsData] = await Promise.all([
                organizationService.getById(user.organizationId),
                organizationService.getLocations(user.organizationId)
            ]);

            setOrg(orgData);
            setLocations(locationsData);

            // Try to get subscription, but don't fail if permissions are insufficient
            try {
                const subData = await organizationService.getSubscription(user.organizationId);
                setSubscription(subData);
            } catch (subError) {
                console.log('Subscription data not available (may require admin access)');
                setSubscription(null);
            }

            if (orgData) {
                setOrgForm({
                    businessRegNumber: orgData.businessRegistrationNumber || '',
                    kraPin: orgData.kraPin || '',
                    documentUrl: orgData.businessRegistrationDocUrl || ''
                });
            }
        } catch (error) {
            console.error('Error loading org details:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (file: File, path: string): Promise<string> => {
        const result = await storageService.uploadFile(file, path, 'documents');
        if (!result.success || !result.url) {
            throw new Error(result.error || 'Upload failed');
        }
        return result.url;
    };

    const handleOrgDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user?.organizationId) return;

        setUploading(true);
        try {
            const path = `organizations/${user.organizationId}/business-reg-${Date.now()}.${file.name.split('.').pop()}`;
            const url = await handleFileUpload(file, path);
            setOrgForm(prev => ({ ...prev, documentUrl: url }));
            setSuccess('Document uploaded successfully');
        } catch (error: any) {
            console.error('Document upload error:', error);
            setError(error?.message || 'Failed to upload document');
        } finally {
            setUploading(false);
        }
    };

    const handleFacilityDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user?.organizationId || !selectedLocation) return;

        setUploading(true);
        try {
            const path = `organizations/${user.organizationId}/locations/${selectedLocation.id}/license-${Date.now()}.${file.name.split('.').pop()}`;
            const url = await handleFileUpload(file, path);
            setFacilityForm(prev => ({ ...prev, documentUrl: url }));
            setSuccess('License document uploaded');
        } catch (error: any) {
            console.error('Facility document upload error:', error);
            setError(error?.message || 'Failed to upload document');
        } finally {
            setUploading(false);
        }
    };

    const handleOrgSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.organizationId) return;

        setError('');
        setSuccess('');

        try {
            await organizationService.submitOrgVerification(user.organizationId, {
                businessRegNumber: orgForm.businessRegNumber,
                kraPin: orgForm.kraPin,
                documentUrl: orgForm.documentUrl
            });
            setSuccess('Organization verification submitted successfully');
            loadData();
        } catch (err: any) {
            setError(err.message || 'Failed to submit verification');
        }
    };

    const handleFacilitySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.organizationId || !selectedLocation) return;

        setError('');
        setSuccess('');

        try {
            await organizationService.submitFacilityVerification(user.organizationId, selectedLocation.id, {
                licenseNumber: facilityForm.licenseNumber,
                licensingBody: facilityForm.licensingBody,
                expiryDate: facilityForm.expiryDate,
                documentUrl: facilityForm.documentUrl
            });
            setSuccess('Facility verification submitted');
            setShowFacilityModal(false);
            setSelectedLocation(null);
            setFacilityForm({ licenseNumber: '', licensingBody: '', expiryDate: '', documentUrl: '' });
            loadData();
        } catch (err: any) {
            setError(err.message || 'Failed to submit facility verification');
        }
    };

    const openFacilityModal = (location: Location) => {
        setSelectedLocation(location);
        setFacilityForm({
            licenseNumber: location.licenseNumber || '',
            licensingBody: location.licensingBody || '',
            expiryDate: location.licenseExpiry || '',
            documentUrl: location.licenseDocumentUrl || ''
        });
        setShowFacilityModal(true);
    };

    // Status helpers
    const getOrgStatusLabel = (status: string): { label: string; color: string } => {
        const labels: Record<string, { label: string; color: string }> = {
            'Active': { label: 'Approved', color: 'bg-emerald-100 text-emerald-700' },
            'Approved': { label: 'Approved', color: 'bg-emerald-100 text-emerald-700' },
            'Verified': { label: 'Approved', color: 'bg-emerald-100 text-emerald-700' },
            'Pending': { label: 'Pending Review', color: 'bg-amber-100 text-amber-700' },
            'Pending Review': { label: 'Pending Review', color: 'bg-amber-100 text-amber-700' },
            'Unverified': { label: 'Required before billing', color: 'bg-slate-100 text-slate-600' },
            'Rejected': { label: 'Rejected', color: 'bg-red-100 text-red-700' },
            'Suspended': { label: 'Suspended', color: 'bg-red-100 text-red-700' }
        };
        return labels[status] || { label: 'Not Verified', color: 'bg-slate-100 text-slate-600' };
    };

    const getFacilityStatus = (location: Location): { status: string; color: string } => {
        const isExpired = location.licenseExpiry && new Date(location.licenseExpiry) < new Date();
        if (isExpired) return { status: 'Expired', color: 'bg-red-100 text-red-700' };
        // Check both status and verificationStatus fields for backwards compatibility
        // Some facilities were approved before the fix that updates both fields
        const locAny = location as any;
        const verificationStatus = locAny.verificationStatus;
        // Both 'Verified' (approved) and 'Active' (approved + enabled) mean approved
        if (location.status === 'Verified' || location.status === 'Active' || 
            verificationStatus === 'Approved' || verificationStatus === 'Active') {
            return { status: 'Approved', color: 'bg-emerald-100 text-emerald-700' };
        }
        if (location.status === 'Pending') return { status: 'Pending', color: 'bg-amber-100 text-amber-700' };
        return { status: 'Draft', color: 'bg-slate-100 text-slate-600' };
    };

    const getSubscriptionStatus = (): { label: string; color: string } => {
        const status = subscription?.status || 'Trial';
        const statusMap: Record<string, { label: string; color: string }> = {
            'Trial': { label: 'Trial', color: 'bg-blue-100 text-blue-700' },
            'Active': { label: 'Active', color: 'bg-emerald-100 text-emerald-700' },
            'Suspended': { label: 'Suspended', color: 'bg-red-100 text-red-700' },
            'Cancelled': { label: 'Cancelled', color: 'bg-slate-100 text-slate-600' }
        };
        return statusMap[status] || statusMap['Trial'];
    };

    // Apply filtering - strict exact match by ID
    const visibleLocations = (selectedLocationId && selectedLocationId !== 'all')
        ? locations.filter(l => {
            const isMatch = l.id === selectedLocationId;
            console.log('[DEBUG Filter] Comparing:', { locId: l.id, selectedId: selectedLocationId, locName: l.name, isMatch });
            return isMatch;
        })
        : locations;

    // DEBUG: Log filtering results
    console.log('[DEBUG OrgDetails] Prop selectedLocationId:', selectedLocationId, 'type:', typeof selectedLocationId);
    console.log('[DEBUG OrgDetails] All locations:', locations.map(l => ({ id: l.id, name: l.name })));
    console.log('[DEBUG OrgDetails] Filtered visibleLocations:', visibleLocations.length, 'items:', visibleLocations.map(l => l.name));

    // Compliance summary - org is verified if orgStatus OR approvalStatus is 'Verified'/'Approved'/'Active'
    const orgData = org as any;
    const isOrgVerified = 
        orgData?.orgStatus === 'Verified' || 
        orgData?.orgStatus === 'Active' ||
        orgData?.approvalStatus === 'Approved' ||
        orgData?.approvalStatus === 'Active';
    
    const complianceSummary = {
        org: isOrgVerified,
        facilities: {
            approved: visibleLocations.filter(l => (l.status === 'Verified' || l.status === 'Active') && !(l.licenseExpiry && new Date(l.licenseExpiry) < new Date())).length,
            pending: visibleLocations.filter(l => l.status === 'Pending').length,
            expired: visibleLocations.filter(l => l.licenseExpiry && new Date(l.licenseExpiry) < new Date()).length,
            draft: visibleLocations.filter(l => l.status === 'Unverified' && !l.licenseNumber).length
        }
    };

    const isTrial = subscription?.status === 'Trial' || !subscription?.status;

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    if (!org) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md text-center">
                    <div className="text-5xl mb-4">⚠️</div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Unable to Load Data</h2>
                    <p className="text-slate-600 mb-6">
                        Could not load organization details. This might be a temporary issue or a permission problem.
                    </p>
                    <button
                        onClick={() => loadData()}
                        className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    const subStatus = subscription ? getSubscriptionStatus() : { label: 'Trial', color: 'bg-blue-100 text-blue-700' };
    // Check both orgStatus and approvalStatus fields for the status label
    const effectiveOrgStatus = (org as any)?.approvalStatus || org?.orgStatus;
    const orgStatus = effectiveOrgStatus 
        ? getOrgStatusLabel(effectiveOrgStatus) 
        : { label: 'Not Verified', color: 'bg-slate-100 text-slate-600' };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            {/* Header with Status */}
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Organization Details</h2>
                    <p className="text-slate-500 mt-1">{org?.name}</p>
                </div>
                <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1.5 rounded-lg text-sm font-bold ${subStatus?.color || 'bg-blue-100 text-blue-700'}`}>
                        {subStatus?.label || 'Trial'}
                    </span>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex justify-between items-center">
                    <span>{error}</span>
                    <button onClick={() => setError('')} className="text-red-500">✕</button>
                </div>
            )}

            {success && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl flex justify-between items-center">
                    <span>✓ {success}</span>
                    <button onClick={() => setSuccess('')} className="text-emerald-500">✕</button>
                </div>
            )}

            {/* Compliance Summary Banner */}
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-xl p-6">
                <h3 className="font-bold text-slate-800 mb-4">📋 Compliance Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg p-4 border border-slate-200">
                        <p className="text-sm text-slate-500 mb-1">Organization</p>
                        <div className="flex items-center space-x-2">
                            {complianceSummary.org ? (
                                <span className="text-emerald-600 font-bold">✅ Approved</span>
                            ) : (
                                <span className="text-amber-600 font-bold">⏳ Pending</span>
                            )}
                        </div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-slate-200">
                        <p className="text-sm text-slate-500 mb-1">Facilities Approved</p>
                        <span className="text-xl font-bold text-emerald-600">{complianceSummary.facilities.approved}</span>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-slate-200">
                        <p className="text-sm text-slate-500 mb-1">Pending Review</p>
                        <span className="text-xl font-bold text-amber-600">{complianceSummary.facilities.pending}</span>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-slate-200">
                        <p className="text-sm text-slate-500 mb-1">Expired</p>
                        <span className={`text-xl font-bold ${complianceSummary.facilities.expired > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                            {complianceSummary.facilities.expired}
                        </span>
                    </div>
                </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Section 1: Organization Verification */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 h-fit">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Organization Verification</h3>
                            <p className="text-sm text-slate-500 mt-1">Global business credentials</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${orgStatus?.color || 'bg-slate-100 text-slate-600'}`}>
                            {orgStatus?.label || 'Not Verified'}
                        </span>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                        <p className="text-sm text-blue-700">
                            <strong>ℹ️ Important:</strong> Verification is required to enable billing, invoicing, and payouts.
                        </p>
                    </div>

                    {org?.orgStatus === 'Rejected' && org?.rejectionReason && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                            <div className="font-semibold text-red-800 mb-1">Rejection Reason:</div>
                            <p className="text-red-700">{org.rejectionReason}</p>
                        </div>
                    )}

                    <form onSubmit={handleOrgSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Business Registration Number
                            </label>
                            <input
                                type="text"
                                value={orgForm.businessRegNumber}
                                onChange={(e) => setOrgForm(prev => ({ ...prev, businessRegNumber: e.target.value }))}
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#4fd1c5] outline-none"
                                placeholder="e.g., PVT-ABCD1234"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                KRA PIN <span className="font-normal text-slate-400">(Required for invoicing & tax)</span>
                            </label>
                            <input
                                type="text"
                                value={orgForm.kraPin}
                                onChange={(e) => setOrgForm(prev => ({ ...prev, kraPin: e.target.value.toUpperCase() }))}
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#4fd1c5] outline-none"
                                placeholder="e.g., P001234567X"
                                pattern="[A-Z][0-9]{9}[A-Z]"
                                title="KRA PIN format: 1 letter, 9 digits, 1 letter"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Upload Registration Document
                            </label>
                            <div className="flex items-center space-x-4">
                                <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                                    onChange={handleOrgDocUpload}
                                    className="hidden"
                                    id="org-doc-upload"
                                />
                                <label
                                    htmlFor="org-doc-upload"
                                    className={`px-4 py-2 border border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 ${uploading ? 'opacity-50' : ''}`}
                                >
                                    {uploading ? 'Uploading...' : '📎 Choose File'}
                                </label>
                                {orgForm.documentUrl && (
                                    <a
                                        href={orgForm.documentUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[#0f766e] hover:text-[#0d9488] font-medium"
                                    >
                                        View Document ↗
                                    </a>
                                )}
                            </div>
                            <p className="text-xs text-slate-400 mt-1">Supported: PDF, Images, Word, Excel</p>
                        </div>

                        <button
                            type="submit"
                            disabled={org?.orgStatus === 'Verified' || org?.orgStatus === 'Active'}
                            className="w-full px-6 py-3 bg-[#1a2e35] text-[#4fd1c5] rounded-xl font-bold hover:bg-[#152428] disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-colors"
                        >
                            {(org?.orgStatus === 'Verified' || org?.orgStatus === 'Active') ? '✓ Verified' :
                                org?.orgStatus === 'Pending' ? 'Submit for Review' : 'Submit for Verification'}
                        </button>
                    </form>

                    {/* Status Meanings */}
                    <div className="mt-6 pt-6 border-t border-slate-100">
                        <p className="text-xs text-slate-400 mb-2 font-semibold uppercase">Status Guide</p>
                        <div className="space-y-1 text-xs text-slate-500">
                            <p>• <strong>Draft</strong> – Nothing submitted yet</p>
                            <p>• <strong>Pending</strong> – Submitted, awaiting HURE review</p>
                            <p>• <strong>Approved</strong> – Verified by HURE admin</p>
                        </div>
                    </div>
                </div>

                {/* Section 2: Facility Licenses */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 h-fit">
                    <div className="mb-4">
                        <h3 className="text-lg font-bold text-[#1a2e35]">Facility Licenses</h3>
                        <p className="text-sm text-slate-500 mt-1">Per location verification</p>
                    </div>

                    <div className="space-y-4">
                        {visibleLocations.map(location => {
                            const facilityStatus = getFacilityStatus(location);
                            const isExpired = location.licenseExpiry && new Date(location.licenseExpiry) < new Date();

                            return (
                                <div key={location.id} className={`border rounded-xl p-4 ${isExpired ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-2">
                                                <h4 className="font-bold text-slate-900">{location.name}</h4>
                                                {location.isPrimary && (
                                                    <span className="bg-[#e0f2f1] text-[#0f766e] px-2 py-0.5 rounded text-xs font-bold border border-[#4fd1c5]/30">PRIMARY</span>
                                                )}
                                            </div>
                                            <p className="text-sm text-slate-500 mt-1">
                                                {location.address}{location.city ? `, ${location.city}` : ''}
                                            </p>

                                            {location.licenseNumber && (
                                                <div className="mt-2 text-sm">
                                                    <span className="text-slate-600">License: </span>
                                                    <span className="font-medium">{location.licenseNumber}</span>
                                                    {location.licensingBody && (
                                                        <span className="text-slate-400 ml-2">({location.licensingBody})</span>
                                                    )}
                                                </div>
                                            )}

                                            {location.licenseExpiry && (
                                                <p className={`text-xs mt-1 ${isExpired ? 'text-red-600 font-bold' : 'text-slate-400'}`}>
                                                    {isExpired ? '⚠️ EXPIRED: ' : 'Expires: '}
                                                    {formatDateKE(location.licenseExpiry)}
                                                </p>
                                            )}

                                            {location.status === 'Rejected' && location.rejectionReason && (
                                                <div className="mt-2 text-sm text-red-600 bg-red-100 rounded-lg px-3 py-2">
                                                    <strong>Rejected:</strong> {location.rejectionReason}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col items-end space-y-2">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${facilityStatus?.color || 'bg-slate-100 text-slate-600'}`}>
                                                {facilityStatus?.status || 'Draft'}
                                            </span>
                                            <button
                                                onClick={() => openFacilityModal(location)}
                                                className="text-[#0f766e] hover:text-[#0d9488] font-bold text-sm transition-colors"
                                            >
                                                {location.licenseNumber ? 'Update' : 'Add License'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Limited Access Notice */}
                                    {(location.status === 'Pending' || location.status === 'Unverified') && (
                                        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                                            <p className="text-xs font-semibold text-amber-800 mb-2">⚠️ Limited actions until verified</p>
                                            <div className="space-y-1 text-xs">
                                                <p className="text-emerald-700 font-semibold">Employer CAN access:</p>
                                                <div className="pl-2 space-y-0.5 text-emerald-700">
                                                    <p>• Scheduling</p>
                                                    <p>• Attendance</p>
                                                    <p>• Leave</p>
                                                    <p>• Staff onboarding</p>
                                                    <p>• Credential collection</p>
                                                    <p>• Basic HR records</p>
                                                </div>
                                                <p className="text-red-700 font-semibold mt-2">🚫 Employer CANNOT access:</p>
                                                <div className="pl-2 space-y-0.5 text-red-700">
                                                    <p>• Payroll module (at all)</p>
                                                    <p>• Payroll previews</p>
                                                    <p>• Payroll exports</p>
                                                    <p>• Payroll Report (under report)</p>
                                                    <p>• Pay history generation</p>
                                                    <p>• Employees pay visibility</p>
                                                    <p>• Pay History, employee dashboard</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {locations.length === 0 && (
                            <div className="text-center py-8 text-slate-500">
                                <p className="text-4xl mb-2">📍</p>
                                <p>No locations added yet</p>
                                <a href="/employer/locations" className="text-blue-600 font-medium text-sm">Add Location →</a>
                            </div>
                        )}

                        {locations.length > 0 && visibleLocations.length === 0 && (
                            <div className="text-center py-8 text-slate-500">
                                <p>No facilities found at this location.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>



            {/* Facility License Modal */}
            {showFacilityModal && selectedLocation && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 m-4">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-900">Facility License</h2>
                            <button onClick={() => { setShowFacilityModal(false); setSelectedLocation(null); }} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-4 mb-4">
                            <p className="font-medium text-slate-900">{selectedLocation.name}</p>
                            <p className="text-sm text-slate-500">{selectedLocation.address}</p>
                        </div>

                        <form onSubmit={handleFacilitySubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">License Number *</label>
                                <input
                                    type="text"
                                    required
                                    value={facilityForm.licenseNumber}
                                    onChange={(e) => setFacilityForm(prev => ({ ...prev, licenseNumber: e.target.value }))}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-xl"
                                    placeholder="e.g., KMPDB-12345"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Licensing Body *</label>
                                <select
                                    required
                                    value={facilityForm.licensingBody}
                                    onChange={(e) => setFacilityForm(prev => ({ ...prev, licensingBody: e.target.value }))}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-xl"
                                >
                                    <option value="">Select Body</option>
                                    <option value="KMPDB">Kenya Medical Practitioners & Dentists Board</option>
                                    <option value="NCK">Nursing Council of Kenya</option>
                                    <option value="PPB">Pharmacy & Poisons Board</option>
                                    <option value="MOH">Ministry of Health</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div>
                                <DateInput
                                    label="Expiry Date"
                                    required
                                    value={facilityForm.expiryDate}
                                    onChange={(value) => setFacilityForm(prev => ({ ...prev, expiryDate: value }))}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">License Document</label>
                                <div className="flex items-center space-x-4">
                                    <input
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                                        onChange={handleFacilityDocUpload}
                                        className="hidden"
                                        id="facility-doc-upload"
                                    />
                                    <label
                                        htmlFor="facility-doc-upload"
                                        className={`px-4 py-2 border border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 ${uploading ? 'opacity-50' : ''}`}
                                    >
                                        {uploading ? 'Uploading...' : '📎 Choose File'}
                                    </label>
                                    {facilityForm.documentUrl && (
                                        <a href={facilityForm.documentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700">
                                            View ↗
                                        </a>
                                    )}
                                </div>
                                <p className="text-xs text-slate-400 mt-1">Supported: PDF, Images, Word, Excel</p>
                            </div>

                            <div className="flex space-x-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => { setShowFacilityModal(false); setSelectedLocation(null); }}
                                    className="flex-1 py-3 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
                                >
                                    Submit for Verification
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrgDetails;
