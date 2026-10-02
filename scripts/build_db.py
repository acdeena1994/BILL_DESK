import os
import json
import sqlite3
import time
import shutil

def build_database():
    t0 = time.time()
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    stock_json_path = os.path.join(root_dir, 'assets', 'stock.json')
    assets_db_path = os.path.join(root_dir, 'assets', 'billdesk.db')
    android_assets_dir = os.path.join(root_dir, 'android', 'app', 'src', 'main', 'assets')
    android_db_path = os.path.join(android_assets_dir, 'billdesk.db')

    if not os.path.exists(stock_json_path):
        raise FileNotFoundError(f'stock.json not found at {stock_json_path}')

    print(f'Reading stock.json from {stock_json_path}...')
    with open(stock_json_path, 'r', encoding='utf-8') as f:
        items = json.load(f)
    print(f'Parsed {len(items):,} items in {time.time() - t0:.2f}s')

    if os.path.exists(assets_db_path):
        os.remove(assets_db_path)

    conn = sqlite3.connect(assets_db_path)
    cur = conn.cursor()

    cur.execute('PRAGMA page_size = 4096')
    cur.execute('PRAGMA cache_size = 10000')
    cur.execute('PRAGMA synchronous = OFF')
    cur.execute('PRAGMA journal_mode = MEMORY')

    cur.executescript('''
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
      brand_name TEXT,
      exp_date TEXT,
      price REAL NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (bill_id) REFERENCES bills (id) ON DELETE CASCADE
    );
    ''')

    default_settings = [
        ('shop_name', 'Apex Medico & Pharmacy'),
        ('address', '104 Healthcare Boulevard, Medical Enclave, Chennai - 600001'),
        ('phone', '+91 98401 23456'),
        ('gst_number', '33AABCU9603R1ZM'),
        ('currency_symbol', '₹'),
        ('language', 'en'),
        ('shop_logo', ''),
    ]
    cur.executemany('INSERT INTO settings (key, value) VALUES (?, ?)', default_settings)

    print('Inserting stock records into SQLite...')
    records = []
    for idx, item in enumerate(items, start=1):
        pid = str(item.get('product_id', idx)).strip()
        bname = (item.get('brand_name') or '').strip()
        mfr = (item.get('manufacturer') or '').strip() or None
        punit = (item.get('pack_unit') or '').strip() or None
        praw = (item.get('packaging_raw') or '').strip() or None
        med_name = bname if bname else f'Medicine #{pid}'
        records.append((pid, idx, med_name, bname, mfr, punit, praw, None, 0.0, 0))

    cur.executemany('''
    INSERT OR IGNORE INTO stock (product_id, item_no, medicine_name, brand_name, manufacturer, pack_unit, packaging_raw, exp_date, price, quantity)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', records)

    print('Building search indices...')
    cur.executescript('''
    CREATE INDEX IF NOT EXISTS idx_stock_product_id ON stock (product_id);
    CREATE INDEX IF NOT EXISTS idx_stock_medicine ON stock (medicine_name COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS idx_stock_brand ON stock (brand_name COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS idx_stock_manufacturer ON stock (manufacturer COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS idx_bills_no ON bills (bill_no);
    CREATE INDEX IF NOT EXISTS idx_bills_date ON bills (date);
    CREATE INDEX IF NOT EXISTS idx_bill_items_bill_id ON bill_items (bill_id);
    ''')

    conn.commit()
    print('Optimizing database...')
    cur.execute('ANALYZE')
    cur.execute('VACUUM')
    conn.close()

    db_size_mb = os.path.getsize(assets_db_path) / (1024 * 1024)
    print(f'Successfully built {assets_db_path} ({db_size_mb:.2f} MB) in {time.time() - t0:.2f}s')

    if os.path.exists(os.path.dirname(android_assets_dir)):
        os.makedirs(android_assets_dir, exist_ok=True)
        shutil.copyfile(assets_db_path, android_db_path)
        print(f'Copied database to Android assets: {android_db_path}')

if __name__ == '__main__':
    build_database()
