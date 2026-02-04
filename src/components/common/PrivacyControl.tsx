import React from 'react';

interface PrivacyMaskProps {
    children: React.ReactNode;
    isVisible: boolean;
    placeholder?: string;
    className?: string;
}

/**
 * Wraps sensitive content. Displays a mask (••••••) if isVisible is false.
 */
export const PrivacyMask: React.FC<PrivacyMaskProps> = ({
    children,
    isVisible,
    placeholder = '••••••',
    className = ''
}) => {
    if (!isVisible) {
        return (
            <span className={`font-mono text-slate-400 tracking-wider select-none ${className}`} aria-hidden="true">
                {placeholder}
            </span>
        );
    }
    return <>{children}</>;
};

interface PrivacyToggleProps {
    isVisible: boolean;
    onToggle: (e?: React.MouseEvent) => void;
    label?: string; // Optional text label next to icon
    className?: string;
}

/**
 * Standard eye/eye-slash toggle button for privacy controls.
 */
export const PrivacyToggle: React.FC<PrivacyToggleProps> = ({
    isVisible,
    onToggle,
    label,
    className = ''
}) => {
    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                onToggle(e);
            }}
            className={`flex items-center space-x-1 text-slate-400 hover:text-blue-600 transition-colors focus:outline-none ${className}`}
            title={isVisible ? "Hide details" : "Show details"}
            type="button"
        >
            <span className="text-lg">{isVisible ? '🙈' : '👁️'}</span>
            {label && <span className="text-xs font-semibold uppercase">{label}</span>}
        </button>
    );
};
