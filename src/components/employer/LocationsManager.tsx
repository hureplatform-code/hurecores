import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { organizationService } from '../../lib/services/organization.service';
import KenyaPhoneInput from '../common/KenyaPhoneInput';
import type { Location } from '../../types';
import DateInput from '../common/DateInput';

interface LocationsManagerProps {
    onLocationUpdate?: () => void;
}

const LocationsManager: React.FC<LocationsManagerProps> = ({ onLocationUpdate }) => {
    const { user } = useAuth();
    const [locations, setLocations] = useState<Location[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [maxLocations, setMaxLocations] = useState(5);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newLocation, setNewLocation] = useState({ name: '', city: '', address: '', phone: '', isPrimary: false });
    const [phoneValid, setPhoneValid] = useState(true);
    const [saving, setSaving] = useState(false);

    // State for facility verification form
    const [verificationData, setVerificationData] = useState({ licenseNumber: '', licensingBody: '', expiryDate: '' });
    const [submittingVerification, setSubmittingVerification] = useState<string | null>(null);

    useEffect(() => {
        if (user?.organizationId) {
            loadLocations();
            loadOrgLimits();
        }
    }, [user?.organizationId]);

    const loadLocations = async () => {
        if (!user?.organizationId) return;

        setLoading(true);
        setError('');
        try {
            const locs = await organizationService.getLocations(user.organizationId);
            setLocations(locs);
        } catch (err: any) {
            console.error('Error loading locations:', err);
            setError('Failed to load locations');
        } finally {
            setLoading(false);
        }
    };

    const loadOrgLimits = async () => {
        if (!user?.organizationId) return;
        try {
            const org = await organizationService.getById(user.organizationId);
            if (org?.maxLocations) {
                setMaxLocations(org.maxLocations);
            }
        } catch (err) {
            console.error('Error loading org limits:', err);
        }
    };

    const handleAddLocation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.organizationId) return;

        // Validate phone if provided
        if (newLocation.phone && !phoneValid) {
            setError('Please enter a valid Kenyan phone number');
            return;
        }

        setSaving(true);
        setError('');
        try {
            await organizationService.createLocation(user.organizationId, {
                name: newLocation.name,
                city: newLocation.city || undefined,
                address: newLocation.address || undefined,
                phone: newLocation.phone || undefined,
                isPrimary: newLocation.isPrimary
            });

            setIsModalOpen(false);
            setNewLocation({ name: '', city: '', address: '', phone: '', isPrimary: false });
            setSuccess('Location added successfully');
            await loadLocations();
            // Refresh parent dashboard logic
            if (onLocationUpdate) {
                onLocationUpdate();
            }
        } catch (err: any) {
            console.error('Error adding location:', err);
            setError(err.message || 'Failed to add location');
        } finally {
            setSaving(false);
        }
    };

    const handleVerificationSubmit = async (locationId: string) => {
        if (!user?.organizationId) return;
        if (!verificationData.licenseNumber || !verificationData.licensingBody || !verificationData.expiryDate) {
            setError('Please fill in all verification fields');
            return;
        }

        setSubmittingVerification(locationId);
        setError('');
        try {
            await organizationService.submitFacilityVerification(user.organizationId, locationId, {
                licenseNumber: verificationData.licenseNumber,
                licensingBody: verificationData.licensingBody,
                expiryDate: verificationData.expiryDate
            });

            setVerificationData({ licenseNumber: '', licensingBody: '', expiryDate: '' });
            setSuccess('Verification submitted successfully');
            await loadLocations();
            // Refresh parent
            if (onLocationUpdate) onLocationUpdate();
        } catch (err: any) {
            console.error('Error submitting verification:', err);
            setError(err.message || 'Failed to submit verification');
        } finally {
            setSubmittingVerification(null);
        }
    };

    const isLicenseExpired = (expiryDate?: string) => {
        if (!expiryDate) return false;
        return new Date(expiryDate) < new Date();
    };

    const getStatusBadge = (loc: Location) => {
        const expired = isLicenseExpired(loc.licenseExpiry);
        if (expired) return { label: 'Expired', color: 'bg-red-100 text-red-700 border-red-200' };
        if (loc.status === 'Verified') return { label: 'Approved', color: 'bg-[#e0f2f1] text-[#0f766e] border-[#4fd1c5]/30' };
        if (loc.status === 'Pending') return { label: 'Pending', color: 'bg-amber-100 text-amber-700 border-amber-200' };
        return { label: 'Draft', color: 'bg-slate-100 text-slate-600 border-slate-200' };
    };

    if (loading) {
        return (
            <div className="p-8 max-w-7xl mx-auto flex items-center justify-center h-64">
                <div className="animate-spin text-4xl">⏳</div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto h-full flex flex-col animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-[#1a2e35]">Locations</h2>
                    <p className="text-slate-500">Manage your clinics and facilities.</p>
                </div>
                <div className="flex items-center space-x-4">

                    <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-sm font-bold">
                        {locations.length} / {maxLocations} Locations Used
                    </span>
                    {locations.length < maxLocations ? (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-[#1a2e35] text-[#4fd1c5] px-5 py-2.5 rounded-xl font-bold hover:bg-[#152428] transition-colors shadow-lg shadow-[#1a2e35]/20"
                        >
                            + Add Location
                        </button>
                    ) : (
                        <button
                            disabled
                            className="bg-slate-100 text-slate-400 px-5 py-2.5 rounded-xl font-bold cursor-not-allowed border border-slate-200"
                            title={`Plan limit of ${maxLocations} locations reached. Upgrade to add more.`}
                        >
                            Limit Reached
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex justify-between">
                    <span>{error}</span>
                    <button onClick={() => setError('')}>✕</button>
                </div>
            )}

            {success && (
                <div className="bg-[#e0f2f1] border border-[#4fd1c5]/30 text-[#0f766e] px-4 py-3 rounded-xl mb-6 flex justify-between">
                    <span>✓ {success}</span>
                    <button onClick={() => setSuccess('')}>✕</button>
                </div>
            )}

            {locations.length === 0 ? (
                <div className="bg-white p-16 rounded-2xl border border-slate-200 shadow-sm text-center">
                    <div className="text-6xl mb-4 opacity-20">📍</div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">No Locations Yet</h3>
                    <p className="text-slate-500 mb-6">Add your first clinic or facility location to get started.</p>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-[#1a2e35] text-[#4fd1c5] px-6 py-3 rounded-xl font-bold hover:bg-[#152428]"
                    >
                        + Add Your First Location
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    {locations.map((loc) => {
                        const status = getStatusBadge(loc);
                        const isPending = loc.status === 'Pending';

                        return (
                            <div key={loc.id} className={`bg-white p-6 rounded-2xl border shadow-sm ${isLicenseExpired(loc.licenseExpiry) ? 'border-red-300' : 'border-slate-200'}`}>
                                <div className="flex flex-col lg:flex-row gap-6">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3 mb-2">
                                            <h3 className="text-xl font-bold text-[#1a2e35]">{loc.name}</h3>
                                            {loc.isPrimary && <span className="bg-[#e0f2f1] text-[#0f766e] text-xs font-bold uppercase px-2 py-1 rounded border border-[#4fd1c5]/30">Primary</span>}
                                            <span className={`text-xs font-bold uppercase px-2 py-1 rounded border ${status.color}`}>
                                                {status.label}
                                            </span>
                                        </div>
                                        <p className="text-slate-500">{loc.address || 'No address'}{loc.city ? `, ${loc.city}` : ''}</p>
                                        <p className="text-slate-500 text-sm mt-1">{loc.phone || 'No phone'}</p>

                                        {/* Pending Location Notice */}
                                        {isPending && (
                                            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
                                                <p className="font-semibold text-amber-800 mb-2">⚠️ Limited actions until verified</p>
                                                <div className="grid grid-cols-2 gap-2 text-sm text-amber-700">
                                                    <p>• Scheduling: <span className="text-emerald-600 font-semibold">✅ Allowed</span></p>
                                                    <p>• Attendance: <span className="text-emerald-600 font-semibold">✅ Allowed</span></p>
                                                    <p>• Payroll preview: <span className="text-emerald-600 font-semibold">✅ Allowed</span></p>
                                                    <p>• Payroll payout: <span className="text-red-600 font-semibold">❌ Blocked</span></p>
                                                    <p>• Invoicing: <span className="text-red-600 font-semibold">❌ Blocked</span></p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="w-full lg:w-1/2 bg-slate-50 rounded-xl p-6 border border-slate-100">
                                        <h4 className="font-bold text-slate-900 text-sm mb-4 border-b border-slate-200 pb-2">Facility Verification</h4>

                                        {loc.status === 'Verified' && !isLicenseExpired(loc.licenseExpiry) ? (
                                            <div className="space-y-2">
                                                <div className="flex items-center text-green-700 text-sm font-bold bg-green-50 p-2 rounded-lg mb-3">
                                                    <span className="mr-2">✓</span> License Valid
                                                </div>
                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                    <div>
                                                        <span className="text-slate-500 block text-xs uppercase font-bold">License No.</span>
                                                        <span className="font-mono font-bold text-slate-700">{loc.licenseNumber}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-500 block text-xs uppercase font-bold">Body</span>
                                                        <span className="font-bold text-slate-700">{loc.licensingBody}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-500 block text-xs uppercase font-bold">Expires</span>
                                                        <span className="font-mono font-bold text-slate-700">{loc.licenseExpiry}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : isLicenseExpired(loc.licenseExpiry) ? (
                                            <div className="text-center py-4">
                                                <div className="text-red-600 font-bold mb-2">⚠️ License Expired</div>
                                                <p className="text-sm text-slate-500 mb-4">Please update your license to continue operations.</p>
                                                <button
                                                    onClick={() => {
                                                        setVerificationData({
                                                            licenseNumber: loc.licenseNumber || '',
                                                            licensingBody: loc.licensingBody || '',
                                                            expiryDate: ''
                                                        });
                                                    }}
                                                    className="bg-red-600 text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-red-700"
                                                >
                                                    Renew License
                                                </button>
                                            </div>
                                        ) : loc.status === 'Pending' ? (
                                            <div className="text-center py-4">
                                                <div className="text-amber-600 font-bold mb-2">⏳ Verification in Progress</div>
                                                <p className="text-sm text-slate-500">Your documents are under review. This usually takes 24-48 hours.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <p className="text-xs text-slate-500 mb-2">Submit your facility license to unlock full features.</p>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-600 mb-1">License Number *</label>
                                                        <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                                                            value={verificationData.licenseNumber} onChange={e => setVerificationData({ ...verificationData, licenseNumber: e.target.value })}
                                                            placeholder="e.g., KMPDB-12345"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-600 mb-1">Licensing Body *</label>
                                                        <select className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                                                            value={verificationData.licensingBody} onChange={e => setVerificationData({ ...verificationData, licensingBody: e.target.value })}
                                                        >
                                                            <option value="">Select Body</option>
                                                            <option value="KMPDB">KMPDB</option>
                                                            <option value="NCK">NCK</option>
                                                            <option value="PPB">PPB</option>
                                                            <option value="MOH">MOH</option>
                                                            <option value="Other">Other</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <div>
                                                    <DateInput
                                                        label="Expiry Date"
                                                        required
                                                        value={verificationData.expiryDate}
                                                        onChange={(value) => setVerificationData({ ...verificationData, expiryDate: value })}
                                                    />
                                                </div>

                                                <div className="flex gap-3 mt-4">
                                                    <button className="flex-1 bg-white border border-slate-300 text-slate-700 text-xs font-bold py-2.5 rounded-lg hover:bg-slate-50 flex items-center justify-center gap-2">
                                                        <span>📤</span> Upload Document
                                                    </button>
                                                    <button
                                                        onClick={() => handleVerificationSubmit(loc.id)}
                                                        disabled={submittingVerification === loc.id}
                                                        className="flex-1 bg-[#1a2e35] text-[#4fd1c5] text-xs font-bold py-2.5 rounded-lg hover:bg-[#152428] shadow-sm disabled:opacity-50 transition-colors"
                                                    >
                                                        {submittingVerification === loc.id ? 'Submitting...' : 'Submit for Verification'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative z-10 p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-900">Add New Location</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <form onSubmit={handleAddLocation} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Location Name *</label>
                                <input type="text" required className="w-full px-4 py-3 border border-slate-300 rounded-xl"
                                    value={newLocation.name} onChange={e => setNewLocation({ ...newLocation, name: e.target.value })}
                                    placeholder="e.g., Main Clinic"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">City</label>
                                <input type="text" className="w-full px-4 py-3 border border-slate-300 rounded-xl"
                                    value={newLocation.city} onChange={e => setNewLocation({ ...newLocation, city: e.target.value })}
                                    placeholder="e.g., Nairobi"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Full Address</label>
                                <input type="text" className="w-full px-4 py-3 border border-slate-300 rounded-xl"
                                    value={newLocation.address} onChange={e => setNewLocation({ ...newLocation, address: e.target.value })}
                                    placeholder="e.g., 123 Hospital Road"
                                />
                            </div>

                            {/* Kenya Phone Input */}
                            <KenyaPhoneInput
                                label="Phone Number"
                                value={newLocation.phone}
                                onChange={(normalized, isValid) => {
                                    setNewLocation({ ...newLocation, phone: normalized });
                                    setPhoneValid(isValid);
                                }}
                            />

                            <div className="flex items-center space-x-2 pt-2">
                                <input type="checkbox" id="primary" className="w-4 h-4"
                                    checked={newLocation.isPrimary} onChange={e => setNewLocation({ ...newLocation, isPrimary: e.target.checked })}
                                />
                                <label htmlFor="primary" className="text-sm font-bold text-slate-700">Set as Primary Location</label>
                            </div>
                            <button type="submit" disabled={saving} className="w-full py-3 bg-[#1a2e35] text-[#4fd1c5] font-bold rounded-xl hover:bg-[#152428] shadow-lg mt-4 disabled:opacity-50 transition-colors">
                                {saving ? 'Adding...' : 'Add Location'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LocationsManager;
