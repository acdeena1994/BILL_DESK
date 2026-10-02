import type { ShopSettings } from '../../db/settingsQueries';
import { formatCurrency, formatReadableDate } from '../../utils/formatters';

export interface BillingShareBillItem {
  item_no?: number;
  medicine_name: string;
  batch_number?: string;
  brand_name?: string;
  exp_date?: string;
  price?: number | string;
  quantity?: number;
}

export interface BillingShareBillData {
  bill_no: string;
  date: string;
  customer_name?: string;
  doctor_name?: string;
  total_amount?: number;
  items: BillingShareBillItem[];
}

/**
 * Escapes HTML characters safely
 */
export function escapeHtml(text?: string | null): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generates plain text format of the shared bill adhering to the section order without serial numbers:
 * - Shop details (shop name, address, phone, GST/license no., if available)
 * - Customer name
 * - Doctor details (doctor name, registration no./clinic, if available)
 * - Product details (table with product name, exp date, batch no, quantity, rate, amount per item)
 * - Total amount (final payable amount, clearly highlighted)
 */
export const formatBillShareText = (
  settings: ShopSettings,
  bill: BillingShareBillData
): string => {
  const currency = settings.currency_symbol || '₹';
  const lines: string[] = [];

  // Shop details
  const shopName = settings.shop_name?.trim() || 'Apex Medico & Pharmacy';
  lines.push(`*${shopName}*`);
  if (settings.address?.trim()) {
    lines.push(settings.address.trim());
  }
  if (settings.phone?.trim()) {
    lines.push(`Ph: ${settings.phone.trim()}`);
  }
  const taxIdParts: string[] = [];
  if (settings.gst_number?.trim()) {
    taxIdParts.push(`GSTIN: ${settings.gst_number.trim()}`);
  }
  if (settings.drug_licence_number?.trim()) {
    taxIdParts.push(`DL No: ${settings.drug_licence_number.trim()}`);
  }
  if (taxIdParts.length > 0) {
    lines.push(taxIdParts.join(' | '));
  }
  lines.push(`Invoice No: ${bill.bill_no || '-'} | Date: ${formatReadableDate(bill.date)}`);
  lines.push('');

  // Customer name
  lines.push('--- CUSTOMER NAME ---');
  const customerName = bill.customer_name?.trim() || 'Walk-in Customer';
  lines.push(`Customer: ${customerName}`);
  lines.push('');

  // Doctor details
  const doctorName = bill.doctor_name?.trim();
  lines.push('--- DOCTOR DETAILS ---');
  if (doctorName && doctorName !== 'Self' && doctorName !== 'Self / Direct') {
    lines.push(`Doctor: ${doctorName}`);
  } else if (doctorName) {
    lines.push(`Doctor: ${doctorName}`);
  } else {
    lines.push('Doctor: Self / Direct');
  }
  lines.push('');

  // Product details
  lines.push('--- PRODUCT DETAILS ---');
  const items = bill.items && bill.items.length > 0 ? bill.items : [];
  let subtotal = 0;
  items.forEach((it, idx) => {
    const qty = Number(it.quantity) || 1;
    const rate = parseFloat(String(it.price)) || 0;
    const lineTotal = Math.round((qty * rate + Number.EPSILON) * 100) / 100;
    subtotal += lineTotal;
    const itemNum = it.item_no || idx + 1;
    const expDate = it.exp_date?.trim() || '—';
    const batchNo = it.batch_number?.trim() || '—';
    lines.push(`${itemNum}. ${it.medicine_name}`);
    lines.push(`   Exp Date: ${expDate} | Batch No: ${batchNo}`);
    lines.push(`   Quantity: ${qty} | Rate: ${formatCurrency(rate, currency)} | Amount: ${formatCurrency(lineTotal, currency)}`);
  });
  subtotal = Math.round((subtotal + Number.EPSILON) * 100) / 100;
  lines.push('');

  // Total amount
  const finalTotal = bill.total_amount !== undefined ? bill.total_amount : subtotal;
  lines.push('========================================');
  lines.push(`TOTAL AMOUNT: ${formatCurrency(finalTotal, currency)}`);
  lines.push('========================================');

  return lines.join('\n');
};

/**
 * Generates the HTML markup adhering to the order without serial numbers:
 * - Shop details (shop name, address, phone, GST/license no., if available)
 * - Customer name
 * - Doctor details (doctor name, registration no./clinic, if available)
 * - Product details (table with product name, exp date, batch no, quantity, rate, amount per item)
 * - Total amount (final payable amount, clearly highlighted)
 */
export const generateBillingBillHtml = (
  settings: ShopSettings,
  bill: BillingShareBillData,
  logoDataUri: string | null = null
): string => {
  const currency = settings.currency_symbol || '₹';

  // Shop details preparation
  const shopName = escapeHtml(settings.shop_name || 'Apex Medico & Pharmacy');
  const address = escapeHtml(settings.address?.trim() || '');
  const phone = escapeHtml(settings.phone?.trim() || '');
  const gst = escapeHtml(settings.gst_number?.trim() || '');
  const drugLicence = escapeHtml(settings.drug_licence_number?.trim() || '');

  const shopMetaLines: string[] = [];
  if (address) shopMetaLines.push(address);
  if (phone) shopMetaLines.push(`Ph: ${phone}`);
  if (gst) shopMetaLines.push(`GST: <strong>${gst}</strong>`);
  if (drugLicence) shopMetaLines.push(`DL No: <strong>${drugLicence}</strong>`);

  const logoHtml = logoDataUri
    ? `<img src="${logoDataUri}" alt="Logo" class="shop-logo" />`
    : `<div class="logo-fallback">+</div>`;

  // Customer name preparation
  const customerName = escapeHtml(bill.customer_name?.trim() || 'Walk-in Customer');

  // Doctor details preparation
  const rawDoctor = bill.doctor_name?.trim();
  let doctorDisplay = 'Self / Direct';
  if (rawDoctor && rawDoctor !== 'Self' && rawDoctor !== 'Self / Direct') {
    doctorDisplay = escapeHtml(rawDoctor);
  } else if (rawDoctor) {
    doctorDisplay = escapeHtml(rawDoctor);
  }

  // Product details preparation
  const items = bill.items && bill.items.length > 0 ? bill.items : [];
  let calculatedSubtotal = 0;

  const itemRowsHtml = items
    .map((it, idx) => {
      const qty = Number(it.quantity) || 1;
      const rate = parseFloat(String(it.price)) || 0;
      const lineTotal = Math.round((qty * rate + Number.EPSILON) * 100) / 100;
      calculatedSubtotal += lineTotal;
      const itemNum = it.item_no || idx + 1;
      const medName = escapeHtml(it.medicine_name || 'Medicine Item');
      const expDate = escapeHtml(it.exp_date?.trim() || '—');
      const batchNo = escapeHtml(it.batch_number?.trim() || '—');
      const brand = it.brand_name?.trim() ? escapeHtml(it.brand_name.trim()) : '';

      return `
        <tr class="item-row ${idx % 2 === 1 ? 'alt-row' : ''}">
          <td class="text-center font-mono col-num">${itemNum}</td>
          <td>
            <div class="product-name font-bold">${medName}</div>
            ${brand ? `<div class="product-subtext">${brand}</div>` : ''}
          </td>
          <td class="text-center font-mono col-exp">${expDate}</td>
          <td class="text-center font-mono col-batch">${batchNo}</td>
          <td class="text-center font-bold col-qty">${qty}</td>
          <td class="text-right font-mono col-rate">${formatCurrency(rate, currency)}</td>
          <td class="text-right font-bold col-amt">${formatCurrency(lineTotal, currency)}</td>
        </tr>
      `;
    })
    .join('');

  calculatedSubtotal = Math.round((calculatedSubtotal + Number.EPSILON) * 100) / 100;

  // Total amount preparation
  const grandTotal = bill.total_amount !== undefined ? bill.total_amount : calculatedSubtotal;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice - ${escapeHtml(bill.bill_no)}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 14mm 16mm 14mm;
            @bottom-right {
              content: "Page " counter(page) " of " counter(pages);
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-size: 9px;
              color: #64748B;
            }
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #1E293B;
            background-color: #FFFFFF;
            margin: 0;
            padding: 0;
            font-size: 11px;
            line-height: 1.4;
          }
          .invoice-card {
            width: 100%;
            margin: 0 auto;
          }

          /* SHOP DETAILS */
          .section-shop {
            border-bottom: 2.5px solid #091540;
            padding-bottom: 12px;
            margin-bottom: 14px;
          }
          .shop-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .shop-info-wrapper {
            display: flex;
            align-items: center;
          }
          .shop-logo {
            height: 52px;
            max-width: 80px;
            object-fit: contain;
            margin-right: 14px;
            border-radius: 4px;
          }
          .logo-fallback {
            width: 44px;
            height: 44px;
            background-color: #091540;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #FFFFFF;
            font-weight: 800;
            font-size: 24px;
            margin-right: 14px;
          }
          .shop-title {
            font-size: 20px;
            font-weight: 800;
            color: #091540;
            margin: 0 0 4px 0;
            letter-spacing: -0.2px;
          }
          .shop-meta-line {
            font-size: 10.5px;
            color: #475569;
            margin-bottom: 2px;
          }
          .invoice-banner {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background-color: #F1F5F9;
            border: 1px solid #CBD5E1;
            border-radius: 6px;
            padding: 7px 12px;
            margin-top: 10px;
          }
          .invoice-tag {
            font-size: 12px;
            font-weight: 800;
            color: #091540;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .invoice-meta-date {
            font-size: 11px;
            color: #334155;
          }

          /* SECTION HEADERS */
          .section-title {
            font-size: 11.5px;
            font-weight: 700;
            color: #091540;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 6px;
            display: flex;
            align-items: center;
          }
          .section-title::after {
            content: "";
            flex: 1;
            height: 1px;
            background-color: #E2E8F0;
            margin-left: 8px;
          }

          /* CUSTOMER & DOCTOR DETAILS */
          .details-grid {
            display: flex;
            gap: 12px;
            margin-bottom: 14px;
          }
          .detail-box {
            flex: 1;
            background-color: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 6px;
            padding: 9px 12px;
          }
          .detail-box-label {
            font-size: 9.5px;
            font-weight: 700;
            color: #64748B;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 3px;
          }
          .detail-box-value {
            font-size: 12.5px;
            font-weight: 700;
            color: #0F172A;
          }

          /* PRODUCT DETAILS */
          .section-products {
            margin-bottom: 14px;
          }
          table.products-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 4px;
          }
          table.products-table th {
            background-color: #091540;
            color: #FFFFFF;
            font-size: 10px;
            font-weight: 700;
            padding: 8px 6px;
            letter-spacing: 0.3px;
            text-align: left;
            border: 1px solid #091540;
          }
          table.products-table td {
            padding: 7px 6px;
            font-size: 10.5px;
            border: 1px solid #E2E8F0;
            vertical-align: middle;
          }
          .alt-row {
            background-color: #F8FAFC;
          }
          .product-name {
            color: #0F172A;
            font-size: 11px;
          }
          .product-subtext {
            font-size: 9px;
            color: #64748B;
            margin-top: 1px;
          }
          .col-num {
            width: 26px;
          }
          .col-exp {
            width: 68px;
          }
          .col-batch {
            width: 72px;
          }
          .col-qty {
            width: 55px;
          }
          .col-rate {
            width: 75px;
          }
          .col-amt {
            width: 85px;
            color: #091540;
          }

          /* TOTAL AMOUNT (CLEARLY HIGHLIGHTED) */
          .section-total-highlight {
            background: linear-gradient(135deg, #091540 0%, #172554 100%);
            color: #FFFFFF;
            border-radius: 8px;
            padding: 12px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            margin-bottom: 16px;
          }
          .total-highlight-label {
            font-size: 13px;
            font-weight: 800;
            letter-spacing: 0.6px;
            text-transform: uppercase;
          }
          .total-highlight-value {
            font-size: 20px;
            font-weight: 900;
            letter-spacing: 0.3px;
          }

          /* FOOTER NOTICE */
          .print-notice {
            text-align: center;
            font-size: 8.5px;
            color: #94A3B8;
            margin-top: 14px;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: 700; }
          .font-mono { font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="invoice-card">
          <!-- SHOP DETAILS -->
          <div class="section-shop">
            <div class="shop-header">
              <div class="shop-info-wrapper">
                ${logoHtml}
                <div>
                  <h1 class="shop-title">${shopName}</h1>
                  ${shopMetaLines.length > 0 ? `<div class="shop-meta-line">${shopMetaLines.join(' | ')}</div>` : ''}
                </div>
              </div>
            </div>
            <div class="invoice-banner">
              <span class="invoice-tag">Customer Tax Invoice</span>
              <span class="invoice-meta-date">Invoice No: <strong>${escapeHtml(bill.bill_no)}</strong> &nbsp;|&nbsp; Date: <strong>${formatReadableDate(bill.date)}</strong></span>
            </div>
          </div>

          <!-- CUSTOMER NAME & DOCTOR DETAILS -->
          <div class="details-grid">
            <!-- CUSTOMER NAME -->
            <div class="detail-box">
              <div class="detail-box-label">Customer Name</div>
              <div class="detail-box-value">${customerName}</div>
            </div>

            <!-- DOCTOR DETAILS -->
            <div class="detail-box">
              <div class="detail-box-label">Doctor Details</div>
              <div class="detail-box-value">${doctorDisplay}</div>
            </div>
          </div>

          <!-- PRODUCT DETAILS -->
          <div class="section-products">
            <div class="section-title">Product Details (${items.length})</div>
            <table class="products-table">
              <thead>
                <tr>
                  <th class="text-center col-num">#</th>
                  <th>Product Name</th>
                  <th class="text-center col-exp">Exp Date</th>
                  <th class="text-center col-batch">Batch No</th>
                  <th class="text-center col-qty">Quantity</th>
                  <th class="text-right col-rate">Rate</th>
                  <th class="text-right col-amt">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemRowsHtml}
              </tbody>
            </table>
          </div>

          <!-- TOTAL AMOUNT (CLEARLY HIGHLIGHTED) -->
          <div class="section-total-highlight">
            <span class="total-highlight-label">Total Payable Amount</span>
            <span class="total-highlight-value">${formatCurrency(grandTotal, currency)}</span>
          </div>

          <!-- Computer generated disclaimer -->
          <div class="print-notice">
            Computer generated official invoice • Powered by Bill Desk Pharmacy Management
          </div>
        </div>
      </body>
    </html>
  `;
};
