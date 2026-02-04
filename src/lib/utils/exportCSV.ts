// CSV Export Utility for Reports
export interface CSVColumn<T> {
    header: string;
    accessor: keyof T | ((row: T) => string | number);
}

/**
 * Export data to CSV format and trigger download
 */
export function exportToCSV<T extends Record<string, any>>(
    data: T[],
    columns: CSVColumn<T>[],
    filename: string
): void {
    if (!data.length) {
        alert('No data to export');
        return;
    }

    // Create header row
    const headers = columns.map(col => `"${col.header}"`).join(',');

    // Create data rows
    const rows = data.map(row => {
        return columns.map(col => {
            let value: string | number;

            if (typeof col.accessor === 'function') {
                value = col.accessor(row);
            } else {
                value = row[col.accessor] ?? '';
            }

            // Handle special formatting
            if (typeof value === 'string') {
                // Escape quotes and wrap in quotes
                value = `"${value.replace(/"/g, '""')}"`;
            } else if (typeof value === 'number') {
                value = String(value);
            } else {
                value = `"${String(value)}"`;
            }

            return value;
        }).join(',');
    }).join('\n');

    // Combine headers and rows
    const csvContent = `${headers}\n${rows}`;

    // Create blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Format cents to currency string for CSV
 */
export function formatCentsForCSV(cents: number): string {
    return (cents / 100).toFixed(2);
}

/**
 * Format date for CSV (dd/mm/yyyy)
 */
export function formatDateForCSV(dateString: string | undefined): string {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch {
        return dateString;
    }
}

/**
 * Format datetime for CSV (dd/mm/yyyy HH:mm)
 */
export function formatDateTimeForCSV(dateString: string | undefined): string {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        const datePart = date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        const timePart = date.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        return `${datePart} ${timePart}`;
    } catch {
        return dateString;
    }
}
