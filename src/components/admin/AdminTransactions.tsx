import React, { useState, useEffect } from 'react';
import { adminService } from '../../lib/services/organization.service';
import type { Organization } from '../../types';
import { PLANS } from '../../constants';

// Transactions would come from a payment service/collection
// For now, we derive from organization data as placeholder
const AdminTransactions: React.FC = () => {
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTransactions();
    }, []);

    const loadTransactions = async () => {
        setLoading(true);
        try {
            const orgs = await adminService.getAllOrganizations();
            setOrganizations(orgs);
        } catch (err) {
            console.error('Error loading transactions:', err);
        } finally {
            setLoading(false);
        }
    };

    const getPlanAmount = (planId?: string): string => {
        if (!planId) return '0';
        const plan = PLANS.find(p => p.id === planId || p.name === planId);
        if (!plan) return '0';
        return plan.price.replace('KES ', '');
    };

    const formatDate = (timestamp: any): string => {
        if (!timestamp) return 'N/A';
        if (timestamp.seconds) {
            return new Date(timestamp.seconds * 1000).toISOString().split('T')[0];
        }
        return new Date(timestamp).toISOString().split('T')[0];
    };

    // Create transaction-like entries from organization signups
    const transactions = organizations.map((org, i) => ({
        id: `TXN-${(10000 + i).toString()}`,
        clinic: org.name,
        email: org.email,
        plan: org.plan || 'Essential',
        amount: getPlanAmount(org.plan),
        status: org.accountStatus === 'Active' ? 'Completed' : 'Pending',
        date: formatDate(org.createdAt),
        method: 'Pending Setup'
    }));

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin text-4xl">⏳</div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Transactions</h2>
                <p className="text-slate-500">History of all platform payments and invoices.</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                {transactions.length === 0 ? (
                    <div className="p-16 text-center">
                        <div className="text-6xl mb-4 opacity-20">💰</div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">No Transactions</h3>
                        <p className="text-slate-500">No payment transactions recorded yet.</p>
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4">Transaction ID</th>
                                <th className="px-6 py-4">Clinic / Payer</th>
                                <th className="px-6 py-4">Plan Item</th>
                                <th className="px-6 py-4">Amount (KES)</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {transactions.map((txn) => (
                                <tr key={txn.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-mono font-bold text-slate-600 text-xs bg-slate-100 px-2 py-1 rounded w-fit">{txn.id}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-900">{txn.clinic}</div>
                                        <div className="text-xs text-slate-500">{txn.method}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${txn.plan.includes('Professional') ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'
                                            }`}>
                                            {txn.plan}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-slate-900">
                                        {txn.amount}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`flex items-center gap-1.5 text-xs font-bold uppercase ${txn.status === 'Completed' ? 'text-green-600' :
                                                txn.status === 'Pending' ? 'text-amber-600' : 'text-red-500'
                                            }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${txn.status === 'Completed' ? 'bg-green-600' :
                                                    txn.status === 'Pending' ? 'bg-amber-600' : 'bg-red-500'
                                                }`}></span>
                                            {txn.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm text-slate-500 font-mono">
                                        {txn.date}
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

export default AdminTransactions;
