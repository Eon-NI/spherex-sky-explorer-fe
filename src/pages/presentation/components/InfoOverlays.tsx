import { motion } from 'motion/react';
import { useI18n } from '../../../i18n/useI18n';

/**
 * Capas animadas sobre las imágenes de la sección informativa.
 * Con prefers-reduced-motion (MotionConfig reducedMotion="user") quedan quietas.
 */

/** SPHEREx: una franja de escaneo recorre la imagen y deja ver las bandas infrarrojas */
export function SpherexScan() {
    const { m } = useI18n();
    return (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <motion.div
                className="absolute inset-y-0 left-0 w-1/4"
                style={{
                    background:
                        'linear-gradient(90deg, transparent, rgba(167,139,250,0.18) 30%, rgba(56,189,248,0.28) 60%, rgba(251,146,60,0.18) 85%, transparent)',
                    mixBlendMode: 'screen',
                }}
                initial={{ x: '-100%' }}
                animate={{ x: '400%' }}
                transition={{ duration: 7, ease: 'linear', repeat: Infinity, repeatDelay: 1.5 }}
            />
            <div className="font-hud absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-night/75 px-3 py-1.5 text-xs font-medium text-paper backdrop-blur">
                <span className="flex h-2 w-14 overflow-hidden rounded-full">
                    {['#a78bfa', '#60a5fa', '#38bdf8', '#34d399', '#facc15', '#fb923c'].map((c) => (
                        <span key={c} className="flex-1" style={{ background: c }} />
                    ))}
                </span>
                {m.landing.info.spherex.chip}
            </div>
        </div>
    );
}

/**
 * Planeta X (ilustración): un objeto tenue, casi invisible, que brilla en infrarrojo
 * y se desplaza lentamente; deja marcas de sus posiciones anteriores.
 */
export function HiddenWorldTrail() {
    const { m } = useI18n();
    return (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            {/* posiciones registradas en capturas anteriores */}
            {[0.15, 0.4, 0.65].map((t) => (
                <span
                    key={t}
                    className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-star/60"
                    style={{ left: `${12 + 50 * t}%`, top: `${68 - 30 * t}%` }}
                />
            ))}

            {/* la capa completa se desplaza (transform), así se detiene con reduced motion */}
            <motion.span
                className="absolute inset-0 block"
                initial={{ x: '0%', y: '0%' }}
                animate={{ x: '50%', y: '-30%' }}
                transition={{ duration: 16, ease: 'easeInOut', repeat: Infinity, repeatType: 'mirror' }}
            >
                <span className="absolute block" style={{ left: '12%', top: '68%' }}>
                {/* brillo infrarrojo */}
                <motion.span
                    className="absolute size-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(251,113,133,0.55),rgba(251,146,60,0.18)_45%,transparent_70%)]"
                    animate={{ scale: [1, 1.25, 1], opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                />
                <span className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ffd7c2]" />
                <span className="absolute size-7 -translate-x-1/2 -translate-y-1/2 rounded-full border border-star/80" />
                </span>
            </motion.span>

            <div className="font-hud absolute right-4 bottom-4 rounded-full bg-night/75 px-3 py-1.5 text-xs font-medium text-paper backdrop-blur">
                {m.landing.info.planetX.chip}
            </div>
        </div>
    );
}
