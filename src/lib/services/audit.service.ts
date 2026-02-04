// Audit Service - Firebase/Firestore Implementation
import {
    collections,
    getDocs,
    addDoc,
    query,
    where,
    orderBy,
    serverTimestamp
} from '../firestore';
import { auth } from '../firebase';

export interface AuditLogEntry {
    id?: string;
    organizationId: string;
    action: string;
    entityType: string;
    entityId?: string;
    entityName?: string;
    actorId: string;
    actorEmail?: string;
    actorName?: string;
    details?: Record<string, any>;
    timestamp: string;
    ipAddress?: string;
}

export const auditService = {
    /**
     * Get audit logs for an organization
     */
    async getAuditLogs(organizationId: string, options?: {
        startDate?: string;
        endDate?: string;
        action?: string;
        entityType?: string;
        limit?: number;
    }): Promise<AuditLogEntry[]> {
        try {
            // Build query with filters
            let q = query(
                collections.orgAuditLogs(organizationId)
                // orderBy('timestamp', 'desc') // Temporarily removed to avoid index issues
            );

            const snapshot = await getDocs(q);
            let logs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as AuditLogEntry)).sort((a, b) =>
                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );

            // Apply client-side filters if needed
            if (options?.startDate) {
                logs = logs.filter(log => log.timestamp >= options.startDate!);
            }
            if (options?.endDate) {
                logs = logs.filter(log => log.timestamp <= options.endDate! + 'T23:59:59');
            }
            if (options?.action) {
                logs = logs.filter(log => log.action === options.action);
            }
            if (options?.entityType) {
                logs = logs.filter(log => log.entityType === options.entityType);
            }

            // Apply limit
            if (options?.limit) {
                logs = logs.slice(0, options.limit);
            }

            return logs;
        } catch (error) {
            console.error('Error fetching audit logs:', error);
            return [];
        }
    },

    /**
     * Log an action to the audit trail
     */
    async logAction(organizationId: string, action: string, entityType: string, options?: {
        entityId?: string;
        entityName?: string;
        details?: Record<string, any>;
        actorName?: string;
    }): Promise<void> {
        try {
            const user = auth.currentUser;

            await addDoc(collections.orgAuditLogs(organizationId), {
                organizationId,
                action,
                entityType,
                entityId: options?.entityId || null,
                entityName: options?.entityName || null,
                actorId: user?.uid || 'system',
                actorEmail: user?.email || null,
                actorName: options?.actorName || user?.displayName || user?.email || 'Unknown',
                details: options?.details || null,
                timestamp: new Date().toISOString(),
                createdAt: serverTimestamp()
            });
        } catch (error) {
            console.error('Error logging audit action:', error);
            // Don't throw - audit logging should not break main operations
        }
    }
};
