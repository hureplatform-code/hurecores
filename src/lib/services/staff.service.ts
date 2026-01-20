// Staff Service - Firebase/Firestore Implementation
import {
  collections,
  docs,
  getDocument,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  addDoc,
  serverTimestamp,
  addAuditLog
} from '../firestore';
import { auth } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { emailService } from './email.service';
import { leaveService } from './leave.service';
import { leaveEntitlementService } from './leave-entitlement.service';
import type {
  Profile,
  CreateStaffInput,
  SystemRole,
  EmploymentType,
  PayMethod,
  StaffStatus,
  StaffPermissions,
  DEFAULT_PERMISSIONS,
  PLAN_LIMITS
} from '../../types';
import { organizationService } from './organization.service';

// =====================================================
// STAFF SERVICE
// =====================================================

export const staffService = {
  /**
   * Get all staff in an organization
   */
  async getAll(organizationId: string): Promise<Profile[]> {
    // Query without orderBy to avoid composite index requirement
    const q = query(
      collections.users(),
      where('organizationId', '==', organizationId)
    );
    const snapshot = await getDocs(q);

    const staff = await Promise.all(
      snapshot.docs.map(async doc => {
        const data = doc.data();
        const profile: Profile = { id: doc.id, ...data } as Profile;

        // Normalize license data: Map flat fields to nested object if needed
        if (!profile.license && (data.licenseType || data.licenseNumber)) {
          profile.license = {
            type: data.licenseType || '',
            number: data.licenseNumber || '',
            authority: data.licenseAuthority || '',
            expiryDate: data.licenseExpiry || '',
            verificationStatus: data.vettingStatus === 'Verified' ? 'Verified' : 'Pending'
          };
        }

        // Fetch location name if locationId exists
        if (data.locationId && organizationId) {
          const location = await organizationService.getLocation(organizationId, data.locationId);
          if (location) {
            (profile as any).location = location;
          }
        }

        return profile;
      })
    );

    // Sort in-memory by fullName instead of using Firestore orderBy
    return staff.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
  },

  /**
   * Get staff by ID
   */
  async getById(userId: string): Promise<Profile | null> {
    return getDocument<Profile>(docs.user(userId));
  },

  /**
   * Get current user's profile
   */
  async getCurrentProfile(): Promise<Profile | null> {
    const user = auth.currentUser;
    if (!user) return null;
    return this.getById(user.uid);
  },

  /**
   * Check admin seat availability
   */
  async checkAdminSeatAvailability(organizationId: string): Promise<{ available: boolean; used: number; max: number }> {
    const stats = await organizationService.getStats(organizationId);
    if (!stats) {
      return { available: false, used: 0, max: 0 };
    }

    return {
      available: stats.adminsCount < stats.maxAdmins,
      used: stats.adminsCount,
      max: stats.maxAdmins
    };
  },

  /**
   * Create a new staff invitation (stores in staffInvitations collection, not users)
   */
  async createStaffInvitation(input: CreateStaffInput, organizationId: string): Promise<{ success: boolean; error?: string; inviteId?: string }> {
    try {
      // Validate admin seat if assigning ADMIN role
      if (input.systemRole === 'ADMIN') {
        const seatCheck = await this.checkAdminSeatAvailability(organizationId);
        if (!seatCheck.available) {
          return {
            success: false,
            error: `Admin limit reached for your plan (${seatCheck.used}/${seatCheck.max}). Upgrade to add more admin seats.`
          };
        }

        // Validate permissions are provided for ADMIN
        if (!input.permissions || Object.values(input.permissions).every(v => !v)) {
          return {
            success: false,
            error: 'At least one permission must be selected for Admin role.'
          };
        }
      }

      // Check staff limit
      const stats = await organizationService.getStats(organizationId);
      if (stats && stats.staffCount >= stats.maxStaff) {
        return {
          success: false,
          error: `Staff limit reached for your plan (${stats.staffCount}/${stats.maxStaff}). Upgrade to add more staff.`
        };
      }

      // Create invitation in staffInvitations collection (admin has write access here)
      const inviteDoc = await addDoc(collections.staffInvitations(), {
        email: input.email,
        fullName: `${input.firstName} ${input.lastName}`,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone || null,
        organizationId,
        locationId: input.locationId || null,
        systemRole: input.systemRole,
        jobTitle: input.jobTitle || null,
        department: input.department || null,
        employmentType: input.employmentType,
        monthlySalaryCents: input.monthlySalaryCents || 0,
        dailyRateCents: input.dailyRateCents || 0,
        shiftRateCents: input.shiftRateCents || 0,
        hourlyRateCents: input.hourlyRateCents || 0,
        payMethod: input.payMethod || 'Fixed',
        hireDate: input.hireDate || null,
        permissions: input.systemRole === 'ADMIN' ? input.permissions : null,
        // Professional License
        licenseType: input.licenseType || null,
        licenseNumber: input.licenseNumber || null,
        licenseAuthority: input.licenseAuthority || null,
        licenseExpiry: input.licenseExpiry || null,
        licenseDocumentUrl: input.licenseDocumentUrl || null,
        status: 'pending', // pending, accepted, expired
        invitedBy: auth.currentUser?.uid || null,
        invitedByEmail: auth.currentUser?.email || null,
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      });

      const inviteId = inviteDoc.id;

      // Get organization name for email
      const org = await organizationService.getById(organizationId);
      const orgName = org?.name || 'Your Organization';

      // Send invitation email with invite token
      const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
      const inviteLink = `${baseUrl}/#/accept-invite?token=${inviteId}`;

      try {
        await emailService.sendStaffInvitation(
          input.email,
          `${input.firstName} ${input.lastName}`,
          orgName,
          inviteLink
        );
      } catch (emailError) {
        console.error('Failed to send invitation email:', emailError);
        // Continue - invitation record is created
      }

      // Add audit log
      await addAuditLog(
        'Staff',
        `Invited ${input.firstName} ${input.lastName} as ${input.systemRole}`,
        auth.currentUser?.uid,
        auth.currentUser?.email || undefined,
        organizationId,
        { inviteId, email: input.email, role: input.systemRole }
      );

      return { success: true, inviteId };
    } catch (error: any) {
      console.error('Create staff invitation error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create staff invitation'
      };
    }
  },

  /**
   * Get a staff invitation by ID
   */
  async getInvitation(inviteId: string): Promise<any | null> {
    return getDocument(docs.staffInvitation(inviteId));
  },

  /**
   * Accept an invitation - called when invited user signs up
   * This creates the actual user profile and marks invitation as accepted
   */
  async acceptInvitation(inviteId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const invitation = await this.getInvitation(inviteId);

      if (!invitation) {
        return { success: false, error: 'Invitation not found' };
      }

      if (invitation.status === 'accepted') {
        return { success: false, error: 'Invitation has already been accepted' };
      }

      if (invitation.status === 'expired' || new Date(invitation.expiresAt) < new Date()) {
        return { success: false, error: 'Invitation has expired' };
      }

      // Create the actual user profile
      await setDoc(docs.user(userId), {
        id: userId,
        email: invitation.email,
        fullName: invitation.fullName,
        firstName: invitation.firstName,
        lastName: invitation.lastName,
        phone: invitation.phone,
        organizationId: invitation.organizationId,
        locationId: invitation.locationId,
        systemRole: invitation.systemRole,
        jobTitle: invitation.jobTitle,
        department: invitation.department,
        employmentType: invitation.employmentType,
        staffStatus: 'Active',
        monthlySalaryCents: invitation.monthlySalaryCents,
        dailyRateCents: invitation.dailyRateCents,
        shiftRateCents: invitation.shiftRateCents,
        hourlyRateCents: invitation.hourlyRateCents,
        payMethod: invitation.payMethod,
        hireDate: invitation.hireDate,
        isSuperAdmin: false,
        permissions: invitation.permissions,
        // Professional License (if provided)
        license: invitation.licenseType ? {
          type: invitation.licenseType,
          number: invitation.licenseNumber || '',
          authority: invitation.licenseAuthority || '',
          expiryDate: invitation.licenseExpiry || '',
          issuedDate: '',
          verificationStatus: 'Pending',
          documentUrl: invitation.licenseDocumentUrl || ''
        } : null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Mark invitation as accepted
      await updateDoc(docs.staffInvitation(inviteId), {
        status: 'accepted',
        acceptedAt: serverTimestamp(),
        acceptedByUserId: userId
      });

      // Add audit log
      await addAuditLog(
        'Staff',
        `${invitation.fullName} accepted invitation and joined as ${invitation.systemRole}`,
        userId,
        invitation.email,
        invitation.organizationId,
        { inviteId }
      );

      // Initialize leave entitlements for the new staff member
      try {
        await leaveEntitlementService.initializeStaffEntitlements(invitation.organizationId, userId);
      } catch (leaveError) {
        console.error('Failed to initialize leave entitlements:', leaveError);
        // Don't fail the whole process, just log it. Admin can fix later.
      }

      // Notify organization admins about new staff member
      try {
        // Get all admins and owner for this organization
        const admins = await this.getAll(invitation.organizationId);
        const adminIds = admins
          .filter(u => u.systemRole === 'OWNER' || u.systemRole === 'ADMIN')
          .map(u => u.id);

        // Create notifications for each admin
        for (const adminId of adminIds) {
          await addDoc(collections.notifications(invitation.organizationId), {
            userId: adminId,
            organizationId: invitation.organizationId,
            type: 'staff_joined',
            title: '👋 New Staff Member Joined',
            message: `${invitation.fullName} has accepted their invitation and joined as ${invitation.systemRole}.`,
            link: '/#/employer/staff',
            read: false,
            createdAt: serverTimestamp()
          });
        }
      } catch (notifError) {
        console.error('Failed to send notifications:', notifError);
        // Don't fail the acceptance if notifications fail
      }

      return { success: true };
    } catch (error: any) {
      console.error('Accept invitation error:', error);
      return {
        success: false,
        error: error.message || 'Failed to accept invitation'
      };
    }
  },

  /**
   * Get all pending invitations for an organization
   */
  async getPendingInvitations(organizationId: string): Promise<any[]> {
    const q = query(
      collections.staffInvitations(),
      where('organizationId', '==', organizationId),
      where('status', '==', 'pending')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  /**
   * Cancel/revoke an invitation
   */
  async cancelInvitation(inviteId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await updateDoc(docs.staffInvitation(inviteId), {
        status: 'cancelled',
        cancelledAt: serverTimestamp()
      });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Resend invitation email
   */
  async resendInvitation(inviteId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const invitation = await this.getInvitation(inviteId);
      if (!invitation || invitation.status !== 'pending') {
        return { success: false, error: 'Invitation not found or already used' };
      }

      // Update expiration
      const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await updateDoc(docs.staffInvitation(inviteId), {
        expiresAt: newExpiry,
        updatedAt: serverTimestamp()
      });

      // Get org name and resend
      const org = await organizationService.getById(invitation.organizationId);
      const orgName = org?.name || 'Your Organization';
      const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
      const inviteLink = `${baseUrl}/#/accept-invite?token=${inviteId}`;
      console.log('Sending invitation email to:', invitation.email);
      console.log('Invite link:', inviteLink);

      const emailSent = await emailService.sendStaffInvitation(
        invitation.email,
        invitation.fullName,
        orgName,
        inviteLink
      );

      if (!emailSent) {
        console.error('Email service returned false - email may not have been sent');
        return { success: false, error: 'Failed to send email. Please check email configuration.' };
      }

      console.log('Email sent successfully to:', invitation.email);
      return { success: true };
    } catch (error: any) {
      console.error('Resend invitation error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Update a staff member's profile
   */
  async update(userId: string, updates: Partial<Profile>, organizationId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const currentProfile = await this.getById(userId);
      if (!currentProfile) {
        return { success: false, error: 'Staff member not found' };
      }

      // If changing to ADMIN, validate seat availability
      if (updates.systemRole === 'ADMIN' && currentProfile.systemRole !== 'ADMIN') {
        const orgId = organizationId || currentProfile.organizationId;
        if (orgId) {
          const seatCheck = await this.checkAdminSeatAvailability(orgId);
          if (!seatCheck.available) {
            return {
              success: false,
              error: `Admin limit reached for your plan (${seatCheck.used}/${seatCheck.max}). Upgrade to add more admin seats.`
            };
          }
        }
      }

      // If downgrading from ADMIN to EMPLOYEE, remove permissions
      if (updates.systemRole === 'EMPLOYEE' && currentProfile.systemRole === 'ADMIN') {
        updates.permissions = null as any;
      }

      // If setting as ADMIN without permissions, reject
      if (updates.systemRole === 'ADMIN') {
        if (!updates.permissions || Object.values(updates.permissions).every(v => !v)) {
          if (!currentProfile.permissions || Object.values(currentProfile.permissions).every(v => !v)) {
            return {
              success: false,
              error: 'At least one permission must be selected for Admin role.'
            };
          }
        }
      }

      // Filter out undefined values to avoid Firestore errors
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, value]) => value !== undefined)
      );

      await updateDoc(docs.user(userId), {
        ...cleanUpdates,
        updatedAt: serverTimestamp()
      });

      return { success: true };
    } catch (error: any) {
      console.error('Update staff error:', error);
      return {
        success: false,
        error: error.message || 'Failed to update staff member'
      };
    }
  },

  /**
   * Deactivate a staff member (soft delete)
   */
  async deactivate(userId: string): Promise<{ success: boolean; error?: string }> {
    return this.update(userId, { staffStatus: 'Inactive' as StaffStatus });
  },

  /**
   * Reactivate a staff member
   */
  async reactivate(userId: string): Promise<{ success: boolean; error?: string }> {
    return this.update(userId, { staffStatus: 'Active' as StaffStatus });
  },

  /**
   * Archive a staff member
   */
  async archive(userId: string): Promise<{ success: boolean; error?: string }> {
    return this.update(userId, { staffStatus: 'Archived' as StaffStatus });
  },

  /**
   * Get staff count for an organization
   */
  async getCount(organizationId: string): Promise<number> {
    const q = query(
      collections.users(),
      where('organizationId', '==', organizationId)
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  },

  /**
   * Get active staff count
   */
  async getActiveCount(organizationId: string): Promise<number> {
    const q = query(
      collections.users(),
      where('organizationId', '==', organizationId),
      where('staffStatus', '==', 'Active')
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  },

  /**
   * Search staff by name or email
   */
  async search(organizationId: string, searchQuery: string): Promise<Profile[]> {
    const allStaff = await this.getAll(organizationId);
    const query = searchQuery.toLowerCase();

    return allStaff.filter(staff =>
      staff.fullName.toLowerCase().includes(query) ||
      staff.email.toLowerCase().includes(query)
    );
  },

  /**
   * Get staff by location
   */
  async getByLocation(organizationId: string, locationId: string): Promise<Profile[]> {
    // Query without orderBy to avoid composite index requirement
    const q = query(
      collections.users(),
      where('organizationId', '==', organizationId),
      where('locationId', '==', locationId)
    );
    const snapshot = await getDocs(q);
    const staff = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Profile));
    // Sort in-memory
    return staff.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
  },

  /**
   * Get staff by system role
   */
  async getByRole(organizationId: string, role: SystemRole): Promise<Profile[]> {
    // Query without orderBy to avoid composite index requirement
    const q = query(
      collections.users(),
      where('organizationId', '==', organizationId),
      where('systemRole', '==', role)
    );
    const snapshot = await getDocs(q);
    const staff = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Profile));
    // Sort in-memory
    return staff.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
  },

  /**
   * Get all admins
   */
  async getAdmins(organizationId: string): Promise<Profile[]> {
    const allStaff = await this.getAll(organizationId);
    return allStaff.filter(staff =>
      staff.systemRole === 'OWNER' || staff.systemRole === 'ADMIN'
    );
  },

  /**
   * Update staff permissions
   */
  async updatePermissions(userId: string, permissions: StaffPermissions): Promise<{ success: boolean; error?: string }> {
    const profile = await this.getById(userId);
    if (!profile) {
      return { success: false, error: 'Staff member not found' };
    }

    // Allow permissions for any role
    // Removed restriction that Owners are ignored - now they can have specific permission sets if desired (for UI control)

    // Removed restriction that only Admins can have permissions
    // Removed restriction that at least one permission must be selected (allowing clearing of permissions)

    await updateDoc(docs.user(userId), {
      permissions,
      updatedAt: serverTimestamp()
    });

    return { success: true };
  }
};
