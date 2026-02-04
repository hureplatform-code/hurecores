import React from 'react';

const ManagerDocuments: React.FC = () => {
    const documents = [
        { id: 1, name: 'Facility License 2024', type: 'License', expiry: '2024-12-31', status: 'Valid', location: 'Nairobi Main' },
        { id: 2, name: 'Fire Safety Certificate', type: 'Certificate', expiry: '2025-06-30', status: 'Valid', location: 'Nairobi Main' },
        { id: 3, name: 'Pharmacy Practice License', type: 'License', expiry: '2024-11-15', status: 'Expiring Soon', location: 'Mombasa Branch' },
    ];

    return (
        <div className="p-8 max-w-7xl mx-auto flex flex-col animate-in fade-in duration-500">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900">Facility Documents</h2>
                <p className="text-slate-500">View and manage facility licenses and certificates.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {documents.map((doc) => (
                    <div key={doc.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl text-2xl">
                                📄
                            </div>
                            <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${doc.status === 'Valid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                }`}>
                                {doc.status}
                            </span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-1">{doc.name}</h3>
                        <p className="text-sm text-slate-500 mb-4">{doc.location} • {doc.type}</p>

                        <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                            <div className="text-xs text-slate-400 font-bold uppercase">Expires</div>
                            <div className={`font-mono font-bold ${doc.status === 'Expiring Soon' ? 'text-amber-600' : 'text-slate-700'}`}>
                                {doc.expiry}
                            </div>
                        </div>

                        <button className="w-full mt-4 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                            View Document
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ManagerDocuments;
