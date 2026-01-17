import { useI18n } from '../context/I18nContext.jsx';

export default function LanguageSwitcher({ className = '' }) {
  const { lang, setLang, t } = useI18n();

  return (
    <div className={`flex items-center gap-2 ${className}`.trim()}>
      <span className="text-xs text-gray-500 hidden sm:block">{t({ tr: 'Dil', en: 'Lang' })}</span>
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        className="text-sm px-2 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
        aria-label={t({ tr: 'Dil seç', en: 'Select language' })}
      >
        <option value="tr">TR</option>
        <option value="en">EN</option>
      </select>
    </div>
  );
}
