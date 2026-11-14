import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { AlertTriangle, Hourglass, Layers, MousePointerClick, X } from 'lucide-react';

import {
    CHANNEL_COUNT,
    USE_MOCK,
    channelDetector,
    channelWavelength,
    fetchSpectralCube,
    fetchSpectrum,
    type SpectralCubeResponse,
    type SpectrumResponse,
} from '../../api/spherex';
import TimelapseViewer, { type ViewerMarker } from '../timelapse_components/TimelapseViewer';
import { inputClass } from '../timelapse_components/SearchFields';
import { useFramePreloader } from '../timelapse_components/useFramePreloader';
import { useTimelapsePlayer } from '../timelapse_components/useTimelapsePlayer';
import { uvToSky } from '../timelapse_components/skyMath';
import ChannelSlider from './ChannelSlider';
import SpectralCube from './SpectralCube';
import SpectrumCompareChart, { type SpectrumSeries } from './SpectrumCompareChart';
import { OBJECT_COLORS, hueAtPosition } from './spectralColors';

/* =========================================================
   Formulario y URL
   ========================================================= */
type FormValues = { ra: string; dec: string; fov: string; fovUnit: 'deg' | 'arcmin' };
type CubeQuery = { ra: number; dec: number; fovDeg: number };

/** Por defecto: la galaxia de Andrómeda (M31), como en la figura del cubo */
const DEFAULT_FORM: FormValues = { ra: '10.68470', dec: '41.26875', fov: '0.5', fovUnit: 'deg' };
const MAX_FOV = 3.5; // grados

function validate(f: FormValues): { query?: CubeQuery; error?: string } {
    const ra = Number(f.ra.replace(',', '.'));
    const dec = Number(f.dec.replace(',', '.'));
    const raw = Number(f.fov.replace(',', '.'));
    const fovDeg = f.fovUnit === 'arcmin' ? raw / 60 : raw;
    if (!Number.isFinite(ra) || ra < 0 || ra >= 360) return { error: 'RA debe estar entre 0° y 360°.' };
    if (!Number.isFinite(dec) || dec < -90 || dec > 90) return { error: 'Dec debe estar entre −90° y +90°.' };
    if (!Number.isFinite(fovDeg) || fovDeg <= 0 || fovDeg > MAX_FOV)
        return { error: `El campo de visión debe ser mayor que 0 y como máximo ${MAX_FOV}°.` };
    return { query: { ra, dec, fovDeg } };
}

/* =========================================================
   Objetos seleccionados (hasta 3)
   ========================================================= */
type ObjectPoint = {
    id: string;
    slot: number;
    u: number;
    v: number;
    ra: number;
    dec: number;
};

const MAX_OBJECTS = 3;

/* =========================================================
   Módulo Spectral Explorer
   ========================================================= */
export default function SpectralModule() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [initial] = useState(() => {
        const form: FormValues = {
            ...DEFAULT_FORM,
            ra: searchParams.get('ra') ?? DEFAULT_FORM.ra,
            dec: searchParams.get('dec') ?? DEFAULT_FORM.dec,
            fov: searchParams.get('fov') ?? DEFAULT_FORM.fov,
        };
        const ch = Number(searchParams.get('ch'));
        return {
            form,
            auto: searchParams.has('ra') && searchParams.has('dec'),
            channel: Number.isFinite(ch) && searchParams.has('ch') ? Math.max(1, Math.min(CHANNEL_COUNT, ch)) - 1 : undefined,
        };
    });

    const [form, setForm] = useState<FormValues>(initial.form);
    const [formError, setFormError] = useState<string | null>(null);
    const [query, setQuery] = useState<CubeQuery | null>(() =>
        initial.auto ? (validate(initial.form).query ?? null) : null,
    );
    const queryKey = query ? JSON.stringify(query) : '';
    const [result, setResult] = useState<{ key: string; data?: SpectralCubeResponse; error?: string } | null>(null);
    const pendingChannel = useRef<number | undefined>(initial.channel);

    const [objects, setObjects] = useState<ObjectPoint[]>([]);
    const [spectra, setSpectra] = useState<Record<string, SpectrumResponse | { error: string }>>({});
    const [zoom, setZoom] = useState(1);

    /* ---------- cubo espectral ---------- */
    useEffect(() => {
        if (!query) return;
        const ctrl = new AbortController();
        fetchSpectralCube(query, ctrl.signal)
            .then((data) => setResult({ key: queryKey, data }))
            .catch((e: Error) => {
                if (e.name !== 'AbortError')
                    setResult({ key: queryKey, error: e.message || 'No se pudo conectar con el servidor.' });
            });
        return () => ctrl.abort();
    }, [query, queryKey]);

    const current = result?.key === queryKey ? result : null;
    const fetching = !!query && !current;
    const channels = useMemo(
        () => [...(current?.data?.channels ?? [])].sort((a, b) => a.index - b.index),
        [current],
    );
    const urls = useMemo(() => channels.map((c) => c.imageUrl), [channels]);
    const preload = useFramePreloader(urls);
    // reutilizamos el motor del timelapse: aquí cada "frame" es un canal
    const player = useTimelapsePlayer(preload.images.length);
    const { jumpTo } = player;
    const ready = preload.images.length > 0;
    const loading = fetching || preload.loading;
    const channel = Math.min(player.index, CHANNEL_COUNT - 1);

    useEffect(() => {
        if (preload.images.length === 0) return;
        jumpTo(pendingChannel.current ?? 0);
        pendingChannel.current = undefined;
    }, [preload.images.length, jumpTo]);

    /* ---------- acciones ---------- */
    const onSubmit = (e: FormEvent) => {
        e.preventDefault();
        const { query: q, error } = validate(form);
        if (!q) {
            setFormError(error ?? 'Revisa los datos.');
            return;
        }
        setFormError(null);
        setObjects([]);
        setSpectra({});
        setZoom(1);
        pendingChannel.current = channel;
        setQuery(q);
        setSearchParams(
            { ra: String(q.ra), dec: String(q.dec), fov: String(q.fovDeg), ch: String(channel + 1) },
            { replace: true, preventScrollReset: true },
        );
    };

    const selectChannel = (i: number) => {
        player.goTo(i);
    };

    const onSelectPoint = (u: number, v: number) => {
        if (!query) return;
        const sky = uvToSky(u, v, query.ra, query.dec, query.fovDeg);
        const used = new Set(objects.map((o) => o.slot));
        const keep = objects.length >= MAX_OBJECTS ? objects.slice(1) : objects;
        const freed = objects.length >= MAX_OBJECTS ? objects[0].slot : undefined;
        const slot = freed ?? [0, 1, 2].find((s) => !used.has(s)) ?? 0;
        const point: ObjectPoint = { id: crypto.randomUUID(), slot, u, v, ...sky };
        setObjects([...keep, point]);

        fetchSpectrum(sky.ra, sky.dec)
            .then((data) => setSpectra((s) => ({ ...s, [point.id]: data })))
            .catch((err: Error) => setSpectra((s) => ({ ...s, [point.id]: { error: err.message } })));
    };

    const removeObject = (id: string) => setObjects((list) => list.filter((o) => o.id !== id));

    const markers: ViewerMarker[] = useMemo(
        () => objects.map((o) => ({ u: o.u, v: o.v, color: OBJECT_COLORS[o.slot], label: `Objeto ${o.slot + 1}` })),
        [objects],
    );

    const series: SpectrumSeries[] = objects.map((o) => {
        const s = spectra[o.id];
        return {
            id: o.id,
            label: `Objeto ${o.slot + 1}`,
            color: OBJECT_COLORS[o.slot],
            points: s && 'points' in s ? s.points : undefined,
            loading: !s,
        };
    });
    const unit = Object.values(spectra).find((s): s is SpectrumResponse => 'points' in s)?.unit ?? 'flujo';
    const errorMessage = formError ?? current?.error ?? preload.error;
    const wl = channelWavelength(channel);

    return (
        <section id="spectral" className="px-4 py-16 md:px-8">
            <div className="mx-auto max-w-7xl">
                {/* ---------- encabezado ---------- */}
                <div className="mb-10 text-center">
                    <span className="text-xs font-medium uppercase tracking-[0.35em] text-sky-400">
                        Módulo · Spectral Explorer
                    </span>
                    <h2 className="font-display mx-auto mt-3 max-w-3xl text-3xl font-bold text-white md:text-5xl">
                        Mira un punto a través de los{' '}
                        <span className="bg-gradient-to-r from-sky-300 via-blue-400 to-violet-400 bg-clip-text text-transparent">
                            102 canales
                        </span>{' '}
                        de SPHEREx
                    </h2>
                    <p className="mx-auto mt-4 max-w-2xl text-slate-400">
                        SPHEREx fotografía cada región en 102 longitudes de onda infrarrojas. Desliza entre canales
                        para ver cómo cambia la imagen y haz clic en hasta 3 objetos para comparar sus espectros.
                    </p>
                    {USE_MOCK && (
                        <span className="mt-4 inline-block rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-xs font-medium text-sky-200">
                            Datos simulados
                        </span>
                    )}
                </div>

                <div className="liquid-glass rounded-3xl p-3 md:p-4">
                    <div className="grid gap-3 lg:grid-cols-[1.55fr_1fr]">
                        {/* ---------- visor del canal ---------- */}
                        <div className="relative h-[52vh] min-h-[340px] overflow-hidden rounded-2xl bg-[#05070f] ring-1 ring-white/10 lg:h-auto lg:min-h-[520px]">
                            <TimelapseViewer
                                images={preload.images}
                                posRef={player.posRef}
                                fade={1}
                                zoom={zoom}
                                onZoomChange={setZoom}
                                selected={null}
                                markers={markers}
                                onSelect={onSelectPoint}
                                hueAt={hueAtPosition}
                            />

                            {ready && (
                                <div className="pointer-events-none absolute left-4 top-4 flex flex-wrap gap-2">
                                    <span className="font-display rounded-full bg-[#05070f]/70 px-3 py-1 text-sm tabular-nums text-white backdrop-blur">
                                        λ {wl.toFixed(2)} µm
                                    </span>
                                    <span className="font-display rounded-full bg-[#05070f]/70 px-3 py-1 text-xs tabular-nums text-slate-300 backdrop-blur">
                                        CH {String(channel + 1).padStart(3, '0')} / {CHANNEL_COUNT}
                                    </span>
                                    <span className="rounded-full bg-[#05070f]/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-sky-300 backdrop-blur">
                                        {channelDetector(channel)}
                                    </span>
                                </div>
                            )}

                            {ready && (
                                <div className="absolute bottom-4 right-4 flex items-center gap-1 rounded-full bg-[#05070f]/70 p-1 backdrop-blur">
                                    <button
                                        type="button"
                                        onClick={() => setZoom((z) => Math.max(1, z / 1.5))}
                                        disabled={zoom <= 1}
                                        className="h-8 w-8 rounded-full text-slate-300 hover:bg-white/10 disabled:opacity-30"
                                        aria-label="Alejar"
                                    >
                                        −
                                    </button>
                                    <span className="font-display w-10 text-center text-xs tabular-nums text-slate-300">
                                        {zoom.toFixed(1)}×
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setZoom((z) => Math.min(8, z * 1.5))}
                                        disabled={zoom >= 8}
                                        className="h-8 w-8 rounded-full text-slate-300 hover:bg-white/10 disabled:opacity-30"
                                        aria-label="Acercar"
                                    >
                                        +
                                    </button>
                                </div>
                            )}

                            {ready && objects.length === 0 && (
                                <span className="pointer-events-none absolute bottom-4 left-4 flex items-center gap-1.5 rounded-full bg-[#05070f]/70 px-3 py-1 text-xs text-slate-300 backdrop-blur">
                                    <MousePointerClick size={14} /> Haz clic en un objeto para ver su espectro
                                </span>
                            )}

                            {!ready && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                                    {loading ? (
                                        <>
                                            <Hourglass size={34} className="animate-spin text-sky-300 [animation-duration:2.4s]" />
                                            <p className="font-display text-lg text-white">
                                                {fetching ? 'Consultando el cubo espectral…' : 'Cargando los 102 canales…'}
                                            </p>
                                            {!fetching && preload.total > 0 && (
                                                <div className="w-56">
                                                    <div className="h-1 overflow-hidden rounded-full bg-white/10">
                                                        <div
                                                            className="h-full rounded-full bg-gradient-to-r from-sky-400 to-violet-400 transition-[width]"
                                                            style={{ width: `${(preload.loaded / preload.total) * 100}%` }}
                                                        />
                                                    </div>
                                                    <p className="font-display mt-2 text-xs tabular-nums text-slate-400">
                                                        {preload.loaded} / {preload.total}
                                                    </p>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <Layers size={34} className="text-sky-300" />
                                            <p className="font-display text-lg text-white">Elige una región del cielo</p>
                                            <p className="max-w-sm text-sm text-slate-400">
                                                Escribe RA, Dec y campo de visión y pulsa «GO».
                                            </p>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* ---------- cubo + espectros ---------- */}
                        <div className="flex flex-col gap-3">
                            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                                <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-sky-300">
                                    Cubo espectral
                                </p>
                                <p className="mt-1 text-xs text-slate-500">La misma región, apilada en 102 imágenes.</p>
                                <div className={ready ? '' : 'pointer-events-none opacity-40'}>
                                    <SpectralCube channel={channel} onSelect={selectChannel} />
                                </div>
                            </div>

                            <div className="flex-1 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                                <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-sky-300">
                                    Espectro de los objetos
                                </p>
                                {objects.length === 0 ? (
                                    <p className="mt-3 text-sm leading-6 text-slate-400">
                                        Cada objeto brilla distinto en cada canal. Haz clic sobre la imagen para trazar su
                                        espectro y compara hasta {MAX_OBJECTS}.
                                    </p>
                                ) : (
                                    <>
                                        <SpectrumCompareChart
                                            series={series}
                                            channel={channel}
                                            unit={unit}
                                            onChannelChange={selectChannel}
                                        />
                                        <ul className="mt-2 space-y-1.5">
                                            {objects.map((o) => {
                                                const s = spectra[o.id];
                                                return (
                                                    <li key={o.id} className="flex items-center gap-2 text-xs">
                                                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: OBJECT_COLORS[o.slot] }} />
                                                        <span className="font-medium text-slate-200">Objeto {o.slot + 1}</span>
                                                        <span className="font-display flex-1 truncate tabular-nums text-slate-500">
                                                            {o.ra.toFixed(4)}°, {o.dec >= 0 ? '+' : ''}
                                                            {o.dec.toFixed(4)}°
                                                        </span>
                                                        {!s && <span className="animate-pulse text-slate-500">cargando…</span>}
                                                        {s && 'error' in s && <span className="text-violet-300">error</span>}
                                                        <button
                                                            type="button"
                                                            onClick={() => removeObject(o.id)}
                                                            aria-label={`Quitar objeto ${o.slot + 1}`}
                                                            className="rounded-full p-1 text-slate-500 hover:bg-white/10 hover:text-white"
                                                        >
                                                            <X size={13} />
                                                        </button>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ---------- controles (como el wireframe) ---------- */}
                    <div className="mt-3 grid gap-3 lg:grid-cols-[1.25fr_1fr]">
                        <form onSubmit={onSubmit} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                            <p className="mb-4 text-sm text-slate-400">
                                Ingresa la ascensión recta, la declinación y el campo de visión.
                            </p>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
                                <label className="block">
                                    <span className="text-[11px] font-medium uppercase tracking-[0.25em] text-sky-300">RA</span>
                                    <input
                                        className={inputClass}
                                        inputMode="decimal"
                                        value={form.ra}
                                        placeholder="10.68470"
                                        onChange={(e) => setForm((f) => ({ ...f, ra: e.target.value }))}
                                        required
                                    />
                                    <span className="mt-1 block text-[11px] text-slate-500">Right Ascension (°)</span>
                                </label>
                                <label className="block">
                                    <span className="text-[11px] font-medium uppercase tracking-[0.25em] text-sky-300">Dec</span>
                                    <input
                                        className={inputClass}
                                        inputMode="decimal"
                                        value={form.dec}
                                        placeholder="41.26875"
                                        onChange={(e) => setForm((f) => ({ ...f, dec: e.target.value }))}
                                        required
                                    />
                                    <span className="mt-1 block text-[11px] text-slate-500">Declination (°)</span>
                                </label>
                                <label className="block">
                                    <span className="text-[11px] font-medium uppercase tracking-[0.25em] text-sky-300">FoV</span>
                                    <div className="mt-1.5 flex overflow-hidden rounded-xl border border-white/15 bg-white/5 focus-within:border-sky-400">
                                        <input
                                            className="font-display w-full min-w-0 bg-transparent px-3 py-2 text-sm tabular-nums text-white placeholder:text-slate-500 focus:outline-none"
                                            inputMode="decimal"
                                            value={form.fov}
                                            placeholder="0.5"
                                            onChange={(e) => setForm((f) => ({ ...f, fov: e.target.value }))}
                                            required
                                        />
                                        <select
                                            aria-label="Unidad del campo de visión"
                                            value={form.fovUnit}
                                            onChange={(e) => setForm((f) => ({ ...f, fovUnit: e.target.value as FormValues['fovUnit'] }))}
                                            className="border-l border-white/10 bg-transparent px-2 text-sm text-slate-300 focus:outline-none [&>option]:bg-[#0a1230]"
                                        >
                                            <option value="deg">°</option>
                                            <option value="arcmin">′</option>
                                        </select>
                                    </div>
                                    <span className="mt-1 block text-[11px] text-slate-500">Field of view</span>
                                </label>
                                <div className="pb-5">
                                    <button
                                        type="submit"
                                        disabled={fetching}
                                        className="w-full rounded-full bg-sky-500 px-7 py-2.5 text-sm font-bold tracking-[0.2em] text-slate-950 transition hover:bg-sky-400 disabled:opacity-50"
                                    >
                                        {fetching ? '…' : 'GO'}
                                    </button>
                                </div>
                            </div>
                            {errorMessage && (
                                <p role="alert" className="mt-1 flex items-center gap-2 text-sm text-violet-300">
                                    <AlertTriangle size={16} /> {errorMessage}
                                </p>
                            )}
                        </form>

                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                            <ChannelSlider
                                channel={channel}
                                onChange={selectChannel}
                                playing={player.playing}
                                onPlay={() => {
                                    player.setLoop(false);
                                    player.setFps(14);
                                    player.play();
                                }}
                                onPause={player.pause}
                                disabled={!ready}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
