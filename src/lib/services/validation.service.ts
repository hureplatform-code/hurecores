// Validation Service - Deduplication and uniqueness checks
import {
  collections,
  getDocs,
  query,
  where
} from '../firestore';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  field?: string;
  message?: string;
  existingOrgId?: string;
  existingOrgName?: string;
}

export const validationService = {
  /**
   * Check if an email is already registered as an owner/employer user in Firestore
   * This checks the users collection to prevent duplicate owner accounts
   */
  async checkEmailExists(email: string): Promise<{ exists: boolean; message?: string }> {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      
      // Query the users collection to check if this email is already used
      const usersQuery = query(
        collections.users(),
        where('email', '==', normalizedEmail)
      );
      const usersSnapshot = await getDocs(usersQuery);
      
      if (!usersSnapshot.empty) {
        // Check if any of the matching users is an owner/employer
        for (const doc of usersSnapshot.docs) {
          const userData = doc.data();
          const systemRole = (userData.systemRole || '').toUpperCase();
          const role = (userData.role || '').toUpperCase();
          
          // Check for owner/employer roles (case-insensitive)
          if (systemRole === 'OWNER' || systemRole === 'EMPLOYER' || role === 'OWNER' || role === 'EMPLOYER') {
            return {
              exists: true,
              message: 'This email is already registered as an employer/owner. Please log in or use a different email.'
            };
          }
        }
        // Email exists but not as owner - still block to prevent conflicts
        return {
          exists: true,
          message: 'This email is already registered. Please log in or use a different email.'
        };
      }
      
      return { exists: false };
    } catch (error: any) {
      console.error('Error checking email:', error);
      return { exists: false }; // Don't block signup on check failure
    }
  },

  /**
   * Check if organization identifiers already exist
   * Checks: email, businessRegNumber, kraPin
   */
  async checkOrganizationDuplicates(data: {
    email?: string;
    businessRegNumber?: string;
    kraPin?: string;
  }): Promise<DuplicateCheckResult> {
    try {
      const orgsSnapshot = await getDocs(collections.organizations());
      
      for (const doc of orgsSnapshot.docs) {
        const org = doc.data();
        const orgId = doc.id;
        const orgName = org.name || 'Unknown Organization';

        // Check organization email
        if (data.email && org.email) {
          const normalizedInput = data.email.toLowerCase().trim();
          const normalizedExisting = org.email.toLowerCase().trim();
          if (normalizedInput === normalizedExisting) {
            return {
              isDuplicate: true,
              field: 'email',
              message: `An organization with this email already exists (${orgName}). If you are part of this organization, please request access from the owner instead of creating a new account.`,
              existingOrgId: orgId,
              existingOrgName: orgName
            };
          }
        }

        // Check business registration number
        if (data.businessRegNumber && org.businessRegNumber) {
          const normalizedInput = data.businessRegNumber.replace(/\s+/g, '').toUpperCase();
          const normalizedExisting = org.businessRegNumber.replace(/\s+/g, '').toUpperCase();
          if (normalizedInput === normalizedExisting) {
            return {
              isDuplicate: true,
              field: 'businessRegNumber',
              message: `An organization with this Business Registration Number already exists (${orgName}). If you are part of this organization, please request access from the owner instead of creating a new account.`,
              existingOrgId: orgId,
              existingOrgName: orgName
            };
          }
        }

        // Check KRA PIN
        if (data.kraPin && org.kraPin) {
          const normalizedInput = data.kraPin.replace(/\s+/g, '').toUpperCase();
          const normalizedExisting = org.kraPin.replace(/\s+/g, '').toUpperCase();
          if (normalizedInput === normalizedExisting) {
            return {
              isDuplicate: true,
              field: 'kraPin',
              message: `An organization with this KRA PIN already exists (${orgName}). If you are part of this organization, please request access from the owner instead of creating a new account.`,
              existingOrgId: orgId,
              existingOrgName: orgName
            };
          }
        }
      }

      return { isDuplicate: false };
    } catch (error) {
      console.error('Error checking organization duplicates:', error);
      return { isDuplicate: false }; // Don't block on check failure
    }
  },

  /**
   * Check if location name or phone already exists within an organization
   */
  async checkLocationDuplicates(
    organizationId: string,
    data: { name?: string; phone?: string },
    excludeLocationId?: string
  ): Promise<DuplicateCheckResult> {
    try {
      const locationsSnapshot = await getDocs(collections.locations(organizationId));

      for (const doc of locationsSnapshot.docs) {
        // Skip the location being edited
        if (excludeLocationId && doc.id === excludeLocationId) continue;

        const loc = doc.data();

        // Check location name (case-insensitive)
        if (data.name && loc.name) {
          const normalizedInput = data.name.toLowerCase().trim();
          const normalizedExisting = loc.name.toLowerCase().trim();
          if (normalizedInput === normalizedExisting) {
            return {
              isDuplicate: true,
              field: 'name',
              message: `A location with the name "${loc.name}" already exists in your organization.`
            };
          }
        }

        // Check phone number (normalize and compare)
        if (data.phone && loc.phone) {
          const normalizedInput = data.phone.replace(/\s+/g, '').replace(/-/g, '');
          const normalizedExisting = loc.phone.replace(/\s+/g, '').replace(/-/g, '');
          if (normalizedInput === normalizedExisting) {
            return {
              isDuplicate: true,
              field: 'phone',
              message: `A location with this phone number already exists (${loc.name}).`
            };
          }
        }
      }

      return { isDuplicate: false };
    } catch (error) {
      console.error('Error checking location duplicates:', error);
      return { isDuplicate: false }; // Don't block on check failure
    }
  },

  /**
   * Check if staff email already exists in the organization
   */
  async checkStaffEmailInOrg(
    organizationId: string,
    email: string,
    excludeStaffId?: string
  ): Promise<{ exists: boolean; message?: string }> {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      
      // Query users collection for this organization
      const usersQuery = query(
        collections.users(),
        where('organizationId', '==', organizationId)
      );
      const usersSnapshot = await getDocs(usersQuery);

      for (const doc of usersSnapshot.docs) {
        if (excludeStaffId && doc.id === excludeStaffId) continue;
        
        const user = doc.data();
        if (user.email && user.email.toLowerCase().trim() === normalizedEmail) {
          return {
            exists: true,
            message: 'A staff member with this email already exists in your organization.'
          };
        }
      }

      return { exists: false };
    } catch (error) {
      console.error('Error checking staff email:', error);
      return { exists: false };
    }
  }
};
