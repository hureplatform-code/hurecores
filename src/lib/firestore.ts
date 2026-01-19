// Firestore Collection Helpers
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    Timestamp,
    DocumentReference,
    CollectionReference,
    QueryConstraint,
    addDoc,
    writeBatch,
    serverTimestamp,
    increment
} from 'firebase/firestore';
import { db } from './firebase';

// =====================================================
// COLLECTION REFERENCES
// =====================================================

export const collections = {
    // Top-level collections
    organizations: () => collection(db, 'organizations'),
    users: () => collection(db, 'users'),
    staffInvitations: () => collection(db, 'staffInvitations'),
    verificationRequests: () => collection(db, 'verificationRequests'),
    auditLogs: () => collection(db, 'auditLogs'),

    // Organization subcollections
    locations: (orgId: string) => collection(db, 'organizations', orgId, 'locations'),
    staff: (orgId: string) => collection(db, 'organizations', orgId, 'staff'),
    shifts: (orgId: string) => collection(db, 'organizations', orgId, 'shifts'),
    shiftAssignments: (orgId: string) => collection(db, 'organizations', orgId, 'shiftAssignments'),
    attendance: (orgId: string) => collection(db, 'organizations', orgId, 'attendance'),
    leaveTypes: (orgId: string) => collection(db, 'organizations', orgId, 'leaveTypes'),
    leaveBalances: (orgId: string) => collection(db, 'organizations', orgId, 'leaveBalances'),
    leaveEntitlements: (orgId: string) => collection(db, 'organizations', orgId, 'leaveEntitlements'),
    leaveRequests: (orgId: string) => collection(db, 'organizations', orgId, 'leaveRequests'),
    payrollPeriods: (orgId: string) => collection(db, 'organizations', orgId, 'payrollPeriods'),
    payrollEntries: (orgId: string) => collection(db, 'organizations', orgId, 'payrollEntries'),
    documents: (orgId: string) => collection(db, 'organizations', orgId, 'documents'),
    customRoles: (orgId: string) => collection(db, 'organizations', orgId, 'customRoles'),
    notifications: (orgId: string) => collection(db, 'organizations', orgId, 'notifications'),
    subscriptions: (orgId: string) => collection(db, 'organizations', orgId, 'subscriptions'),
    // Settings and Policy Documents
    settings: (orgId: string) => collection(db, 'organizations', orgId, 'settings'),
    policyDocuments: (orgId: string) => collection(db, 'organizations', orgId, 'policyDocuments'),
    documentAcknowledgements: (orgId: string) => collection(db, 'organizations', orgId, 'documentAcknowledgements'),
    // Org-level audit logs (use this for org-scoped audit trail)
    orgAuditLogs: (orgId: string) => collection(db, 'organizations', orgId, 'auditLogs'),
};

// Document references
export const docs = {
    organization: (orgId: string) => doc(db, 'organizations', orgId),
    user: (userId: string) => doc(db, 'users', userId),
    staffInvitation: (inviteId: string) => doc(db, 'staffInvitations', inviteId),
    location: (orgId: string, locationId: string) => doc(db, 'organizations', orgId, 'locations', locationId),
    staff: (orgId: string, staffId: string) => doc(db, 'organizations', orgId, 'staff', staffId),
    shift: (orgId: string, shiftId: string) => doc(db, 'organizations', orgId, 'shifts', shiftId),
    attendance: (orgId: string, recordId: string) => doc(db, 'organizations', orgId, 'attendance', recordId),
    leaveEntitlement: (orgId: string, entitlementId: string) => doc(db, 'organizations', orgId, 'leaveEntitlements', entitlementId),
    leaveRequest: (orgId: string, requestId: string) => doc(db, 'organizations', orgId, 'leaveRequests', requestId),
    payrollPeriod: (orgId: string, periodId: string) => doc(db, 'organizations', orgId, 'payrollPeriods', periodId),
    document: (orgId: string, docId: string) => doc(db, 'organizations', orgId, 'documents', docId),
    notification: (orgId: string, notifId: string) => doc(db, 'organizations', orgId, 'notifications', notifId),
    verificationRequest: (requestId: string) => doc(db, 'verificationRequests', requestId),
    auditLog: (logId: string) => doc(db, 'auditLogs', logId),
    // Settings and Policy Documents
    settings: (orgId: string, settingsId: string) => doc(db, 'organizations', orgId, 'settings', settingsId),
    policyDocument: (orgId: string, docId: string) => doc(db, 'organizations', orgId, 'policyDocuments', docId),
    documentAcknowledgement: (orgId: string, ackId: string) => doc(db, 'organizations', orgId, 'documentAcknowledgements', ackId),
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Convert Firestore Timestamp to ISO string
 */
export const timestampToISO = (timestamp: Timestamp | null | undefined): string | null => {
    if (!timestamp) return null;
    return timestamp.toDate().toISOString();
};

/**
 * Convert ISO string to Firestore Timestamp
 */
export const isoToTimestamp = (isoString: string | null | undefined): Timestamp | null => {
    if (!isoString) return null;
    return Timestamp.fromDate(new Date(isoString));
};

/**
 * Get current server timestamp
 */
export const getServerTimestamp = () => serverTimestamp();

/**
 * Create a batch writer for atomic operations
 */
export const createBatch = () => writeBatch(db);

/**
 * Generic document fetch with type
 */
export async function getDocument<T>(docRef: DocumentReference): Promise<T | null> {
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    return { id: snapshot.id, ...snapshot.data() } as T;
}

/**
 * Generic collection query with type
 */
export async function queryCollection<T>(
    collectionRef: CollectionReference,
    ...constraints: QueryConstraint[]
): Promise<T[]> {
    const q = query(collectionRef, ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
}

/**
 * Add audit log entry
 */
export async function addAuditLog(
    eventType: string,
    description: string,
    userId?: string,
    userEmail?: string,
    organizationId?: string,
    metadata?: Record<string, unknown>
) {
    await addDoc(collections.auditLogs(), {
        eventType,
        description,
        userId,
        userEmail,
        organizationId,
        metadata,
        createdAt: serverTimestamp()
    });
}

// Export Firestore utilities
export {
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    addDoc,
    Timestamp,
    serverTimestamp,
    increment
};
