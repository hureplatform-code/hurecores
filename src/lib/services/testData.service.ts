import { db } from '../firebase';
import { collections, docs } from '../firestore';
import { setDoc, doc, Timestamp, addDoc } from 'firebase/firestore';

export const testDataService = {
    /**
     * Generate comprehensive test data for the platform
     */
    async generateTestData() {
        console.log('Starting test data generation...');

        try {
            // 1. Create Verified Organization (Active)
            const org1Id = 'org_test_verified';
            await setDoc(docs.organization(org1Id), {
                id: org1Id,
                name: 'City General Hospital',
                email: 'admin@citygeneral.com',
                phone: '+254711000001',
                city: 'Nairobi',
                address: '123 Medical Way',
                orgStatus: 'Active',
                accountStatus: 'Active',
                plan: 'Enterprise',
                verificationStatus: 'Verified',
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });

            // 2. Create Pending Organization
            const org2Id = 'org_test_pending';
            await setDoc(docs.organization(org2Id), {
                id: org2Id,
                name: 'Sunshine Pediatric Clinic',
                email: 'contact@sunshinepediatrics.com',
                phone: '+254711000002',
                city: 'Mombasa',
                address: '45 Coastal Road',
                orgStatus: 'Pending',
                accountStatus: 'Pending',
                plan: 'Professional',
                verificationStatus: 'Pending',
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });

            // 3. Create Suspended Organization
            const org3Id = 'org_test_suspended';
            await setDoc(docs.organization(org3Id), {
                id: org3Id,
                name: 'Downtown Dental',
                email: 'info@downtowndental.com',
                phone: '+254711000003',
                city: 'Kisumu',
                address: '78 Lake View',
                orgStatus: 'Suspended',
                accountStatus: 'Suspended',
                plan: 'Essential',
                verificationStatus: 'Verified',
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });

            // 4. Create Users for Org 1
            // Owner
            await setDoc(docs.user('user_org1_owner'), {
                id: 'user_org1_owner',
                firstName: 'James',
                lastName: 'Mwangi',
                fullName: 'James Mwangi',
                email: 'james@citygeneral.com',
                organizationId: org1Id,
                systemRole: 'OWNER',
                staffStatus: 'Active',
                isSuperAdmin: false,
                createdAt: Timestamp.now()
            });

            // Admin
            await setDoc(docs.user('user_org1_admin'), {
                id: 'user_org1_admin',
                firstName: 'Sarah',
                lastName: 'Kamau',
                fullName: 'Sarah Kamau',
                email: 'sarah@citygeneral.com',
                organizationId: org1Id,
                systemRole: 'ADMIN',
                staffStatus: 'Active',
                isSuperAdmin: false,
                permissions: { canManageStaff: true, canManageSchedule: true },
                createdAt: Timestamp.now()
            });

            // Employee
            await setDoc(docs.user('user_org1_emp1'), {
                id: 'user_org1_emp1',
                firstName: 'David',
                lastName: 'Otieno',
                fullName: 'David Otieno',
                email: 'david@citygeneral.com',
                organizationId: org1Id,
                systemRole: 'EMPLOYEE',
                staffStatus: 'Active',
                jobTitle: 'Nurse',
                employmentType: 'Full-Time',
                isSuperAdmin: false,
                createdAt: Timestamp.now()
            });

            // 5. Create Staff Records (mirroring users)
            // This is important because the system might look up staff records separately in some views
            await setDoc(docs.staff(org1Id, 'user_org1_owner'), {
                id: 'user_org1_owner',
                userId: 'user_org1_owner',
                firstName: 'James',
                lastName: 'Mwangi',
                email: 'james@citygeneral.com',
                systemRole: 'OWNER',
                status: 'Active',
                joinedAt: Timestamp.now()
            });

            // 6. Create Audit Logs
            await addDoc(collections.auditLogs(), {
                action: 'Organization Verified',
                category: 'Organization',
                performedBy: 'System',
                performedByEmail: 'system@hurecore.com',
                organizationId: org1Id,
                details: 'Automated verification test',
                createdAt: Timestamp.now()
            });

            await addDoc(collections.auditLogs(), {
                action: 'User Login',
                category: 'Auth',
                performedBy: 'user_org1_owner',
                performedByEmail: 'james@citygeneral.com',
                organizationId: org1Id,
                createdAt: Timestamp.now()
            });

            console.log('Test data generation complete!');
            return { success: true, message: 'Test data generated successfully' };
        } catch (error: any) {
            console.error('Error generating test data:', error);
            return { success: false, error: error.message };
        }
    }
};
