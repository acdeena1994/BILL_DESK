import { create } from 'zustand';
import { getSettings, saveSettings as saveSettingsToDb, ShopSettings } from '../db/settingsQueries';
import { DEFAULT_SETTINGS } from '../db/seed';
import i18n, { changeAppLanguage } from '../localization/i18n';

interface SettingsState {
  settings: ShopSettings;
  isLoading: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (newSettings: Partial<ShopSettings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: { ...DEFAULT_SETTINGS },
  isLoading: false,

  loadSettings: async () => {
    set({ isLoading: true });
    try {
      const data = await getSettings();
      set({ settings: data, isLoading: false });
      if (data.language && data.language !== i18n.language) {
        await changeAppLanguage(data.language);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      set({ isLoading: false });
    }
  },

  updateSettings: async (newSettings: Partial<ShopSettings>) => {
    try {
      await saveSettingsToDb(newSettings);
      const updated = { ...get().settings, ...newSettings };
      set({ settings: updated });
      if (newSettings.language && newSettings.language !== i18n.language) {
        await changeAppLanguage(newSettings.language);
      }
    } catch (err) {
      console.error('Failed to update settings:', err);
      throw err;
    }
  },
}));
