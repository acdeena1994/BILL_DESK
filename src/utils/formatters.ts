/**
 * Format numeric value with currency symbol (e.g. ₹ 1,250.00 or $ 1,250.00)
 */
export const formatCurrency = (amount: number, symbol = '₹'): string => {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return `${symbol} 0.00`;
  }
  const formatted = amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol} ${formatted}`;
};

/**
 * Returns today's date formatted as YYYY-MM-DD
 */
export const todayFormatted = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Formats a YYYY-MM-DD string to readable format e.g. 08 Sep 2026
 */
export const formatReadableDate = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
};

/**
 * Auto-formats numeric input into MM/YYYY
 * e.g. typing '062028' -> '06/2028', automatically inserting '/' after 2-digit month.
 * Strictly enforces:
 * - Only numeric characters (0-9)
 * - Month range: 01 to 12 (blocks 00 or >12 at input time)
 * - Year range: 2000 to 2100 (blocks out-of-range year digits at input time)
 * - Handles backspacing gracefully over the slash.
 */
export const formatExpiryDateInput = (val: string, prevVal = ''): string => {
  // Handle backspace when user deletes the slash
  if (prevVal.endsWith('/') && val === prevVal.slice(0, -1)) {
    return val.slice(0, -1);
  }

  // Strictly extract digits only (letters and symbols are discarded)
  const rawDigits = val.replace(/\D/g, '');
  if (!rawDigits) return '';

  let digits = rawDigits;

  // If first digit is 2-9, auto-prepend 0 (e.g. typing '6' becomes '06/')
  if (digits.length === 1) {
    const d0 = parseInt(digits[0], 10);
    if (d0 >= 2) {
      return `0${digits}/`;
    }
    return digits;
  }

  // Validate month (first 2 digits)
  const monthStr = digits.slice(0, 2);
  const monthNum = parseInt(monthStr, 10);

  // Month must be 01-12
  if (monthNum < 1) {
    // e.g. '00' is invalid
    return digits.slice(0, 1);
  }
  if (monthNum > 12) {
    // e.g. '13'-'19' is invalid
    return digits.slice(0, 1);
  }

  // If user only typed 2 month digits
  if (digits.length === 2) {
    if (prevVal.length > val.length) {
      return digits; // user is backspacing
    }
    return `${digits}/`;
  }

  // Validate year digits (index 2 to 5)
  // Digits 2+: Year range 2000 to 2100
  const yearDigits = digits.slice(2, 6);

  // 1st year digit must be '2'
  if (yearDigits.length >= 1 && yearDigits[0] !== '2') {
    return `${monthStr}/`;
  }

  // 2nd year digit must be '0' or '1' (years 2000-2100)
  if (yearDigits.length >= 2 && yearDigits[1] !== '0' && yearDigits[1] !== '1') {
    return `${monthStr}/${yearDigits[0]}`;
  }

  // If 1st two digits are '21', 3rd and 4th digits must be '0' (max year 2100)
  if (yearDigits.startsWith('21')) {
    if (yearDigits.length >= 3 && yearDigits[2] !== '0') {
      return `${monthStr}/21`;
    }
    if (yearDigits.length >= 4 && yearDigits[3] !== '0') {
      return `${monthStr}/210`;
    }
  }

  // Full 4-digit year check
  if (yearDigits.length === 4) {
    const yr = parseInt(yearDigits, 10);
    if (yr < 2000 || yr > 2100) {
      return `${monthStr}/${yearDigits.slice(0, 3)}`;
    }
  }

  return `${monthStr}/${yearDigits}`;
};

/**
 * Auto-formats numeric input into MM/YY (e.g. '1227' -> '12/27')
 * Enforces 2-digit month and 2-digit year (max 5 characters).
 * Handles backspace over slash gracefully.
 */
export const formatCardExpiryInput = (val: string, prevVal = ''): string => {
  if (prevVal.endsWith('/') && val === prevVal.slice(0, -1)) {
    return val.slice(0, -1);
  }

  const rawDigits = val.replace(/\D/g, '').slice(0, 4);
  if (!rawDigits) return '';

  if (rawDigits.length === 1) {
    const d0 = parseInt(rawDigits[0], 10);
    if (d0 >= 2) {
      return `0${rawDigits}/`;
    }
    return rawDigits;
  }

  if (rawDigits.length === 2) {
    if (prevVal.length > val.length) {
      return rawDigits;
    }
    return `${rawDigits}/`;
  }

  return `${rawDigits.slice(0, 2)}/${rawDigits.slice(2, 4)}`;
};

/**
 * Safely resolves a Date object or YYYY-MM-DD calendar date string into a Date instance.
 * Defaults to the system clock (new Date()) if omitted or invalid.
 */
export const resolveReferenceDate = (ref?: Date | string): Date => {
  if (!ref) return new Date();
  if (ref instanceof Date) return ref;
  if (typeof ref === 'string') {
    const parts = ref.trim().split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return new Date(y, m, d);
      }
    }
    const parsed = new Date(ref);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return new Date();
};

/**
 * Returns an inline validation error message for an expiry date string,
 * or null if the expiry date is valid and in an upcoming month relative to referenceDate.
 *
 * Rules:
 * 1. Reject empty or non-string input.
 * 2. Reject wrong format: must be MM/YY or MM/YYYY.
 * 3. Reject month outside 01-12.
 * 4. Convert YY to YYYY (e.g. 27 -> 2027).
 * 5. Compare using month + year only against referenceDate (chosen calendar date or system clock).
 * 6. If past or equals reference month: returns "Medicine has expired. Please enter a future expiry date."
 */
export const getExpiryDateError = (
  value: string | undefined | null,
  referenceDate: Date | string = new Date()
): string | null => {
  if (!value || typeof value !== 'string' || value.trim() === '') {
    return 'Expiry date is required. Please enter MM/YYYY.';
  }

  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{1,2})\/(\d{2}|\d{4})$/);
  if (!match) {
    return 'Invalid format. Please enter MM/YYYY.';
  }

  const mm = parseInt(match[1], 10);
  const yyStr = match[2];

  if (match[1].length !== 2 || mm < 1 || mm > 12) {
    return 'Invalid month (01-12). Please enter a valid expiry date.';
  }

  let yyyy = parseInt(yyStr, 10);
  if (yyStr.length === 2) {
    yyyy = 2000 + yyyy;
  }

  const resolvedRef = resolveReferenceDate(referenceDate);
  const refYear = resolvedRef.getFullYear();
  const refMonth = resolvedRef.getMonth() + 1; // 1-12

  // If in the past or equals the chosen calendar month (already completed/expired)
  if (yyyy < refYear || (yyyy === refYear && mm <= refMonth)) {
    return 'Medicine has expired. Please enter a future expiry date.';
  }

  return null;
};

/**
 * Reusable validator function for expiry dates.
 * Returns true if valid upcoming month (strictly after chosen calendar month), false otherwise.
 * Uses chosen calendar date if passed, or system clock (new Date()) by default.
 */
export const isExpiryDateValid = (
  value: string | undefined | null,
  referenceDate: Date | string = new Date()
): boolean => {
  return getExpiryDateError(value, referenceDate) === null;
};

/**
 * Validates if an expiry date is complete and valid (checks future expiration against calendar date)
 * Maintained for backward compatibility across the codebase.
 */
export const isValidExpiryDate = (
  val: string,
  referenceDate: Date | string = new Date()
): boolean => {
  return isExpiryDateValid(val, referenceDate);
};


