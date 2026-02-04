// Settings Service - Firebase/Firestore Implementation
import {
    collections,
    docs,
    getDocument,
    getDocs,
    setDoc,
    updateDoc,
    addDoc,
    serverTimestamp
} from '../firestore';
import { auth } from '../firebase';
import type {
    OrganizationSettings,
    AttendanceRules,
    LunchRules,
    BreakRules,
    SchedulingRules,
    PolicyDocument,
    DocumentAcknowledgement
} from '../../types';
import {
    DEFAULT_ATTENDANCE_RULES,
    DEFAULT_LUNCH_RULES,
    DEFAULT_BREAK_RULES,
    DEFAULT_SCHEDULING_RULES
} from '../../types';

// =====================================================
// SETTINGS SERVICE
// =====================================================

const SETTINGS_DOC_ID = 'default'; // Single settings doc per organization

// Helper to recursively remove undefined values (Firestore doesn't accept undefined)
const removeUndefined = (obj: any): any => {
    if (obj === null || obj === undefined) return null;
    if (Array.isArray(obj)) return obj.map(removeUndefined);
    if (typeof obj === 'object') {
        const cleaned: any = {};
        for (const [key, value] of Object.entries(obj)) {
            if (value !== undefined) {
                cleaned[key] = removeUndefined(value);
            }
        }
        return cleaned;
    }
    return obj;
};

export const settingsService = {
    /**
     * Get organization settings with defaults
     */
    async getSettings(organizationId: string): Promise<OrganizationSettings> {
        try {
            const settingsDoc = await getDocument<OrganizationSettings>(
                docs.settings(organizationId, SETTINGS_DOC_ID)
            );

            if (settingsDoc) {
                // Ensure new fields exist even in old docs
                return {
                    ...settingsDoc,
                    scheduling: settingsDoc.scheduling || { ...DEFAULT_SCHEDULING_RULES }
                };
            }

            // Return defaults if no settings exist
            return {
                id: SETTINGS_DOC_ID,
                organizationId,
                attendance: { ...DEFAULT_ATTENDANCE_RULES },
                lunch: { ...DEFAULT_LUNCH_RULES },
                breaks: { ...DEFAULT_BREAK_RULES },
                scheduling: { ...DEFAULT_SCHEDULING_RULES },
                updatedAt: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error fetching settings:', error);
            // Return defaults on error
            return {
                id: SETTINGS_DOC_ID,
                organizationId,
                attendance: { ...DEFAULT_ATTENDANCE_RULES },
                lunch: { ...DEFAULT_LUNCH_RULES },
                breaks: { ...DEFAULT_BREAK_RULES },
                scheduling: { ...DEFAULT_SCHEDULING_RULES },
                updatedAt: new Date().toISOString()
            };
        }
    },

    /**
     * Update organization settings
     */
    async updateSettings(
        organizationId: string,
        updates: Partial<{
            attendance: Partial<AttendanceRules>;
            lunch: Partial<LunchRules>;
            breaks: Partial<BreakRules>;
            scheduling: Partial<SchedulingRules>;
        }>
    ): Promise<OrganizationSettings> {
        const currentSettings = await this.getSettings(organizationId);

        const updatedSettings = removeUndefined({
            organizationId,
            attendance: { ...currentSettings.attendance, ...updates.attendance },
            lunch: { ...currentSettings.lunch, ...updates.lunch },
            breaks: { ...currentSettings.breaks, ...updates.breaks },
            scheduling: { ...currentSettings.scheduling, ...updates.scheduling },
            updatedAt: serverTimestamp(),
            updatedBy: auth.currentUser?.uid || 'system'
        });

        await setDoc(docs.settings(organizationId, SETTINGS_DOC_ID), updatedSettings, { merge: true });

        return this.getSettings(organizationId);
    },

    /**
     * Reset settings to defaults
     */
    async resetToDefaults(organizationId: string): Promise<OrganizationSettings> {
        const defaultSettings = removeUndefined({
            organizationId,
            attendance: { ...DEFAULT_ATTENDANCE_RULES },
            lunch: { ...DEFAULT_LUNCH_RULES },
            breaks: { ...DEFAULT_BREAK_RULES },
            scheduling: { ...DEFAULT_SCHEDULING_RULES },
            updatedAt: serverTimestamp(),
            updatedBy: auth.currentUser?.uid || 'system'
        });

        await setDoc(docs.settings(organizationId, SETTINGS_DOC_ID), defaultSettings);

        return this.getSettings(organizationId);
    }
};

// =====================================================
// POLICY DOCUMENTS SERVICE
// =====================================================

export const policyDocumentsService = {
    /**
     * Get all policy documents for an organization
     */
    async getAll(organizationId: string): Promise<PolicyDocument[]> {
        const snapshot = await getDocs(collections.policyDocuments(organizationId));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PolicyDocument));
    },

    /**
     * Get a single policy document
     */
    async getById(organizationId: string, documentId: string): Promise<PolicyDocument | null> {
        return getDocument<PolicyDocument>(docs.policyDocument(organizationId, documentId));
    },

    /**
     * Create a new policy document
     */
    async create(organizationId: string, input: {
        name: string;
        description?: string;
        fileUrl: string;
        fileSizeBytes?: number;
        mimeType?: string;
        assignedTo: 'all' | 'roles' | 'individuals';
        assignedRoles?: string[];
        assignedStaffIds?: string[];
        requiresAcknowledgement: boolean;
    }): Promise<PolicyDocument> {
        const docRef = await addDoc(collections.policyDocuments(organizationId), {
            organizationId,
            ...input,
            uploadedBy: auth.currentUser?.uid || 'unknown',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        return (await this.getById(organizationId, docRef.id))!;
    },

    /**
     * Update a policy document
     */
    async update(organizationId: string, documentId: string, updates: Partial<PolicyDocument>): Promise<PolicyDocument> {
        await updateDoc(docs.policyDocument(organizationId, documentId), {
            ...updates,
            updatedAt: serverTimestamp()
        });

        return (await this.getById(organizationId, documentId))!;
    },

    /**
     * Get documents assigned to a staff member
     */
    async getForStaff(organizationId: string, staffId: string, jobTitle?: string): Promise<PolicyDocument[]> {
        const allDocs = await this.getAll(organizationId);

        return allDocs.filter(doc => {
            // All staff
            if (doc.assignedTo === 'all') return true;

            // Specific roles
            if (doc.assignedTo === 'roles' && jobTitle && doc.assignedRoles?.includes(jobTitle)) {
                return true;
            }

            // Specific individuals
            if (doc.assignedTo === 'individuals' && doc.assignedStaffIds?.includes(staffId)) {
                return true;
            }

            return false;
        });
    },

    /**
     * Get acknowledgement status for a document
     */
    async getAcknowledgements(organizationId: string, documentId: string): Promise<DocumentAcknowledgement[]> {
        const snapshot = await getDocs(collections.documentAcknowledgements(organizationId));
        const acks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DocumentAcknowledgement));
        return acks.filter(ack => ack.documentId === documentId);
    },

    /**
     * Acknowledge a document
     */
    async acknowledge(organizationId: string, documentId: string, staffId: string, staffName?: string): Promise<DocumentAcknowledgement> {
        // Check if already acknowledged
        const existing = await this.getAcknowledgements(organizationId, documentId);
        const alreadyAcked = existing.find(ack => ack.staffId === staffId);
        if (alreadyAcked) return alreadyAcked;

        const docRef = await addDoc(collections.documentAcknowledgements(organizationId), {
            documentId,
            staffId,
            staffName,
            acknowledgedAt: serverTimestamp()
        });

        return {
            id: docRef.id,
            documentId,
            staffId,
            staffName,
            acknowledgedAt: new Date().toISOString()
        };
    },

    /**
     * Check if a staff member has acknowledged a document
     */
    async hasAcknowledged(organizationId: string, documentId: string, staffId: string): Promise<boolean> {
        const acks = await this.getAcknowledgements(organizationId, documentId);
        return acks.some(ack => ack.staffId === staffId);
    }
};
