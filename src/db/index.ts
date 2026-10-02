import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import { Platform } from 'react-native';
import { CREATE_TABLES_SQL } from './schema';
import { DEFAULT_SETTINGS } from './seed';

const DB_NAME = 'billdesk.db';
let databaseInstance: SQLite.SQLiteDatabase | null = null;

const prebuiltDbAsset = require('../../assets/billdesk.db');

const ensureDatabaseFile = async (): Promise<void> => {
  try {
    const dbDir = `${FileSystem.documentDirectory}SQLite`;
    const dbPath = `${dbDir}/${DB_NAME}`;

    const dirInfo = await FileSystem.getInfoAsync(dbDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dbDir, { intermediates: true });
    }

    const fileInfo = await FileSystem.getInfoAsync(dbPath);
    if (!fileInfo.exists || (fileInfo.size !== undefined && fileInfo.size < 200000)) {
      console.log('[DB] Installing pre-built stock database into app storage...');
      let copied = false;

      if (Platform.OS === 'android') {
        try {
          if (fileInfo.exists) {
            await FileSystem.deleteAsync(dbPath, { idempotent: true });
          }
          await FileSystem.copyAsync({
            from: `asset:///${DB_NAME}`,
            to: dbPath,
          });
          const check = await FileSystem.getInfoAsync(dbPath);
          if (check.exists && check.size && check.size > 200000) {
            copied = true;
            console.log('[DB] Pre-built database installed via native Android APK asset.');
          }
        } catch (nativeAssetErr) {
          console.log('[DB] Native Android asset copy note:', nativeAssetErr);
        }
      }

      if (!copied) {
        try {
          const asset = Asset.fromModule(prebuiltDbAsset);
          await asset.downloadAsync();
          const sourceUri = asset.localUri || asset.uri;

          if (sourceUri) {
            if (fileInfo.exists) {
              await FileSystem.deleteAsync(dbPath, { idempotent: true });
            }
            await FileSystem.copyAsync({
              from: sourceUri,
              to: dbPath,
            });
            console.log('[DB] Pre-built database installed via Expo Asset module.');
          }
        } catch (expoAssetErr) {
          console.warn('[DB] Expo asset copy attempt failed:', expoAssetErr);
        }
      }
    }
  } catch (err) {
    console.warn('[DB] Pre-built database setup error:', err);
  }
};

export const getDatabaseFilePath = (): string => {
  return `${FileSystem.documentDirectory}SQLite/${DB_NAME}`;
};

export const closeDB = async (): Promise<void> => {
  if (databaseInstance) {
    try {
      await databaseInstance.closeAsync();
    } catch (e) {
      console.warn('[DB] Error closing database:', e);
    }
    databaseInstance = null;
  }
};

export const reopenDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  await closeDB();
  return await getDB();
};

export const getDB = async (): Promise<SQLite.SQLiteDatabase> => {
  if (databaseInstance) {
    return databaseInstance;
  }
  await ensureDatabaseFile();
  databaseInstance = await SQLite.openDatabaseAsync(DB_NAME);
  return databaseInstance;
};

export const initDatabase = async (): Promise<void> => {
  try {
    const db = await getDB();

    // Ensure schema and indexes exist
    await db.execAsync(CREATE_TABLES_SQL);

    // Runtime column migrations for existing stock table
    try {
      const tableInfo = await db.getAllAsync<{ name: string }>('PRAGMA table_info(stock)');
      const colNames = tableInfo.map((c) => c.name);

      if (!colNames.includes('product_id')) {
        await db.execAsync('ALTER TABLE stock ADD COLUMN product_id TEXT');
        await db.execAsync('CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_product_id ON stock (product_id)');
      }
      if (!colNames.includes('manufacturer')) {
        await db.execAsync('ALTER TABLE stock ADD COLUMN manufacturer TEXT');
      }
      if (!colNames.includes('pack_unit')) {
        await db.execAsync('ALTER TABLE stock ADD COLUMN pack_unit TEXT');
      }
      if (!colNames.includes('packaging_raw')) {
        await db.execAsync('ALTER TABLE stock ADD COLUMN packaging_raw TEXT');
      }
      if (!colNames.includes('batch_number')) {
        await db.execAsync('ALTER TABLE stock ADD COLUMN batch_number TEXT');
      }
    } catch (migErr) {
      console.warn('Stock migration check:', migErr);
    }

    // Runtime column migrations for existing bill_items table
    try {
      const billItemsInfo = await db.getAllAsync<{ name: string; type: string }>('PRAGMA table_info(bill_items)');
      const biColNames = billItemsInfo.map((c) => c.name);
      if (!biColNames.includes('batch_number')) {
        await db.execAsync('ALTER TABLE bill_items ADD COLUMN batch_number TEXT');
      }
      if (!biColNames.includes('price')) {
        await db.execAsync('ALTER TABLE bill_items ADD COLUMN price REAL NOT NULL DEFAULT 0.0');
      }
    } catch (biMigErr) {
      console.warn('Bill items migration check:', biMigErr);
    }

    // Runtime column migrations for existing bills table
    try {
      const billsInfo = await db.getAllAsync<{ name: string }>('PRAGMA table_info(bills)');
      const billColNames = billsInfo.map((c) => c.name);
      if (!billColNames.includes('doctor_name')) {
        await db.execAsync('ALTER TABLE bills ADD COLUMN doctor_name TEXT');
      }
      if (!billColNames.includes('created_at')) {
        await db.execAsync('ALTER TABLE bills ADD COLUMN created_at TEXT DEFAULT CURRENT_TIMESTAMP');
      }
    } catch (billsMigErr) {
      console.warn('Bills migration check:', billsMigErr);
    }

    // Check if settings exist; if not, seed defaults
    const existingSettings = await db.getAllAsync<{ key: string; value: string }>(
      'SELECT key, value FROM settings'
    );
    if (existingSettings.length === 0) {
      for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
        await db.runAsync(
          'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
          [key, value]
        );
      }
    } else {
      // Ensure all standard default keys exist without overwriting existing user settings
      for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
        const hasKey = existingSettings.some((s) => s.key === key);
        if (!hasKey) {
          await db.runAsync(
            'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
            [key, value]
          );
        }
      }
    }
  } catch (err) {
    console.error('Database initialization error:', err);
  }
};

/**
 * Detects whether existing user business data (invoices, custom pharmacy settings,
 * or user-managed stock) is present in SQLite.
 * Used during cold start / splash initialization to distinguish a fresh install
 * from an Android reinstall where the user opted to "Keep App Data".
 */
export const hasExistingBusinessData = async (): Promise<boolean> => {
  try {
    const db = await getDB();

    // 1. Check if bills/invoices exist in the database
    const billCount = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM bills'
    );
    if (billCount && billCount.count > 0) {
      return true;
    }

    // 2. Check if shop profile has been configured/customized by the user
    const shopNameRow = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'shop_name'"
    );
    if (
      shopNameRow &&
      shopNameRow.value &&
      shopNameRow.value.trim() !== '' &&
      shopNameRow.value !== 'Apex Medico & Pharmacy'
    ) {
      return true;
    }

    // 3. Check for user-added/modified stock items (items with batch numbers or custom entries)
    const userStockRow = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM stock WHERE (batch_number IS NOT NULL AND batch_number != '') OR product_id IS NULL"
    );
    if (userStockRow && userStockRow.count > 0) {
      return true;
    }

    return false;
  } catch (err) {
    console.warn('[DB] hasExistingBusinessData check error:', err);
    return false;
  }
};

