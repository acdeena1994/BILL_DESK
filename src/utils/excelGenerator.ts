import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { ShopSettings } from '../db/settingsQueries';
import { Bill } from '../db/billQueries';
import { formatReadableDate } from './formatters';

interface GenerateSalesRegisterExcelParams {
  settings: ShopSettings;
  bills: Bill[];
  fromDate: string;
  toDate: string;
}

/**
 * Generates and shares an Excel (.xlsx) file containing the Sales Register.
 * Columns in order:
 * Bill No, Item No, Date, Doctor Name, Customer Name, Medicine Name, Batch Number, Brand Name, Exp Date, Price, Sign
 * Rows are grouped per bill with a bill total line.
 */
export const generateSalesRegisterExcel = async ({
  settings,
  bills,
  fromDate,
  toDate,
}: GenerateSalesRegisterExcelParams): Promise<string> => {
  const rows: any[][] = [];

  // Title & Shop Header rows
  rows.push([settings.shop_name || 'Apex Medico & Pharmacy']);
  rows.push([
    `Address: ${settings.address || '-'} | Phone: ${settings.phone || '-'} | GST: ${settings.gst_number || '-'} | Drug Lic: ${settings.drug_licence_number || '-'}`,
  ]);
  rows.push([`Sales Register Report (${formatReadableDate(fromDate)} to ${formatReadableDate(toDate)})`]);
  rows.push([]); // blank separator

  // Table Column Headers (matching PDF export column spec)
  rows.push([
    'Bill No',
    'Item No',
    'Date',
    'Doctor Name',
    'Customer Name',
    'Medicine Name',
    'Batch Number',
    'Brand Name',
    'Exp Date',
    'Price',
    'Sign',
  ]);

  let grandTotal = 0;

  // Group each bill's items into a self-contained row-block with its own total line
  bills.forEach((b) => {
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

    items.forEach((it, idx) => {
      const itemPrice = Number(it.price) || 0;
      const itemQty = Number(it.quantity) || 1;
      const itemTotal = itemPrice * itemQty;

      rows.push([
        b.bill_no,
        it.item_no || idx + 1,
        b.date,
        b.doctor_name || 'Self / Direct',
        b.customer_name || 'Walk-in Customer',
        it.medicine_name,
        it.batch_number || '-',
        it.brand_name || '-',
        it.exp_date || '-',
        itemTotal,
        '', // blank sign column
      ]);
    });

    const billTotal = Number(b.total_amount) || 0;
    grandTotal += billTotal;

    // Self-contained bill total row
    rows.push([
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      `Total for Bill #${b.bill_no}`,
      billTotal,
      '',
    ]);

    // Row separator between bills
    rows.push([]);
  });

  // Overall Grand Total row
  rows.push([
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'GRAND TOTAL',
    grandTotal,
    '',
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Set friendly column widths
  ws['!cols'] = [
    { wch: 12 }, // Bill No
    { wch: 8 },  // Item No
    { wch: 13 }, // Date
    { wch: 20 }, // Doctor Name
    { wch: 22 }, // Customer Name
    { wch: 26 }, // Medicine Name
    { wch: 14 }, // Batch Number
    { wch: 18 }, // Brand Name
    { wch: 12 }, // Exp Date
    { wch: 14 }, // Price
    { wch: 10 }, // Sign
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sales Register');

  const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  const filename = `Sales_Register_${fromDate}_to_${toDate}.xlsx`;
  const uri = `${FileSystem.cacheDirectory}${filename}`;

  await FileSystem.writeAsStringAsync(uri, wbout, {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'Download / Share Excel Sales Register',
      UTI: 'com.microsoft.excel.xlsx',
    });
  }

  return uri;
};
