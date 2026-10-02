import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/session';
import { BillCartItem } from '../store/useBillingStore';

export interface BillingDraft {
  customerName: string;
  doctorName: string;
  date: string;
  items: BillCartItem[];
  savedAt: number;
  lastRouteName?: string;
}

/**
 * Determines whether a draft has meaningful user data to preserve.
 * Returns true if at least one medicine item is present or customer/doctor name is entered.
 */
export const hasActiveDraft = (
  draft: Partial<BillingDraft> | null | undefined
): boolean => {
  if (!draft) return false;
  const hasItems = Array.isArray(draft.items) && draft.items.length > 0;
  const hasCustomer = typeof draft.customerName === 'string' && draft.customerName.trim().length > 0;
  const hasDoctor = typeof draft.doctorName === 'string' && draft.doctorName.trim().length > 0;
  return hasItems || hasCustomer || hasDoctor;
};

/**
 * Persists the current in-progress billing draft to local storage.
 */
export const saveBillingDraft = async (
  draftData: Partial<BillingDraft>,
  routeName?: string
): Promise<void> => {
  try {
    if (!hasActiveDraft(draftData)) {
      // If there's no meaningful draft, remove any outdated draft
      await clearSavedBillingDraft();
      return;
    }

    const payload: BillingDraft = {
      customerName: draftData.customerName || '',
      doctorName: draftData.doctorName || '',
      date: draftData.date || new Date().toISOString().split('T')[0],
      items: draftData.items || [],
      savedAt: draftData.savedAt || Date.now(),
      lastRouteName: routeName || draftData.lastRouteName || 'Billing',
    };

    await AsyncStorage.setItem(STORAGE_KEYS.BILLING_DRAFT, JSON.stringify(payload));
  } catch (error) {
    console.error('[billingDraftService] Error saving billing draft:', error);
  }
};

/**
 * Retrieves the persisted billing draft from local storage.
 */
export const getSavedBillingDraft = async (): Promise<BillingDraft | null> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.BILLING_DRAFT);
    if (!raw) return null;
    const parsed: BillingDraft = JSON.parse(raw);
    if (hasActiveDraft(parsed)) {
      return parsed;
    }
    return null;
  } catch (error) {
    console.error('[billingDraftService] Error reading billing draft:', error);
    return null;
  }
};

/**
 * Deletes the persisted billing draft from local storage.
 * Note: As per requirements, "Start Fresh" is the explicit user path that deletes the draft.
 */
export const clearSavedBillingDraft = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.BILLING_DRAFT);
  } catch (error) {
    console.error('[billingDraftService] Error clearing billing draft:', error);
  }
};

/**
 * Maximum valid age for a background session timestamp: 7 days in milliseconds.
 * Timestamps older than 7 days (e.g. from an app uninstalled months ago and reinstalled
 * with "Keep App Data") are purged to avoid triggering unwanted session timeout prompts.
 */
export const MAX_BACKGROUND_TIMESTAMP_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days (604,800,000 ms)

/**
 * Stores the timestamp when the app entered background state.
 */
export const saveLastBackgroundedAt = async (timestamp: number): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_BACKGROUNDED_AT, String(timestamp));
  } catch (error) {
    console.error('[billingDraftService] Error saving background timestamp:', error);
  }
};

/**
 * Retrieves the timestamp when the app last entered background state.
 */
export const getLastBackgroundedAt = async (): Promise<number | null> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.LAST_BACKGROUNDED_AT);
    if (!raw) return null;
    const ts = parseInt(raw, 10);
    return isNaN(ts) ? null : ts;
  } catch (error) {
    console.error('[billingDraftService] Error reading background timestamp:', error);
    return null;
  }
};

/**
 * Retrieves the last background timestamp and purges it if it is stale (> 7 days old
 * or invalid future timestamp), preventing stale session dialogs on reinstalls.
 */
export const getCleanLastBackgroundedAt = async (): Promise<number | null> => {
  try {
    const ts = await getLastBackgroundedAt();
    if (ts === null) return null;

    const now = Date.now();
    const ageMs = now - ts;

    // If timestamp is older than 7 days or unreasonably in the future (> 1 min), purge it
    if (ageMs > MAX_BACKGROUND_TIMESTAMP_AGE_MS || ageMs < -60000) {
      console.log(
        `[billingDraftService] Purging stale background timestamp: ${ts} (age: ${(ageMs / (1000 * 60 * 60 * 24)).toFixed(1)} days)`
      );
      await clearLastBackgroundedAt();
      return null;
    }

    return ts;
  } catch (error) {
    console.error('[billingDraftService] Error validating background timestamp:', error);
    return null;
  }
};

/**
 * Validates and clears any stale background session timestamps (> 7 days old).
 * Typically called during initial app boot or splash preparation.
 */
export const purgeStaleSessionTimestamps = async (): Promise<boolean> => {
  try {
    const ts = await getLastBackgroundedAt();
    if (ts === null) return false;

    const ageMs = Date.now() - ts;
    if (ageMs > MAX_BACKGROUND_TIMESTAMP_AGE_MS || ageMs < -60000) {
      console.log('[billingDraftService] Purging stale session timestamp during boot cleanup');
      await clearLastBackgroundedAt();
      return true;
    }
    return false;
  } catch (error) {
    console.error('[billingDraftService] Error in purgeStaleSessionTimestamps:', error);
    return false;
  }
};

/**
 * Clears the background timestamp from storage.
 */
export const clearLastBackgroundedAt = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.LAST_BACKGROUNDED_AT);
  } catch (error) {
    console.error('[billingDraftService] Error clearing background timestamp:', error);
  }
};

