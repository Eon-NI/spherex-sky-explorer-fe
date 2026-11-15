import { motion } from 'motion/react';
import { Orbit, Sparkles, Telescope } from 'lucide-react';
import logo from '../../../assets/EON.svg';
import { EASE_OUT, VIEWPORT, rise, stagger } from './motionPresets';

const PILLARS = [
    {
        icon: Telescope,
        title: 'Astronomía',
        text: 'Nos mueve la curiosidad por lo que el cielo aún esconde.',
    },
    {
        icon: Sparkles,
        title: 'Tecnología',
        text: 'Convertimos datos científicos en experiencias visuales.',
    },
    {
        icon: Orbit,
        title: 'Exploración',
        text: 'Queremos que cualquier persona pueda descubrir el cielo.',
    },
];

/** Logo en el centro de un pequeño sistema orbital */
function OrbitLogo() {
    const orbits = [
        { r: 118, dur: 36, dot: 7, dotClass: 'fill-star' },
        { r: 160, dur: 58, dot: 5, dotClass: 'fill-sky' },
        { r: 196, dur: 84, dot: 4, dotClass: 'fill-mint' },
    ];

    return (
        <div className="relative mx-auto aspect-square w-72 sm:w-80 md:w-[26rem]">
            {/* halo */}
            <div className="absolute inset-[18%] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--color-sky)_30%,transparent),transparent_70%)] blur-2xl" />

            <svg viewBox="0 0 420 420" aria-hidden="true" className="absolute inset-0 h-full w-full">
                {orbits.map((o, i) => (
                    <g key={o.r}>
                        <circle
                            cx="210"
                            cy="210"
                            r={o.r}
                            className="fill-none stroke-paper/15"
                            strokeWidth={1.5}
                            strokeDasharray={i === 1 ? '2 8' : undefined}
                            strokeLinecap="round"
                        />
                        <motion.g
                            style={{ originX: '210px', originY: '210px', transformBox: 'view-box' }}
                            initial={{ rotate: i * 90 }}
                            animate={{ rotate: i * 90 + (i % 2 ? -360 : 360) }}
                            transition={{ duration: o.dur, ease: 'linear', repeat: Infinity }}
                        >
                            <circle cx="210" cy={210 - o.r} r={o.dot * 2.4} className={`${o.dotClass} opacity-20`} />
                            <circle cx="210" cy={210 - o.r} r={o.dot} className={o.dotClass} />
                        </motion.g>
                    </g>
                ))}

                {/* destellos */}
                {[
                    [60, 90, 0],
                    [360, 120, 0.8],
                    [330, 350, 1.6],
                    [80, 320, 2.2],
                ].map(([x, y, d]) => (
                    <motion.path
                        key={`${x}-${y}`}
                        d={`M${x} ${y - 7} L${x + 1.6} ${y - 1.6} L${x + 7} ${y} L${x + 1.6} ${y + 1.6} L${x} ${y + 7} L${x - 1.6} ${y + 1.6} L${x - 7} ${y} L${x - 1.6} ${y - 1.6}Z`}
                        className="fill-paper"
                        animate={{ opacity: [0.2, 1, 0.2] }}
                        transition={{ duration: 2.6, delay: d, repeat: Infinity, ease: 'easeInOut' }}
                    />
                ))}
            </svg>

            {/* logo flotando */}
            <motion.div
                className="absolute inset-0 flex items-center justify-center"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            >
                <img src={logo} alt="Logo EON" className="w-36 drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)] md:w-48" />
            </motion.div>
        </div>
    );
}

export default function AboutSection() {
    return (
        <section
            id="about"
            aria-labelledby="about-title"
            className="relative isolate scroll-mt-20 overflow-hidden bg-night-soft py-20 lg:py-28"
        >
            {/* fondo: puntos de estrellas muy tenues */}
            <div
                aria-hidden="true"
                className="absolute inset-0 -z-10 opacity-40 [background-image:radial-gradient(circle,color-mix(in_oklab,var(--color-paper)_45%,transparent)_1px,transparent_1.5px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
            />

            <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 md:grid-cols-[auto_1fr] md:gap-16">
                <motion.div
                    initial={{ opacity: 0, scale: 0.85, rotate: -8 }}
                    whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                    viewport={VIEWPORT}
                    transition={{ duration: 1.2, ease: EASE_OUT }}
                >
                    <OrbitLogo />
                </motion.div>

                <motion.div
                    className="max-w-2xl"
                    variants={stagger(0.12)}
                    initial="hidden"
                    whileInView="show"
                    viewport={VIEWPORT}
                >
                    <motion.span
                        variants={rise}
                        className="inline-flex rounded-full bg-paper/10 px-3 py-1 text-xs font-bold tracking-wider text-star uppercase"
                    >
                        Acerca de EON
                    </motion.span>

                    <motion.h2
                        id="about-title"
                        variants={rise}
                        className="font-display mt-4 text-3xl font-extrabold tracking-tight text-balance lg:text-5xl"
                    >
                        Somos EON
                    </motion.h2>

                    {/* Primer párrafo más destacado: marca la jerarquía del bloque */}
                    <motion.p variants={rise} className="mt-6 text-xl leading-relaxed text-paper">
                        Somos un equipo de estudiantes apasionados por la tecnología y la astronomía.
                    </motion.p>

                    <motion.p variants={rise} className="mt-4 text-lg leading-relaxed text-mist">
                        A través de LOOK-EON buscamos acercar la exploración astronómica a los usuarios,
                        permitiéndoles descubrir el cielo y explorar sus cambios a través del tiempo.
                    </motion.p>

                    <motion.ul variants={stagger(0.1)} className="mt-10 grid gap-4 sm:grid-cols-3">
                        {PILLARS.map(({ icon: Icon, title, text }) => (
                            <motion.li
                                key={title}
                                variants={rise}
                                className="group rounded-2xl border border-paper/10 bg-night/40 p-5 transition-colors duration-300 hover:border-star/40 hover:bg-night/60"
                            >
                                <span className="flex size-10 items-center justify-center rounded-xl bg-star/15 text-star transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:rotate-6 motion-reduce:transition-none">
                                    <Icon aria-hidden="true" className="size-5" />
                                </span>
                                <h3 className="mt-4 font-bold text-paper">{title}</h3>
                                <p className="mt-1 text-sm leading-relaxed text-mist">{text}</p>
                            </motion.li>
                        ))}
                    </motion.ul>
                </motion.div>
            </div>
        </section>
    );
}
