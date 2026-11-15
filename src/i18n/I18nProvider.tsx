import { useEffect, useMemo, useState, type ReactNode } from 'react';
import es from './locales/es.json';
import en from './locales/en.json';
import { I18nContext, type Lang, type Messages } from './context';

/** Si a en.json le falta una clave de es.json, TypeScript marca error aquí */
const MESSAGES: Record<Lang, Messages> = { es, en };
const STORAGE_KEY = 'eon:lang';

function initialLang(): Lang {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === 'es' || saved === 'en') return saved;
    } catch {
        /* almacenamiento no disponible */
    }
    return navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'es';
}

export default function I18nProvider({ children }: { children: ReactNode }) {
    const [lang, setLang] = useState<Lang>(initialLang);

    useEffect(() => {
        document.documentElement.lang = lang;
        try {
            localStorage.setItem(STORAGE_KEY, lang);
        } catch {
            /* almacenamiento no disponible */
        }
    }, [lang]);

    const value = useMemo(() => ({ lang, setLang, m: MESSAGES[lang] }), [lang]);
    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
