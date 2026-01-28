// Organization Service - Firebase/Firestore Implementation
import {
  collections,
  docs,
  getDocument,
  queryCollection,
  addAuditLog,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  addDoc,
  serverTimestamp
} from '../firestore';
import type {
  Organization,
  Location,
  Subscription,
  SubscriptionPlan,
  VerificationStatus,
  AccountStatus,
  VerificationRequest,
  Profile,
  PLAN_LIMITS
} from '../../types';

// Plan limits
const planLimits = {
  Essential: { maxLocations: 1, maxStaff: 10, maxAdmins: 2, amountCents: 800000 },
  Professional: { maxLocations: 2, maxStaff: 30, maxAdmins: 5, amountCents: 1500000 },
  Enterprise: { maxLocations: 5, maxStaff: 75, maxAdmins: 10, amountCents: 2500000 },
};

// =====================================================
// ORGANIZATION SERVICE
// =====================================================

export const organizationService = {
  /**
   * Get organization by ID
   */
  async getById(id: string): Promise<Organization | null> {
    return getDocument<Organization>(docs.organization(id));
  },

  /**
   * Get organization with locations
   */
  async getWithLocations(id: string) {
    const org = await this.getById(id);
    if (!org) return null;

    const locations = await this.getLocations(id);
    const subscription = await this.getSubscription(id);

    return {
      ...org,
      locations,
      subscription
    };
  },

  /**
   * Get organization stats (for dashboard)
   */
  async getStats(id: string) {
    const org = await this.getById(id);
    if (!org) return null;

    // Count locations
    const locationsSnapshot = await getDocs(collections.locations(id));
    const locationsCount = locationsSnapshot.size;

    // Count all staff
    const usersQuery = query(
      collections.users(),
      where('organizationId', '==', id)
    );
    const usersSnapshot = await getDocs(usersQuery);
    const staffCount = usersSnapshot.size;

    // Count admins (OWNER + ADMIN roles)
    let adminsCount = 0;
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.systemRole === 'OWNER' || data.systemRole === 'ADMIN') {
        if (data.staffStatus === 'Active') {
          adminsCount++;
        }
      }
    });

    return {
      organizationId: id,
      name: org.name,
      plan: org.plan,
      maxLocations: org.maxLocations,
      maxStaff: org.maxStaff,
      maxAdmins: org.maxAdmins,
      locationsCount,
      staffCount,
      adminsCount
    };
  },

  /**
   * Update organization details
   */
  async update(id: string, updates: Partial<Organization>) {
    await updateDoc(docs.organization(id), {
      ...updates,
      updatedAt: serverTimestamp()
    });
    return this.getById(id);
  },

  /**
   * Get all locations for an organization
   */
  async getLocations(organizationId: string): Promise<Location[]> {
    // Query without orderBy to avoid composite index requirement
    const snapshot = await getDocs(collections.locations(organizationId));
    const locations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Location));

    // Sort in-memory: primary locations first, then by name
    return locations.sort((a, b) => {
      // Primary locations come first
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      // Then sort by name
      return (a.name || '').localeCompare(b.name || '');
    });
  },

  /**
   * Get location by ID
   */
  async getLocation(organizationId: string, locationId: string): Promise<Location | null> {
    return getDocument<Location>(docs.location(organizationId, locationId));
  },

  /**
   * Create a new location
   */
  async createLocation(organizationId: string, input: {
    name: string;
    city?: string;
    address?: string;
    phone?: string;
    isPrimary?: boolean;
  }) {
    const docRef = await addDoc(collections.locations(organizationId), {
      ...input,
      organizationId,
      isPrimary: input.isPrimary ?? false,
      status: 'Pending' as VerificationStatus,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return this.getLocation(organizationId, docRef.id);
  },

  /**
   * Update a location
   */
  async updateLocation(organizationId: string, locationId: string, updates: Partial<Location>) {
    await updateDoc(docs.location(organizationId, locationId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
    return this.getLocation(organizationId, locationId);
  },

  /**
   * Delete a location
   */
  async deleteLocation(organizationId: string, locationId: string) {
    await deleteDoc(docs.location(organizationId, locationId));
  },

  /**
   * Submit facility verification
   */
  async submitFacilityVerification(organizationId: string, locationId: string, input: {
    licenseNumber: string;
    licensingBody: string;
    expiryDate: string;
    documentUrl?: string;
  }) {
    // Update location with verification info
    await updateDoc(docs.location(organizationId, locationId), {
      licenseNumber: input.licenseNumber,
      licensingBody: input.licensingBody,
      licenseExpiry: input.expiryDate,
      licenseDocumentUrl: input.documentUrl,
      status: 'Pending' as VerificationStatus,
      updatedAt: serverTimestamp()
    });

    // Create verification request
    const verificationRef = await addDoc(collections.verificationRequests(), {
      type: 'FACILITY',
      organizationId,
      locationId,
      identifier: input.licenseNumber,
      authority: input.licensingBody,
      licenseNumber: input.licenseNumber,
      licensingBody: input.licensingBody,
      expiryDate: input.expiryDate,
      documentUrl: input.documentUrl,
      status: 'Pending' as VerificationStatus,
      submittedAt: new Date().toISOString(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return { id: verificationRef.id };
  },

  /**
   * Submit organization verification
   */
  async submitOrgVerification(organizationId: string, input: {
    businessRegNumber: string;
    kraPin: string;
    documentUrl?: string;
  }) {
    // Update organization with verification info
    await updateDoc(docs.organization(organizationId), {
      businessRegistrationNumber: input.businessRegNumber,
      kraPin: input.kraPin,
      businessRegistrationDocUrl: input.documentUrl,
      orgStatus: 'Pending' as VerificationStatus,
      approvalStatus: 'Pending Review', // Sync approvalStatus
      updatedAt: serverTimestamp()
    });

    // Create verification request
    const verificationRef = await addDoc(collections.verificationRequests(), {
      type: 'ORG',
      organizationId,
      identifier: input.kraPin,
      authority: 'Registrar of Companies',
      documentUrl: input.documentUrl,
      status: 'Pending' as VerificationStatus,
      submittedAt: new Date().toISOString(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return { id: verificationRef.id };
  },

  /**
   * Get subscription details
   */
  async getSubscription(organizationId: string): Promise<Subscription | null> {
    const q = query(
      collections.subscriptions(organizationId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Subscription;
  },

  /**
   * Update subscription plan
   */
  async updatePlan(organizationId: string, newPlan: SubscriptionPlan) {
    const limits = planLimits[newPlan];

    // Update organization limits
    await updateDoc(docs.organization(organizationId), {
      plan: newPlan,
      maxLocations: limits.maxLocations,
      maxStaff: limits.maxStaff,
      maxAdmins: limits.maxAdmins,
      updatedAt: serverTimestamp()
    });

    // Get existing subscription and update
    const subscription = await this.getSubscription(organizationId);
    if (subscription) {
      const subRef = docs.organization(organizationId);
      // Update in subscriptions subcollection
      const subQuery = query(collections.subscriptions(organizationId));
      const subSnapshot = await getDocs(subQuery);
      if (!subSnapshot.empty) {
        const subDoc = subSnapshot.docs[0];
        await updateDoc(subDoc.ref, {
          plan: newPlan,
          amountCents: limits.amountCents,
          status: 'Active',
          updatedAt: serverTimestamp()
        });
      }
    }

    return this.getById(organizationId);
  }
};


