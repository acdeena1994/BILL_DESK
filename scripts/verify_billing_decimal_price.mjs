/**
 * Verification test script for billing decimal price support
 * Tests:
 * 1. Decimal price input sanitization & typing behavior
 * 2. Precision & calculations (line total, grand total, floating point drift prevention)
 * 3. Currency formatting (2 decimal places)
 * 4. Model / DTO mapping for SQLite persistence
 */

import assert from 'node:assert';

console.log('====================================================');
console.log('RUNNING VERIFICATION: BILLING DECIMAL PRICE SUPPORT');
console.log('====================================================\n');

// ----------------------------------------------------
// 1. Input Sanitization & Decimal Entry Logic
// ----------------------------------------------------
console.log('--- TEST 1: Decimal Input Sanitization & Entry ---');

export const sanitizePriceInput = (val) => {
  const cleaned = val.replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length > 1) {
    return `${parts[0]}.${parts.slice(1).join('')}`;
  }
  return cleaned;
};

// Intermediate typing states
assert.strictEqual(sanitizePriceInput('12.'), '12.', 'Intermediate typing state "12." is preserved');
assert.strictEqual(sanitizePriceInput('0.'), '0.', 'Intermediate typing state "0." is preserved');
assert.strictEqual(sanitizePriceInput('.5'), '.5', 'Leading decimal ".5" is preserved');
assert.strictEqual(sanitizePriceInput('12.5'), '12.5', 'Single decimal "12.5" is preserved');
assert.strictEqual(sanitizePriceInput('12.50'), '12.50', 'Trailing zero "12.50" is preserved');

// Reject invalid characters and extra decimal points
assert.strictEqual(sanitizePriceInput('12.5.5'), '12.55', 'Multiple decimal points collapsed to single decimal');
assert.strictEqual(sanitizePriceInput('12..'), '12.', 'Double dot collapsed to single dot');
assert.strictEqual(sanitizePriceInput('abc12.99$'), '12.99', 'Non-numeric non-dot characters stripped');
assert.strictEqual(sanitizePriceInput(''), '', 'Empty string allowed for backspace clearing');

console.log('✓ Input sanitization tests passed!\n');

// ----------------------------------------------------
// 2. Calculation Precision & Float Drift Prevention
// ----------------------------------------------------
console.log('--- TEST 2: Calculations & Precision Handling ---');

export const computeRowTotal = (price, quantity) => {
  const p = parseFloat(String(price)) || 0;
  const q = Number(quantity) || 0;
  return Math.round((p * q + Number.EPSILON) * 100) / 100;
};

export const computeGrandTotal = (items) => {
  const raw = items.reduce((sum, it) => {
    const p = parseFloat(String(it.price)) || 0;
    const q = Number(it.quantity) || 0;
    return sum + p * q;
  }, 0);
  return Math.round((raw + Number.EPSILON) * 100) / 100;
};

// Line total tests
const row1 = computeRowTotal(19.99, 3);
assert.strictEqual(row1, 59.97, '19.99 * 3 must equal 59.97 without IEEE 754 drift');

const row2 = computeRowTotal('12.50', 2);
assert.strictEqual(row2, 25.0, '"12.50" string price * 2 equals 25.00');

const row3 = computeRowTotal('0.75', 5);
assert.strictEqual(row3, 3.75, '"0.75" * 5 equals 3.75');

const row4 = computeRowTotal('', 2);
assert.strictEqual(row4, 0, 'Blank price computes to 0 total');

// Grand total test
const sampleItems = [
  { price: 19.99, quantity: 3 },  // 59.97
  { price: '12.50', quantity: 2 }, // 25.00
  { price: '0.75', quantity: 5 },  // 3.75
  { price: '100.10', quantity: 1 } // 100.10
];
const grandTotal = computeGrandTotal(sampleItems);
assert.strictEqual(grandTotal, 188.82, 'Grand total must equal 188.82 (59.97 + 25.00 + 3.75 + 100.10)');

console.log('✓ Calculation and precision tests passed!\n');

// ----------------------------------------------------
// 3. Currency Formatting (2 Decimal Places)
// ----------------------------------------------------
console.log('--- TEST 3: Currency Formatting (2 Decimal Places) ---');

export const formatCurrency = (amount, symbol = '₹') => {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return `${symbol} 0.00`;
  }
  const formatted = amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol} ${formatted}`;
};

assert.strictEqual(formatCurrency(188.82, '₹'), '₹ 188.82', 'Formats float with 2 decimal places');
assert.strictEqual(formatCurrency(12.5, '₹'), '₹ 12.50', 'Pads single decimal to 2 places (12.5 -> ₹ 12.50)');
assert.strictEqual(formatCurrency(0.99, '$'), '$ 0.99', 'Supports custom currency symbol ($ 0.99)');
assert.strictEqual(formatCurrency(0, '₹'), '₹ 0.00', 'Formats 0 as ₹ 0.00');
assert.strictEqual(formatCurrency(NaN, '₹'), '₹ 0.00', 'Handles NaN safely as ₹ 0.00');

console.log('✓ Currency formatting tests passed!\n');

// ----------------------------------------------------
// 4. Persistence / DTO Type Mapping
// ----------------------------------------------------
console.log('--- TEST 4: DTO Mapping for SQLite Persistence ---');

// Simulating saveCurrentBill mapping
const cartItems = [
  { item_no: 1, medicine_name: 'Paracetamol 650', batch_number: 'B1', brand_name: 'Dolo', exp_date: '12/2027', price: '32.50', quantity: 2 },
  { item_no: 2, medicine_name: 'Amoxicillin 500', batch_number: 'B2', brand_name: 'Novamox', exp_date: '08/2028', price: 78.25, quantity: 1 },
];

const mappedItems = cartItems.map((it) => ({
  item_no: it.item_no,
  medicine_name: it.medicine_name,
  batch_number: it.batch_number || '',
  brand_name: it.brand_name,
  exp_date: it.exp_date,
  price: parseFloat(String(it.price)) || 0,
  quantity: Number(it.quantity) || 1,
}));

assert.strictEqual(typeof mappedItems[0].price, 'number', 'Mapped item price is primitive number');
assert.strictEqual(mappedItems[0].price, 32.5, 'Mapped price matches 32.5');
assert.strictEqual(typeof mappedItems[1].price, 'number', 'Mapped item price is primitive number');
assert.strictEqual(mappedItems[1].price, 78.25, 'Mapped price matches 78.25');

const calculatedTotal = computeGrandTotal(cartItems);
assert.strictEqual(calculatedTotal, 143.25, '32.50 * 2 + 78.25 * 1 = 143.25');

console.log('✓ DTO persistence mapping tests passed!\n');

console.log('====================================================');
console.log('ALL VERIFICATION CHECKS COMPLETED SUCCESSFULLY (4/4)');
console.log('====================================================');
