import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { organizationService, storageService } from '../../lib/services';
import type { Organization, Location, VerificationStatus } from '../../types';

const OrgDetails: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [org, setOrg] = useState<Organization | null>(null);
    const [locations, setLocations] = useState<Location[]>([]);
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
        } catch (error) {
            setError('Failed to upload document');
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
        } catch (error) {
            setError('Failed to upload document');
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

    const getStatusBadge = (status: VerificationStatus) => {
        const styles: Record<VerificationStatus, string> = {
            'Verified': 'bg-emerald-100 text-emerald-700',
            'Pending': 'bg-amber-100 text-amber-700',
            'Unverified': 'bg-slate-100 text-slate-600',
            'Rejected': 'bg-red-100 text-red-700'
        };
        return (
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${styles[status]}`}>
                {status}
            </span>
        );
    };

    const isLicenseExpiringSoon = (expiryDate?: string) => {
        if (!expiryDate) return false;
        const expiry = new Date(expiryDate);
        const now = new Date();
        const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
    };

    const isLicenseExpired = (expiryDate?: string) => {
        if (!expiryDate) return false;
        return new Date(expiryDate) < new Date();
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <h2 className="text-2xl font-bold text-slate-900">Organization Details</h2>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
                    {error}
                </div>
            )}

            {success && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl">
                    {success}
                </div>
            )}

            {/* Organization Info */}
            <div className="bg-white rounded-2xl border border-slate-200 p-8">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">{org?.name}</h3>
                        <p className="text-slate-500">{org?.email}</p>
                    </div>
                    {getStatusBadge(org?.orgStatus || 'Unverified')}
                </div>

                {org?.orgStatus === 'Rejected' && org?.rejectionReason && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                        <div className="font-semibold text-red-800 mb-1">Rejection Reason:</div>
                        <p className="text-red-700">{org.rejectionReason}</p>
                    </div>
                )}

                <form onSubmit={handleOrgSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Business Registration Number
                            </label>
                            <input
                                type="text"
                                value={orgForm.businessRegNumber}
                                onChange={(e) => setOrgForm(prev => ({ ...prev, businessRegNumber: e.target.value }))}
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl"
                                placeholder="e.g., PVT-ABCD1234"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                KRA PIN
                            </label>
                            <input
                                type="text"
                                value={orgForm.kraPin}
                                onChange={(e) => setOrgForm(prev => ({ ...prev, kraPin: e.target.value }))}
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl"
                                placeholder="e.g., P001234567X"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Business Registration Document
                        </label>
                        <div className="flex items-center space-x-4">
                            <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={handleOrgDocUpload}
                                className="hidden"
                                id="org-doc-upload"
                            />
                            <label
                                htmlFor="org-doc-upload"
                                className={`px-4 py-2 border border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 ${uploading ? 'opacity-50' : ''}`}
                            >
                                {uploading ? 'Uploading...' : 'Choose File'}
                            </label>
                            {orgForm.documentUrl && (
                                <a
                                    href={orgForm.documentUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-700 font-medium"
                                >
                                    View Document ↗
                                </a>
                            )}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={org?.orgStatus === 'Verified'}
                        className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50"
                    >
                        {org?.orgStatus === 'Pending' ? 'Update Verification' : 'Submit for Verification'}
                    </button>
                </form>
            </div>

            {/* Facilities / Locations */}
            <div className="bg-white rounded-2xl border border-slate-200 p-8">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Facility Licenses</h3>

                <div className="space-y-4">
                    {locations.map(location => (
                        <div key={location.id} className="border border-slate-200 rounded-xl p-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center space-x-3">
                                        <h4 className="font-bold text-slate-900">{location.name}</h4>
                                        {location.isPrimary && (
                                            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">PRIMARY</span>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-500 mt-1">
                                        {location.address}{location.city ? `, ${location.city}` : ''}
                                    </p>

                                    {location.licenseNumber && (
                                        <div className="mt-3 text-sm">
                                            <span className="text-slate-600">License: </span>
                                            <span className="font-medium">{location.licenseNumber}</span>
                                            {location.licenseExpiry && (
                                                <span className={`ml-2 ${isLicenseExpired(location.licenseExpiry)
                                                    ? 'text-red-600'
                                                    : isLicenseExpiringSoon(location.licenseExpiry)
                                                        ? 'text-amber-600'
                                                        : 'text-slate-500'
                                                    }`}>
                                                    (Expires: {location.licenseExpiry}
                                                    {isLicenseExpired(location.licenseExpiry) && ' - EXPIRED'}
                                                    {isLicenseExpiringSoon(location.licenseExpiry) && ' - EXPIRING SOON'})
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {location.status === 'Rejected' && location.rejectionReason && (
                                        <div className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                                            <strong>Rejected:</strong> {location.rejectionReason}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center space-x-3">
                                    {getStatusBadge(location.status)}
                                    <button
                                        onClick={() => openFacilityModal(location)}
                                        className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                                    >
                                        {location.licenseNumber ? 'Update' : 'Add License'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {locations.length === 0 && (
                        <p className="text-center text-slate-500 py-8">No locations added yet</p>
                    )}
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
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Expiry Date *</label>
                                <input
                                    type="date"
                                    required
                                    value={facilityForm.expiryDate}
                                    onChange={(e) => setFacilityForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-xl"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">License Document</label>
                                <div className="flex items-center space-x-4">
                                    <input
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={handleFacilityDocUpload}
                                        className="hidden"
                                        id="facility-doc-upload"
                                    />
                                    <label
                                        htmlFor="facility-doc-upload"
                                        className={`px-4 py-2 border border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 ${uploading ? 'opacity-50' : ''}`}
                                    >
                                        {uploading ? 'Uploading...' : 'Choose File'}
                                    </label>
                                    {facilityForm.documentUrl && (
                                        <a
                                            href={facilityForm.documentUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-700"
                                        >
                                            View ↗
                                        </a>
                                    )}
                                </div>
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
