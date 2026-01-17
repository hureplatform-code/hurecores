import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { staffService } from '../../lib/services/staff.service';
import { organizationService } from '../../lib/services/organization.service';
import type { Profile, Location } from '../../types';

const ManagerStaff: React.FC = () => {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [locationFilter, setLocationFilter] = useState('All');
    const [staff, setStaff] = useState<Profile[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.organizationId) {
            loadData();
        }
    }, [user?.organizationId]);

    const loadData = async () => {
        if (!user?.organizationId) return;

        setLoading(true);
        try {
            const [staffData, locationsData] = await Promise.all([
                staffService.getAll(user.organizationId),
                organizationService.getLocations(user.organizationId)
            ]);
            setStaff(staffData);
            setLocations(locationsData);
        } catch (err) {
            console.error('Error loading staff:', err);
        } finally {
            setLoading(false);
        }
    };

    const getLocationName = (locationId?: string): string => {
        if (!locationId) return 'Unassigned';
        const location = locations.find(l => l.id === locationId);
        return location?.name || 'Unknown';
    };

    const filteredStaff = staff.filter(s =>
        (s.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.systemRole?.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (locationFilter === 'All' || s.locationId === locationFilter)
    );

    if (loading) {
        return (
            <div className="p-8 max-w-7xl mx-auto flex items-center justify-center h-64">
                <div className="animate-spin text-4xl">⏳</div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto flex flex-col animate-in fade-in duration-500">
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Staff Directory</h2>
                    <p className="text-slate-500">View contact details and status for all staff members.</p>
                </div>
                <div className="flex space-x-4">
                    <input
                        type="text"
                        placeholder="Search staff..."
                        className="px-4 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <select
                        className="px-4 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500 bg-white"
                        value={locationFilter}
                        onChange={(e) => setLocationFilter(e.target.value)}
                    >
                        <option value="All">All Locations</option>
                        {locations.map(loc => (
                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                {filteredStaff.length === 0 ? (
                    <div className="p-16 text-center">
                        <div className="text-6xl mb-4 opacity-20">👥</div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">No Staff Found</h3>
                        <p className="text-slate-500">
                            {searchTerm || locationFilter !== 'All'
                                ? 'Try adjusting your search or filter.'
                                : 'No staff members have been added yet.'}
                        </p>
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500">
                            <tr>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Contact</th>
                                <th className="px-6 py-4">Location</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredStaff.map((person) => (
                                <tr key={person.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200">
                                                {person.fullName?.split(' ').map(n => n[0]).join('') || '?'}
                                            </div>
                                            <span className="font-bold text-slate-900">{person.fullName || 'Unknown'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-600">{person.systemRole || 'Staff'}</td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm">
                                            <div className="font-semibold text-slate-900">{person.email}</div>
                                            <div className="text-slate-500">{person.phone || 'No phone'}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                                        {getLocationName(person.locationId)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${person.accountStatus === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                            {person.accountStatus || 'Active'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default ManagerStaff;
