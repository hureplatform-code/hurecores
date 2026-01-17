// Location Service - Wrapper for organization location methods
// This service provides a cleaner interface for location-specific operations
import { organizationService } from './organization.service';
import type { Location } from '../../types';

// =====================================================
// LOCATION SERVICE
// =====================================================

export const locationService = {
    /**
     * Get all locations for an organization
     */
    async getByOrganization(organizationId: string): Promise<Location[]> {
        return organizationService.getLocations(organizationId);
    },

    /**
     * Get single location by ID
     */
    async getById(organizationId: string, locationId: string): Promise<Location | null> {
        return organizationService.getLocation(organizationId, locationId);
    },

    /**
     * Create a new location
     */
    async create(organizationId: string, input: {
        name: string;
        city?: string;
        address?: string;
        phone?: string;
        isPrimary?: boolean;
    }): Promise<Location | null> {
        return organizationService.createLocation(organizationId, input);
    },

    /**
     * Update a location
     */
    async update(organizationId: string, locationId: string, updates: Partial<Location>): Promise<Location | null> {
        return organizationService.updateLocation(organizationId, locationId, updates);
    },

    /**
     * Delete a location
     */
    async delete(organizationId: string, locationId: string): Promise<void> {
        return organizationService.deleteLocation(organizationId, locationId);
    },

    /**
     * Submit facility verification
     */
    async submitVerification(organizationId: string, locationId: string, input: {
        licenseNumber: string;
        licensingBody: string;
        expiryDate: string;
        documentUrl?: string;
    }) {
        return organizationService.submitFacilityVerification(organizationId, locationId, input);
    }
};
