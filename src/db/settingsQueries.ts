import { getDB } from './index';
import { DEFAULT_SETTINGS } from './seed';

export interface ShopSettings {
  shop_name: string;
  shop_logo: string;
  address: string;
  phone: string;
  gst_number: string;
  drug_licence_number: string;
  currency_symbol: string;
  language: string;
}

export const getSettings = async (): Promise<ShopSettings> => {
  const db = await getDB();
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM settings'
  );

  const settings: Record<string, string> = { ...DEFAULT_SETTINGS };
  rows.forEach((r) => {
    settings[r.key] = r.value;
  });

  return settings as unknown as ShopSettings;
};

export const saveSettings = async (newSettings: Partial<ShopSettings>): Promise<void> => {
  const db = await getDB();
  await db.withTransactionAsync(async () => {
    for (const [key, value] of Object.entries(newSettings)) {
      if (value !== undefined) {
        await db.runAsync(
          'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
          [key, String(value)]
        );
      }
    }
  });
};
