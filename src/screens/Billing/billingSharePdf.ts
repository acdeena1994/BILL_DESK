import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { ShopSettings } from '../../db/settingsQueries';
import {
  BillingShareBillItem,
  BillingShareBillData,
  generateBillingBillHtml,
  formatBillShareText,
  escapeHtml,
} from './billingShareFormatter';

export type { BillingShareBillItem, BillingShareBillData };
export { generateBillingBillHtml, formatBillShareText, escapeHtml };

export interface GenerateBillingBillPdfParams {
  settings: ShopSettings;
  bill: BillingShareBillData;
}

/**
 * Converts a local file URI into a Base64 data URI for expo-print WebView
 */
export const getLogoDataUri = async (logoUri?: string): Promise<string | null> => {
  if (!logoUri || !logoUri.trim()) return null;
  if (logoUri.startsWith('data:image/') || logoUri.startsWith('http://') || logoUri.startsWith('https://')) {
    return logoUri;
  }
  try {
    const base64 = await FileSystem.readAsStringAsync(logoUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    let mime = 'image/png';
    const lower = logoUri.toLowerCase();
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
      mime = 'image/jpeg';
    } else if (lower.endsWith('.webp')) {
      mime = 'image/webp';
    } else if (lower.endsWith('.gif')) {
      mime = 'image/gif';
    }
    return `data:${mime};base64,${base64}`;
  } catch {
    return null;
  }
};

/**
 * Generates and shares the individual bill PDF adhering to the 6 sections
 */
export const generateBillingBillPdf = async ({
  settings,
  bill,
}: GenerateBillingBillPdfParams): Promise<string> => {
  const logoDataUri = await getLogoDataUri(settings.shop_logo);
  const html = generateBillingBillHtml(settings, bill, logoDataUri);

  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Share Invoice ${bill.bill_no}`,
      UTI: 'com.adobe.pdf',
    });
  }
  return uri;
};
