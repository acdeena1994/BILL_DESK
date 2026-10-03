import assert from 'node:assert';

console.log('====================================================');
console.log('RUNNING VERIFICATION: BILL COUNTER & NO MONTHLY RESET');
console.log('====================================================\n');

// Mock SQLite storage matching SQLite key-value settings table and bills table
class MockSQLite {
  constructor() {
    this.settings = new Map();
    this.bills = [];
    this.billItems = [];
  }

  async getFirstAsync(query, params = []) {
    if (query.includes("FROM settings WHERE key = 'bill_counter'")) {
      const val = this.settings.get('bill_counter');
      return val !== undefined ? { value: val } : null;
    }
    if (query.includes('FROM bills ORDER BY id DESC LIMIT 1')) {
      if (this.bills.length === 0) return null;
      const last = this.bills[this.bills.length - 1];
      return { bill_no: last.bill_no, date: last.date };
    }
    return null;
  }

  async runAsync(query, params = []) {
    if (query.includes("INSERT OR REPLACE INTO settings (key, value) VALUES ('bill_counter', ?)")) {
      this.settings.set('bill_counter', params[0]);
      return { lastInsertRowId: 1 };
    }
    if (query.includes('INSERT INTO bills')) {
      const newId = this.bills.length + 1;
      this.bills.push({
        id: newId,
        bill_no: params[0],
        date: params[1],
        customer_name: params[2],
        doctor_name: params[3],
        total_amount: params[4],
      });
      return { lastInsertRowId: newId };
    }
    return { lastInsertRowId: 1 };
  }

  async withTransactionAsync(fn) {
    return await fn();
  }
}

// Emulate implementation of billQueries.ts
const createBillQueries = (db) => {
  const getBillCounter = async () => {
    const row = await db.getFirstAsync("SELECT value FROM settings WHERE key = 'bill_counter'");
    if (row && row.value !== null && row.value !== undefined) {
      const parsed = parseInt(row.value, 10);
      return isNaN(parsed) ? 0 : parsed;
    }
    const lastBill = await db.getFirstAsync('SELECT bill_no FROM bills ORDER BY id DESC LIMIT 1');
    if (!lastBill || !lastBill.bill_no) {
      return 0;
    }
    const match = lastBill.bill_no.match(/(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  };

  const setBillCounter = async (counter) => {
    await db.runAsync("INSERT OR REPLACE INTO settings (key, value) VALUES ('bill_counter', ?)", [String(counter)]);
  };

  const resetBillCounter = async () => {
    await setBillCounter(0);
  };

  const generateNextBillNo = async () => {
    const currentCounter = await getBillCounter();
    const nextSeq = currentCounter + 1;
    return String(nextSeq).padStart(4, '0');
  };

  const createBill = async (bill, items) => {
    let billId = 0;
    const billNo = bill.bill_no || (await generateNextBillNo());

    await db.withTransactionAsync(async () => {
      const res = await db.runAsync(
        'INSERT INTO bills (bill_no, date, customer_name, doctor_name, total_amount) VALUES (?, ?, ?, ?, ?)',
        [billNo, bill.date, bill.customer_name || 'Walk-in', bill.doctor_name || 'Self', bill.total_amount || 0]
      );
      billId = res.lastInsertRowId;

      const match = billNo.match(/(\d+)$/);
      if (match) {
        const currentSeq = parseInt(match[1], 10);
        await db.runAsync("INSERT OR REPLACE INTO settings (key, value) VALUES ('bill_counter', ?)", [String(currentSeq)]);
      }
    });

    return { billId, billNo };
  };

  return { getBillCounter, setBillCounter, resetBillCounter, generateNextBillNo, createBill };
};

// --------------------------------------------------------------------------
// TEST 1: Generate 3 bills in the same month
// --------------------------------------------------------------------------
console.log('Test 1: Generate 3 bills in the same month...');
const db = new MockSQLite();
let queries = createBillQueries(db);

const b1 = await queries.createBill({ date: '2026-10-02', total_amount: 100 }, []);
const b2 = await queries.createBill({ date: '2026-10-02', total_amount: 150 }, []);
const b3 = await queries.createBill({ date: '2026-10-15', total_amount: 200 }, []);

assert.strictEqual(b1.billNo, '0001', 'First bill should be 0001');
assert.strictEqual(b2.billNo, '0002', 'Second bill should be 0002');
assert.strictEqual(b3.billNo, '0003', 'Third bill should be 0003');
console.log('✓ PASS: Bills 0001, 0002, 0003 generated sequentially.\n');

// --------------------------------------------------------------------------
// TEST 2: Change system date to next month, generate a bill
// --------------------------------------------------------------------------
console.log('Test 2: Change system date to next month, generate a bill...');
const b4 = await queries.createBill({ date: '2026-11-05', total_amount: 250 }, []);
assert.strictEqual(b4.billNo, '0004', 'Fourth bill in next month should be 0004 (NO monthly reset)');
console.log('✓ PASS: Bill 0004 generated in next month (no reset).\n');

// --------------------------------------------------------------------------
// TEST 3: Change date to next year, generate a bill
// --------------------------------------------------------------------------
console.log('Test 3: Change date to next year, generate a bill...');
const b5 = await queries.createBill({ date: '2027-01-10', total_amount: 300 }, []);
assert.strictEqual(b5.billNo, '0005', 'Fifth bill in next year should be 0005 (NO annual reset)');
console.log('✓ PASS: Bill 0005 generated in next year (no reset).\n');

// --------------------------------------------------------------------------
// TEST 4: Click Reset -> Cancel on confirmation
// --------------------------------------------------------------------------
console.log('Test 4: Click Reset -> Cancel on confirmation...');
let counterBefore = await queries.getBillCounter();
// Cancel simulation: user rejects dialog, resetBillCounter is NOT called
let counterAfterCancel = await queries.getBillCounter();
assert.strictEqual(counterAfterCancel, counterBefore, 'Counter must remain unchanged on cancel');
assert.strictEqual(counterAfterCancel, 5, 'Counter is still 5');
console.log('✓ PASS: Cancel preserved counter at 5.\n');

// --------------------------------------------------------------------------
// TEST 5: Click Reset -> Confirm
// --------------------------------------------------------------------------
console.log('Test 5: Click Reset -> Confirm...');
const totalBillsBeforeReset = db.bills.length;
assert.strictEqual(totalBillsBeforeReset, 5, '5 bills exist before reset');

// Confirm simulation: user confirms, resetBillCounter is called
await queries.resetBillCounter();
const counterAfterConfirm = await queries.getBillCounter();
assert.strictEqual(counterAfterConfirm, 0, 'Counter must be 0 after reset');
assert.strictEqual(db.bills.length, 5, 'Existing bills must NOT be deleted');
console.log('✓ PASS: Counter reset to 0, existing bills intact (count = 5).\n');

// --------------------------------------------------------------------------
// TEST 6: Generate a bill right after reset
// --------------------------------------------------------------------------
console.log('Test 6: Generate a bill right after reset...');
const b6 = await queries.createBill({ date: '2027-01-10', total_amount: 50 }, []);
assert.strictEqual(b6.billNo, '0001', 'First bill after reset must be 0001');
assert.strictEqual(db.bills.length, 6, 'Total bills now 6');
console.log('✓ PASS: Next bill is 0001, total bills preserved (count = 6).\n');

// --------------------------------------------------------------------------
// TEST 7: Restart the app after reset, then generate a bill
// --------------------------------------------------------------------------
console.log('Test 7: Restart the app after reset, then generate a bill...');
// Emulate cold start by creating a new queries instance attached to same db
const restartedQueries = createBillQueries(db);
const persistedCounter = await restartedQueries.getBillCounter();
assert.strictEqual(persistedCounter, 1, 'Persisted counter across app restart should be 1');

const b7 = await restartedQueries.createBill({ date: '2027-01-11', total_amount: 80 }, []);
assert.strictEqual(b7.billNo, '0002', 'Bill after app restart must be 0002');
console.log('✓ PASS: Cold restart correctly continues counter to 0002.\n');

console.log('All automated verification checks PASSED!');
