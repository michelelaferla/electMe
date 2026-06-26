import { useLanguage } from '../i18n/LanguageContext';
import type { LanguageCode } from '../i18n/translations';

export function LanguageSelector() {
  const { language, setLanguage, supportedLanguages, t } = useLanguage();

  return (
    <label className="languageSelector">
      <span>{t('language.label')}</span>
      <select value={language} onChange={event => setLanguage(event.target.value as LanguageCode)}>
        {supportedLanguages.map(option => (
          <option key={option.code} value={option.code}>
            {option.code === 'mt' ? t('language.maltese') : t('language.english')}
          </option>
        ))}
      </select>
    </label>
  );
}
