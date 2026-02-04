import React, { useState, useEffect } from 'react';
import { normalizeKenyanPhone, formatPhoneForDisplay, PHONE_VALIDATION_MESSAGES } from '../../lib/utils/phoneValidation';

interface KenyaPhoneInputProps {
    value: string;
    onChange: (normalizedValue: string, isValid: boolean) => void;
    label?: string;
    required?: boolean;
    disabled?: boolean;
    error?: string;
    className?: string;
    placeholder?: string;
}

/**
 * Kenya Phone Input Component
 * 
 * Displays 🇰🇪 +254 prefix
 * Accepts various input formats
 * Normalizes to E.164 format on blur
 */
const KenyaPhoneInput: React.FC<KenyaPhoneInputProps> = ({
    value,
    onChange,
    label = 'Phone Number',
    required = false,
    disabled = false,
    error: externalError,
    className = '',
    placeholder = '712 345 678'
}) => {
    const [displayValue, setDisplayValue] = useState('');
    const [internalError, setInternalError] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    // Initialize display value from normalized value
    useEffect(() => {
        if (value && value.startsWith('+254')) {
            const local = value.substring(4); // Remove +254 for display
            // Format with spaces: 712 345 678
            const formatted = local.substring(0, 3) + ' ' + local.substring(3, 6) + ' ' + local.substring(6);
            setDisplayValue(formatted);
        } else if (value) {
            // Try to normalize and extract local part
            const result = normalizeKenyanPhone(value);
            if (result.isValid && result.normalized) {
                const local = result.normalized.substring(4);
                const formatted = local.substring(0, 3) + ' ' + local.substring(3, 6) + ' ' + local.substring(6);
                setDisplayValue(formatted);
            } else {
                setDisplayValue(value);
            }
        }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let input = e.target.value;

        // Remove any non-digit characters for the local part
        input = input.replace(/[^\d]/g, '');

        // Limit to 9 digits
        if (input.length > 9) {
            input = input.substring(0, 9);
        }

        // Format with spaces for display: 712 345 678
        let formatted = input;
        if (input.length > 3) {
            formatted = input.substring(0, 3) + ' ' + input.substring(3);
        }
        if (input.length > 6) {
            formatted = input.substring(0, 3) + ' ' + input.substring(3, 6) + ' ' + input.substring(6);
        }

        setDisplayValue(formatted);
        setInternalError('');

        // Real-time validation (partial)
        if (input.length > 0 && input.length < 9) {
            // Don't show error while typing
        } else if (input.length === 9) {
            const result = normalizeKenyanPhone(input);
            if (!result.isValid) {
                setInternalError(result.error || PHONE_VALIDATION_MESSAGES.invalid);
                onChange('', false);
            } else {
                onChange(result.normalized!, true);
            }
        } else if (input.length === 0) {
            onChange('', !required);
        }
    };

    const handleBlur = () => {
        setIsFocused(false);

        if (!displayValue && !required) {
            setInternalError('');
            return;
        }

        // Remove spaces from display value for validation
        const cleanValue = displayValue.replace(/\s/g, '');

        if (!cleanValue && required) {
            setInternalError(PHONE_VALIDATION_MESSAGES.required);
            onChange('', false);
            return;
        }

        // Normalize on blur
        const result = normalizeKenyanPhone(cleanValue);
        if (!result.isValid) {
            setInternalError(result.error || PHONE_VALIDATION_MESSAGES.invalid);
            onChange('', false);
        } else {
            setInternalError('');
            // Format with spaces: 712 345 678
            const local = result.normalized!.substring(4);
            const formatted = local.substring(0, 3) + ' ' + local.substring(3, 6) + ' ' + local.substring(6);
            setDisplayValue(formatted);
            onChange(result.normalized!, true);
        }
    };

    const error = externalError || internalError;
    const hasError = !!error;

    return (
        <div className={className}>
            {label && (
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}

            <div className={`flex items-center border rounded-xl overflow-hidden transition-colors ${hasError ? 'border-red-500 focus-within:ring-2 focus-within:ring-red-200' :
                isFocused ? 'border-[#4fd1c5] ring-2 ring-[#4fd1c5]/30' : 'border-slate-300'
                } ${disabled ? 'bg-slate-100' : 'bg-white'}`}>
                {/* Country Code Prefix */}
                <div className="flex items-center px-3 py-3 bg-slate-50 border-r border-slate-200 text-slate-600 font-medium">
                    <span className="mr-1.5">🇰🇪</span>
                    <span>+254</span>
                </div>

                {/* Input Field */}
                <input
                    type="tel"
                    value={displayValue}
                    onChange={handleChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={handleBlur}
                    disabled={disabled}
                    placeholder={placeholder}
                    className="flex-1 px-3 py-3 outline-none bg-transparent disabled:text-slate-500"
                    maxLength={11} // 9 digits + 2 spaces for formatting
                />
            </div>

            {/* Error Message */}
            {hasError && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
            )}

            {/* Helper Text */}
            {!hasError && (
                <p className="mt-1 text-xs text-slate-400">
                    Enter 9 digits (e.g., 712345678)
                </p>
            )}
        </div>
    );
};

export default KenyaPhoneInput;
