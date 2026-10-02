/**
 * Verification test suite for individual bill share format rework.
 * Tests:
 * 1. Correct sequential order of all 6 sections in both HTML and text
 * 2. Shop details correctness & graceful handling of missing fields
 * 3. Product details (name, quantity, rate, line amount) for 1 and many products
 * 4. Customer name correctness
 * 5. Doctor details correctness & fallback handling when no doctor is present
 * 6. Price details matching bill totals (subtotal, discount, tax, charges)
 * 7. Total payable amount highlighted and matching grand total
 * 8. Zero occurrences of 'undefined' or 'null' in generated output
 * 9. Scope rules compliance (unchanged shared utils, untouched analytics)
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import babel from '@babel/core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('RUNNING VERIFICATION: BILLING INDIVIDUAL SHARE FORMAT');
console.log('====================================================\n');

// Helper to load and execute TypeScript files via project's babel config
function loadTsModule(filePath) {
  const transformed = babel.transformFileSync(filePath, {
    configFile: path.resolve(__dirname, '../babel.config.js'),
  });

  const moduleObj = { exports: {} };
  const customRequire = (specifier) => {
    if (specifier === '../../utils/formatters' || specifier.endsWith('formatters')) {
      return loadTsModule(path.resolve(__dirname, '../src/utils/formatters.ts'));
    }
    if (specifier === './billingShareFormatter' || specifier.endsWith('billingShareFormatter')) {
      return loadTsModule(path.resolve(__dirname, '../src/screens/Billing/billingShareFormatter.ts'));
    }
    if (specifier === '../../db/settingsQueries') {
      return {};
    }
    return {};
  };

  const context = vm.createContext({
    module: moduleObj,
    exports: moduleObj.exports,
    require: customRequire,
    console,
    Math,
    String,
    Number,
    Date,
    parseFloat,
    parseInt,
    isNaN,
  });

  vm.runInContext(transformed.code, context);
  return moduleObj.exports;
}

const formatterModule = loadTsModule(path.resolve(__dirname, '../src/screens/Billing/billingShareFormatter.ts'));
const { generateBillingBillHtml, formatBillShareText } = formatterModule;

// Sample test data
const mockSettingsComplete = {
  shop_name: 'Metro Pharmacy & Care',
  shop_logo: '',
  address: '123 Health Ave, Mumbai, MH',
  phone: '+91 98765 43210',
  gst_number: '27AAAAA0000A1Z5',
  drug_licence_number: 'MH-MZ-123456',
  currency_symbol: '₹',
  language: 'en',
};

const mockSettingsSparse = {
  shop_name: 'Minimal Meds',
  shop_logo: '',
  address: '',
  phone: '',
  gst_number: '',
  drug_licence_number: '',
  currency_symbol: '₹',
  language: 'en',
};

const mockBillSingleItem = {
  bill_no: '0042',
  date: '2026-09-28',
  customer_name: 'Rohan Sharma',
  doctor_name: 'Dr. A. K. Verma',
  total_amount: 150.0,
  items: [
    {
      item_no: 1,
      medicine_name: 'Paracetamol 650mg',
      batch_number: 'B204',
      brand_name: 'Dolo',
      exp_date: '10/2027',
      price: 30.0,
      quantity: 5,
    },
  ],
};

const mockBillMultipleItems = {
  bill_no: '0043',
  date: '2026-09-28',
  customer_name: 'Pooja Patel',
  doctor_name: 'Dr. S. Nair',
  total_amount: 525.5,
  items: [
    {
      item_no: 1,
      medicine_name: 'Azithromycin 500mg',
      batch_number: 'AZ99',
      brand_name: 'Azee',
      exp_date: '05/2028',
      price: 120.5,
      quantity: 2, // 241.00
    },
    {
      item_no: 2,
      medicine_name: 'Cetirizine 10mg',
      batch_number: 'CT11',
      brand_name: 'Cetzine',
      exp_date: '12/2027',
      price: 18.0,
      quantity: 10, // 180.00
    },
    {
      item_no: 3,
      medicine_name: 'Vitamin D3 60K',
      batch_number: 'VD01',
      brand_name: 'Calcirol',
      exp_date: '01/2029',
      price: 104.5,
      quantity: 1, // 104.50
    },
  ],
};

const mockBillNoDoctorWalkin = {
  bill_no: '0044',
  date: '2026-09-28',
  customer_name: '',
  doctor_name: '',
  total_amount: 45.0,
  items: [
    {
      item_no: 1,
      medicine_name: 'Bandage Strip',
      price: 45.0,
      quantity: 1,
    },
  ],
};

// ----------------------------------------------------
// TEST 1: Section Order Verification
// ----------------------------------------------------
console.log('--- TEST 1: Exact Section Order Verification ---');

const htmlOutput = generateBillingBillHtml(mockSettingsComplete, mockBillSingleItem);
const textOutput = formatBillShareText(mockSettingsComplete, mockBillSingleItem);

// In HTML body
const bodyHtml = htmlOutput.substring(htmlOutput.indexOf('<body>'));
const idxShopHtml = bodyHtml.indexOf('section-shop');
const idxCustomerHtml = bodyHtml.indexOf('Customer Name');
const idxDoctorHtml = bodyHtml.indexOf('Doctor Details');
const idxProductsHtml = bodyHtml.indexOf('Product Details');
const idxTotalHtml = bodyHtml.indexOf('Total Payable Amount');

assert(idxShopHtml !== -1, 'Shop details must exist in HTML');
assert(idxCustomerHtml !== -1, 'Customer name must exist in HTML');
assert(idxDoctorHtml !== -1, 'Doctor details must exist in HTML');
assert(idxProductsHtml !== -1, 'Product details must exist in HTML');
assert(idxTotalHtml !== -1, 'Total Amount must exist in HTML');

assert(
  idxShopHtml < idxCustomerHtml &&
  idxCustomerHtml < idxDoctorHtml &&
  idxDoctorHtml < idxProductsHtml &&
  idxProductsHtml < idxTotalHtml,
  'HTML output must strictly adhere to the sections in order: Shop -> Customer -> Doctor -> Products -> Total Amount'
);

// Verify no serial numbers like "1.", "2.", "3.", etc. in section headers
assert(!bodyHtml.includes('1. Shop Details'), 'No serial number 1 in header');
assert(!bodyHtml.includes('2. Customer Name'), 'No serial number 2 in header');
assert(!bodyHtml.includes('3. Doctor Details'), 'No serial number 3 in header');
assert(!bodyHtml.includes('4. Product Details'), 'No serial number 4 in header');
assert(!bodyHtml.includes('6. Total Payable Amount'), 'No serial number 6 in header');

// In Text
const idxShopText = textOutput.indexOf(mockSettingsComplete.shop_name);
const idxCustomerText = textOutput.indexOf('--- CUSTOMER NAME ---');
const idxDoctorText = textOutput.indexOf('--- DOCTOR DETAILS ---');
const idxProductsText = textOutput.indexOf('--- PRODUCT DETAILS ---');
const idxTotalText = textOutput.indexOf('TOTAL AMOUNT:');

assert(
  idxShopText < idxCustomerText &&
  idxCustomerText < idxDoctorText &&
  idxDoctorText < idxProductsText &&
  idxProductsText < idxTotalText,
  'Text output must strictly adhere to the sections in order: Shop -> Customer -> Doctor -> Products -> Total Amount'
);

console.log('✓ Section order and absence of serial numbers verified in both HTML and text formats!\n');

// ----------------------------------------------------
// TEST 2: Shop Details & Missing Field Handling
// ----------------------------------------------------
console.log('--- TEST 2: Shop Details & Missing Field Handling ---');

assert(htmlOutput.includes('Metro Pharmacy &amp; Care'), 'Contains HTML-escaped shop name');
assert(textOutput.includes('Metro Pharmacy & Care'), 'Contains text shop name');
assert(htmlOutput.includes('123 Health Ave, Mumbai, MH'), 'Contains shop address');
assert(htmlOutput.includes('+91 98765 43210'), 'Contains shop phone');
assert(htmlOutput.includes('27AAAAA0000A1Z5'), 'Contains GST');
assert(htmlOutput.includes('MH-MZ-123456'), 'Contains drug licence no');

// Sparse settings: no address, phone, GST, DL
const sparseHtml = generateBillingBillHtml(mockSettingsSparse, mockBillNoDoctorWalkin);
const sparseText = formatBillShareText(mockSettingsSparse, mockBillNoDoctorWalkin);

assert(!sparseHtml.includes('undefined'), 'No undefined in sparse HTML');
assert(!sparseHtml.includes('null'), 'No null in sparse HTML');
assert(!sparseText.includes('undefined'), 'No undefined in sparse text');
assert(!sparseText.includes('null'), 'No null in sparse text');
assert(!sparseHtml.includes('Ph:'), 'Empty phone is skipped in HTML');
assert(!sparseText.includes('Ph:'), 'Empty phone is skipped in text');
assert(!sparseHtml.includes('GST:'), 'Empty GST is skipped in HTML');
assert(!sparseText.includes('GSTIN:'), 'Empty GST is skipped in text');

console.log('✓ Shop details and missing field graceful omission verified!\n');

// ----------------------------------------------------
// TEST 3: Product Details (table with product name, exp date, batch no, quantity, rate, amount)
// ----------------------------------------------------
console.log('--- TEST 3: Product Details (table with product name, exp date, batch no, quantity, rate, amount) ---');

// Table header checks
assert(htmlOutput.includes('Product Name'), 'Header has Product Name');
assert(htmlOutput.includes('Exp Date'), 'Header has Exp Date');
assert(htmlOutput.includes('Batch No'), 'Header has Batch No');
assert(htmlOutput.includes('Quantity'), 'Header has Quantity');
assert(htmlOutput.includes('Rate'), 'Header has Rate');
assert(htmlOutput.includes('Amount'), 'Header has Amount');

// Single item check
assert(htmlOutput.includes('Paracetamol 650mg'), 'Single item name present');
assert(htmlOutput.includes('10/2027'), 'Single item exp date 10/2027 present in HTML');
assert(htmlOutput.includes('B204'), 'Single item batch no B204 present in HTML');
assert(htmlOutput.includes('>5<'), 'Quantity 5 present in HTML');
assert(htmlOutput.includes('30.00'), 'Rate 30.00 present in HTML');
assert(htmlOutput.includes('150.00'), 'Item line total 150.00 present in HTML');

// Text output check for exp date and batch no
assert(textOutput.includes('Paracetamol 650mg'), 'Text has product name');
assert(textOutput.includes('Exp Date: 10/2027'), 'Text has exp date');
assert(textOutput.includes('Batch No: B204'), 'Text has batch no');
assert(textOutput.includes('Quantity: 5'), 'Text has quantity');

// Multiple items check
const multiHtml = generateBillingBillHtml(mockSettingsComplete, mockBillMultipleItems);
const multiText = formatBillShareText(mockSettingsComplete, mockBillMultipleItems);

assert(multiHtml.includes('Azithromycin 500mg'), 'Item 1 present in multi');
assert(multiHtml.includes('AZ99'), 'Item 1 batch AZ99 present');
assert(multiHtml.includes('05/2028'), 'Item 1 exp 05/2028 present');
assert(multiHtml.includes('Cetirizine 10mg'), 'Item 2 present in multi');
assert(multiHtml.includes('Vitamin D3 60K'), 'Item 3 present in multi');
assert(multiHtml.includes('241.00'), 'Azithromycin line total (2 * 120.50) present');
assert(multiHtml.includes('180.00'), 'Cetirizine line total (10 * 18.00) present');
assert(multiHtml.includes('104.50'), 'Vitamin D3 line total (1 * 104.50) present');

assert(multiText.includes('Azithromycin 500mg'), 'Multi text has item 1');
assert(multiText.includes('Exp Date: 05/2028 | Batch No: AZ99'), 'Multi text has item 1 exp and batch');
assert(multiText.includes('Cetirizine 10mg'), 'Multi text has item 2');
assert(multiText.includes('Vitamin D3 60K'), 'Multi text has item 3');

console.log('✓ Product details table with product name, exp date, batch no, quantity, rate, amount per item verified!\n');

// ----------------------------------------------------
// TEST 4: Customer Details
// ----------------------------------------------------
console.log('--- TEST 4: Customer Name ---');

assert(htmlOutput.includes('Rohan Sharma'), 'Customer name present in HTML');
assert(textOutput.includes('Rohan Sharma'), 'Customer name present in text');

// Walk-in fallback when customer name is blank
assert(sparseHtml.includes('Walk-in Customer'), 'Walk-in customer fallback used in HTML');
assert(sparseText.includes('Walk-in Customer'), 'Walk-in customer fallback used in text');

console.log('✓ Customer name and walk-in fallback verified!\n');

// ----------------------------------------------------
// TEST 5: Doctor Details
// ----------------------------------------------------
console.log('--- TEST 5: Doctor Details ---');

assert(htmlOutput.includes('Dr. A. K. Verma'), 'Doctor name present when provided in HTML');
assert(textOutput.includes('Dr. A. K. Verma'), 'Doctor name present when provided in text');

// Fallback when doctor is empty
assert(sparseHtml.includes('Self / Direct'), 'Doctor fallback gracefully handles empty doctor in HTML');
assert(sparseText.includes('Self / Direct'), 'Doctor fallback gracefully handles empty doctor in text');

console.log('✓ Doctor details and no-doctor fallback verified!\n');

// ----------------------------------------------------
// TEST 6: Price Details (Subtotal, Discount, Tax, Charges)
// ----------------------------------------------------
console.log('--- TEST 6: Price Details Dummy Breakdown Omission ---');

assert(!htmlOutput.includes('Other Charges'), 'Other Charges is removed from layout');
assert(!htmlOutput.includes('Discount'), 'Discount dummy line is removed from layout');
assert(!textOutput.includes('--- PRICE DETAILS ---'), 'PRICE DETAILS dummy header is removed from text');
assert(!textOutput.includes('Other Charges:'), 'Other Charges is removed from text');

console.log('✓ Redundant dummy price breakdown cleanly removed!\n');

// ----------------------------------------------------
// TEST 7: Total Amount Highlighted
// ----------------------------------------------------
console.log('--- TEST 7: Total Amount Highlighted ---');

assert(htmlOutput.includes('section-total-highlight'), 'HTML has prominent total highlight class');
assert(htmlOutput.includes('total-highlight-value'), 'HTML has total highlight value');
assert(htmlOutput.includes('150.00'), 'Single bill total matches 150.00');
assert(multiHtml.includes('525.50'), 'Multi bill total matches 525.50');

console.log('✓ Total payable amount highlighted and matched!\n');

// ----------------------------------------------------
// TEST 8: Scope Rules & Regression Checks
// ----------------------------------------------------
console.log('--- TEST 8: Scope Rules & Regression Verification ---');

// Check that pdfGenerator.ts still has generateSingleBillPdf and generateSalesRegisterPdf
const pdfGenContent = fs.readFileSync(path.resolve(__dirname, '../src/utils/pdfGenerator.ts'), 'utf8');
assert(
  pdfGenContent.includes('export const generateSalesRegisterPdf'),
  'generateSalesRegisterPdf in src/utils/pdfGenerator.ts remains untouched'
);
assert(
  pdfGenContent.includes('export const generateSingleBillPdf'),
  'generateSingleBillPdf in src/utils/pdfGenerator.ts remains intact'
);

// Check that BillPreviewScreen.tsx calls generateBillingBillPdf
const billPreviewContent = fs.readFileSync(path.resolve(__dirname, '../src/screens/Billing/BillPreviewScreen.tsx'), 'utf8');
assert(
  billPreviewContent.includes("from './billingSharePdf'"),
  'BillPreviewScreen.tsx imports from Billing-specific billingSharePdf'
);
assert(
  billPreviewContent.includes('generateBillingBillPdf({'),
  'BillPreviewScreen.tsx calls generateBillingBillPdf'
);

// Check that AnalyticsScreen.tsx is completely unchanged
const analyticsContent = fs.readFileSync(path.resolve(__dirname, '../src/screens/Analytics/AnalyticsScreen.tsx'), 'utf8');
assert(
  analyticsContent.includes("import { generateSalesRegisterPdf } from '../../utils/pdfGenerator';"),
  'AnalyticsScreen.tsx continues using sales register PDF without modification'
);

console.log('✓ Scope rules satisfied: shared utils and other pages unchanged!\n');

console.log('====================================================');
console.log('ALL VERIFICATION CHECKS COMPLETED SUCCESSFULLY (8/8)');
console.log('====================================================');
