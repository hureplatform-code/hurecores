import React, { useState, useEffect } from "react";
import { db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

/**
 * Employer-side Payroll Rules (Read-Only)
 * Purpose: Explain HOW payroll is calculated without allowing edits
 * Audience: Employer / Owner / Admin
 * Data Source: system_settings/payroll_rules (same as Super Admin)
 */

interface PAYEBand {
  limit: number;
  rate: number;
}

interface StatutoryRules {
  payeBands: PAYEBand[];
  personalRelief: number;
  shifRate: number;
  housingLevyRate: number;
  nssfTierILimit: number;
  nssfTierIILimit: number;
  updatedAt?: any;
  effectiveDate?: string;
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
  housingLevyRate: 1.5,
  nssfTierILimit: 6000,
  nssfTierIILimit: 18000
};

export default function PayrollRulesReadOnly() {
  const [open, setOpen] = useState(true);
  const [rules, setRules] = useState<StatutoryRules>(DEFAULT_RULES);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      const docRef = doc(db, 'statutoryRules', 'payroll_rules');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setRules({ ...DEFAULT_RULES, ...data } as StatutoryRules);

        // Format last updated date
        if (data.updatedAt) {
          const date = data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt);
          setLastUpdated(date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }));
        }
      }
    } catch (err) {
      console.error('Error loading payroll rules:', err);
    } finally {
      setLoading(false);
    }
  };

  // Format rate as percentage
  const formatRate = (rate: number) => `${(rate * 100).toFixed(rate * 100 % 1 === 0 ? 0 : 1)}%`;

  // Format currency
  const formatKES = (value: number) => {
    if (value === Infinity) return 'Above 800,000';
    return value.toLocaleString('en-KE');
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="rounded-2xl border bg-white shadow-sm p-8 text-center text-slate-500">
          Loading payroll rules...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="rounded-2xl border bg-white shadow-sm">
        {/* Header */}
        <div
          className="flex cursor-pointer items-center justify-between px-5 py-4"
          onClick={() => setOpen(!open)}
        >
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">🔒</div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Payroll Rules (KRA-defined payroll calculation logic)</h3>
              <p className="text-xs text-slate-500">
                Defined by HURE in accordance with Kenya Revenue Authority (KRA)
              </p>
            </div>
          </div>
          <span className="text-xs text-slate-500 hover:text-slate-700">{open ? "Hide" : "View"}</span>
        </div>

        {open && (
          <div className="space-y-6 border-t px-5 py-5">
            {/* Calculation Order */}
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                How Payroll Is Calculated
              </h4>
              <ol className="space-y-1 text-sm text-slate-700">
                <li>1. Gross Pay</li>
                <li>2. Taxable Pay</li>
                <li>3. PAYE (applied cumulatively)</li>
                <li>4. Personal Relief</li>
                <li>5. Employee Statutory Deductions</li>
                <li className="font-medium text-slate-900">6. Net Pay</li>
              </ol>
              <p className="mt-2 text-xs text-slate-500">
                Statutory deductions do not reduce taxable income.
              </p>
            </div>

            {/* Statutory Snapshot */}
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Current Kenya Statutory Rates
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-3 text-sm">
                  <div className="text-slate-500">Personal Relief</div>
                  <div className="font-semibold text-slate-900">KES {rules.personalRelief.toLocaleString()} / month</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 text-sm">
                  <div className="text-slate-500">PAYE</div>
                  <div className="font-semibold text-slate-900">Progressive (KRA bands)</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 text-sm">
                  <div className="text-slate-500">SHIF</div>
                  <div className="font-semibold text-slate-900">{rules.shifRate}% of gross pay</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 text-sm">
                  <div className="text-slate-500">Housing Levy</div>
                  <div className="font-semibold text-slate-900">{rules.housingLevyRate}% of gross pay</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 text-sm">
                  <div className="text-slate-500">NSSF (Employee)</div>
                  <div className="font-semibold text-slate-900">6% up to KES {rules.nssfTierIILimit.toLocaleString()}</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 text-sm">
                  <div className="text-slate-500">NSSF (Employer)</div>
                  <div className="font-semibold text-slate-900">6% (reporting only)</div>
                </div>
              </div>
            </div>

            {/* Progressive PAYE Bands (Read-only, compact) */}
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                PAYE Bands (Monthly · Read Only)
              </h4>
              <div className="overflow-hidden rounded-xl border">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-3 py-2 text-left">Band</th>
                      <th className="px-3 py-2 text-left">Up to (KES)</th>
                      <th className="px-3 py-2 text-left">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rules.payeBands.map((band, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2">{idx + 1}</td>
                        <td className="px-3 py-2">{formatKES(band.limit)}</td>
                        <td className="px-3 py-2">{formatRate(band.rate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Bands apply cumulatively on monthly taxable pay. Final band is open-ended.
              </p>
            </div>

            {/* Footer */}
            <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
              These payroll rules are centrally managed by HURE and automatically
              updated when statutory law changes. Employers cannot modify statutory
              calculations.
              <div className="mt-1 text-slate-400">
                Last updated: {lastUpdated || 'Jan 2026'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
