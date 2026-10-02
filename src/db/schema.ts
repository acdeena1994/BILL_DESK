export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS stock (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT UNIQUE,
  item_no INTEGER,
  medicine_name TEXT,
  brand_name TEXT,
  manufacturer TEXT,
  pack_unit TEXT,
  packaging_raw TEXT,
  exp_date TEXT,
  batch_number TEXT,
  price REAL NOT NULL DEFAULT 0.0,
  quantity INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bill_no TEXT NOT NULL,
  date TEXT NOT NULL,
  customer_name TEXT,
  doctor_name TEXT,
  total_amount REAL NOT NULL DEFAULT 0.0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bill_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bill_id INTEGER NOT NULL,
  item_no INTEGER NOT NULL,
  medicine_name TEXT NOT NULL,
  batch_number TEXT,
  brand_name TEXT,
  exp_date TEXT,
  price REAL NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (bill_id) REFERENCES bills (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_stock_product_id ON stock (product_id);
CREATE INDEX IF NOT EXISTS idx_stock_medicine ON stock (medicine_name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_stock_brand ON stock (brand_name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_stock_manufacturer ON stock (manufacturer COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_bills_no ON bills (bill_no);
CREATE INDEX IF NOT EXISTS idx_bills_date ON bills (date);
CREATE INDEX IF NOT EXISTS idx_bill_items_bill_id ON bill_items (bill_id);
`;
