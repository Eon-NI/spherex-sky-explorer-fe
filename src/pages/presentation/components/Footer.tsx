import { Link } from 'react-router';
import { ArrowRight, ArrowUp } from 'lucide-react';
import logo from '../../../assets/EON.svg';
import CtaBanner from '../../../components/CtaBanner';
import { useI18n } from '../../../i18n/useI18n';
import { fmt, rich } from '../../../i18n/format';

const footerLink =
    'inline-flex w-fit text-mist transition-colors hover:text-paper focus-visible:text-paper underline-offset-4 hover:underline';

const EXPLORE = [
    { key: 'observatory', to: '/observatorio' },
    { key: 'timelapse', to: '/timelapse' },
    { key: 'search', to: '/search' },
    { key: 'spectral', to: '/spectral' },
] as const;

const PROJECT = [
    { key: 'features', href: '#caracteristicas' },
    { key: 'functions', href: '#servicios' },
    { key: 'about', href: '#about' },
] as const;

export default function Footer() {
    const { m } = useI18n();
    const f = m.landing.footer;
    return (
        <footer className="relative isolate overflow-hidden border-t border-paper/10 bg-night text-paper">
            {/* horizonte luminoso */}
            <div
                aria-hidden="true"
                className="absolute inset-x-0 -top-40 -z-10 mx-auto h-72 max-w-4xl rounded-full bg-[radial-gradient(ellipse_at_center,color-mix(in_oklab,var(--color-star)_12%,transparent),transparent_70%)] blur-2xl"
            />

            {/* llamada a la acción */}
            <div className="mx-auto max-w-6xl px-6 pt-16 md:pt-20">
                <CtaBanner
                    title={rich(f.ctaTitle, { hl: (t) => <span className="text-star">{t}</span> })}
                    text={f.ctaText}
                    to="/observatorio"
                    label={f.ctaButton}
                    icon={ArrowRight}
                />
            </div>

            {/* columnas */}
            <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr]">
                <div>
                    <Link to="/" className="inline-block" aria-label={m.common.homeAria}>
                        <img src={logo} alt={m.common.logoAlt} className="h-12 w-auto" />
                    </Link>
                    <p className="mt-4 max-w-xs text-mist">
                        {f.tagline}
                    </p>
                </div>

                <nav aria-label={f.explore}>
                    <p className="text-xs font-bold tracking-wider text-paper/60 uppercase">{f.explore}</p>
                    <ul className="mt-4 flex flex-col gap-3">
                        {EXPLORE.map((l) => (
                            <li key={l.to}>
                                <Link to={l.to} className={footerLink}>
                                    {m.common.modules[l.key]}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>

                <nav aria-label={f.footerNav}>
                    <p className="text-xs font-bold tracking-wider text-paper/60 uppercase">{f.project}</p>
                    <ul className="mt-4 flex flex-col gap-3">
                        {PROJECT.map((l) => (
                            <li key={l.href}>
                                <a href={l.href} className={footerLink}>
                                    {f[l.key]}
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>
            </div>

            {/* barra inferior */}
            <div className="border-t border-paper/10">
                <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6 text-sm text-mist sm:flex-row sm:items-center sm:justify-between">
                    <p>{fmt(m.common.copyright, { year: new Date().getFullYear() })}</p>
                    <a
                        href="#top"
                        onClick={(e) => {
                            e.preventDefault();
                            window.scrollTo({
                                top: 0,
                                behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
                                    ? 'auto'
                                    : 'smooth',
                            });
                        }}
                        className="group inline-flex w-fit items-center gap-2 rounded-full border border-paper/15 px-4 py-2 font-semibold text-paper transition-colors hover:border-paper/40"
                    >
                        {f.backToTop}
                        <ArrowUp
                            aria-hidden="true"
                            className="size-4 transition-transform group-hover:-translate-y-0.5 motion-reduce:transition-none"
                        />
                    </a>
                </div>
            </div>
        </footer>
    );
}
