/**
 * Kenya Phone Number Validation & Normalization Utility
 * 
 * Validates and normalizes Kenyan phone numbers to E.164 format.
 * Final format: +254XXXXXXXXX (12 digits total, 9 after country code)
 * 
 * Accepted input formats:
 * - 0712345678 (local with leading 0)
 * - 712345678 (local without leading 0)
 * - +254712345678 (international with +)
 * - 254712345678 (international without +)
 * - 0112345678 (Safaricom 011x format)
 */

export interface PhoneValidationResult {
    isValid: boolean;
    normalized: string | null;
    error?: string;
}

// Valid Kenyan mobile prefixes (after 254)
const VALID_PREFIXES = [
    // Safaricom
    '7', '70', '71', '72', '74', '79',
    '11', '110', '111', '112',
    // Airtel
    '73', '78', '75', '76',
    '10', '100', '101', '102',
    // Telkom
    '77',
    // Landlines (Nairobi)
    '20'
];

/**
 * Normalize a Kenyan phone number to E.164 format (+254XXXXXXXXX)
 */
export function normalizeKenyanPhone(input: string): PhoneValidationResult {
    if (!input || typeof input !== 'string') {
        return { isValid: false, normalized: null, error: 'Phone number is required' };
    }

    // Remove all non-digit characters except leading +
    let cleaned = input.trim().replace(/[^\d+]/g, '');

    // Handle + prefix
    const hasPlus = cleaned.startsWith('+');
    cleaned = cleaned.replace(/^\+/, '');

    // Remove leading zeros if followed by 254
    if (cleaned.startsWith('0254')) {
        cleaned = cleaned.substring(1);
    }

    // If starts with 254, extract the local part
    let localNumber: string;
    if (cleaned.startsWith('254')) {
        localNumber = cleaned.substring(3);
    } else if (cleaned.startsWith('0')) {
        // Local format with leading 0
        localNumber = cleaned.substring(1);
    } else {
        // Assume it's already the local part (without 0 or 254)
        localNumber = cleaned;
    }

    // The local number should be exactly 9 digits
    if (localNumber.length !== 9) {
        return {
            isValid: false,
            normalized: null,
            error: `Invalid phone number length. Expected 9 digits after country code, got ${localNumber.length}`
        };
    }

    // Validate that the number starts with a valid prefix
    const startsWithValidPrefix = VALID_PREFIXES.some(prefix =>
        localNumber.startsWith(prefix.replace('7', '').length > 0 ? prefix : prefix) &&
        (localNumber.startsWith('7') || localNumber.startsWith('1') || localNumber.startsWith('2'))
    );

    // More specific validation: must start with 7, 1, or 2
    if (!localNumber.match(/^[712]/)) {
        return {
            isValid: false,
            normalized: null,
            error: 'Invalid Kenyan phone number. Must start with 7, 1, or 2 after country code'
        };
    }

    // Final normalized format
    const normalized = `+254${localNumber}`;

    // Final validation: exactly 13 characters (+254 + 9 digits)
    if (normalized.length !== 13) {
        return {
            isValid: false,
            normalized: null,
            error: 'Invalid phone number format'
        };
    }

    return {
        isValid: true,
        normalized
    };
}

/**
 * Validate a phone number without normalizing
 */
export function isValidKenyanPhone(input: string): boolean {
    return normalizeKenyanPhone(input).isValid;
}

/**
 * Format a normalized phone number for display
 * +254712345678 -> +254 712 345 678
 */
export function formatPhoneForDisplay(normalized: string): string {
    if (!normalized || !normalized.startsWith('+254') || normalized.length !== 13) {
        return normalized || '';
    }

    const local = normalized.substring(4);
    return `+254 ${local.substring(0, 3)} ${local.substring(3, 6)} ${local.substring(6)}`;
}

/**
 * Get the input mask pattern for Kenya phone
 */
export function getKenyaPhonePlaceholder(): string {
    return '712 345 678';
}

/**
 * Validation error messages
 */
export const PHONE_VALIDATION_MESSAGES = {
    required: 'Phone number is required',
    invalid: 'Please enter a valid Kenyan phone number',
    format: 'Phone must be a valid Kenyan number (e.g., 0712345678)',
    length: 'Phone number must be 9 digits after +254'
};

export default {
    normalizeKenyanPhone,
    isValidKenyanPhone,
    formatPhoneForDisplay,
    getKenyaPhonePlaceholder,
    PHONE_VALIDATION_MESSAGES
};
