import { Link } from 'react-router';
import { Home } from 'lucide-react';
import logo from '../assets/EON.svg';
import CtaBanner from './CtaBanner';
import { useI18n } from '../i18n/useI18n';
import { fmt, rich } from '../i18n/format';

const MODULES = [
    { key: 'observatory', to: '/observatorio' },
    { key: 'timelapse', to: '/timelapse' },
    { key: 'search', to: '/search' },
    { key: 'spectral', to: '/spectral' },
] as const;

/** Footer del Observatorio y sus módulos */
export default function Footer() {
    const { m } = useI18n();
    const f = m.observatory.footer;

    return (
        <footer className="relative isolate overflow-hidden border-t border-paper/10 bg-night text-paper">
            <div className="mx-auto max-w-7xl px-5 pt-16 md:px-8 md:pt-20">
                <CtaBanner
                    title={rich(f.ctaTitle, { hl: (t) => <span className="text-star">{t}</span> })}
                    text={f.ctaText}
                    to="/"
                    label={f.ctaButton}
                    icon={Home}
                    iconFirst
                />
            </div>

            <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-12 md:flex-row md:items-center md:justify-between md:px-8">
                <Link to="/" aria-label={m.common.homeAria} className="inline-block">
                    <img src={logo} alt={m.common.logoAlt} className="h-11 w-auto" />
                </Link>

                <nav aria-label={f.modulesNav}>
                    <ul className="flex flex-wrap gap-x-6 gap-y-3">
                        {MODULES.map((mod) => (
                            <li key={mod.to}>
                                <Link
                                    to={mod.to}
                                    className="text-mist underline-offset-4 transition-colors hover:text-paper hover:underline"
                                >
                                    {m.common.modules[mod.key]}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>
            </div>

            <div className="border-t border-paper/10">
                <p className="mx-auto max-w-7xl px-5 py-6 text-sm text-mist md:px-8">
                    {fmt(m.common.copyright, { year: new Date().getFullYear() })}
                </p>
            </div>
        </footer>
    );
}
