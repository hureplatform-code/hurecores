import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { policyDocumentsService } from '../../lib/services';
import type { PolicyDocument, DocumentAcknowledgement } from '../../types';

const MyDocuments: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [documents, setDocuments] = useState<PolicyDocument[]>([]);
    const [acknowledgements, setAcknowledgements] = useState<Record<string, boolean>>({});
    const [acknowledging, setAcknowledging] = useState<string | null>(null);
    const [selectedDoc, setSelectedDoc] = useState<PolicyDocument | null>(null);

    useEffect(() => {
        if (user?.organizationId && user?.id) {
            loadData();
        }
    }, [user?.organizationId, user?.id]);

    const loadData = async () => {
        if (!user?.organizationId || !user?.id) return;
        setLoading(true);
        try {
            // Get documents assigned to this staff member
            const docs = await policyDocumentsService.getForStaff(
                user.organizationId,
                user.id,
                user.jobTitle
            );
            setDocuments(docs);

            // Check acknowledgement status for each document
            const ackStatus: Record<string, boolean> = {};
            for (const doc of docs) {
                ackStatus[doc.id] = await policyDocumentsService.hasAcknowledged(
                    user.organizationId,
                    doc.id,
                    user.id
                );
            }
            setAcknowledgements(ackStatus);
        } catch (error) {
            console.error('Error loading documents:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAcknowledge = async (docId: string) => {
        if (!user?.organizationId || !user?.id) return;

        setAcknowledging(docId);
        try {
            await policyDocumentsService.acknowledge(
                user.organizationId,
                docId,
                user.id,
                user.name || 'Unknown'
            );
            setAcknowledgements(prev => ({ ...prev, [docId]: true }));
            setSelectedDoc(null);
        } catch (error) {
            console.error('Error acknowledging document:', error);
            alert(`Failed to acknowledge document: ${(error as Error).message}`);
        } finally {
            setAcknowledging(null);
        }
    };

    const pendingCount = documents.filter(d => d.requiresAcknowledgement && !acknowledgements[d.id]).length;

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="animate-spin w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 max-w-5xl mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900">My Documents</h2>
                <p className="text-slate-500">View company documents and policies. Complete any pending acknowledgements.</p>
            </div>

            {/* Pending Alert */}
            {pendingCount > 0 && (
                <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-amber-800">
                    <span className="text-xl">📋</span>
                    <div>
                        <p className="font-bold text-sm">Action Required</p>
                        <p className="text-xs opacity-90">You have {pendingCount} document{pendingCount > 1 ? 's' : ''} requiring acknowledgement.</p>
                    </div>
                </div>
            )}

            {/* Documents Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {documents.length > 0 ? documents.map((doc) => {
                    const isAcknowledged = acknowledgements[doc.id];
                    const needsAck = doc.requiresAcknowledgement && !isAcknowledged;

                    return (
                        <div
                            key={doc.id}
                            className={`bg-white rounded-2xl border shadow-sm p-6 transition-all hover:shadow-md ${needsAck ? 'border-amber-200' : 'border-slate-200'
                                }`}
                        >
                            <div className="flex items-start gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${needsAck ? 'bg-amber-100' : 'bg-slate-100'
                                    }`}>
                                    📄
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-slate-900">{doc.name}</h3>
                                    {doc.description && (
                                        <p className="text-sm text-slate-500 mt-1">{doc.description}</p>
                                    )}
                                    <p className="text-xs text-slate-400 mt-2">
                                        Uploaded {(() => {
                                            try {
                                                const dateVal = doc.createdAt as any;
                                                const date = dateVal?.toDate ? dateVal.toDate() : new Date(dateVal);
                                                return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleDateString();
                                            } catch (e) {
                                                return 'Invalid Date';
                                            }
                                        })()}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                                {doc.requiresAcknowledgement && (
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${isAcknowledged ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                                        <span className={`text-xs font-bold ${isAcknowledged ? 'text-green-600' : 'text-amber-600'}`}>
                                            {isAcknowledged ? '✓ Acknowledged' : 'Pending Acknowledgement'}
                                        </span>
                                    </div>
                                )}
                                {!doc.requiresAcknowledgement && (
                                    <span className="text-xs text-slate-400">No acknowledgement required</span>
                                )}

                                <div className="flex gap-2">
                                    <a
                                        href={doc.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-3 py-1.5 text-xs font-bold text-teal-600 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors"
                                    >
                                        View
                                    </a>
                                    {needsAck && (
                                        <button
                                            onClick={() => setSelectedDoc(doc)}
                                            className="px-3 py-1.5 text-xs font-bold text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors"
                                        >
                                            Acknowledge
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                }) : (
                    <div className="col-span-2 p-12 text-center bg-white rounded-2xl border border-slate-200">
                        <div className="text-4xl mb-3 opacity-30">📄</div>
                        <div className="text-slate-900 font-bold">No documents available</div>
                        <div className="text-slate-500 text-sm">Documents assigned to you will appear here.</div>
                    </div>
                )}
            </div>

            {/* Acknowledgement Modal */}
            {selectedDoc && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-2xl">📄</div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">{selectedDoc.name}</h3>
                                <p className="text-sm text-slate-500">Acknowledgement Required</p>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-xl mb-6">
                            <p className="text-sm text-slate-600">
                                By clicking "I Acknowledge", you confirm that you have read and understood the contents of this document.
                                This acknowledgement will be recorded and timestamped.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setSelectedDoc(null)}
                                className="flex-1 py-2.5 px-4 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <a
                                href={selectedDoc.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 py-2.5 px-4 border border-teal-200 rounded-xl font-semibold text-teal-600 bg-teal-50 hover:bg-teal-100 transition-colors text-center"
                            >
                                View Document
                            </a>
                            <button
                                onClick={() => handleAcknowledge(selectedDoc.id)}
                                disabled={acknowledging === selectedDoc.id}
                                className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-white bg-amber-500 hover:bg-amber-600 transition-colors disabled:opacity-50"
                            >
                                {acknowledging === selectedDoc.id ? 'Saving...' : '✓ I Acknowledge'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyDocuments;
