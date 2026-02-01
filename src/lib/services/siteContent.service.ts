import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

export interface LandingPageContent {
    heroHeadlinePrefix: string;
    heroHeadlineHighlight: string;
    heroBody: string;
    heroNote: string;
    heroImageUrl?: string; // Main hero image
    pricingEyebrow: string;
    pricingTitle: string;
    pricingCtaLine1: string;
    pricingCtaLine2: string;
    pricingNote: string;
    contactTitle: string;
    contactBody: string;
    footerBlurb: string;
    logoUrl?: string; // Site logo
    plans: Array<{
        key: string;
        name: string;
        price: number;
        period: string;
        badge: string | null;
        tagline: string;
        limits: string[];
        cta: { label: string; intent: string };
        featured?: boolean;
    }>;
    faqs: Array<{ q: string; a: string }>;
    features: Array<{ icon: string; title: string; desc: string; colSpan: string }>;
}

export const DEFAULT_LANDING_CONTENT: LandingPageContent = {
    heroHeadlinePrefix: "Streamline your",
    heroHeadlineHighlight: "clinic workforce operations",
    heroBody:
        "HURE Core is the operating system for clinic workforce management — built to manage staff, schedules, attendance, leave, payroll-ready exports, and compliance for single-location or multi-location clinics in one secure system.",
    heroNote: "Healthcare workforce management, done right",

    pricingEyebrow: "FLEXIBLE PRICING",
    pricingTitle: "Simple, transparent plans",
    pricingCtaLine1: "Ready to modernize your clinic workforce operations?",
    pricingCtaLine2:
        "Start your free trial (no payment needed) and run real scheduling, attendance, leave, and payroll exports with role-based access and audit trails for 10 days.",
    pricingNote:
        "Choose the plan that fits your clinic’s stage of growth. All plans include full access during the trial.",

    contactTitle: "Have questions before you start?",
    contactBody: "Contact us and we’ll help you choose the right plan.",

    footerBlurb:
        "The modern operating system for clinic workforce management — scheduling, attendance, leave, payroll-ready exports, and compliance in one place.",

    plans: [
        {
            key: "essential",
            name: "Essential",
            price: 8000,
            period: "/ month",
            badge: null,
            tagline: "For small clinics getting started",
            limits: ["Up to 1 location", "Up to 10 staff", "2 admin roles"],
            cta: { label: "Start Free Trial", intent: "trial" },
        },
        {
            key: "professional",
            name: "Professional",
            price: 15000,
            period: "/ month",
            badge: "Most Popular",
            tagline: "For growing multi-team clinics",
            limits: ["Up to 2 locations", "Up to 30 staff", "5 admin roles"],
            cta: { label: "Start Free Trial", intent: "trial" },
            featured: true,
        },
        {
            key: "enterprise",
            name: "Enterprise",
            price: 25000,
            period: "/ month",
            badge: null,
            tagline: "For larger clinics & groups",
            limits: ["Up to 5 locations", "Up to 75 staff", "10 admin roles"],
            cta: { label: "Contact Us", intent: "contact" },
        },
    ],

    faqs: [
        {
            q: "How long does setup take?",
            a: "Most clinics can get started the same day. Add your locations, create roles, invite staff, and begin scheduling and attendance tracking immediately.",
        },
        {
            q: "Can I manage multiple clinic locations?",
            a: "Yes. HURE Core supports multi-location oversight with unified staff management and location-specific scheduling and reporting (based on your plan).",
        },
        {
            q: "Does HURE Core process payroll payments?",
            a: "HURE Core prepares payroll-ready exports and calculations (attendance, leave, allowances, deductions). Payment processing is handled by your bank or payroll provider using the exported file.",
        },
        {
            q: "How does the free trial work?",
            a: "You get full access to the plan you choose for 10 days, so you can test real workflows before subscribing. No credit card required.",
        },
        {
            q: "Is my data secure?",
            a: "We follow best-practice security controls for access, audit trails, and data protection. You control who can view or manage sensitive settings through permissions.",
        },
    ],

    features: [
        { icon: "users", title: "Staff records & roles", desc: "Organize staff profiles, credentials, and role-based access.", colSpan: "lg:col-span-2" },
        { icon: "calendar", title: "Scheduling & coverage", desc: "Build shifts, assign staff, and avoid conflicts across teams.", colSpan: "lg:col-span-1" },
        { icon: "clock", title: "Attendance & time tracking", desc: "Clock in/out workflows and attendance-ready exports.", colSpan: "lg:col-span-1" },
        { icon: "file", title: "Payroll-ready exports", desc: "Export payroll CSVs aligned to attendance, leave, allowances, and deductions.", colSpan: "lg:col-span-2" },
        { icon: "layers", title: "Multi-location ready", desc: "Run one clinic or multiple branches with unified oversight.", colSpan: "lg:col-span-1" },
        { icon: "shield", title: "Compliance & logs", desc: "Track key actions, documents, and accountability by permissions.", colSpan: "lg:col-span-2" },
    ]
};

const COLLECTION = 'site_content';
const DOC_ID = 'landing_page';

export const siteContentService = {
    /**
     * Get landing page content
     */
    async getLandingContent(): Promise<LandingPageContent> {
        try {
            const docRef = doc(db, COLLECTION, DOC_ID);
            const snapshot = await getDoc(docRef);

            if (snapshot.exists()) {
                return { ...DEFAULT_LANDING_CONTENT, ...snapshot.data() } as LandingPageContent;
            }

            return DEFAULT_LANDING_CONTENT;
        } catch (error) {
            console.error('Error fetching landing content:', error);
            return DEFAULT_LANDING_CONTENT;
        }
    },

    /**
     * Update landing page content
     */
    async updateLandingContent(content: Partial<LandingPageContent>): Promise<void> {
        const docRef = doc(db, COLLECTION, DOC_ID);
        await setDoc(docRef, content, { merge: true });
    }
};
