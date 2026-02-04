import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

interface PAYEBand {
    limit: number;
    rate: number;
}

export interface StatutoryRules {
    payeBands: PAYEBand[];
    personalRelief: number;
    shifRate: number;        // Percentage (e.g., 2.75 for 2.75%)
    housingLevyRate: number; // Percentage (e.g., 1.5 for 1.5%)
    nssfTierILimit: number;  // KES 6,000
    nssfTierIILimit: number; // KES 18,000
    nssfRate: number;        // Rate as decimal (e.g., 0.06 for 6%)
}

/**
 * KRA 2025/2026 Monthly Tax Bands
 * These are CORRECT monthly limits (annual ÷ 12)
 */
const DEFAULT_RULES: StatutoryRules = {
    payeBands: [
        { limit: 24000, rate: 0.10 },      // First 24,000 at 10%
        { limit: 32333, rate: 0.25 },      // 24,001 to 32,333 at 25%
        { limit: 500000, rate: 0.30 },     // 32,334 to 500,000 at 30%
        { limit: 800000, rate: 0.325 },    // 500,001 to 800,000 at 32.5%
        { limit: Infinity, rate: 0.35 }    // Above 800,000 at 35%
    ],
    personalRelief: 2400,     // Monthly personal relief
    shifRate: 2.75,           // SHIF: 2.75% of gross
    housingLevyRate: 1.5,     // Housing Levy: 1.5% of gross
    nssfTierILimit: 6000,     // Tier I applies up to KES 6,000
    nssfTierIILimit: 18000,   // Tier II applies from 6,001 to 18,000
    nssfRate: 0.06            // NSSF rate: 6%
};

export const statutoryService = {
    /**
     * Get global statutory rules from Firestore
     */
    async getGlobalRules(): Promise<StatutoryRules> {
        try {
            const docRef = doc(db, 'statutoryRules', 'payroll_rules');
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                // Convert Infinity for last band if stored as 0 or missing
                if (data.payeBands && Array.isArray(data.payeBands)) {
                    data.payeBands = data.payeBands.map((band: any, idx: number) => ({
                        limit: (band.limit === 0 || band.limit === null) && idx === data.payeBands.length - 1
                            ? Infinity
                            : band.limit,
                        rate: band.rate
                    }));
                }
                return { ...DEFAULT_RULES, ...data } as StatutoryRules;
            }
        } catch (error) {
            console.error('Error fetching statutory rules:', error);
        }
        return DEFAULT_RULES;
    },

    /**
     * Calculate NSSF Deductions (Employee contribution)
     * 
     * KRA 2024 NSSF Structure:
     * - Tier I: 6% of earnings up to KES 6,000 = max KES 360
     * - Tier II: 6% of earnings from 6,001 to 18,000 = max KES 720
     * - Total max employee NSSF = KES 1,080
     */
    calculateNSSF(grossPay: number, rules: StatutoryRules) {
        const rate = rules.nssfRate || 0.06; // Default 6%

        // Tier I: 6% of earnings up to 6,000
        const tierIEarnings = Math.min(grossPay, rules.nssfTierILimit);
        const tierI = tierIEarnings * rate;

        // Tier II: 6% of earnings from 6,001 to 18,000
        let tierII = 0;
        if (grossPay > rules.nssfTierILimit) {
            const tierIIEarnings = Math.min(grossPay, rules.nssfTierIILimit) - rules.nssfTierILimit;
            tierII = tierIIEarnings * rate;
        }

        const total = tierI + tierII;

        // Sanity check: max NSSF should be 1,080
        if (total > 1080 && grossPay > 18000) {
            console.warn(`NSSF calculation capped: ${total} -> 1080`);
        }

        return {
            tierI: Math.round(tierI * 100) / 100,
            tierII: Math.round(tierII * 100) / 100,
            total: Math.round(Math.min(total, 1080) * 100) / 100
        };
    },

    /**
     * Calculate PAYE (Pay As You Earn)
     * 
     * Uses MONTHLY tax bands progressively.
     * Personal relief is applied AFTER computing gross tax.
     * 
     * @param taxablePay - Monthly taxable income in KES
     * @param rules - Statutory rules with tax bands
     * @returns PAYE tax amount in KES (after personal relief)
     */
    calculatePAYE(taxablePay: number, rules: StatutoryRules): {
        grossTax: number;
        personalRelief: number;
        netTax: number;
        bandBreakdown: { from: number; to: number; rate: number; taxableAmount: number; tax: number }[];
    } {
        let grossTax = 0;
        let remainingPay = taxablePay;
        let previousLimit = 0;
        const bandBreakdown: { from: number; to: number; rate: number; taxableAmount: number; tax: number }[] = [];

        for (const band of rules.payeBands) {
            if (remainingPay <= 0) break;

            // Calculate the range for this band
            const bandRange = band.limit === Infinity
                ? remainingPay
                : band.limit - previousLimit;

            // Amount taxable in this band
            const taxableAmount = Math.min(remainingPay, bandRange);
            const bandTax = taxableAmount * band.rate;

            grossTax += bandTax;

            bandBreakdown.push({
                from: previousLimit,
                to: band.limit === Infinity ? previousLimit + taxableAmount : Math.min(taxablePay, band.limit),
                rate: band.rate,
                taxableAmount,
                tax: bandTax
            });

            remainingPay -= taxableAmount;
            previousLimit = band.limit === Infinity ? previousLimit + taxableAmount : band.limit;
        }

        // Apply Personal Relief AFTER computing gross tax
        const personalRelief = rules.personalRelief || 2400;
        const netTax = Math.max(0, grossTax - personalRelief);

        return {
            grossTax: Math.round(grossTax * 100) / 100,
            personalRelief,
            netTax: Math.round(netTax * 100) / 100,
            bandBreakdown
        };
    },

    /**
     * Calculate SHIF (Social Health Insurance Fund)
     * Rate: 2.75% of Gross Pay
     */
    calculateSHIF(grossPay: number, rules: StatutoryRules): number {
        const rate = (rules.shifRate || 2.75) / 100; // Convert percentage to decimal
        return Math.round(grossPay * rate * 100) / 100;
    },

    /**
     * Calculate Affordable Housing Levy
     * Rate: 1.5% of Gross Pay
     */
    calculateHousingLevy(grossPay: number, rules: StatutoryRules): number {
        const rate = (rules.housingLevyRate || 1.5) / 100; // Convert percentage to decimal
        return Math.round(grossPay * rate * 100) / 100;
    },

    /**
     * Calculate Net Pay with full breakdown
     * 
     * KRA-Aligned Calculation Flow:
     * 1. Determine Gross Pay (basic + allowances)
     * 2. Determine Taxable Pay (gross - non-taxable allowances)
     * 3. Compute PAYE using MONTHLY bands cumulatively
     * 4. Apply Personal Relief AFTER computing PAYE
     * 5. Compute statutory deductions (SHIF, Housing Levy, NSSF) - these do NOT reduce taxable pay
     * 6. Calculate Net Pay = Gross - All Deductions
     * 
     * IMPORTANT: Statutory contributions do NOT reduce taxable pay for PAYE purposes!
     */
    calculateNetPay(basicSalary: number, allowances: number, rules: StatutoryRules, nonTaxableAllowances: number = 0) {
        // Step 1: Gross Pay
        const grossPay = basicSalary + allowances;

        // Step 2: Taxable Pay (gross minus non-taxable allowances)
        // IMPORTANT: Do NOT subtract NSSF, SHIF, or Housing Levy when computing taxable pay
        const taxablePay = Math.max(0, grossPay - nonTaxableAllowances);

        // Step 3 & 4: Calculate PAYE on taxable pay (with personal relief applied inside)
        const payeResult = this.calculatePAYE(taxablePay, rules);

        // Step 5: Calculate statutory deductions (AFTER PAYE, these reduce NET pay, not taxable pay)
        const nssf = this.calculateNSSF(grossPay, rules);
        const shif = this.calculateSHIF(grossPay, rules);
        const housingLevy = this.calculateHousingLevy(grossPay, rules);

        // Total Deductions
        const totalDeductions = payeResult.netTax + nssf.total + shif + housingLevy;

        // Step 6: Net Pay
        const netPay = grossPay - totalDeductions;

        // ==========================================
        // VALIDATION CHECKS (prevent impossible calculations)
        // ==========================================
        const validationErrors: string[] = [];

        // Check 1: PAYE cannot exceed taxable pay
        if (payeResult.netTax > taxablePay) {
            validationErrors.push('PAYE_EXCEEDS_TAXABLE');
            console.error(`VALIDATION ERROR: PAYE (${payeResult.netTax}) exceeds taxable pay (${taxablePay})`);
        }

        // Check 2: Total deductions cannot exceed gross pay
        if (totalDeductions > grossPay) {
            validationErrors.push('DEDUCTIONS_EXCEED_GROSS');
            console.error(`VALIDATION ERROR: Deductions (${totalDeductions}) exceed gross (${grossPay})`);
        }

        // Check 3: NSSF should not exceed 1,080 for salaries above 18,000
        if (nssf.total > 1080) {
            validationErrors.push('NSSF_EXCEEDS_MAX');
            console.error(`VALIDATION ERROR: NSSF (${nssf.total}) exceeds max (1,080)`);
        }

        // Check 4: PAYE should be reasonable (< 40% of taxable for most cases)
        if (payeResult.netTax > taxablePay * 0.4) {
            console.warn(`WARNING: PAYE (${payeResult.netTax}) is ${(payeResult.netTax / taxablePay * 100).toFixed(1)}% of taxable pay`);
        }

        return {
            // Input
            basicSalary,
            allowances,
            nonTaxableAllowances,

            // Computed
            grossPay,
            taxablePay,

            // PAYE breakdown
            paye: {
                grossTax: payeResult.grossTax,
                personalRelief: payeResult.personalRelief,
                netTax: payeResult.netTax,
                bandBreakdown: payeResult.bandBreakdown
            },

            // Statutory deductions
            deductions: {
                paye: payeResult.netTax,
                nssf: nssf.total,
                nssfTier1: nssf.tierI,
                nssfTier2: nssf.tierII,
                shif,
                housingLevy,
                total: totalDeductions
            },

            // Final
            netPay,

            // Validation
            validation: {
                isValid: validationErrors.length === 0,
                errors: validationErrors
            }
        };
    }
};
