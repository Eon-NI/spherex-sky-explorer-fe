import { createContext } from 'react';
import es from './locales/es.json';

export type Lang = 'es' | 'en';
/** La forma de los textos la define es.json; en.json debe tener las mismas claves */
export type Messages = typeof es;

export type I18nValue = {
    lang: Lang;
    setLang: (lang: Lang) => void;
    /** Textos del idioma actual: m.landing.hero.subtitle … */
    m: Messages;
};

export const I18nContext = createContext<I18nValue | null>(null);
