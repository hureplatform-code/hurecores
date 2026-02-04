import React, { useRef, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { formatDateKE } from '../../lib/utils/dateFormat';

interface DateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    label?: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
}

const DateInput: React.FC<DateInputProps> = ({
    label,
    value,
    onChange,
    className = '',
    error,
    ...props
}) => {
    const inputRef = useRef<HTMLInputElement>(null);

    // Set the input type to "date" which uses YYYY-MM-DD internally
    // But display the formatted dd/mm/yyyy to the user
    useEffect(() => {
        // Ensure the browser's date picker respects dd/mm/yyyy format
        // Note: The native date input type="date" always uses YYYY-MM-DD for value
        // but the display can vary by browser locale
        if (inputRef.current && value) {
            inputRef.current.value = value; // YYYY-MM-DD format
        }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Native date input always returns YYYY-MM-DD format
        onChange(e.target.value);
    };

    const handleContainerClick = () => {
        if (inputRef.current) {
            // @ts-ignore - showPicker is supported in modern browsers
            if (inputRef.current.showPicker) {
                // @ts-ignore
                inputRef.current.showPicker();
            } else {
                inputRef.current.click();
            }
        }
    };

    // Format display value to dd/mm/yyyy
    const displayValue = value ? formatDateKE(value) : '';

    return (
        <div className={`relative ${className}`}>
            {label && (
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {label} {props.required && <span className="text-red-500">*</span>}
                </label>
            )}
            <div
                className={`relative flex items-center w-full px-4 py-2 border rounded-xl bg-white cursor-pointer hover:bg-slate-50 transition-colors ${error ? 'border-red-300 focus-within:ring-red-200' : 'border-slate-300 focus-within:ring-[#4fd1c5]'
                    } focus-within:ring-2 focus-within:border-transparent`}
                onClick={handleContainerClick}
            >
                <Calendar className="w-5 h-5 text-slate-400 mr-3 flex-shrink-0" />
                <span className={`block w-full text-sm ${value ? 'text-slate-900' : 'text-slate-400'}`}>
                    {value ? displayValue : (props.placeholder || 'dd/mm/yyyy')}
                </span>

                {/* Hidden native input for functionality - always uses YYYY-MM-DD internally */}
                <input
                    ref={inputRef}
                    type="date"
                    value={value}
                    onChange={handleChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    {...props}
                />
            </div>
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        </div>
    );
};

export default DateInput;
