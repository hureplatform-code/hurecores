import {
    collections,
    docs,
    getDocument,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    serverTimestamp
} from '../firestore';
import { StaffPermissions } from '../../types';

export interface CustomRole {
    id: string;
    organizationId: string;
    name: string;
    description?: string;
    permissions: StaffPermissions;
    createdAt: string;
    updatedAt: string;
}

export const roleService = {
    /**
     * Get all custom roles for an organization
     */
    async getRoles(organizationId: string): Promise<CustomRole[]> {
        const q = query(
            collections.customRoles(organizationId)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CustomRole));
    },

    /**
     * Create a new custom role
     */
    async createRole(organizationId: string, name: string, description: string, permissions: StaffPermissions): Promise<CustomRole> {
        const docRef = await addDoc(collections.customRoles(organizationId), {
            organizationId,
            name,
            description,
            permissions,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        const newRole = await getDocument<CustomRole>(docRef);
        return newRole!;
    },

    /**
     * Update a custom role
     */
    /**
     * Update a custom role
     */
    async updateRole(organizationId: string, roleId: string, updates: Partial<CustomRole>): Promise<void> {
        await updateDoc(docs.customRole(organizationId, roleId), {
            ...updates,
            updatedAt: serverTimestamp()
        });
    },

    /**
     * Delete a custom role
     */
    async deleteRole(organizationId: string, roleId: string): Promise<void> {
        await deleteDoc(docs.customRole(organizationId, roleId));
    }
};
