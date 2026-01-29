import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { policyDocumentsService, storageService, staffService, auditService } from '../../lib/services';
import type { PolicyDocument, DocumentAcknowledgement, Profile } from '../../types';
import { JOB_TITLES } from '../../types';

const DocumentsPoliciesManager: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [documents, setDocuments] = useState<PolicyDocument[]>([]);
    const [staff, setStaff] = useState<Profile[]>([]);
    const [acknowledgements, setAcknowledgements] = useState<Record<string, DocumentAcknowledgement[]>>({});
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploading, setUploading] = useState(false);
    
    // Acknowledgement details modal state
    const [showAckDetailsModal, setShowAckDetailsModal] = useState(false);
    const [selectedDocForAck, setSelectedDocForAck] = useState<PolicyDocument | null>(null);

    // Upload form state
    const [uploadForm, setUploadForm] = useState({
        name: '',
        description: '',
        file: null as File | null,
        assignedTo: 'all' as 'all' | 'roles' | 'individuals',
        assignedRoles: [] as string[],
        assignedStaffIds: [] as string[],
        requiresAcknowledgement: true
    });

    useEffect(() => {
        if (user?.organizationId) {
            loadData();
        }
    }, [user?.organizationId]);

    const loadData = async () => {
        if (!user?.organizationId) return;
        setLoading(true);
        try {
            const [docs, staffList] = await Promise.all([
                policyDocumentsService.getAll(user.organizationId),
                staffService.getAll(user.organizationId)
            ]);
            setDocuments(docs);
            setStaff(staffList);

            // Load acknowledgements for each document
            const ackMap: Record<string, DocumentAcknowledgement[]> = {};
            for (const doc of docs) {
                ackMap[doc.id] = await policyDocumentsService.getAcknowledgements(user.organizationId, doc.id);
            }
            setAcknowledgements(ackMap);
        } catch (error) {
            console.error('Error loading documents:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async () => {
        if (!user?.organizationId || !uploadForm.file) return;

        setUploading(true);
        try {
            // Upload file to storage
            const uploadResult = await storageService.uploadFile(
                uploadForm.file,
                `organizations/${user.organizationId}/policies/${Date.now()}_${uploadForm.file.name}`
            );

            if (!uploadResult.success || !uploadResult.url) {
                throw new Error(uploadResult.error || 'Failed to upload file');
            }

            // Create document record
            await policyDocumentsService.create(user.organizationId, {
                name: uploadForm.name,
                description: uploadForm.description,
                fileUrl: uploadResult.url,
                fileSizeBytes: uploadForm.file.size,
                mimeType: uploadForm.file.type,
                assignedTo: uploadForm.assignedTo,
                assignedRoles: uploadForm.assignedRoles,
                assignedStaffIds: uploadForm.assignedStaffIds,
                requiresAcknowledgement: uploadForm.requiresAcknowledgement
            });

            // Log upload action
            await auditService.logAction(user.organizationId, 'CREATE', 'document', {
                entityName: uploadForm.name,
                details: {
                    type: 'policy_document',
                    assignedTo: uploadForm.assignedTo,
                    requiresAcknowledgement: uploadForm.requiresAcknowledgement
                }
            });

            // Reset form and reload
            setUploadForm({
                name: '',
                description: '',
                file: null,
                assignedTo: 'all',
                assignedRoles: [],
                assignedStaffIds: [],
                requiresAcknowledgement: true
            });
            setShowUploadModal(false);
            loadData();
        } catch (error) {
            console.error('Error uploading document:', error);
            alert('Failed to upload document');
        } finally {
            setUploading(false);
        }
    };

    const getAcknowledgementStatus = (doc: PolicyDocument) => {
        const acks = acknowledgements[doc.id] || [];
        let totalRequired = 0;

        if (doc.assignedTo === 'all') {
            totalRequired = staff.length;
        } else if (doc.assignedTo === 'roles') {
            totalRequired = staff.filter(s => doc.assignedRoles?.includes(s.jobTitle || '')).length;
        } else {
            totalRequired = doc.assignedStaffIds?.length || 0;
        }

        return { acknowledged: acks.length, total: totalRequired };
    };

    // Get list of staff assigned to a document
    const getAssignedStaff = (doc: PolicyDocument): Profile[] => {
        if (doc.assignedTo === 'all') {
            return staff;
        } else if (doc.assignedTo === 'roles') {
            return staff.filter(s => doc.assignedRoles?.includes(s.jobTitle || ''));
        } else {
            return staff.filter(s => doc.assignedStaffIds?.includes(s.id));
        }
    };

    // Get acknowledgement details for a document
    const getAcknowledgementDetails = (doc: PolicyDocument) => {
        const assignedStaff = getAssignedStaff(doc);
        const acks = acknowledgements[doc.id] || [];
        const ackedStaffIds = acks.map(a => a.staffId);

        const acknowledged = assignedStaff.filter(s => ackedStaffIds.includes(s.id));
        const pending = assignedStaff.filter(s => !ackedStaffIds.includes(s.id));

        // Get acknowledgement timestamps
        const ackMap: Record<string, DocumentAcknowledgement> = {};
        acks.forEach(a => { ackMap[a.staffId] = a; });

        return { acknowledged, pending, ackMap };
    };

    const openAckDetails = (doc: PolicyDocument) => {
        setSelectedDocForAck(doc);
        setShowAckDetailsModal(true);
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="animate-spin w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Documents & Policies</h2>
                    <p className="text-slate-500">Upload and manage HR documents, policies, SOPs, and handbooks. Assign to staff and track acknowledgements.</p>
                </div>
                <button
                    onClick={() => setShowUploadModal(true)}
                    className="px-6 py-2.5 text-white font-semibold rounded-xl transition-colors hover:opacity-90"
                    style={{ backgroundColor: '#1a2e35' }}
                >
                    + Upload Document
                </button>
            </div>

            {/* Documents List */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4">Document</th>
                            <th className="px-6 py-4">Assigned To</th>
                            <th className="px-6 py-4">Acknowledgements</th>
                            <th className="px-6 py-4">Uploaded</th>
                            <th className="px-6 py-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {documents.length > 0 ? documents.map((doc) => {
                            const status = getAcknowledgementStatus(doc);
                            const allAcked = status.acknowledged >= status.total && status.total > 0;

                            return (
                                <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div>
                                            <div className="font-bold text-slate-900">{doc.name}</div>
                                            {doc.description && (
                                                <div className="text-sm text-slate-500">{doc.description}</div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase ${doc.assignedTo === 'all'
                                            ? 'bg-blue-100 text-blue-700'
                                            : doc.assignedTo === 'roles'
                                                ? 'bg-purple-100 text-purple-700'
                                                : 'bg-amber-100 text-amber-700'
                                            }`}>
                                            {doc.assignedTo === 'all' ? 'All Staff' :
                                                doc.assignedTo === 'roles' ? `${doc.assignedRoles?.length || 0} Roles` :
                                                    `${doc.assignedStaffIds?.length || 0} Staff`}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {doc.requiresAcknowledgement ? (
                                            <button
                                                onClick={() => openAckDetails(doc)}
                                                className="flex items-center gap-2 hover:bg-slate-100 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                                                title="Click to view acknowledgement details"
                                            >
                                                <div className={`w-2 h-2 rounded-full ${allAcked ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                                                <span className={`font-bold ${allAcked ? 'text-green-600' : 'text-amber-600'}`}>
                                                    {status.acknowledged}/{status.total}
                                                </span>
                                                <span className={`text-xs px-1.5 py-0.5 rounded ${allAcked ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {allAcked ? 'Complete' : 'Pending'}
                                                </span>
                                            </button>
                                        ) : (
                                            <span className="text-xs text-slate-400">Not required</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">
                                        {(() => {
                                            try {
                                                const dateVal = doc.createdAt as any;
                                                const date = dateVal?.toDate ? dateVal.toDate() : new Date(dateVal);
                                                return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleDateString();
                                            } catch (e) {
                                                return 'Invalid Date';
                                            }
                                        })()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-2">
                                            <a
                                                href={doc.fileUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-3 py-1.5 text-xs font-bold text-teal-600 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors"
                                            >
                                                View
                                            </a>
                                        </div>
                                    </td>
                                </tr>
                            );
                        }) : (
                            <tr>
                                <td colSpan={5} className="p-12 text-center">
                                    <div className="text-4xl mb-3 opacity-30">📄</div>
                                    <div className="text-slate-900 font-bold">No documents yet</div>
                                    <div className="text-slate-500 text-sm">Upload your first document to get started.</div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-slate-900">Upload Document</h3>
                            <button
                                onClick={() => setShowUploadModal(false)}
                                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Document Name */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Document Name *</label>
                                <input
                                    type="text"
                                    value={uploadForm.name}
                                    onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                                    placeholder="e.g., Employee Handbook 2024"
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                <textarea
                                    value={uploadForm.description}
                                    onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                                    placeholder="Brief description of this document..."
                                    rows={2}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                                />
                            </div>

                            {/* File Upload */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">File *</label>
                                <input
                                    type="file"
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.gif,.bmp,.svg,.zip,.rar,.7z"
                                    onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                                />
                                {uploadForm.file && (
                                    <p className="text-xs text-slate-500 mt-1">
                                        {uploadForm.file.name} ({(uploadForm.file.size / 1024).toFixed(1)} KB)
                                    </p>
                                )}
                                <p className="text-xs text-slate-400 mt-1">Supported: PDF, Word, Excel, PowerPoint, Images, Archives, and more</p>
                            </div>


                            {/* Assign To */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Assign To</label>
                                <select
                                    value={uploadForm.assignedTo}
                                    onChange={(e) => setUploadForm({ ...uploadForm, assignedTo: e.target.value as any })}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                                >
                                    <option value="all">All Staff</option>
                                    <option value="roles">Specific Roles</option>
                                    <option value="individuals">Specific Individuals</option>
                                </select>
                            </div>

                            {/* Role Selection */}
                            {uploadForm.assignedTo === 'roles' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Select Roles</label>
                                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border border-slate-200 rounded-xl p-3">
                                        {JOB_TITLES.map((role) => (
                                            <label key={role} className="flex items-center gap-2 text-sm">
                                                <input
                                                    type="checkbox"
                                                    checked={uploadForm.assignedRoles.includes(role)}
                                                    onChange={(e) => {
                                                        const roles = e.target.checked
                                                            ? [...uploadForm.assignedRoles, role]
                                                            : uploadForm.assignedRoles.filter(r => r !== role);
                                                        setUploadForm({ ...uploadForm, assignedRoles: roles });
                                                    }}
                                                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                                />
                                                <span>{role}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Staff Selection */}
                            {uploadForm.assignedTo === 'individuals' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Select Staff</label>
                                    <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-3 space-y-2">
                                        {staff.map((s) => (
                                            <label key={s.id} className="flex items-center gap-2 text-sm">
                                                <input
                                                    type="checkbox"
                                                    checked={uploadForm.assignedStaffIds.includes(s.id)}
                                                    onChange={(e) => {
                                                        const ids = e.target.checked
                                                            ? [...uploadForm.assignedStaffIds, s.id]
                                                            : uploadForm.assignedStaffIds.filter(id => id !== s.id);
                                                        setUploadForm({ ...uploadForm, assignedStaffIds: ids });
                                                    }}
                                                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                                />
                                                <span>{s.fullName || s.email}</span>
                                                <span className="text-xs text-slate-400">{s.jobTitle}</span>
                                            </label>
                                        ))}
                                        {staff.length === 0 && (
                                            <p className="text-sm text-slate-400">No staff members found</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Requires Acknowledgement */}
                            <div className="flex items-center justify-between py-3 border-t border-slate-100">
                                <label className="text-sm font-medium text-slate-700">Requires acknowledgement</label>
                                <button
                                    type="button"
                                    onClick={() => setUploadForm({ ...uploadForm, requiresAcknowledgement: !uploadForm.requiresAcknowledgement })}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${uploadForm.requiresAcknowledgement ? 'bg-teal-500' : 'bg-slate-200'
                                        }`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${uploadForm.requiresAcknowledgement ? 'translate-x-6' : 'translate-x-1'
                                        }`} />
                                </button>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowUploadModal(false)}
                                className="flex-1 py-2.5 px-4 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpload}
                                disabled={uploading || !uploadForm.name || !uploadForm.file}
                                className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-white disabled:opacity-50 transition-colors"
                                style={{ backgroundColor: '#1a2e35' }}
                            >
                                {uploading ? 'Uploading...' : 'Upload'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Acknowledgement Details Modal */}
            {showAckDetailsModal && selectedDocForAck && (() => {
                const details = getAcknowledgementDetails(selectedDocForAck);
                const status = getAcknowledgementStatus(selectedDocForAck);
                const allAcked = status.acknowledged >= status.total && status.total > 0;

                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900">Acknowledgement Details</h3>
                                    <p className="text-sm text-slate-500 mt-1">{selectedDocForAck.name}</p>
                                </div>
                                <button
                                    onClick={() => { setShowAckDetailsModal(false); setSelectedDocForAck(null); }}
                                    className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Summary Stats */}
                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="bg-slate-50 rounded-xl p-4 text-center">
                                    <div className="text-2xl font-bold text-slate-900">{status.total}</div>
                                    <div className="text-xs text-slate-500 font-medium">Total Assigned</div>
                                </div>
                                <div className="bg-green-50 rounded-xl p-4 text-center">
                                    <div className="text-2xl font-bold text-green-600">{details.acknowledged.length}</div>
                                    <div className="text-xs text-green-600 font-medium">Acknowledged</div>
                                </div>
                                <div className="bg-amber-50 rounded-xl p-4 text-center">
                                    <div className="text-2xl font-bold text-amber-600">{details.pending.length}</div>
                                    <div className="text-xs text-amber-600 font-medium">Pending</div>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="mb-6">
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="font-medium text-slate-700">Progress</span>
                                    <span className={`font-bold ${allAcked ? 'text-green-600' : 'text-amber-600'}`}>
                                        {status.total > 0 ? Math.round((status.acknowledged / status.total) * 100) : 0}%
                                    </span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-2.5">
                                    <div
                                        className={`h-2.5 rounded-full transition-all ${allAcked ? 'bg-green-500' : 'bg-amber-500'}`}
                                        style={{ width: `${status.total > 0 ? (status.acknowledged / status.total) * 100 : 0}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* Tabs for Acknowledged / Pending */}
                            <div className="border-b border-slate-200 mb-4">
                                <div className="flex gap-4">
                                    <span className="px-1 pb-2 text-sm font-bold text-slate-900 border-b-2 border-teal-500">
                                        All Staff ({status.total})
                                    </span>
                                </div>
                            </div>

                            {/* Staff List */}
                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                {/* Pending First */}
                                {details.pending.length > 0 && (
                                    <div className="mb-4">
                                        <div className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-2 flex items-center gap-2">
                                            <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                                            Pending ({details.pending.length})
                                        </div>
                                        {details.pending.map((staffMember) => (
                                            <div
                                                key={staffMember.id}
                                                className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100 mb-2"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-amber-200 flex items-center justify-center text-amber-700 font-bold text-sm">
                                                        {(staffMember.fullName || staffMember.email || '?').charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-slate-900">{staffMember.fullName || staffMember.email}</div>
                                                        <div className="text-xs text-slate-500">{staffMember.jobTitle || 'No role assigned'}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-lg">
                                                        Not Acknowledged
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Acknowledged */}
                                {details.acknowledged.length > 0 && (
                                    <div>
                                        <div className="text-xs font-bold text-green-600 uppercase tracking-wide mb-2 flex items-center gap-2">
                                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                            Acknowledged ({details.acknowledged.length})
                                        </div>
                                        {details.acknowledged.map((staffMember) => {
                                            const ack = details.ackMap[staffMember.id];
                                            let ackDate = 'Unknown date';
                                            try {
                                                const dateVal = ack?.acknowledgedAt as any;
                                                const date = dateVal?.toDate ? dateVal.toDate() : new Date(dateVal);
                                                if (!isNaN(date.getTime())) {
                                                    ackDate = date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                                }
                                            } catch (e) { }

                                            return (
                                                <div
                                                    key={staffMember.id}
                                                    className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-100 mb-2"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center text-green-700 font-bold text-sm">
                                                            {(staffMember.fullName || staffMember.email || '?').charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-slate-900">{staffMember.fullName || staffMember.email}</div>
                                                            <div className="text-xs text-slate-500">{staffMember.jobTitle || 'No role assigned'}</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-lg flex items-center gap-1">
                                                            ✓ Acknowledged
                                                        </span>
                                                        <div className="text-xs text-slate-400 mt-1">{ackDate}</div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {details.acknowledged.length === 0 && details.pending.length === 0 && (
                                    <div className="text-center py-8 text-slate-500">
                                        <div className="text-3xl mb-2">📋</div>
                                        <p>No staff assigned to this document</p>
                                    </div>
                                )}
                            </div>

                            {/* Close Button */}
                            <div className="flex justify-end mt-6 pt-4 border-t border-slate-100">
                                <button
                                    onClick={() => { setShowAckDetailsModal(false); setSelectedDocForAck(null); }}
                                    className="px-6 py-2.5 rounded-xl font-semibold text-white transition-colors"
                                    style={{ backgroundColor: '#1a2e35' }}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default DocumentsPoliciesManager;
