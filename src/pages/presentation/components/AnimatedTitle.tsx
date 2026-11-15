import { motion, useReducedMotion } from 'motion/react';
import { EASE_OUT } from './motionPresets';

/**
 * Título del hero con animación tipográfica.
 *
 * Interpretación propia del concepto "apertura de la O" (no se pudo ver la referencia):
 * en COSMOS y MUNDOS la letra O nace como un punto de luz, crece hasta ser un disco
 * (un planeta), se "abre" en un anillo y, desde ese anillo, salen el resto de letras
 * de la palabra. Las demás palabras emergen desde abajo línea a línea.
 *
 * Accesibilidad: el h1 contiene el texto completo para lectores de pantalla;
 * la versión animada es decorativa (aria-hidden).
 */

const TEXT = 'EXPLORA EL COSMOS Y DESCUBRE NUEVOS MUNDOS A TRAVÉS DEL TIEMPO';

type Word = { text: string; open?: boolean };

const LINES: Word[][] = [
    [{ text: 'EXPLORA' }, { text: 'EL' }, { text: 'COSMOS', open: true }],
    [{ text: 'Y' }, { text: 'DESCUBRE' }, { text: 'NUEVOS' }, { text: 'MUNDOS', open: true }],
    [{ text: 'A' }, { text: 'TRAVÉS' }, { text: 'DEL' }, { text: 'TIEMPO' }],
];

/** Momento (s) en que empieza cada línea */
const LINE_START = [0.15, 0.95, 1.6];
/** Retraso extra de la palabra que se abre ("O"), por línea */
const OPEN_OFFSET = [0.25, 0.32, 0];

export const TITLE_DURATION = 2.3; // el subtítulo entra cuando el título casi termina

const accent = 'text-star';

/** Palabra normal: sube desde detrás de una máscara */
function RiseWord({ text, delay }: { text: string; delay: number }) {
    return (
        <span className="inline-block overflow-hidden px-[0.04em] pt-[0.14em] pb-[0.06em] -mt-[0.14em] align-bottom">
            <motion.span
                className="inline-block"
                initial={{ y: '105%', opacity: 0 }}
                animate={{ y: '0%', opacity: 1 }}
                transition={{ duration: 0.8, ease: EASE_OUT, delay }}
            >
                {text}
            </motion.span>
        </span>
    );
}

/** Palabra que se abre desde su letra O */
function OpeningWord({ text, delay }: { text: string; delay: number }) {
    const letters = [...text];
    const oIndex = letters.indexOf('O');

    const DOT = delay; // aparece el punto de luz
    const DISK = DOT + 0.3; // crece a disco
    const OPEN = DISK + 0.35; // se abre en anillo
    const SPREAD = OPEN + 0.1; // salen las letras
    const SETTLE = OPEN + 0.55; // el anillo se funde con la letra

    return (
        <span className={`relative inline-block ${accent}`}>
            {letters.map((ch, i) => {
                if (i === oIndex) {
                    return (
                        <span key={i} className="relative z-10 inline-block">
                            {/* la letra real aparece al final, cuando el anillo se desvanece */}
                            <motion.span
                                className="inline-block"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.4, delay: SETTLE }}
                            >
                                {ch}
                            </motion.span>

                            {/* halo */}
                            <motion.span
                                className="absolute top-1/2 left-1/2 size-[1.6em] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--color-star)_55%,transparent),transparent_65%)]"
                                initial={{ opacity: 0, scale: 0.2 }}
                                animate={{ opacity: [0, 1, 0.6, 0], scale: [0.2, 0.7, 1.1, 1.4] }}
                                transition={{ duration: 1.5, delay: DOT, ease: 'easeOut', times: [0, 0.3, 0.6, 1] }}
                            />

                            {/* punto → disco → anillo */}
                            <motion.span
                                className="absolute top-[52%] left-1/2 size-[0.74em] rounded-full border-solid border-current"
                                style={{ x: '-50%', y: '-50%' }}
                                initial={{ scale: 0, borderWidth: '0.37em', opacity: 1 }}
                                animate={{
                                    scale: [0, 0.18, 1.08, 1],
                                    borderWidth: ['0.37em', '0.37em', '0.37em', '0.13em'],
                                    opacity: [1, 1, 1, 0],
                                }}
                                transition={{
                                    duration: SETTLE + 0.35 - DOT,
                                    delay: DOT,
                                    ease: EASE_OUT,
                                    times: [
                                        0,
                                        (DISK - DOT) / (SETTLE + 0.35 - DOT),
                                        (OPEN - DOT) / (SETTLE + 0.35 - DOT),
                                        1,
                                    ],
                                }}
                            />
                        </span>
                    );
                }

                // el resto de letras sale desde la O hacia su sitio
                const k = i - oIndex;
                return (
                    <motion.span
                        key={i}
                        className="relative inline-block"
                        initial={{ x: `${-k * 0.62}em`, opacity: 0, filter: 'blur(6px)' }}
                        animate={{ x: '0em', opacity: 1, filter: 'blur(0px)' }}
                        transition={{ duration: 0.75, ease: EASE_OUT, delay: SPREAD + Math.abs(k) * 0.045 }}
                    >
                        {ch}
                    </motion.span>
                );
            })}
        </span>
    );
}

export default function AnimatedTitle({ className = '', id }: { className?: string; id?: string }) {
    const reduced = useReducedMotion();

    return (
        <h1 id={id} className={className}>
            <span className="sr-only">{TEXT}</span>

            <span aria-hidden="true" className="block">
                {LINES.map((line, li) => {
                    return (
                        <span key={li} className="block">
                            {line.map((word, wi) => {
                                const isAccent = word.open;
                                const space = wi < line.length - 1 ? ' ' : '';
                                if (reduced) {
                                    return (
                                        <span key={wi} className={isAccent ? accent : undefined}>
                                            {word.text}
                                            {space}
                                        </span>
                                    );
                                }
                                const delay = word.open
                                    ? LINE_START[li] + OPEN_OFFSET[li]
                                    : LINE_START[li] + wi * 0.08;
                                return (
                                    <span key={wi}>
                                        {word.open ? (
                                            <OpeningWord text={word.text} delay={delay} />
                                        ) : (
                                            <RiseWord text={word.text} delay={delay} />
                                        )}
                                        {space}
                                    </span>
                                );
                            })}
                        </span>
                    );
                })}
            </span>
        </h1>
    );
}
