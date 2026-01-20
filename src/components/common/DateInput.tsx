import React, { useRef } from 'react';
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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    // Format display value
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
                    {value ? displayValue : (props.placeholder || 'Select date')}
                </span>

                {/* Hidden native input for functionality */}
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
