// Migration Helper - Fix missing organizationId in existing staff profiles
// Run this ONCE to fix existing staff profiles that are missing organizationId

import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';

interface StaffProfile {
    id: string;
    email: string;
    fullName: string;
    organizationId?: string;
}

/**
 * Fix missing organizationId for existing staff
 * This should be run by an admin for their organization
 */
export async function fixMissingOrganizationIds(organizationId: string): Promise<{
    fixed: number;
    errors: string[];
    staffFixed: string[];
}> {
    const fixed: string[] = [];
    const errors: string[] = [];

    try {
        // Get all users in Firestore
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);

        for (const docSnap of snapshot.docs) {
            const data = docSnap.data() as Partial<StaffProfile>;
            const staffId = docSnap.id;

            // Check if this staff belongs to the org but is missing organizationId
            // We can verify this by checking staffInvitations or asking admin to provide list
            if (!data.organizationId) {
                console.log(`Found staff without organizationId: ${data.fullName} (${data.email})`);

                // Check if there's a linked invitation for this email
                const invitationsRef = collection(db, 'staffInvitations');
                const inviteQuery = query(
                    invitations Ref,
                    where('email', '==', data.email),
                    where('organizationId', '==', organizationId),
                    where('status', '==', 'accepted')
                );

                const inviteSnapshot = await getDocs(inviteQuery);

                if (!inviteSnapshot.empty) {
                    // Found invitation - this staff belongs to this org
                    try {
                        const userDocRef = doc(db, 'users', staffId);
                        await updateDoc(userDocRef, {
                            organizationId: organizationId
                        });

                        fixed.push(`${data.fullName} (${data.email})`);
                        console.log(`✅ Fixed: ${data.fullName}`);
                    } catch (error: any) {
                        errors.push(`Failed to fix ${data.fullName}: ${error.message}`);
                        console.error(`❌ Error fixing ${data.fullName}:`, error);
                    }
                }
            }
        }

        return {
            fixed: fixed.length,
            errors,
            staffFixed: fixed
        };
    } catch (error: any) {
        console.error('Migration error:', error);
        errors.push(`Migration failed: ${error.message}`);
        return {
            fixed: fixed.length,
            errors,
            staffFixed: fixed
        };
    }
}

/**
 * Manual fix for specific staff member
 * Use this if you know the staff belongs to your org
 */
export async function fixSingleStaffOrganizationId(staffId: string, organizationId: string): Promise<boolean> {
    try {
        const userDocRef = doc(db, 'users', staffId);
        await updateDoc(userDocRef, {
            organizationId: organizationId
        });
        console.log(`✅ Fixed organizationId for staff: ${staffId}`);
        return true;
    } catch (error) {
        console.error(`❌ Error fixing staff ${staffId}:`, error);
        return false;
    }
}
