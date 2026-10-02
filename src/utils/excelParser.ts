import * as FileSystem from 'expo-file-system';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export interface ExcelStockRow {
  product_id: string;
  brand_name: string;
  manufacturer: string;
  pack_unit: string;
  packaging_raw: string;
  batch_number?: string;
}

/**
 * Copies the uploaded Excel/CSV/JSON file to the app's private sandbox backup directory:
 * FileSystem.documentDirectory + 'stock/imports/'
 */
export const saveBackupImportFile = async (
  sourceUri: string,
  originalName?: string
): Promise<string> => {
  const importsDir = `${FileSystem.documentDirectory}stock/imports/`;
  const dirInfo = await FileSystem.getInfoAsync(importsDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(importsDir, { intermediates: true });
  }

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const ext = originalName?.includes('.') ? originalName.split('.').pop() : 'xlsx';
  const targetFileName = `stock_import_${dateStr}_${Date.now()}.${ext}`;
  const targetPath = `${importsDir}${targetFileName}`;

  await FileSystem.copyAsync({
    from: sourceUri,
    to: targetPath,
  });

  return targetPath;
};

/**
 * Parses an Excel (.xlsx, .xls), CSV, or JSON file into the standard 6-column stock schema:
 * 1: product_id
 * 2: brand_name
 * 3: manufacturer
 * 4: pack_unit
 * 5: packaging_raw
 * 6: batch_number
 */
export const parseStockFile = async (
  fileUri: string,
  fileName?: string
): Promise<ExcelStockRow[]> => {
  const lowerName = (fileName || fileUri).toLowerCase();
  const isJson = lowerName.endsWith('.json');
  const isCsv = lowerName.endsWith('.csv');

  // Fast CSV parsing using PapaParse (optimized for 450,000+ rows)
  if (isCsv) {
    const textContent = await FileSystem.readAsStringAsync(fileUri);
    const parsed = Papa.parse<string[]>(textContent, {
      skipEmptyLines: 'greedy',
      fastMode: true,
    });

    const rawRows = parsed.data;
    if (!rawRows || rawRows.length === 0) {
      throw new Error('The selected CSV file is empty.');
    }

    const firstRow = rawRows[0] || [];
    const firstRowStr = firstRow.map((c) => String(c).toLowerCase().trim()).join(' ');
    const hasHeader =
      firstRowStr.includes('product') ||
      firstRowStr.includes('brand') ||
      firstRowStr.includes('manufacturer') ||
      firstRowStr.includes('pack') ||
      firstRowStr.includes('packaging') ||
      firstRowStr.includes('batch') ||
      firstRowStr.includes('name') ||
      firstRowStr.includes('id');

    const dataRows = hasHeader ? rawRows.slice(1) : rawRows;
    const parsedItems: ExcelStockRow[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      if (!row || row.length === 0) continue;

      const productId = String(row[0] ?? '').trim();
      const brandName = String(row[1] ?? '').trim();
      const manufacturer = String(row[2] ?? '').trim();
      const packUnit = String(row[3] ?? '').trim();
      const packagingRaw = String(row[4] ?? '').trim();
      const batchNumber = String(row[5] ?? '').trim();

      if (!productId && !brandName && !manufacturer) {
        continue;
      }

      parsedItems.push({
        product_id: productId || `PROD-${Date.now()}-${i + 1}`,
        brand_name: brandName || 'Unnamed Product',
        manufacturer,
        pack_unit: packUnit,
        packaging_raw: packagingRaw,
        batch_number: batchNumber,
      });
    }

    return parsedItems;
  }

  // Fast JSON parsing
  if (isJson) {
    const textContent = await FileSystem.readAsStringAsync(fileUri);
    const jsonData = JSON.parse(textContent);
    const itemsArray: any[] = Array.isArray(jsonData)
      ? jsonData
      : jsonData.products || jsonData.stock || jsonData.data || [];

    if (!itemsArray || itemsArray.length === 0) {
      throw new Error('The selected JSON file does not contain a valid products array.');
    }

    const parsedItems: ExcelStockRow[] = [];

    for (let i = 0; i < itemsArray.length; i++) {
      const item = itemsArray[i];
      if (!item) continue;

      if (Array.isArray(item)) {
        const productId = String(item[0] ?? '').trim();
        const brandName = String(item[1] ?? '').trim();
        const manufacturer = String(item[2] ?? '').trim();
        const packUnit = String(item[3] ?? '').trim();
        const packagingRaw = String(item[4] ?? '').trim();
        const batchNumber = String(item[5] ?? '').trim();

        if (productId || brandName || manufacturer) {
          parsedItems.push({
            product_id: productId || `PROD-${Date.now()}-${i + 1}`,
            brand_name: brandName || 'Unnamed Product',
            manufacturer,
            pack_unit: packUnit,
            packaging_raw: packagingRaw,
            batch_number: batchNumber,
          });
        }
      } else if (typeof item === 'object') {
        const productId = String(item.product_id ?? item.productId ?? item.id ?? '').trim();
        const brandName = String(
          item.brand_name ?? item.brandName ?? item.medicine_name ?? item.name ?? ''
        ).trim();
        const manufacturer = String(item.manufacturer ?? item.mfr ?? '').trim();
        const packUnit = String(item.pack_unit ?? item.packUnit ?? '').trim();
        const packagingRaw = String(
          item.packaging_raw ?? item.packagingRaw ?? item.packaging ?? ''
        ).trim();
        const batchNumber = String(
          item.batch_number ?? item.batchNumber ?? item.batch ?? item.batch_no ?? ''
        ).trim();

        if (productId || brandName || manufacturer) {
          parsedItems.push({
            product_id: productId || `PROD-${Date.now()}-${i + 1}`,
            brand_name: brandName || 'Unnamed Product',
            manufacturer,
            pack_unit: packUnit,
            packaging_raw: packagingRaw,
            batch_number: batchNumber,
          });
        }
      }
    }

    return parsedItems;
  }

  // Handle Excel (.xlsx, .xls) via SheetJS
  const base64Data = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const workbook = XLSX.read(base64Data, { type: 'base64' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('The selected workbook has no sheets.');
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    blankrows: false,
    defval: '',
  });

  if (!rawRows || rawRows.length === 0) {
    throw new Error('The selected file is empty.');
  }

  // Detect whether the first row contains headers
  const firstRow = rawRows[0] || [];
  const firstRowStr = firstRow.map((c) => String(c).toLowerCase().trim()).join(' ');
  const hasHeader =
    firstRowStr.includes('product') ||
    firstRowStr.includes('brand') ||
    firstRowStr.includes('manufacturer') ||
    firstRowStr.includes('pack') ||
    firstRowStr.includes('packaging') ||
    firstRowStr.includes('batch') ||
    firstRowStr.includes('id');

  const dataRows = hasHeader ? rawRows.slice(1) : rawRows;
  const parsedItems: ExcelStockRow[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (!row || row.length === 0) continue;

    const productId = String(row[0] ?? '').trim();
    const brandName = String(row[1] ?? '').trim();
    const manufacturer = String(row[2] ?? '').trim();
    const packUnit = String(row[3] ?? '').trim();
    const packagingRaw = String(row[4] ?? '').trim();
    const batchNumber = String(row[5] ?? '').trim();

    // Skip empty rows
    if (!productId && !brandName && !manufacturer) {
      continue;
    }

    parsedItems.push({
      product_id: productId || `PROD-${Date.now()}-${i + 1}`,
      brand_name: brandName || 'Unnamed Product',
      manufacturer,
      pack_unit: packUnit,
      packaging_raw: packagingRaw,
      batch_number: batchNumber,
    });
  }

  return parsedItems;
};

// Backward-compatible alias
export const parseExcelStockFile = parseStockFile;
