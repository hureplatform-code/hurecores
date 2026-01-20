import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

interface PAYEBand {
    limit: number;
    rate: number;
}

export interface StatutoryRules {
    payeBands: PAYEBand[];
    personalRelief: number;
    shifRate: number;
    nssfTierI: number;
    nssfTierII: number;
    housingLevyRate: number;
    nssfTierILimit: number;
    nssfTierIILimit: number;
}

const DEFAULT_RULES: StatutoryRules = {
    payeBands: [
        { limit: 24000, rate: 0.1 },
        { limit: 32333, rate: 0.25 },
        { limit: 500000, rate: 0.3 },
        { limit: 800000, rate: 0.325 },
        { limit: Infinity, rate: 0.35 }
    ],
    personalRelief: 2400,
    shifRate: 2.75,
    nssfTierI: 360,
    nssfTierII: 0.06,
    housingLevyRate: 1.5,
    nssfTierILimit: 6000,
    nssfTierIILimit: 18000
};

export const statutoryService = {
    /**
     * Get global statutory rules from settings
     */
    async getGlobalRules(): Promise<StatutoryRules> {
        try {
            const docRef = doc(db, 'system_settings', 'payroll_rules');
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                return { ...DEFAULT_RULES, ...docSnap.data() } as StatutoryRules;
            }
        } catch (error) {
            console.error('Error fetching statutory rules:', error);
        }
        return DEFAULT_RULES;
    },

    /**
     * Calculate NSSF Deductions (Tier I & II)
     */
    calculateNSSF(pensionablePay: number, rules: StatutoryRules) {
        // NSSF Tier I
        const tierI = Math.min(pensionablePay, rules.nssfTierILimit);
        const nssfTierI = Math.min(tierI, rules.nssfTierILimit) * (typeof rules.nssfTierI === 'number' && rules.nssfTierI < 1 ? rules.nssfTierI : 0.06);
        // Note: rule.nssfTierI in DEFAULT is 360 (fixed) or rate? 
        // KRA usually uses 6% capped. Default provided 360 which is 6% of 6000.
        // Let's ensure we use the rate if it's a rate, or calculation.
        // For simplicity/standard: Tier I is 6% of earnings up to 6,000.

        const tierIContribution = Math.min(pensionablePay, rules.nssfTierILimit) * 0.06;

        // NSSF Tier II
        // Earnings between Tier I Limit and Tier II Limit
        let tierIIContribution = 0;
        if (pensionablePay > rules.nssfTierILimit) {
            const tierII = Math.min(pensionablePay, rules.nssfTierIILimit) - rules.nssfTierILimit;
            tierIIContribution = tierII * rules.nssfTierII;
        }

        return {
            tierI: tierIContribution,
            tierII: tierIIContribution,
            total: tierIContribution + tierIIContribution
        };
    },

    /**
     * Calculate Taxable Pay
     * Taxable Pay = Gross Pay - NSSF Contributions (Allowable Deduction)
     */
    calculateTaxablePay(grossPay: number, nssfTotal: number): number {
        return Math.max(0, grossPay - nssfTotal);
    },

    /**
     * Calculate PAYE (Pay As You Earn)
     */
    calculatePAYE(taxablePay: number, rules: StatutoryRules): number {
        let tax = 0;
        let remainingPay = taxablePay;
        let previousLimit = 0;

        for (const band of rules.payeBands) {
            if (remainingPay <= 0) break;

            const bandRange = band.limit === Infinity
                ? remainingPay
                : band.limit - previousLimit;

            const taxableAmount = Math.min(remainingPay, bandRange);
            tax += taxableAmount * band.rate;

            remainingPay -= taxableAmount;
            previousLimit = band.limit;
        }

        // Apply Personal Relief
        return Math.max(0, tax - rules.personalRelief);
    },

    /**
     * Calculate SHIF (Social Health Insurance Fund)
     * 2.75% of Gross Pay
     */
    calculateSHIF(grossPay: number, rules: StatutoryRules): number {
        return grossPay * (rules.shifRate / 100);
    },

    /**
     * Calculate Affordable Housing Levy
     * 1.5% of Gross Pay
     */
    calculateHousingLevy(grossPay: number, rules: StatutoryRules): number {
        return grossPay * (rules.housingLevyRate / 100);
    },

    /**
     * Calculate Net Pay with full breakdown
     */
    calculateNetPay(basicSalary: number, allowances: number, rules: StatutoryRules) {
        const grossPay = basicSalary + allowances;

        // 1. NSSF
        const nssf = this.calculateNSSF(grossPay, rules); // Assuming pensionable pay is gross for simplicity or just basic? Usually Basic + Regular Allowances. Using Gross here as per "Pensionable Pay". 

        // 2. Taxable Pay (Gross - NSSF)
        const taxablePay = this.calculateTaxablePay(grossPay, nssf.total);

        // 3. PAYE
        const paye = this.calculatePAYE(taxablePay, rules);

        // 4. SHIF
        const shif = this.calculateSHIF(grossPay, rules);

        // 5. Housing Levy
        const housingLevy = this.calculateHousingLevy(grossPay, rules);

        // Total Deductions
        const totalDeductions = nssf.total + paye + shif + housingLevy;

        // Net Pay
        const netPay = grossPay - totalDeductions;

        return {
            grossPay,
            taxablePay,
            deductions: {
                nssf: nssf.total,
                paye,
                shif,
                housingLevy,
                total: totalDeductions
            },
            netPay
        };
    }
};
