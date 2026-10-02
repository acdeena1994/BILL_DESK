import i18n, { LanguageDetectorAsyncModule } from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { I18nManager } from 'react-native';

import en from './locales/en.json';
import es from './locales/es.json';
import hi from './locales/hi.json';
import ta from './locales/ta.json';
import te from './locales/te.json';
import bn from './locales/bn.json';
import mr from './locales/mr.json';
import gu from './locales/gu.json';
import kn from './locales/kn.json';
import ml from './locales/ml.json';
import pa from './locales/pa.json';
import or from './locales/or.json';
import as from './locales/as.json';
import ur from './locales/ur.json';
import ne from './locales/ne.json';
import kok from './locales/kok.json';
import ks from './locales/ks.json';

export const USER_LANGUAGE_KEY = 'userLanguage';

export interface LanguageOption {
  code: string;
  label: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी (Hindi)' },
  { code: 'ta', label: 'தமிழ் (Tamil)' },
  { code: 'es', label: 'Español (Spanish)' },
  { code: 'te', label: 'తెలుగు (Telugu)' },
  { code: 'bn', label: 'বাংলা (Bengali)' },
  { code: 'mr', label: 'मराठी (Marathi)' },
  { code: 'gu', label: 'ગુજરાતી (Gujarati)' },
  { code: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
  { code: 'ml', label: 'മലയാളം (Malayalam)' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ (Punjabi)' },
  { code: 'or', label: 'ଓଡ଼ିଆ (Odia)' },
  { code: 'as', label: 'অসমীয়া (Assamese)' },
  { code: 'ur', label: 'اردو (Urdu)' },
  { code: 'ne', label: 'नेपाली (Nepali)' },
  { code: 'kok', label: 'कोंकणी (Konkani)' },
  { code: 'ks', label: 'کٲشُر (Kashmiri)' },
];

export const resources = {
  en: { translation: en },
  es: { translation: es },
  hi: { translation: hi },
  ta: { translation: ta },
  te: { translation: te },
  bn: { translation: bn },
  mr: { translation: mr },
  gu: { translation: gu },
  kn: { translation: kn },
  ml: { translation: ml },
  pa: { translation: pa },
  or: { translation: or },
  as: { translation: as },
  ur: { translation: ur },
  ne: { translation: ne },
  kok: { translation: kok },
  ks: { translation: ks },
};

const languageDetector: LanguageDetectorAsyncModule = {
  type: 'languageDetector',
  async: true,
  detect: (callback: (lng: string | readonly string[] | undefined) => void) => {
    AsyncStorage.getItem(USER_LANGUAGE_KEY)
      .then((savedLang) => {
        if (savedLang && Object.prototype.hasOwnProperty.call(resources, savedLang)) {
          callback(savedLang);
          return;
        }
        const locales = Localization.getLocales();
        const deviceLang = locales?.[0]?.languageCode;
        if (deviceLang && Object.prototype.hasOwnProperty.call(resources, deviceLang)) {
          callback(deviceLang);
          return;
        }
        callback('en');
      })
      .catch((e) => {
        console.warn('Error reading stored language, defaulting to en:', e);
        callback('en');
      });
  },
  init: () => {},
  cacheUserLanguage: async (lng: string) => {
    try {
      await AsyncStorage.setItem(USER_LANGUAGE_KEY, lng);
    } catch (e) {
      console.warn('Error caching user language:', e);
    }
  },
};

let initPromise: Promise<typeof i18n> | null = null;

export const initI18n = (): Promise<typeof i18n> => {
  if (i18n.isInitialized) {
    return Promise.resolve(i18n);
  }
  if (!initPromise) {
    initPromise = i18n
      .use(languageDetector)
      .use(initReactI18next)
      .init({
        resources,
        fallbackLng: 'en',
        compatibilityJSON: 'v4',
        interpolation: {
          escapeValue: false,
        },
        react: {
          useSuspense: false,
        },
      })
      .then(() => i18n);
  }
  return initPromise;
};

// Immediate language switcher and persistence helper
export const changeAppLanguage = async (langCode: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(USER_LANGUAGE_KEY, langCode);
    await i18n.changeLanguage(langCode);

    // RTL handling (e.g. Urdu, Arabic, Hebrew)
    const isRtlLang = ['ur', 'ar', 'he', 'fa'].includes(langCode);
    if (I18nManager.isRTL !== isRtlLang) {
      I18nManager.allowRTL(isRtlLang);
      I18nManager.forceRTL(isRtlLang);
    }
  } catch (err) {
    console.error('Failed to change application language:', err);
    throw err;
  }
};

// Also trigger auto-init on module load if not already started
initI18n().catch((err) => console.warn('i18n background init warning:', err));

export default i18n;
