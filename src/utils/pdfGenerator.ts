import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { ShopSettings } from '../db/settingsQueries';
import { Bill } from '../db/billQueries';
import { formatReadableDate } from './formatters';

interface GenerateSalesRegisterPdfParams {
  settings: ShopSettings;
  bills: Bill[];
  fromDate: string;
  toDate: string;
}

interface GenerateSingleBillPdfParams {
  settings: ShopSettings;
  bill: {
    bill_no: string;
    date: string;
    customer_name: string;
    doctor_name: string;
    total_amount: number;
    items: Array<{
      item_no: number;
      medicine_name: string;
      batch_number?: string;
      brand_name?: string;
      exp_date?: string;
      price?: number;
      quantity: number;
    }>;
  };
}

/**
 * Converts a local file/content URI into a Base64 data URI so expo-print's
 * WebView renderer displays the logo reliably without origin isolation failures.
 */
export const getLogoDataUri = async (logoUri?: string): Promise<string | null> => {
  if (!logoUri || !logoUri.trim()) return null;

  // Already a base64 data URI
  if (logoUri.startsWith('data:image/')) {
    return logoUri;
  }

  // Remote URL
  if (logoUri.startsWith('http://') || logoUri.startsWith('https://')) {
    return logoUri;
  }

  // Local file / content URI
  try {
    const base64 = await FileSystem.readAsStringAsync(logoUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    let mime = 'image/png';
    const lower = logoUri.toLowerCase();
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
      mime = 'image/jpeg';
    } else if (lower.endsWith('.webp')) {
      mime = 'image/webp';
    } else if (lower.endsWith('.gif')) {
      mime = 'image/gif';
    }

    return `data:${mime};base64,${base64}`;
  } catch (err) {
    console.warn('Failed to read logo image as Base64:', err);
    return null;
  }
};

/**
 * Generates and shares a comprehensive multi-page Sales Register PDF table.
 * Columns (in order):
 * | Bill No | Item No | Date | Doctor Name | Customer Name | Medicine Name | Quantity | Batch Number | Brand Name | Exp Date | Sign |
 * Grouped per bill with repeating header and page numbering.
 */
export const generateSalesRegisterPdf = async ({
  settings,
  bills,
  fromDate,
  toDate,
}: GenerateSalesRegisterPdfParams): Promise<string> => {
  const logoDataUri = await getLogoDataUri(settings.shop_logo);

  const logoHtml = logoDataUri
    ? `<img src="${logoDataUri}" alt="Logo" class="shop-logo" />`
    : `<div class="logo-fallback">+</div>`;

  const tableBodiesHtml = bills
    .map((b, bIdx) => {
      const items = b.items && b.items.length > 0 ? b.items : [
        {
          item_no: 1,
          medicine_name: 'Standard Order',
          batch_number: '-',
          brand_name: '-',
          exp_date: '-',
          price: b.total_amount,
          quantity: 1,
        },
      ];

      const rowCount = items.length;

      const itemRowsHtml = items
        .map((it, iIdx) => {
          const qty = it.quantity ?? (it as any).qty ?? 1;

          if (iIdx === 0) {
            return `
              <tr class="item-row">
                <td rowspan="${rowCount}" class="td text-center font-bold bill-no-cell">${escapeHtml(b.bill_no)}</td>
                <td class="td text-center">${it.item_no || 1}</td>
                <td rowspan="${rowCount}" class="td text-center nowrap">${formatReadableDate(b.date)}</td>
                <td rowspan="${rowCount}" class="td text-muted">${escapeHtml(b.doctor_name || 'Self')}</td>
                <td rowspan="${rowCount}" class="td font-medium">${escapeHtml(b.customer_name || 'Walk-in')}</td>
                <td class="td font-bold">${escapeHtml(it.medicine_name)}</td>
                <td class="td text-center font-medium">${qty}</td>
                <td class="td text-center font-mono">${escapeHtml(it.batch_number || '-')}</td>
                <td class="td text-muted">${escapeHtml(it.brand_name || '-')}</td>
                <td class="td text-center">${escapeHtml(it.exp_date || '-')}</td>
                <td rowspan="${rowCount}" class="td text-center sign-cell">
                  <div class="sig-line"></div>
                </td>
              </tr>
            `;
          }

          return `
            <tr class="item-row">
              <td class="td text-center">${it.item_no || iIdx + 1}</td>
              <td class="td font-bold">${escapeHtml(it.medicine_name)}</td>
              <td class="td text-center font-medium">${qty}</td>
              <td class="td text-center font-mono">${escapeHtml(it.batch_number || '-')}</td>
              <td class="td text-muted">${escapeHtml(it.brand_name || '-')}</td>
              <td class="td text-center">${escapeHtml(it.exp_date || '-')}</td>
            </tr>
          `;
        })
        .join('');

      return `
        <tbody class="bill-block ${bIdx % 2 === 1 ? 'alt-bill' : ''}">
          ${itemRowsHtml}
        </tbody>
      `;
    })
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Sales Register / Bill Report</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 10mm 10mm 15mm 10mm;
            @bottom-right {
              content: "Page " counter(page) " of " counter(pages);
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-size: 9px;
              font-weight: 600;
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
            font-size: 10.5px;
            line-height: 1.35;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
          tbody.bill-block {
            page-break-inside: avoid;
            break-inside: avoid;
            border-bottom: 2px solid #091540;
          }
          .alt-bill {
            background-color: #F8FAFC;
          }
          .header-wrapper {
            background-color: #FFFFFF;
            padding-bottom: 8px;
            margin-bottom: 8px;
            border-bottom: 2.5px solid #091540;
          }
          .header-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .header-left {
            display: flex;
            align-items: center;
          }
          .shop-logo {
            height: 48px;
            max-width: 80px;
            object-fit: contain;
            margin-right: 12px;
            border-radius: 4px;
          }
          .logo-fallback {
            width: 42px;
            height: 42px;
            background-color: #091540;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #FFFFFF;
            font-weight: 800;
            font-size: 22px;
            margin-right: 12px;
          }
          .shop-title {
            font-size: 18px;
            font-weight: 800;
            color: #091540;
            margin: 0 0 3px 0;
            letter-spacing: 0.2px;
          }
          .shop-meta {
            font-size: 10px;
            color: #64748B;
            line-height: 1.35;
          }
          .report-banner {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background-color: #F1F5F9;
            border: 1px solid #CBD5E1;
            border-radius: 5px;
            padding: 6px 10px;
            margin-top: 8px;
          }
          .report-title {
            font-size: 12px;
            font-weight: 700;
            color: #091540;
            text-transform: uppercase;
            letter-spacing: 0.4px;
          }
          .report-range {
            font-size: 10.5px;
            color: #334155;
          }
          .th-header-cell {
            padding: 0;
            border: none;
            background: #FFFFFF;
            font-weight: normal;
            text-align: left;
          }
          .table-header-row th {
            background-color: #091540;
            color: #FFFFFF;
            font-size: 9.5px;
            font-weight: 700;
            padding: 7px 5px;
            text-align: left;
            letter-spacing: 0.2px;
            border: 1px solid #091540;
          }
          .td {
            padding: 5px 5px;
            font-size: 10px;
            border: 1px solid #CBD5E1;
            vertical-align: middle;
          }
          .bill-no-cell {
            color: #091540;
            font-size: 11px;
          }
          .font-bold {
            font-weight: 700;
          }
          .font-medium {
            font-weight: 600;
          }
          .font-mono {
            font-family: monospace;
            font-size: 9.5px;
          }
          .text-center {
            text-align: center;
          }
          .text-right {
            text-align: right;
          }
          .text-muted {
            color: #64748B;
          }
          .sub-text {
            font-size: 8.5px;
            color: #64748B;
            font-weight: normal;
          }
          .nowrap {
            white-space: nowrap;
          }
          .sign-cell {
            width: 58px;
            vertical-align: bottom;
            padding-bottom: 6px;
          }
          .sig-line {
            border-bottom: 1px solid #94A3B8;
            height: 16px;
            width: 48px;
            margin: 0 auto;
          }
          .print-notice {
            text-align: center;
            font-size: 8.5px;
            color: #94A3B8;
            margin-top: 14px;
          }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>
              <th colspan="11" class="th-header-cell">
                <div class="header-wrapper">
                  <div class="header-row">
                    <div class="header-left">
                      ${logoHtml}
                      <div>
                        <h1 class="shop-title">${escapeHtml(settings.shop_name || 'Apex Medico & Pharmacy')}</h1>
                        <div class="shop-meta">
                          ${escapeHtml(settings.address || '')} | Ph: ${escapeHtml(settings.phone || '-')}
                          ${settings.gst_number ? ` | GST: <strong>${escapeHtml(settings.gst_number)}</strong>` : ''}
                          ${settings.drug_licence_number ? ` | Drug Licence No: <strong>${escapeHtml(settings.drug_licence_number)}</strong>` : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="report-banner">
                    <span class="report-title">Sales Register / Bill Report</span>
                    <span class="report-range">Date Range: <strong>${formatReadableDate(fromDate)}</strong> to <strong>${formatReadableDate(toDate)}</strong></span>
                  </div>
                </div>
              </th>
            </tr>
            <tr class="table-header-row">
              <th style="width: 58px; text-align: center;">Bill No</th>
              <th style="width: 40px; text-align: center;">Item No</th>
              <th style="width: 70px; text-align: center;">Date</th>
              <th style="width: 90px;">Doctor Name</th>
              <th style="width: 100px;">Customer Name</th>
              <th style="width: 135px;">Medicine Name</th>
              <th style="width: 45px; text-align: center;">Quantity</th>
              <th style="width: 72px; text-align: center;">Batch Number</th>
              <th style="width: 90px;">Brand Name</th>
              <th style="width: 62px; text-align: center;">Exp Date</th>
              <th style="width: 58px; text-align: center;">Sign</th>
            </tr>
          </thead>
          ${tableBodiesHtml}
        </table>

        <div class="print-notice">
          Computer generated official sales register document • Powered by Bill Desk Pharmacy Management
        </div>
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Share / Save Sales Register PDF',
      UTI: 'com.adobe.pdf',
    });
  }

  return uri;
};

/**
 * Generates single invoice PDF for an individual bill using the exact same header and column format
 * | Bill No | Item No | Date | Customer Name | Doctor Name | Medicine Name | Quantity | Batch Number | Brand Name | Exp Date | Sign |
 */
export const generateSingleBillPdf = async ({
  settings,
  bill,
}: GenerateSingleBillPdfParams): Promise<string> => {
  const logoDataUri = await getLogoDataUri(settings.shop_logo);

  const logoHtml = logoDataUri
    ? `<img src="${logoDataUri}" alt="Logo" class="shop-logo" />`
    : `<div class="logo-fallback">+</div>`;

  const items = bill.items && bill.items.length > 0 ? bill.items : [
    {
      item_no: 1,
      medicine_name: 'Standard Order',
      batch_number: '-',
      brand_name: '-',
      exp_date: '-',
      price: bill.total_amount || 0,
      quantity: 1,
    },
  ];

  const rowCount = items.length;

  const itemRowsHtml = items
    .map((it, iIdx) => {
      const qty = it.quantity ?? (it as any).qty ?? 1;

      if (iIdx === 0) {
        return `
          <tr class="item-row">
            <td rowspan="${rowCount}" class="td text-center font-bold bill-no-cell">${escapeHtml(bill.bill_no)}</td>
            <td class="td text-center">${it.item_no || 1}</td>
            <td rowspan="${rowCount}" class="td text-center nowrap">${formatReadableDate(bill.date)}</td>
            <td rowspan="${rowCount}" class="td font-medium">${escapeHtml(bill.customer_name || 'Walk-in')}</td>
            <td rowspan="${rowCount}" class="td text-muted">${escapeHtml(bill.doctor_name || 'Self')}</td>
            <td class="td font-bold">${escapeHtml(it.medicine_name)}</td>
            <td class="td text-center font-medium">${qty}</td>
            <td class="td text-center font-mono">${escapeHtml(it.batch_number || '-')}</td>
            <td class="td text-muted">${escapeHtml(it.brand_name || '-')}</td>
            <td class="td text-center">${escapeHtml(it.exp_date || '-')}</td>
            <td rowspan="${rowCount}" class="td text-center sign-cell">
              <div class="sig-line"></div>
            </td>
          </tr>
        `;
      }

      return `
        <tr class="item-row">
          <td class="td text-center">${it.item_no || iIdx + 1}</td>
          <td class="td font-bold">${escapeHtml(it.medicine_name)}</td>
          <td class="td text-center font-medium">${qty}</td>
          <td class="td text-center font-mono">${escapeHtml(it.batch_number || '-')}</td>
          <td class="td text-muted">${escapeHtml(it.brand_name || '-')}</td>
          <td class="td text-center">${escapeHtml(it.exp_date || '-')}</td>
        </tr>
      `;
    })
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice - ${escapeHtml(bill.bill_no)}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 10mm 10mm 15mm 10mm;
            @bottom-right {
              content: "Page " counter(page) " of " counter(pages);
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-size: 9px;
              font-weight: 600;
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
            line-height: 1.35;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          thead {
            display: table-header-group;
          }
          tbody.bill-block {
            page-break-inside: avoid;
            break-inside: avoid;
            border-bottom: 2px solid #091540;
          }
          .header-wrapper {
            background-color: #FFFFFF;
            padding-bottom: 8px;
            margin-bottom: 8px;
            border-bottom: 2.5px solid #091540;
          }
          .header-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .header-left {
            display: flex;
            align-items: center;
          }
          .shop-logo {
            height: 48px;
            max-width: 80px;
            object-fit: contain;
            margin-right: 12px;
            border-radius: 4px;
          }
          .logo-fallback {
            width: 42px;
            height: 42px;
            background-color: #091540;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #FFFFFF;
            font-weight: 800;
            font-size: 22px;
            margin-right: 12px;
          }
          .shop-title {
            font-size: 18px;
            font-weight: 800;
            color: #091540;
            margin: 0 0 3px 0;
            letter-spacing: 0.2px;
          }
          .shop-meta {
            font-size: 10px;
            color: #64748B;
            line-height: 1.35;
          }
          .report-banner {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background-color: #F1F5F9;
            border: 1px solid #CBD5E1;
            border-radius: 5px;
            padding: 6px 10px;
            margin-top: 8px;
          }
          .report-title {
            font-size: 12px;
            font-weight: 700;
            color: #091540;
            text-transform: uppercase;
            letter-spacing: 0.4px;
          }
          .report-range {
            font-size: 10.5px;
            color: #334155;
          }
          .th-header-cell {
            padding: 0;
            border: none;
            background: #FFFFFF;
            font-weight: normal;
            text-align: left;
          }
          .table-header-row th {
            background-color: #091540;
            color: #FFFFFF;
            font-size: 9.5px;
            font-weight: 700;
            padding: 7px 5px;
            text-align: left;
            letter-spacing: 0.2px;
            border: 1px solid #091540;
          }
          .td {
            padding: 6px 5px;
            font-size: 10.5px;
            border: 1px solid #CBD5E1;
            vertical-align: middle;
          }
          .bill-no-cell {
            color: #091540;
            font-size: 11.5px;
          }
          .font-bold {
            font-weight: 700;
          }
          .font-medium {
            font-weight: 600;
          }
          .font-mono {
            font-family: monospace;
            font-size: 10px;
          }
          .text-center {
            text-align: center;
          }
          .text-right {
            text-align: right;
          }
          .text-muted {
            color: #64748B;
          }
          .sub-text {
            font-size: 8.5px;
            color: #64748B;
            font-weight: normal;
          }
          .nowrap {
            white-space: nowrap;
          }
          .sign-cell {
            width: 58px;
            vertical-align: bottom;
            padding-bottom: 6px;
          }
          .sig-line {
            border-bottom: 1px solid #94A3B8;
            height: 16px;
            width: 48px;
            margin: 0 auto;
          }
          .print-notice {
            text-align: center;
            font-size: 8.5px;
            color: #94A3B8;
            margin-top: 16px;
          }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>
              <th colspan="11" class="th-header-cell">
                <div class="header-wrapper">
                  <div class="header-row">
                    <div class="header-left">
                      ${logoHtml}
                      <div>
                        <h1 class="shop-title">${escapeHtml(settings.shop_name || 'Apex Medico & Pharmacy')}</h1>
                        <div class="shop-meta">
                          ${escapeHtml(settings.address || '')} | Ph: ${escapeHtml(settings.phone || '-')}
                          ${settings.gst_number ? ` | GST: <strong>${escapeHtml(settings.gst_number)}</strong>` : ''}
                          ${settings.drug_licence_number ? ` | Drug Licence No: <strong>${escapeHtml(settings.drug_licence_number)}</strong>` : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="report-banner">
                    <span class="report-title">Customer Tax Invoice</span>
                    <span class="report-range">Invoice No: <strong>${escapeHtml(bill.bill_no)}</strong> | Date: <strong>${formatReadableDate(bill.date)}</strong></span>
                  </div>
                </div>
              </th>
            </tr>
            <tr class="table-header-row">
              <th style="width: 58px; text-align: center;">Bill No</th>
              <th style="width: 40px; text-align: center;">Item No</th>
              <th style="width: 70px; text-align: center;">Date</th>
              <th style="width: 100px;">Customer Name</th>
              <th style="width: 90px;">Doctor Name</th>
              <th style="width: 135px;">Medicine Name</th>
              <th style="width: 45px; text-align: center;">Quantity</th>
              <th style="width: 72px; text-align: center;">Batch Number</th>
              <th style="width: 90px;">Brand Name</th>
              <th style="width: 62px; text-align: center;">Exp Date</th>
              <th style="width: 58px; text-align: center;">Sign</th>
            </tr>
          </thead>
          <tbody class="bill-block">
            ${itemRowsHtml}
          </tbody>
        </table>

        <div class="print-notice">
          Computer generated official invoice • Powered by Bill Desk Pharmacy Management
        </div>
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Share Invoice ${bill.bill_no}`,
      UTI: 'com.adobe.pdf',
    });
  }
  return uri;
};

function escapeHtml(text: string): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
