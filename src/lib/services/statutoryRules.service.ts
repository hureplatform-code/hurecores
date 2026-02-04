// =====================================================
// STATUTORY RULES SERVICE
// Handles Kenya's statutory payroll rules (PAYE, NSSF, NHDF, SHA)
// Super Admin only for updates, all users can read
// =====================================================

import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import type { StatutoryRules, PAYEBand, DeductionPreview } from '../../types';

const statutoryRulesRef = collection(db, 'statutoryRules');

// =====================================================
// DEFAULT KENYA STATUTORY RULES (2024-2025)
// =====================================================

const DEFAULT_KENYA_RULES: Omit<StatutoryRules, 'id' | 'updatedAt'> = {
    country: 'Kenya',
    effectiveFrom: '2024-01-01',
    version: 1,
    isActive: true,

    // PAYE Bands (Annual thresholds)
    payeBands: [
        { threshold: 288000, rate: 0.10, label: 'First 288,000' },
        { threshold: 100000, rate: 0.25, label: 'Next 100,000' },
        { threshold: 5612000, rate: 0.30, label: 'Next 5,612,000' },
        { threshold: 3600000, rate: 0.325, label: 'Next 3,600,000' },
        { threshold: Infinity, rate: 0.35, label: 'Above 9,600,000' }
    ],

    // NSSF rates
    nssfEmployeeRate: 0.06,
    nssfEmployerRate: 0.06,
    nssfTier1Limit: 6000,
    nssfTier2Limit: 18000,

    // Personal Relief
    personalRelief: 2400,

    // NHDF rate
    nhdfRate: 0.015,

    // SHA rate
    shaRate: 0.0275,

    updatedBy: 'system',
    updatedByEmail: 'system@hurecore.com',
    notes: 'Initial Kenya statutory rules for 2024-2025'
};

export const statutoryRulesService = {

    /**
     * Get current active statutory rules for Kenya
     */
    async getCurrentRules(): Promise<StatutoryRules | null> {
        try {
            // Simplified query to avoid composite index requirements
            // We fetch all rules for the country and filter in memory since dataset is small
            const q = query(
                statutoryRulesRef,
                where('country', '==', 'Kenya')
            );

            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                // Create default rules if none exist
                console.log('No statutory rules found, creating defaults...');
                return await this.createDefaultRules();
            }

            // Client-side filtering and sorting
            const rules = snapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    effectiveFrom: doc.data().effectiveFrom,
                    effectiveUntil: doc.data().effectiveUntil || undefined,
                    updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt
                } as StatutoryRules))
                .filter(rule => rule.isActive)
                .sort((a, b) => b.version - a.version);

            if (rules.length === 0) {
                // Rules exist but none are active? This shouldn't happen normally if defaults are created.
                // We might want to return the latest inactive one or null.
                // For now, let's assume we want to create defaults if absolutely nothing active is found
                // BUT if we have history, we might not want to overwrite it blindly.
                // Let's return null here, causing the UI to show "No Rules" 
                // and the user can click "Initialize" which creates a NEW active default.
                return null;
            }

            return rules[0];
        } catch (error) {
            console.error('Error getting current rules:', error);
            return null;
        }
    },

    /**
     * Get all rules versions with history
     */
    async getRulesHistory(): Promise<StatutoryRules[]> {
        try {
            // Simplified query, client-side sort
            const q = query(
                statutoryRulesRef,
                where('country', '==', 'Kenya')
            );

            const snapshot = await getDocs(q);
            return snapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt
                } as StatutoryRules))
                .sort((a, b) => b.version - a.version);
        } catch (error) {
            console.error('Error getting rules history:', error);
            return [];
        }
    },

    /**
     * Create default statutory rules
     */
    async createDefaultRules(): Promise<StatutoryRules> {
        try {
            const newRules = {
                ...DEFAULT_KENYA_RULES,
                updatedAt: serverTimestamp()
            };

            const docRef = await addDoc(statutoryRulesRef, newRules);
            const snapshot = await getDoc(docRef);

            return {
                id: docRef.id,
                ...snapshot.data(),
                updatedAt: snapshot.data()?.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
            } as StatutoryRules;
        } catch (error) {
            console.error('Error creating default rules:', error);
            throw error;
        }
    },

    /**
     * Update statutory rules (creates new version, archives previous)
     */
    async updateRules(
        updatedBy: string,
        updatedByEmail: string,
        updates: {
            payeBands?: PAYEBand[];
            nssfEmployeeRate?: number;
            nssfEmployerRate?: number;
            nssfCap?: number;
            nssfTier1Limit?: number;
            nssfTier2Limit?: number;
            nhdfRate?: number;
            shaRate?: number;
            personalRelief?: number;
            effectiveFrom?: string;
            notes?: string;
        }
    ): Promise<StatutoryRules> {
        try {
            // Get current active rules
            const currentRules = await this.getCurrentRules();

            if (!currentRules) {
                throw new Error('No current rules found');
            }

            // Archive current rules
            await updateDoc(doc(db, 'statutoryRules', currentRules.id), {
                isActive: false,
                effectiveUntil: new Date().toISOString()
            });

            // Create new version
            const newRules = {
                country: 'Kenya' as const,
                effectiveFrom: updates.effectiveFrom || new Date().toISOString(),
                version: currentRules.version + 1,
                isActive: true,
                payeBands: updates.payeBands || currentRules.payeBands,
                nssfEmployeeRate: updates.nssfEmployeeRate ?? currentRules.nssfEmployeeRate,
                nssfEmployerRate: updates.nssfEmployerRate ?? currentRules.nssfEmployerRate,
                nssfCap: updates.nssfCap,
                nssfTier1Limit: updates.nssfTier1Limit ?? currentRules.nssfTier1Limit ?? 6000,
                nssfTier2Limit: updates.nssfTier2Limit ?? currentRules.nssfTier2Limit ?? 18000,
                nhdfRate: updates.nhdfRate ?? currentRules.nhdfRate,
                shaRate: updates.shaRate ?? currentRules.shaRate,
                personalRelief: updates.personalRelief ?? currentRules.personalRelief ?? 2400,
                updatedBy,
                updatedByEmail,
                updatedAt: serverTimestamp(),
                notes: updates.notes
            };

            const docRef = await addDoc(statutoryRulesRef, newRules);
            const snapshot = await getDoc(docRef);

            return {
                id: docRef.id,
                ...snapshot.data(),
                updatedAt: snapshot.data()?.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
            } as StatutoryRules;
        } catch (error) {
            console.error('Error updating rules:', error);
            throw error;
        }
    },

    /**
     * Calculate PAYE based on annual taxable income
     */
    calculatePAYE(annualIncome: number, payeBands: PAYEBand[]): number {
        let paye = 0;
        let remaining = annualIncome;

        for (const band of payeBands) {
            if (remaining <= 0) break;

            const taxableInThisBand = Math.min(remaining, band.threshold);
            paye += taxableInThisBand * band.rate;
            remaining -= band.threshold;
        }

        return Math.max(0, paye); // Ensure non-negative
    },

    /**
     * Calculate all statutory deductions preview
     */
    async calculateDeductions(
        monthlySalary: number,
        monthlyAllowances: number = 0
    ): Promise<DeductionPreview> {
        try {
            const rules = await this.getCurrentRules();

            if (!rules) {
                throw new Error('No statutory rules found');
            }

            // Calculate components
            const grossPay = monthlySalary + monthlyAllowances;
            const taxablePay = grossPay; // In Kenya, all cash allowances are taxable

            // PAYE (annualize then divide by 12)
            const annualTaxablePay = taxablePay * 12;
            const annualPAYE = this.calculatePAYE(annualTaxablePay, rules.payeBands);
            const monthlyPAYE = annualPAYE / 12;

            // NSSF
            const nssfEmployee = taxablePay * rules.nssfEmployeeRate;
            const nssfEmployer = taxablePay * rules.nssfEmployerRate;

            // NHDF
            const nhdf = taxablePay * rules.nhdfRate;

            // SHA
            const sha = taxablePay * rules.shaRate;

            // Totals
            const totalEmployeeDeductions = monthlyPAYE + nssfEmployee + nhdf + sha;
            const netPay = grossPay - totalEmployeeDeductions;
            const employerCost = grossPay + nssfEmployer;

            return {
                grossPay,
                taxablePay,
                paye: monthlyPAYE,
                nssfEmployee,
                nssfEmployer,
                nhdf,
                sha,
                totalEmployeeDeductions,
                netPay,
                employerCost
            };
        } catch (error) {
            console.error('Error calculating deductions:', error);
            throw error;
        }
    },

    /**
     * Revert to default rules (Super Admin only)
     */
    async revertToDefaults(updatedBy: string, updatedByEmail: string): Promise<StatutoryRules> {
        try {
            // Archive current rules
            const currentRules = await this.getCurrentRules();

            if (currentRules) {
                await updateDoc(doc(db, 'statutoryRules', currentRules.id), {
                    isActive: false,
                    effectiveUntil: new Date().toISOString()
                });
            }

            // Create new version with defaults
            const newRules = {
                ...DEFAULT_KENYA_RULES,
                version: currentRules ? currentRules.version + 1 : 1,
                effectiveFrom: new Date().toISOString(),
                updatedBy,
                updatedByEmail,
                updatedAt: serverTimestamp(),
                notes: 'Reverted to default statutory rules'
            };

            const docRef = await addDoc(statutoryRulesRef, newRules);
            const snapshot = await getDoc(docRef);

            return {
                id: docRef.id,
                ...snapshot.data(),
                updatedAt: snapshot.data()?.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
            } as StatutoryRules;
        } catch (error) {
            console.error('Error reverting to defaults:', error);
            throw error;
        }
    }
};

export default statutoryRulesService;
