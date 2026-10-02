import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { getDB, closeDB, reopenDatabase, initDatabase, getDatabaseFilePath } from '../db';
import { useSettingsStore } from '../store/useSettingsStore';
import { useBillingStore } from '../store/useBillingStore';

export interface DatabaseStats {
  exists: boolean;
  sizeBytes: number;
  sizeFormatted: string;
  billsCount: number;
  stockCount: number;
  lastModified?: number;
}

export interface BackupResult {
  success: boolean;
  fileName?: string;
  filePath?: string;
  error?: string;
}

export interface RestoreResult {
  success: boolean;
  canceled: boolean;
  billsCount?: number;
  stockCount?: number;
  error?: string;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

/**
 * Retrieves current database file information and table record counts.
 */
export const getDatabaseStats = async (): Promise<DatabaseStats> => {
  try {
    const dbPath = getDatabaseFilePath();
    const fileInfo = await FileSystem.getInfoAsync(dbPath);

    if (!fileInfo.exists) {
      return {
        exists: false,
        sizeBytes: 0,
        sizeFormatted: '0 MB',
        billsCount: 0,
        stockCount: 0,
      };
    }

    const db = await getDB();
    let billsCount = 0;
    let stockCount = 0;

    try {
      const billsRes = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM bills');
      billsCount = billsRes?.count ?? 0;
    } catch {
      // bills table might be empty or not yet created
    }

    try {
      const stockRes = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM stock');
      stockCount = stockRes?.count ?? 0;
    } catch {
      // stock table check
    }

    return {
      exists: true,
      sizeBytes: fileInfo.size || 0,
      sizeFormatted: formatBytes(fileInfo.size || 0),
      billsCount,
      stockCount,
      lastModified: fileInfo.modificationTime,
    };
  } catch (err) {
    console.warn('[BackupService] Error getting database stats:', err);
    return {
      exists: false,
      sizeBytes: 0,
      sizeFormatted: '0 MB',
      billsCount: 0,
      stockCount: 0,
    };
  }
};

/**
 * Checkpoints SQLite WAL and exports a timestamped copy of billdesk.db
 * via the native system share sheet (Google Drive, Downloads, WhatsApp, Email, etc.).
 */
export const exportDatabaseBackup = async (): Promise<BackupResult> => {
  try {
    const dbPath = getDatabaseFilePath();
    const fileInfo = await FileSystem.getInfoAsync(dbPath);

    if (!fileInfo.exists) {
      return { success: false, error: 'Mobile data file does not exist yet.' };
    }

    // 1. Flush pending SQLite write-ahead-log pages into the main .db file
    try {
      const db = await getDB();
      await db.execAsync('PRAGMA wal_checkpoint(FULL);');
    } catch (walErr) {
      console.warn('[BackupService] WAL checkpoint note:', walErr);
    }

    // 2. Prepare timestamped backup in cache directory
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');
    const backupFileName = `BillDesk_Backup_${dateStr}_${timeStr}.db`;
    const targetUri = `${FileSystem.cacheDirectory}${backupFileName}`;

    await FileSystem.copyAsync({
      from: dbPath,
      to: targetUri,
    });

    // 3. Share file via Android / iOS system share dialog
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      return {
        success: true,
        fileName: backupFileName,
        filePath: targetUri,
      };
    }

    await Sharing.shareAsync(targetUri, {
      mimeType: 'application/x-sqlite3',
      dialogTitle: 'Export Bill Desk Pharmacy Mobile Backup',
      UTI: 'public.database',
    });

    return {
      success: true,
      fileName: backupFileName,
      filePath: targetUri,
    };
  } catch (err: any) {
    console.error('[BackupService] Export backup error:', err);
    return {
      success: false,
      error: err.message || 'Failed to export mobile backup',
    };
  }
};

/**
 * Lets the user select an existing .db / .sqlite backup file,
 * validates its SQLite header, replaces the current database, and reloads application state.
 */
export const restoreDatabaseFromBackup = async (): Promise<RestoreResult> => {
  const dbPath = getDatabaseFilePath();
  const rollbackPath = `${dbPath}.rollback`;

  try {
    // 1. Pick a database file
    const pickResult = await DocumentPicker.getDocumentAsync({
      type: ['*/*'],
      copyToCacheDirectory: true,
    });

    if (pickResult.canceled || !pickResult.assets || pickResult.assets.length === 0) {
      return { canceled: true, success: false };
    }

    const fileAsset = pickResult.assets[0];

    // 2. Basic validation: file size
    if (!fileAsset.size || fileAsset.size < 5000) {
      return {
        canceled: false,
        success: false,
        error: 'Selected file is too small to be a valid Bill Desk mobile backup.',
      };
    }

    // 3. Header check: SQLite files always start with 'SQLite format 3\0' (16 bytes)
    try {
      const headerBase64 = await FileSystem.readAsStringAsync(fileAsset.uri, {
        encoding: FileSystem.EncodingType.Base64,
        length: 16,
      });
      // Base64 of "SQLite format 3\0"
      const expectedPrefix = 'U1FMaXRlIGZvcm1hdCAz';
      if (!headerBase64.startsWith(expectedPrefix)) {
        return {
          canceled: false,
          success: false,
          error: 'The selected file is not a valid mobile backup file.',
        };
      }
    } catch (headerErr) {
      console.warn('[BackupService] SQLite header check note:', headerErr);
    }

    // 4. Safely close existing database connection
    await closeDB();

    // 5. Create rollback backup of current database in case replacement fails
    const currentInfo = await FileSystem.getInfoAsync(dbPath);
    if (currentInfo.exists) {
      await FileSystem.copyAsync({
        from: dbPath,
        to: rollbackPath,
      });
    }

    // 6. Delete active database and journal/wal files
    await FileSystem.deleteAsync(dbPath, { idempotent: true });
    await FileSystem.deleteAsync(`${dbPath}-wal`, { idempotent: true });
    await FileSystem.deleteAsync(`${dbPath}-shm`, { idempotent: true });

    // 7. Copy restored file into SQLite database location
    await FileSystem.copyAsync({
      from: fileAsset.uri,
      to: dbPath,
    });

    // 8. Reconnect and re-run migrations to ensure table integrity
    const newDb = await reopenDatabase();
    await initDatabase();

    // 9. Verify restored database has bills and settings
    const billsRes = await newDb.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM bills');
    const stockRes = await newDb.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM stock');

    const billsCount = billsRes?.count ?? 0;
    const stockCount = stockRes?.count ?? 0;

    // Clean up rollback file
    await FileSystem.deleteAsync(rollbackPath, { idempotent: true });

    // 10. Refresh active application stores
    await useSettingsStore.getState().loadSettings();
    useBillingStore.getState().clearBill();

    return {
      canceled: false,
      success: true,
      billsCount,
      stockCount,
    };
  } catch (err: any) {
    console.error('[BackupService] Restore database error:', err);

    // Rollback if active file replacement failed
    try {
      const rollbackInfo = await FileSystem.getInfoAsync(rollbackPath);
      if (rollbackInfo.exists) {
        await FileSystem.deleteAsync(dbPath, { idempotent: true });
        await FileSystem.copyAsync({
          from: rollbackPath,
          to: dbPath,
        });
        await FileSystem.deleteAsync(rollbackPath, { idempotent: true });
        await reopenDatabase();
        await initDatabase();
      }
    } catch (rollbackErr) {
      console.error('[BackupService] Rollback error:', rollbackErr);
    }

    return {
      canceled: false,
      success: false,
      error: err.message || 'Failed to restore mobile data from backup file',
    };
  }
};
