import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTrialStatus, AccessBlockedOverlay } from '../../context/TrialContext';
import { staffService } from '../../lib/services/staff.service';
import type { Profile } from '../../types';

const ManagerPayroll: React.FC = () => {
    const { user } = useAuth();
    const { isVerified } = useTrialStatus();
    const [activeTab, setActiveTab] = useState<'All' | 'Salaried' | 'Daily' | 'Hourly'>('All');
    const [staff, setStaff] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);

    if (!isVerified) {
        return <AccessBlockedOverlay reason="verification" />;
    }

    useEffect(() => {
        if (user?.organizationId) {
            loadStaff();
        }
    }, [user?.organizationId]);

    const loadStaff = async () => {
        if (!user?.organizationId) return;

        setLoading(true);
        try {
            const staffData = await staffService.getAll(user.organizationId);
            setStaff(staffData);
        } catch (err) {
            console.error('Error loading staff:', err);
        } finally {
            setLoading(false);
        }
    };

    // Since payroll data structure may not exist yet, we show staff with placeholder payroll info
    // In production, this would come from a payroll service
    const payrollData = staff.map(s => ({
        id: s.id,
        name: s.fullName || 'Unknown',
        role: s.systemRole || 'Staff',
        type: 'Salaried', // Would come from contract/payroll info
        worked: 'N/A',
        rate: 'N/A',
        total: 'N/A',
        status: 'Pending'
    }));

    const filteredData = activeTab === 'All' ? payrollData : payrollData.filter(item => item.type === activeTab);

    if (loading) {
        return (
            <div className="p-8 max-w-7xl mx-auto flex items-center justify-center h-64">
                <div className="animate-spin text-4xl">⏳</div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto flex flex-col animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Team Payroll</h2>
                    <p className="text-slate-500">View payroll status for your team (Read Only).</p>
                </div>
                <div className="flex items-center space-x-4">
                    <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors">
                        <span>📥</span>
                        <span>Export CSV</span>
                    </button>
                    <select className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500">
                        <option>January 2026</option>
                        <option>December 2025</option>
                    </select>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-2 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
                {['All', 'Salaried', 'Daily', 'Hourly'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                            }`}
                    >
                        {tab === 'All' ? 'All Staff' : `${tab} Staff`}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    {filteredData.length === 0 ? (
                        <div className="p-16 text-center">
                            <div className="text-6xl mb-4 opacity-20">💰</div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">No Payroll Data</h3>
                            <p className="text-slate-500">No staff members found for this category.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500">
                                <tr>
                                    <th className="px-6 py-4">Staff Member</th>
                                    <th className="px-6 py-4">Work Summary</th>
                                    <th className="px-6 py-4">Rate</th>
                                    <th className="px-6 py-4">Total Due</th>
                                    <th className="px-6 py-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredData.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-sm">
                                                    {item.name.split(' ').map(n => n[0]).join('')}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900">{item.name}</div>
                                                    <div className="text-xs text-slate-500">{item.role}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-700">{item.worked}</td>
                                        <td className="px-6 py-4 text-slate-600">{item.rate}</td>
                                        <td className="px-6 py-4 font-mono font-bold text-slate-900">{item.total}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${item.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                {item.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ManagerPayroll;
