import React from 'react';

const PendingOnboarding: React.FC = () => {
    const pendingClinics = [
        { id: 1, name: 'Care Health Facility', email: 'reg_nairobi_01@care.com', emailVerified: true, status: 'Pending Details', created: '2025-01-02' },
        { id: 2, name: 'MediLife Center', email: 'admin@medilife.co.ke', emailVerified: false, status: 'Email Unverified', created: '2025-01-02' },
        { id: 3, name: 'Sunrise Pediatric', email: 'info@sunrise.com', emailVerified: true, status: 'Payment Pending', created: '2025-01-01' },
    ];

    // Toggle this to test empty state
    const isEmpty = false;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Pending Onboarding</h2>
                <p className="text-slate-500">Clinics that have registered but not completed setup.</p>
            </div>

            {isEmpty || pendingClinics.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm flex flex-col items-center justify-center h-96">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-4xl mb-6 shadow-sm">🎉</div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">All Clear!</h3>
                    <p className="text-slate-500 max-w-sm mx-auto">All registered clinics have completed their onboarding process. Great job!</p>
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4">Clinic Details</th>
                                <th className="px-6 py-4">Email Verification</th>
                                <th className="px-6 py-4">Current Stage</th>
                                <th className="px-6 py-4">Created On</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {pendingClinics.map((clinic) => (
                                <tr key={clinic.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-900">{clinic.name}</div>
                                        <div className="text-xs text-slate-500 font-mono">{clinic.email}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {clinic.emailVerified ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-green-50 text-green-700 text-xs font-bold border border-green-200">
                                                <span>✓</span> Verified
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">
                                                <span>⚠</span> Pending
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wide">
                                            {clinic.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 font-mono">
                                        {clinic.created}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-blue-600 font-bold text-sm hover:underline">View Details</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default PendingOnboarding;
