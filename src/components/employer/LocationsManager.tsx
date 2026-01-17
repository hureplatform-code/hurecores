import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { organizationService } from '../../lib/services/organization.service';
import type { Location } from '../../types';

const LocationsManager: React.FC = () => {
    const { user } = useAuth();
    const [locations, setLocations] = useState<Location[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [maxLocations, setMaxLocations] = useState(5);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newLocation, setNewLocation] = useState({ name: '', city: '', address: '', phone: '', isPrimary: false });
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
            await loadLocations();
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
            await loadLocations();
        } catch (err: any) {
            console.error('Error submitting verification:', err);
            setError(err.message || 'Failed to submit verification');
        } finally {
            setSubmittingVerification(null);
        }
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
                    <h2 className="text-2xl font-bold text-slate-900">Locations</h2>
                    <p className="text-slate-500">Manage your clinics and facilities.</p>
                </div>
                <div className="flex items-center space-x-4">
                    <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-sm font-bold">
                        {locations.length} / {maxLocations} Locations Used
                    </span>
                    {locations.length < maxLocations && (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                        >
                            + Add Location
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
                    {error}
                </div>
            )}

            {locations.length === 0 ? (
                <div className="bg-white p-16 rounded-2xl border border-slate-200 shadow-sm text-center">
                    <div className="text-6xl mb-4 opacity-20">📍</div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">No Locations Yet</h3>
                    <p className="text-slate-500 mb-6">Add your first clinic or facility location to get started.</p>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700"
                    >
                        + Add Your First Location
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    {locations.map((loc) => (
                        <div key={loc.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-6">
                            <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                    <h3 className="text-xl font-bold text-slate-900">{loc.name}</h3>
                                    {loc.isPrimary && <span className="bg-blue-100 text-blue-700 text-xs font-bold uppercase px-2 py-1 rounded">Primary</span>}
                                    <span className={`text-xs font-bold uppercase px-2 py-1 rounded border ${loc.status === 'Verified' ? 'bg-green-50 text-green-700 border-green-200' :
                                        loc.status === 'Pending' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                            'bg-amber-50 text-amber-700 border-amber-200'
                                        }`}>{loc.status || 'Unverified'}</span>
                                </div>
                                <p className="text-slate-500">{loc.address || 'No address'}{loc.city ? `, ${loc.city}` : ''}</p>
                                <p className="text-slate-500 text-sm mt-1">{loc.phone || 'No phone'}</p>
                            </div>

                            <div className="w-full lg:w-1/2 bg-slate-50 rounded-xl p-6 border border-slate-100">
                                <h4 className="font-bold text-slate-900 text-sm mb-4 border-b border-slate-200 pb-2">Facility Verification</h4>

                                {loc.status === 'Verified' ? (
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
                                ) : loc.status === 'Pending' ? (
                                    <div className="text-center py-4">
                                        <div className="text-blue-600 font-bold mb-2">Verification in Progress</div>
                                        <p className="text-sm text-slate-500">Your documents are under review. This usually takes 24-48 hours.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <p className="text-xs text-slate-500 mb-2">Submit your facility license to unlock full features.</p>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-1">License Number</label>
                                                <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                                                    value={verificationData.licenseNumber} onChange={e => setVerificationData({ ...verificationData, licenseNumber: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-1">Licensing Body</label>
                                                <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm bg-white" placeholder="e.g. KMPDC"
                                                    value={verificationData.licensingBody} onChange={e => setVerificationData({ ...verificationData, licensingBody: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1">Expiry Date</label>
                                            <input type="date" className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                                                value={verificationData.expiryDate} onChange={e => setVerificationData({ ...verificationData, expiryDate: e.target.value })}
                                            />
                                        </div>

                                        <div className="flex gap-3 mt-4">
                                            <button className="flex-1 bg-white border border-slate-300 text-slate-700 text-xs font-bold py-2.5 rounded-lg hover:bg-slate-50 flex items-center justify-center gap-2">
                                                <span>📤</span> Upload Document
                                            </button>
                                            <button
                                                onClick={() => handleVerificationSubmit(loc.id)}
                                                disabled={submittingVerification === loc.id}
                                                className="flex-1 bg-blue-600 text-white text-xs font-bold py-2.5 rounded-lg hover:bg-blue-700 shadow-sm disabled:opacity-50"
                                            >
                                                {submittingVerification === loc.id ? 'Submitting...' : 'Submit for Verification'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative z-10 p-6">
                        <h3 className="text-xl font-bold text-slate-900 mb-6">Add New Location</h3>
                        <form onSubmit={handleAddLocation} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Location Name</label>
                                <input type="text" required className="w-full px-4 py-2 border rounded-xl" value={newLocation.name} onChange={e => setNewLocation({ ...newLocation, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">City</label>
                                <input type="text" className="w-full px-4 py-2 border rounded-xl" value={newLocation.city} onChange={e => setNewLocation({ ...newLocation, city: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Full Address</label>
                                <input type="text" className="w-full px-4 py-2 border rounded-xl" value={newLocation.address} onChange={e => setNewLocation({ ...newLocation, address: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Phone Number</label>
                                <input type="text" className="w-full px-4 py-2 border rounded-xl" value={newLocation.phone} onChange={e => setNewLocation({ ...newLocation, phone: e.target.value })} />
                            </div>
                            <div className="flex items-center space-x-2 pt-2">
                                <input type="checkbox" id="primary" checked={newLocation.isPrimary} onChange={e => setNewLocation({ ...newLocation, isPrimary: e.target.checked })} />
                                <label htmlFor="primary" className="text-sm font-bold text-slate-700">Set as Primary Location</label>
                            </div>
                            <button type="submit" disabled={saving} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg mt-4 disabled:opacity-50">
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
