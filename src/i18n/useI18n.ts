import { useContext } from 'react';
import { I18nContext } from './context';

/** const { m, lang, setLang } = useI18n(); */
export function useI18n() {
    const ctx = useContext(I18nContext);
    if (!ctx) throw new Error('useI18n debe usarse dentro de <I18nProvider>');
    return ctx;
}
