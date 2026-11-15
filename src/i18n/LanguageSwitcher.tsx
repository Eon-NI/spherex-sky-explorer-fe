import { useI18n } from './useI18n';
import type { Lang } from './context';

const LANGS: Lang[] = ['es', 'en'];

/** Selector ES / EN para los headers */
export default function LanguageSwitcher({ className = '' }: { className?: string }) {
    const { lang, setLang, m } = useI18n();

    return (
        <div
            role="group"
            aria-label={m.common.language.label}
            className={`font-hud inline-flex items-center rounded-full border border-paper/15 p-0.5 text-xs font-medium ${className}`}
        >
            {LANGS.map((l) => (
                <button
                    key={l}
                    type="button"
                    lang={l}
                    onClick={() => setLang(l)}
                    aria-pressed={lang === l}
                    title={m.common.language[l]}
                    className={`rounded-full px-2.5 py-1 uppercase transition-colors ${
                        lang === l ? 'bg-star text-night' : 'text-mist hover:text-paper'
                    }`}
                >
                    {l}
                </button>
            ))}
        </div>
    );
}
