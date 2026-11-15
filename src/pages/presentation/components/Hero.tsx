import { Link } from 'react-router';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';

import AnimatedTitle, { TITLE_DURATION } from './AnimatedTitle';
import CosmicBackground from './CosmicBackground';
import { EASE_OUT } from './motionPresets';

const SUBTITLE =
    'Analiza más de mil millones de objetos capturados por la misión SPHEREx de la NASA. Compara épocas, filtra 102 bandas infrarrojas y ayúdanos a encontrar asteroides, enanas marrones y el próximo gran hallazgo astronómico con EON.';

export default function Hero() {
    return (
        <section
            aria-labelledby="hero-title"
            className="relative isolate flex min-h-[calc(100svh-4rem)] items-center overflow-hidden bg-night py-24 sm:py-28"
        >
            <CosmicBackground />

            <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-5 text-center sm:px-6">
                <AnimatedTitle
                    id="hero-title"
                    className="font-display w-full max-w-6xl text-[clamp(2.1rem,6.4vw,4.75rem)] leading-[1.04] font-extrabold tracking-tight text-paper"
                />

                <motion.p
                    className="mt-8 max-w-2xl text-base leading-relaxed text-paper/85 sm:text-lg lg:text-xl"
                    initial={{ opacity: 0, y: 18, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ duration: 0.9, ease: EASE_OUT, delay: TITLE_DURATION }}
                >
                    {SUBTITLE}
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 18, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.8, ease: EASE_OUT, delay: TITLE_DURATION + 0.25 }}
                >
                    <Link
                        to="/observatorio"
                        className="group mt-10 inline-flex items-center justify-center gap-3 rounded-full bg-[color-mix(in_oklab,var(--color-star)_86%,black)] px-7 py-4 text-base font-bold text-night shadow-[0_8px_28px_-12px_color-mix(in_oklab,var(--color-star)_45%,transparent)] transition-colors hover:bg-star sm:px-8 sm:text-lg"
                    >
                        Iniciar exploración en el Observatorio
                        <ArrowRight
                            aria-hidden="true"
                            className="size-5 transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
                        />
                    </Link>
                </motion.div>
            </div>
        </section>
    );
}
