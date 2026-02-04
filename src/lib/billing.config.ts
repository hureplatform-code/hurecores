// =====================================================
// BILLING CONFIGURATION
// All payment provider credentials are placeholders
// Replace with actual API keys in .env file
// =====================================================

/**
 * Billing Configuration
 * Contains all constants and API configuration for the billing system
 * 
 * IMPORTANT: Set actual API keys in your .env file before production deployment
 */
export const BILLING_CONFIG = {
    // Trial Configuration
    TRIAL_DAYS: 10,

    // Billing Cycle (Monthly)
    BILLING_CYCLE_DAYS: 31,

    // Grace Period (None per client spec)
    GRACE_PERIOD_DAYS: 0,

    // Currency
    CURRENCY: 'KES',
    CURRENCY_CODE: 'KES',

    // =====================================================
    // M-PESA CONFIGURATION (Safaricom Daraja API)
    // =====================================================
    // Set these in your .env file:
    // VITE_MPESA_CONSUMER_KEY=your_consumer_key
    // VITE_MPESA_CONSUMER_SECRET=your_consumer_secret
    // VITE_MPESA_PASSKEY=your_passkey
    // VITE_MPESA_SHORTCODE=your_shortcode
    // VITE_MPESA_CALLBACK_URL=your_callback_url
    MPESA: {
        CONSUMER_KEY: import.meta.env.VITE_MPESA_CONSUMER_KEY || 'YOUR_MPESA_CONSUMER_KEY',
        CONSUMER_SECRET: import.meta.env.VITE_MPESA_CONSUMER_SECRET || 'YOUR_MPESA_CONSUMER_SECRET',
        PASSKEY: import.meta.env.VITE_MPESA_PASSKEY || 'YOUR_MPESA_PASSKEY',
        BUSINESS_SHORT_CODE: import.meta.env.VITE_MPESA_SHORTCODE || '174379', // Sandbox default
        CALLBACK_URL: import.meta.env.VITE_MPESA_CALLBACK_URL || 'https://yourapp.com/api/mpesa/callback',
        // Sandbox or Production
        ENVIRONMENT: (import.meta.env.VITE_MPESA_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production',
        // API Endpoints
        get AUTH_URL() {
            return this.ENVIRONMENT === 'production'
                ? 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
                : 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';
        },
        get STK_PUSH_URL() {
            return this.ENVIRONMENT === 'production'
                ? 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
                : 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';
        },
    },

    // =====================================================
    // FLUTTERWAVE CONFIGURATION
    // =====================================================
    // Set these in your .env file:
    // VITE_FLUTTERWAVE_PUBLIC_KEY=your_public_key
    // VITE_FLUTTERWAVE_SECRET_KEY=your_secret_key
    // VITE_FLUTTERWAVE_ENCRYPTION_KEY=your_encryption_key
    FLUTTERWAVE: {
        PUBLIC_KEY: import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY || 'YOUR_FLUTTERWAVE_PUBLIC_KEY',
        SECRET_KEY: import.meta.env.VITE_FLUTTERWAVE_SECRET_KEY || 'YOUR_FLUTTERWAVE_SECRET_KEY',
        ENCRYPTION_KEY: import.meta.env.VITE_FLUTTERWAVE_ENCRYPTION_KEY || 'YOUR_FLUTTERWAVE_ENCRYPTION_KEY',
        ENVIRONMENT: (import.meta.env.VITE_FLUTTERWAVE_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production',
        REDIRECT_URL: import.meta.env.VITE_FLUTTERWAVE_REDIRECT_URL || 'https://yourapp.com/billing/callback',
        WEBHOOK_URL: import.meta.env.VITE_FLUTTERWAVE_WEBHOOK_URL || 'https://yourapp.com/api/flutterwave/webhook',
        // Flutterwave API Endpoint
        API_URL: 'https://api.flutterwave.com/v3',
    },

    // =====================================================
    // PLAN PRICING (in KES)
    // =====================================================
    PLANS: {
        Essential: {
            id: 'Essential' as const,
            name: 'Essential',
            amountKES: 8000,
            amountCents: 800000,
            locations: 1,
            staff: 10,
            admins: 2,
            features: ['Basic Scheduling', 'Attendance', 'CSV Exports'],
        },
        Professional: {
            id: 'Professional' as const,
            name: 'Professional',
            amountKES: 15000,
            amountCents: 1500000,
            locations: 2,
            staff: 30,
            admins: 5,
            features: ['Advanced Scheduling', 'Payroll mapping', 'Multiple Branches'],
            popular: true,
        },
        Enterprise: {
            id: 'Enterprise' as const,
            name: 'Enterprise',
            amountKES: 25000,
            amountCents: 2500000,
            locations: 5,
            staff: 75,
            admins: 10,
            features: ['API Access', 'Custom Roles', 'Dedicated Support'],
        },
    } as const,

    // =====================================================
    // DEVELOPMENT MODE
    // =====================================================
    // When true, shows test buttons for simulating payments
    DEV_MODE: import.meta.env.DEV || import.meta.env.VITE_DEV_MODE === 'true',

    // Support contact for suspended accounts
    SUPPORT_EMAIL: 'support@gethure.com',
    SUPPORT_PHONE: '+254 700 000 000',
};

// Helper to get plan amount in KES
export function getPlanAmount(plan: 'Essential' | 'Professional' | 'Enterprise'): number {
    return BILLING_CONFIG.PLANS[plan].amountKES;
}

// Helper to get plan amount in cents
export function getPlanAmountCents(plan: 'Essential' | 'Professional' | 'Enterprise'): number {
    return BILLING_CONFIG.PLANS[plan].amountCents;
}

// Helper to format amount in KES
export function formatKES(amountCents: number): string {
    const amount = amountCents / 100;
    return `KES ${amount.toLocaleString('en-KE')}`;
}

// Check if M-Pesa is configured
export function isMpesaConfigured(): boolean {
    return BILLING_CONFIG.MPESA.CONSUMER_KEY !== 'YOUR_MPESA_CONSUMER_KEY'
        && BILLING_CONFIG.MPESA.CONSUMER_SECRET !== 'YOUR_MPESA_CONSUMER_SECRET';
}

// Check if Flutterwave is configured
export function isFlutterwaveConfigured(): boolean {
    return BILLING_CONFIG.FLUTTERWAVE.PUBLIC_KEY !== 'YOUR_FLUTTERWAVE_PUBLIC_KEY'
        && BILLING_CONFIG.FLUTTERWAVE.SECRET_KEY !== 'YOUR_FLUTTERWAVE_SECRET_KEY';
}

export default BILLING_CONFIG;
