export {
    normalizeKenyanPhone,
    isValidKenyanPhone,
    formatPhoneForDisplay,
    getKenyaPhonePlaceholder,
    PHONE_VALIDATION_MESSAGES
} from './phoneValidation';
export type { PhoneValidationResult } from './phoneValidation';

// Kenya date format utilities (dd/mm/yyyy)
export {
    formatDateKE,
    formatDateTimeKE,
    formatDateWithDayKE,
    formatDateLongKE,
    formatDateFullKE,
    getWeekdayShort,
    formatMonthYearKE
} from './dateFormat';
