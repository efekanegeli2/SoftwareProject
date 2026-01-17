import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const I18nContext = createContext(null);

const STORAGE_KEY = 'ui_lang';

/**
 * Lightweight i18n provider (TR/EN) without extra dependencies.
 *
 * Usage:
 *   const { t } = useI18n();
 *   t({ tr: 'Çıkış', en: 'Logout' })
 */
export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === 'en' ? 'en' : 'tr';
    } catch {
      return 'tr';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore
    }
  }, [lang]);

  const t = useMemo(() => {
    /**
     * Translate a message.
     * - If `msg` is a string, it is returned as-is.
     * - If `msg` is an object like { tr: '...', en: '...' }, returns the chosen language with a safe fallback.
     * - Basic interpolation supported via vars: {name:'Berke'} and "Hello {name}".
     */
    return (msg, vars = null) => {
      let out = '';

      if (typeof msg === 'string') {
        out = msg;
      } else if (msg && typeof msg === 'object') {
        out = msg[lang] ?? msg.en ?? msg.tr ?? '';
      }

      if (vars && typeof out === 'string') {
        Object.entries(vars).forEach(([k, v]) => {
          out = out.replaceAll(`{${k}}`, String(v));
        });
      }

      return out;
    };
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within an I18nProvider');
  return ctx;
}
