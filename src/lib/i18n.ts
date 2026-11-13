import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { Platform } from 'react-native';
import ar from '../locales/ar.json';
import de from '../locales/de.json';
import en from '../locales/en.json';

export const LANGS = [
  { code: 'ar', label: 'العربية' },
  { code: 'de', label: 'Deutsch' },
  { code: 'en', label: 'English' },
] as const;
export type Lang = (typeof LANGS)[number]['code'];

const KEY = 'takewith.lang';
const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';

function initialLang(): Lang {
  if (isWeb) {
    try {
      const saved = window.localStorage.getItem(KEY);
      if (saved === 'ar' || saved === 'de' || saved === 'en') return saved;
    } catch {}
    const nav = (window.navigator.language || 'en').slice(0, 2);
    if (nav === 'ar' || nav === 'de') return nav;
  }
  return 'en';
}

function applyDirection(lang: string) {
  if (!isWeb) return;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
}

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, de: { translation: de }, ar: { translation: ar } },
  lng: initialLang(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});
applyDirection(i18n.language);

export function setLanguage(lang: Lang) {
  i18n.changeLanguage(lang);
  applyDirection(lang);
  if (isWeb) {
    try {
      window.localStorage.setItem(KEY, lang);
    } catch {}
  }
}

export function isRTL(): boolean {
  return i18n.language === 'ar';
}

export function formatDate(iso: string, lang: string): string {
  try {
    const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
    return new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
  } catch {
    return iso;
  }
}

export function formatTime(iso: string, lang: string): string {
  try {
    return new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default i18n;
