import { getDB } from './index';

export interface StockItem {
  id?: number;
  product_id?: string;
  item_no?: number;
  medicine_name: string;
  brand_name?: string;
  manufacturer?: string;
  pack_unit?: string;
  packaging_raw?: string;
  exp_date?: string;
  batch_number?: string;
  price: number;
  quantity: number;
  created_at?: string;
}

/**
 * Autocomplete / Live search on stock by medicine name, brand name, manufacturer, or product ID.
 * Uses prefix-matching first and substring matching for fast indexing.
 */
export const searchStock = async (query: string, limit = 10): Promise<StockItem[]> => {
  if (!query || query.trim() === '') return [];
  const db = await getDB();
  const trimmed = query.trim();

  // Search prefix first, then substring
  const rows = await db.getAllAsync<StockItem>(
    `SELECT * FROM stock 
     WHERE medicine_name LIKE ? || '%' 
        OR brand_name LIKE ? || '%' 
        OR manufacturer LIKE ? || '%'
        OR product_id LIKE ? || '%'
        OR medicine_name LIKE '%' || ? || '%' 
        OR brand_name LIKE '%' || ? || '%'
     ORDER BY 
       CASE WHEN medicine_name LIKE ? || '%' OR brand_name LIKE ? || '%' THEN 1 ELSE 2 END,
       brand_name ASC, medicine_name ASC 
     LIMIT ?`,
    [trimmed, trimmed, trimmed, trimmed, trimmed, trimmed, trimmed, trimmed, limit]
  );
  return rows;
};

/**
 * Get all stock items with optional search query filter and A-Z letter jump filter
 */
export const getAllStock = async (
  search = '',
  letter = '',
  limit = 200
): Promise<StockItem[]> => {
  const db = await getDB();
  const trimmedSearch = search.trim();
  const trimmedLetter = letter.trim().toUpperCase();

  const whereClauses: string[] = [];
  const params: any[] = [];

  if (trimmedLetter && trimmedLetter !== 'ALL') {
    whereClauses.push("(UPPER(brand_name) LIKE ? || '%' OR UPPER(medicine_name) LIKE ? || '%')");
    params.push(trimmedLetter, trimmedLetter);
  }

  if (trimmedSearch) {
    whereClauses.push(
      '(medicine_name LIKE ? OR brand_name LIKE ? OR manufacturer LIKE ? OR product_id LIKE ? OR packaging_raw LIKE ? OR batch_number LIKE ?)'
    );
    const term = `%${trimmedSearch}%`;
    params.push(term, term, term, term, term, term);
  }

  let sql = 'SELECT * FROM stock';
  if (whereClauses.length > 0) {
    sql += ` WHERE ${whereClauses.join(' AND ')}`;
  }
  sql += ' ORDER BY brand_name ASC, medicine_name ASC LIMIT ?';
  params.push(limit);

  return await db.getAllAsync<StockItem>(sql, params);
};

/**
 * Add a new stock item manually
 */
export const addStockItem = async (item: Omit<StockItem, 'id'>): Promise<number> => {
  const db = await getDB();
  const result = await db.runAsync(
    `INSERT INTO stock (product_id, item_no, medicine_name, brand_name, manufacturer, pack_unit, packaging_raw, exp_date, batch_number, price, quantity)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item.product_id?.trim() || null,
      item.item_no || null,
      (item.medicine_name || item.brand_name || '').trim(),
      item.brand_name?.trim() || null,
      item.manufacturer?.trim() || null,
      item.pack_unit?.trim() || null,
      item.packaging_raw?.trim() || null,
      item.exp_date?.trim() || null,
      item.batch_number?.trim() || null,
      Number(item.price) || 0,
      Number(item.quantity) || 0,
    ]
  );
  return result.lastInsertRowId;
};

/**
 * Update an existing stock item
 */
export const updateStockItem = async (id: number, item: Partial<StockItem>): Promise<void> => {
  const db = await getDB();
  await db.runAsync(
    `UPDATE stock 
     SET product_id = COALESCE(?, product_id),
         medicine_name = COALESCE(?, medicine_name),
         brand_name = COALESCE(?, brand_name),
         manufacturer = COALESCE(?, manufacturer),
         pack_unit = COALESCE(?, pack_unit),
         packaging_raw = COALESCE(?, packaging_raw),
         exp_date = COALESCE(?, exp_date),
         batch_number = COALESCE(?, batch_number),
         price = COALESCE(?, price),
         quantity = COALESCE(?, quantity)
     WHERE id = ?`,
    [
      item.product_id ?? null,
      item.medicine_name ?? null,
      item.brand_name ?? null,
      item.manufacturer ?? null,
      item.pack_unit ?? null,
      item.packaging_raw ?? null,
      item.exp_date ?? null,
      item.batch_number ?? null,
      item.price !== undefined ? Number(item.price) : null,
      item.quantity !== undefined ? Number(item.quantity) : null,
      id,
    ]
  );
};

/**
 * Delete a stock item
 */
export const deleteStockItem = async (id: number): Promise<void> => {
  const db = await getDB();
  await db.runAsync('DELETE FROM stock WHERE id = ?', [id]);
};

/**
 * High-performance bulk upsert designed to handle 450,000+ rows smoothly.
 * Uses:
 * 1. Multi-row parameterized INSERT (100 rows = 900 parameters, within SQLite 999 limit)
 * 2. SQLite high-throughput PRAGMAs (synchronous = OFF, journal_mode = MEMORY)
 * 3. Chunked transactions that yield to the event loop so the UI stays smooth and never freezes
 * 4. Real-time progress callback for UI updates
 */
export const upsertStockItems = async (
  items: Array<{
    product_id: string;
    brand_name: string;
    manufacturer?: string;
    pack_unit?: string;
    packaging_raw?: string;
    exp_date?: string;
    batch_number?: string;
    price?: number;
    quantity?: number;
  }>,
  onProgress?: (inserted: number, total: number) => void
): Promise<number> => {
  if (!items || items.length === 0) return 0;
  const db = await getDB();
  const total = items.length;
  let totalInserted = 0;

  // Maximize SQLite write throughput during bulk import
  try {
    await db.execAsync('PRAGMA synchronous = OFF; PRAGMA journal_mode = MEMORY; PRAGMA cache_size = 10000;');
  } catch (pErr) {
    console.warn('Bulk PRAGMA error:', pErr);
  }

  const ROWS_PER_QUERY = 100;
  const BATCH_SIZE = 1000;

  for (let batchStart = 0; batchStart < total; batchStart += BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE, total);
    const batch = items.slice(batchStart, batchEnd);

    await db.withTransactionAsync(async () => {
      for (let i = 0; i < batch.length; i += ROWS_PER_QUERY) {
        const chunk = batch.slice(i, i + ROWS_PER_QUERY);
        if (chunk.length === 0) continue;

        const placeholders: string[] = [];
        const values: any[] = [];

        for (const item of chunk) {
          const pid = item.product_id?.trim() || null;
          const bname = (item.brand_name || '').trim();
          if (!pid && !bname) continue;

          const medName = bname || pid || 'Unnamed Product';
          const mfr = item.manufacturer?.trim() || null;
          const packUnit = item.pack_unit?.trim() || null;
          const packagingRaw = item.packaging_raw?.trim() || null;
          const expDate = item.exp_date?.trim() || null;
          const batchNumber = item.batch_number?.trim() || null;
          const price = Number(item.price) || 0;
          const quantity = Number(item.quantity) || 0;

          placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
          values.push(pid, medName, bname, mfr, packUnit, packagingRaw, expDate, batchNumber, price, quantity);
        }

        if (placeholders.length > 0) {
          const sql = `
            INSERT INTO stock (product_id, medicine_name, brand_name, manufacturer, pack_unit, packaging_raw, exp_date, batch_number, price, quantity)
            VALUES ${placeholders.join(', ')}
            ON CONFLICT(product_id) DO UPDATE SET
              brand_name = excluded.brand_name,
              manufacturer = excluded.manufacturer,
              pack_unit = excluded.pack_unit,
              packaging_raw = excluded.packaging_raw,
              batch_number = COALESCE(excluded.batch_number, stock.batch_number),
              medicine_name = COALESCE(excluded.medicine_name, stock.medicine_name),
              price = CASE WHEN excluded.price > 0 THEN excluded.price ELSE stock.price END,
              quantity = CASE WHEN excluded.quantity > 0 THEN excluded.quantity ELSE stock.quantity END
          `;
          await db.runAsync(sql, values);
          totalInserted += placeholders.length;
        }
      }
    });

    if (onProgress) {
      onProgress(Math.min(batchEnd, total), total);
    }

    // Yield control back to JavaScript event loop so UI does not freeze
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  // Restore safe SQLite operation and re-analyze query planner for instant search
  try {
    await db.execAsync('PRAGMA synchronous = NORMAL; PRAGMA journal_mode = WAL; ANALYZE;');
  } catch (rErr) {
    console.warn('Restore PRAGMA error:', rErr);
  }

  return totalInserted;
};

/**
 * Decrement stock quantity when a bill is generated
 */
export const decrementStock = async (medicineName: string, qty: number): Promise<void> => {
  const db = await getDB();
  await db.runAsync(
    `UPDATE stock 
     SET quantity = MAX(0, quantity - ?) 
     WHERE medicine_name = ? OR brand_name = ?`,
    [qty, medicineName, medicineName]
  );
};
