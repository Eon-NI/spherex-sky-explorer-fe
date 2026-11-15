import { useEffect, useRef } from 'react';

/**
 * Fondo espacial animado del hero:
 * - una galaxia espiral de partículas que gira muy despacio (rotación diferencial)
 * - tres capas de estrellas con paralaje según el puntero
 * Se dibuja en <canvas>; debajo siempre queda un degradado CSS como alternativa estática
 * (si el canvas no está disponible o mientras carga).
 * Con prefers-reduced-motion se dibuja un único fotograma fijo.
 */

type Star = { x: number; y: number; r: number; a: number; layer: number; tw: number };
type Particle = { radius: number; angle: number; size: number; alpha: number; hue: number };

function mulberry32(seed: number) {
    let a = seed;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function makeGalaxy(count: number): Particle[] {
    const rand = mulberry32(7);
    const arms = 3;
    return Array.from({ length: count }, () => {
        const arm = Math.floor(rand() * arms);
        const radius = Math.pow(rand(), 0.6); // más densidad cerca del núcleo
        const spread = (rand() - 0.5) * 0.55 * (1 - radius * 0.4);
        const angle = (arm / arms) * Math.PI * 2 + radius * 4.2 + spread;
        return {
            radius,
            angle,
            size: rand() < 0.04 ? 1.8 : 0.6 + rand() * 0.9,
            alpha: 0.25 + rand() * 0.6,
            // núcleo cálido, brazos azulados/violetas
            hue: radius < 0.18 ? 40 : rand() < 0.65 ? 210 : 265,
        };
    });
}

function makeStars(count: number): Star[] {
    const rand = mulberry32(42);
    return Array.from({ length: count }, () => {
        const layer = rand() < 0.6 ? 0 : rand() < 0.75 ? 1 : 2;
        return {
            x: rand(),
            y: rand(),
            r: [0.5, 0.9, 1.4][layer] * (0.7 + rand() * 0.6),
            a: 0.35 + rand() * 0.65,
            layer,
            tw: rand() * Math.PI * 2,
        };
    });
}

export default function CosmicBackground({ className = '' }: { className?: string }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return; // se queda el degradado CSS

        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const galaxy = makeGalaxy(1600);
        const stars = makeStars(420);
        const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
        let w = 0;
        let h = 0;
        let dpr = 1;
        let raf = 0;
        let visible = true;
        let last = performance.now();
        let t = 0;

        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            w = rect.width;
            h = rect.height;
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            if (reduced) draw();
        };

        const draw = () => {
            ctx.clearRect(0, 0, w, h);
            const mobile = w < 640;

            // estrellas de fondo con paralaje por capas
            for (const s of stars) {
                const depth = [6, 14, 26][s.layer];
                const x = (s.x * w + pointer.x * depth + w) % w;
                const y = (s.y * h + pointer.y * depth + t * (s.layer + 1) * 1.2) % h;
                const twinkle = reduced ? 1 : 0.75 + 0.25 * Math.sin(t * 1.4 + s.tw);
                ctx.globalAlpha = s.a * twinkle;
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(x, y, s.r, s.r);
            }

            // galaxia: elipse inclinada, abajo en móvil, centrada-baja en escritorio
            const cx = w * 0.5 + pointer.x * 18;
            const cy = h * (mobile ? 0.82 : 0.66) + pointer.y * 12;
            const size = Math.max(w, h) * (mobile ? 0.75 : 0.55);
            const tilt = -0.32;
            const cosT = Math.cos(tilt);
            const sinT = Math.sin(tilt);

            ctx.globalCompositeOperation = 'lighter';
            const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.32);
            core.addColorStop(0, 'rgba(255, 228, 180, 0.45)');
            core.addColorStop(0.35, 'rgba(140, 150, 255, 0.10)');
            core.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.globalAlpha = 1;
            ctx.fillStyle = core;
            ctx.fillRect(0, 0, w, h);

            for (const p of galaxy) {
                // rotación diferencial: el centro gira más rápido que los bordes
                const a = p.angle + t * (0.05 / (0.25 + p.radius));
                const ex = Math.cos(a) * p.radius * size;
                const ey = Math.sin(a) * p.radius * size * 0.38;
                const x = cx + ex * cosT - ey * sinT;
                const y = cy + ex * sinT + ey * cosT;
                ctx.globalAlpha = Math.min(1, p.alpha * 1.35 * (1 - p.radius * 0.5));
                ctx.fillStyle = `hsl(${p.hue}, 85%, ${p.hue === 40 ? 80 : 72}%)`;
                ctx.fillRect(x, y, p.size, p.size);
            }
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;
        };

        const loop = (now: number) => {
            raf = requestAnimationFrame(loop);
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            if (!visible) return;
            t += dt;
            pointer.x += (pointer.tx - pointer.x) * 0.04;
            pointer.y += (pointer.ty - pointer.y) * 0.04;
            draw();
        };

        const onPointer = (e: PointerEvent) => {
            pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
            pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
        };

        const ro = new ResizeObserver(resize);
        ro.observe(canvas);
        resize();

        // no gastar batería cuando el hero no está en pantalla
        const io = new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
        });
        io.observe(canvas);

        if (reduced) {
            draw();
        } else {
            window.addEventListener('pointermove', onPointer, { passive: true });
            raf = requestAnimationFrame(loop);
        }

        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
            io.disconnect();
            window.removeEventListener('pointermove', onPointer);
        };
    }, []);

    return (
        <div aria-hidden="true" className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className}`}>
            {/* alternativa estática: nebulosa en degradado */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_70%,rgba(99,102,241,0.28),transparent_70%),radial-gradient(ellipse_45%_35%_at_20%_20%,rgba(56,189,248,0.16),transparent_70%),radial-gradient(ellipse_40%_35%_at_85%_30%,rgba(168,85,247,0.18),transparent_70%)] bg-night" />
            <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
            {/* velo para asegurar contraste del texto */}
            <div
                className="absolute inset-0"
                style={{
                    background:
                        'radial-gradient(ellipse 60% 55% at 50% 42%, color-mix(in oklab, var(--color-night) 72%, transparent), color-mix(in oklab, var(--color-night) 25%, transparent) 70%, transparent)',
                }}
            />
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-night to-transparent" />
        </div>
    );
}
