import { getDB } from './index';
import { decrementStock } from './stockQueries';

export interface BillItem {
  id?: number;
  bill_id?: number;
  item_no: number;
  medicine_name: string;
  batch_number?: string;
  brand_name?: string;
  exp_date?: string;
  price: number;
  quantity: number;
}

export interface Bill {
  id?: number;
  bill_no: string;
  date: string;
  customer_name: string;
  doctor_name: string;
  total_amount: number;
  created_at?: string;
  items?: BillItem[];
}

export interface FlattenedReportRow {
  item_no: number;
  bill_no: string;
  date: string;
  customer_name: string;
  doctor_name: string;
  medicine_name: string;
  batch_number?: string;
  brand_name: string;
  exp_date: string;
  price: number;
  quantity: number;
  total_item_price: number;
}

/**
 * Generate sequential invoice number (e.g. 0001, 0002, ... restarting each calendar month)
 */
export const generateNextBillNo = async (): Promise<string> => {
  const db = await getDB();
  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const lastBill = await db.getFirstAsync<{ bill_no: string; date: string }>(
    'SELECT bill_no, date FROM bills ORDER BY id DESC LIMIT 1'
  );

  if (!lastBill || !lastBill.date) {
    return '0001';
  }

  const lastBillMonth = lastBill.date.substring(0, 7);

  // If calendar month changed, reset sequence to 0001
  if (lastBillMonth !== currentMonth) {
    return '0001';
  }

  // Extract trailing digits from last bill_no
  const match = lastBill.bill_no.match(/(\d+)$/);
  const lastSeq = match ? parseInt(match[1], 10) : 0;
  const nextSeq = lastSeq + 1;

  return String(nextSeq).padStart(4, '0');
};

/**
 * Permanently deletes all bills and bill items, and resets bill sequence to 0001.
 */
export const resetAllBills = async (): Promise<void> => {
  const db = await getDB();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM bill_items');
    await db.runAsync('DELETE FROM bills');
    try {
      await db.runAsync("DELETE FROM sqlite_sequence WHERE name IN ('bills', 'bill_items')");
    } catch {
      // sqlite_sequence may not exist if no autoincrement operations were tracked
    }
  });
};

/**
 * Save complete bill and its items atomically in a transaction
 */
export const createBill = async (
  bill: Omit<Bill, 'id'>,
  items: Array<Omit<BillItem, 'id' | 'bill_id'>>
): Promise<{ billId: number; billNo: string }> => {
  const db = await getDB();
  let billId = 0;
  const billNo = bill.bill_no || (await generateNextBillNo());

  await db.withTransactionAsync(async () => {
    // 1. Insert master bill
    const res = await db.runAsync(
      `INSERT INTO bills (bill_no, date, customer_name, doctor_name, total_amount)
       VALUES (?, ?, ?, ?, ?)`,
      [
        billNo,
        bill.date,
        bill.customer_name?.trim() || 'Walk-in Customer',
        bill.doctor_name?.trim() || 'Self / Direct',
        Number(bill.total_amount) || 0,
      ]
    );
    billId = res.lastInsertRowId;

    // 2. Insert items and decrement stock
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemNo = item.item_no || i + 1;
      await db.runAsync(
        `INSERT INTO bill_items (bill_id, item_no, medicine_name, batch_number, brand_name, exp_date, price, quantity)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          billId,
          itemNo,
          item.medicine_name.trim(),
          item.batch_number?.trim() || '',
          item.brand_name?.trim() || '',
          item.exp_date?.trim() || '',
          Number(item.price) || 0,
          Number(item.quantity) || 1,
        ]
      );

      // Decrement inventory in stock table
      await decrementStock(item.medicine_name, Number(item.quantity) || 1);
    }
  });

  return { billId, billNo };
};

/**
 * Fetch bills in date range with their items
 */
export const getBillsByDateRange = async (fromDate: string, toDate: string): Promise<Bill[]> => {
  const db = await getDB();
  const bills = await db.getAllAsync<Bill>(
    `SELECT * FROM bills 
     WHERE date >= ? AND date <= ? 
     ORDER BY date DESC, id DESC`,
    [fromDate, toDate]
  );

  for (const b of bills) {
    if (b.id) {
      b.items = await db.getAllAsync<BillItem>(
        `SELECT * FROM bill_items WHERE bill_id = ? ORDER BY item_no ASC`,
        [b.id]
      );
    }
  }

  return bills;
};

/**
 * Get bill with items by bill ID
 */
export const getBillWithItems = async (billId: number): Promise<Bill | null> => {
  const db = await getDB();
  const bill = await db.getFirstAsync<Bill>('SELECT * FROM bills WHERE id = ?', [billId]);
  if (!bill) return null;

  bill.items = await db.getAllAsync<BillItem>(
    'SELECT * FROM bill_items WHERE bill_id = ? ORDER BY item_no ASC',
    [billId]
  );
  return bill;
};

/**
 * Fetch flattened bill item rows for tabular PDF download
 */
export const getFlattenedBillItemsByDateRange = async (
  fromDate: string,
  toDate: string
): Promise<FlattenedReportRow[]> => {
  const db = await getDB();
  const query = `
    SELECT 
      bi.item_no,
      b.bill_no,
      b.date,
      b.customer_name,
      b.doctor_name,
      bi.medicine_name,
      COALESCE(bi.batch_number, '-') AS batch_number,
      COALESCE(bi.brand_name, '-') AS brand_name,
      COALESCE(bi.exp_date, '-') AS exp_date,
      bi.price,
      bi.quantity,
      (bi.price * bi.quantity) AS total_item_price
    FROM bill_items bi
    JOIN bills b ON bi.bill_id = b.id
    WHERE b.date >= ? AND b.date <= ?
    ORDER BY b.date ASC, b.id ASC, bi.item_no ASC
  `;
  return await db.getAllAsync<FlattenedReportRow>(query, [fromDate, toDate]);
};

/**
 * Sales aggregation for analytics charts (Daily, Weekly, Monthly)
 */
export const getSalesAnalytics = async (
  period: 'daily' | 'weekly' | 'monthly'
): Promise<Array<{ label: string; value: number }>> => {
  const db = await getDB();

  if (period === 'daily') {
    // Last 7 days
    const rows = await db.getAllAsync<{ day: string; total: number }>(
      `SELECT date as day, SUM(total_amount) as total
       FROM bills
       WHERE date >= date('now', '-7 days')
       GROUP BY date
       ORDER BY date ASC`
    );

    // If less than 7 rows, construct all 7 days with 0 if no sales
    const result: Array<{ label: string; value: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const found = rows.find((r) => r.day === dStr);
      result.push({
        label: `${dayName} ${d.getDate()}`,
        value: found ? Number(found.total) : 0,
      });
    }
    return result;
  } else if (period === 'weekly') {
    // Last 6 weeks aggregated
    const rows = await db.getAllAsync<{ week: string; total: number }>(
      `SELECT strftime('%Y-W%W', date) as week, SUM(total_amount) as total
       FROM bills
       WHERE date >= date('now', '-42 days')
       GROUP BY week
       ORDER BY week ASC`
    );

    return rows.map((r, i) => ({
      label: `Wk ${r.week.split('-W')[1] || i + 1}`,
      value: Number(r.total) || 0,
    }));
  } else {
    // Monthly (last 6 months)
    const rows = await db.getAllAsync<{ month: string; total: number }>(
      `SELECT strftime('%Y-%m', date) as month, SUM(total_amount) as total
       FROM bills
       WHERE date >= date('now', '-6 months')
       GROUP BY month
       ORDER BY month ASC`
    );

    return rows.map((r) => {
      const parts = r.month.split('-');
      const monthDate = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
      const label = monthDate.toLocaleDateString('en-US', { month: 'short' });
      return {
        label,
        value: Number(r.total) || 0,
      };
    });
  }
};
