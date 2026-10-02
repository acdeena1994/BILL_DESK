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
 * Validates if an expiry date is complete and valid (MM/YYYY with MM 01-12 and YYYY 2000-2100)
 */
export const isValidExpiryDate = (val: string): boolean => {
  if (!val || val.length !== 7 || !val.includes('/')) return false;
  const parts = val.split('/');
  if (parts.length !== 2) return false;
  const mm = parseInt(parts[0], 10);
  const yyyy = parseInt(parts[1], 10);
  return mm >= 1 && mm <= 12 && yyyy >= 2000 && yyyy <= 2100;
};
