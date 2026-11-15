import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { useI18n } from '../../i18n/useI18n';
import { fmt, rich } from '../../i18n/format';
import { AlertTriangle, Hourglass, Layers, MousePointerClick, X } from 'lucide-react';

import {
    CHANNEL_COUNT,
    channelDetector,
    channelWavelength,
    fetchSpectralCube,
    fetchSpectrum,
    resolveSpectralPoint,
    setLiveChannels,
    type SpectralCubeResponse,
    type SpectrumResponse,
} from '../../api/spherex';
import TimelapseViewer, { type ViewerMarker } from '../timelapse_components/TimelapseViewer';
import { inputClass } from '../timelapse_components/SearchFields';
import ChannelSlider from './ChannelSlider';
import SpectralCube from './SpectralCube';
import SpectrumCompareChart, { type SpectrumSeries } from './SpectrumCompareChart';
import { OBJECT_COLORS } from './spectralColors';

/* =========================================================
   Formulario y URL
   ========================================================= */
type FormValues = { ra: string; dec: string; fov: string; fovUnit: 'deg' | 'arcmin' };
type CubeQuery = { ra: number; dec: number; fovDeg: number };

/** Por defecto: la galaxia de Andrómeda (M31), como en la figura del cubo */
const DEFAULT_FORM: FormValues = { ra: '10.68470', dec: '41.26875', fov: '0.5', fovUnit: 'deg' };
const MAX_FOV = 1; // un tile order-5; el servidor recorta al tile

function validate(f: FormValues): { query?: CubeQuery; error?: 'ra' | 'dec' | 'fov' } {
    const ra = Number(f.ra.replace(',', '.'));
    const dec = Number(f.dec.replace(',', '.'));
    const raw = Number(f.fov.replace(',', '.'));
    const fovDeg = f.fovUnit === 'arcmin' ? raw / 60 : raw;
    if (!Number.isFinite(ra) || ra < 0 || ra >= 360) return { error: 'ra' };
    if (!Number.isFinite(dec) || dec < -90 || dec > 90) return { error: 'dec' };
    if (!Number.isFinite(fovDeg) || fovDeg <= 0 || fovDeg > MAX_FOV)
        return { error: 'fov' };
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
    const { m } = useI18n();
    const t = m.modules.spectral;
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
    const [cubeProgress, setCubeProgress] = useState<number | null>(null);
    const pendingChannel = useRef<number | undefined>(initial.channel);

    const [objects, setObjects] = useState<ObjectPoint[]>([]);
    const [spectra, setSpectra] = useState<Record<string, SpectrumResponse | { error: string }>>({});
    const [zoom, setZoom] = useState(1);
    const [channel, setChannel] = useState(initial.channel ?? 0);
    const [preview, setPreview] = useState<HTMLImageElement | null>(null);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [playing, setPlaying] = useState(false);
    const posRef = useRef(0);

    /* ---------- cubo espectral ---------- */
    useEffect(() => {
        if (!query) return;
        const ctrl = new AbortController();
        setCubeProgress(null);
        fetchSpectralCube(query, ctrl.signal, (progress) => setCubeProgress(progress))
            .then((data) => { setLiveChannels(data.channels); setResult({ key: queryKey, data }); })
            .catch((e: Error) => {
                if (e.name !== 'AbortError')
                    setResult({ key: queryKey, error: e.message || m.common.serverError });
            });
        return () => ctrl.abort();
    }, [query, queryKey]);

    const current = result?.key === queryKey ? result : null;
    const fetching = !!query && !current;
    const channels = useMemo(
        () => [...(current?.data?.channels ?? [])].sort((a, b) => a.index - b.index),
        [current],
    );
    useEffect(() => {
        if (!channels.length) return;
        setChannel(pendingChannel.current ?? 0);
        pendingChannel.current = undefined;
    }, [channels]);

    useEffect(() => {
        const selected = channels[channel];
        setPreview(null);
        setPreviewError(null);
        if (!selected || !selected.available) return;
        const image = new Image();
        setPreviewLoading(true);
        image.onload = () => { setPreview(image); setPreviewLoading(false); };
        image.onerror = () => { setPreviewError('No se pudo cargar el preview de este canal.'); setPreviewLoading(false); };
        image.src = selected.imageUrl;
        return () => { image.onload = null; image.onerror = null; };
    }, [channels, channel]);

    useEffect(() => {
        if (!playing) return;
        const timer = window.setInterval(() => setChannel((current) => {
            let next = (current + 1) % CHANNEL_COUNT;
            if (next === 50 || next === 51) next = 52;
            return next;
        }), 2500);
        return () => window.clearInterval(timer);
    }, [playing]);

    const ready = !!preview;
    const loading = fetching || previewLoading;

    /* ---------- acciones ---------- */
    const onSubmit = (e: FormEvent) => {
        e.preventDefault();
        const { query: q, error } = validate(form);
        if (!q) {
            setFormError(error ? fmt(m.modules.validation[error], { max: MAX_FOV }) : m.common.checkData);
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
        setChannel(i);
    };

    const onSelectPoint = (u: number, v: number) => {
        if (!query || current?.data?.tileId === undefined) return;
        const used = new Set(objects.map((o) => o.slot));
        const keep = objects.length >= MAX_OBJECTS ? objects.slice(1) : objects;
        const freed = objects.length >= MAX_OBJECTS ? objects[0].slot : undefined;
        const slot = freed ?? [0, 1, 2].find((s) => !used.has(s)) ?? 0;
        const point: ObjectPoint = { id: crypto.randomUUID(), slot, u, v, ra: query.ra, dec: query.dec };
        setObjects([...keep, point]);
        resolveSpectralPoint(current.data.tileId, query, u, v)
            .then((sky) => {
                setObjects((list) => list.map((item) => item.id === point.id ? { ...item, ...sky } : item));
                return fetchSpectrum(sky.ra, sky.dec, query.fovDeg);
            })
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
            label: fmt(t.object, { n: o.slot + 1 }),
            color: OBJECT_COLORS[o.slot],
            points: s && 'points' in s ? s.points : undefined,
            loading: !s,
        };
    });
    const unit = Object.values(spectra).find((s): s is SpectrumResponse => 'points' in s)?.unit
        ?? current?.data?.imageUnit ?? t.flux;
    const errorMessage = formError ?? current?.error ?? previewError;
    const wl = channelWavelength(channel);

    return (
        <section id="spectral" className="px-4 py-16 md:px-8">
            <div className="mx-auto max-w-7xl">
                {/* ---------- encabezado ---------- */}
                <div className="mb-10 text-center">
                    <span className="text-xs font-medium uppercase tracking-[0.35em] text-sky-400">
                        {t.eyebrow}
                    </span>
                    <h2 className="font-display mx-auto mt-3 max-w-3xl text-3xl font-bold text-white md:text-5xl">
                        {rich(t.title, { hl: (text) => <span className="bg-gradient-to-r from-sky-300 via-blue-400 to-violet-400 bg-clip-text text-transparent">{text}</span> })}
                    </h2>
                    <p className="mx-auto mt-4 max-w-2xl text-slate-400">
                        {t.text}
                    </p>
                </div>

                <div className="liquid-glass rounded-3xl p-3 md:p-4">
                    <div className="grid gap-3 lg:grid-cols-[1.55fr_1fr]">
                        {/* ---------- visor del canal ---------- */}
                        <div className="relative h-[52vh] min-h-[340px] overflow-hidden rounded-2xl bg-[#05070f] ring-1 ring-white/10 lg:h-auto lg:min-h-[520px]">
                            <TimelapseViewer
                                images={preview ? [preview] : []}
                                posRef={posRef}
                                fade={1}
                                zoom={zoom}
                                onZoomChange={setZoom}
                                selected={null}
                                markers={markers}
                                onSelect={onSelectPoint}
                            />

                            {ready && (
                                <div className="pointer-events-none absolute left-4 top-4 flex flex-wrap gap-2">
                                    <span className="font-display rounded-full bg-[#05070f]/70 px-3 py-1 text-sm tabular-nums text-white backdrop-blur">
                                        λ {wl.toFixed(3)} µm
                                    </span>
                                    <span className="rounded-full bg-[#05070f]/70 px-3 py-1 text-xs text-slate-300 backdrop-blur">
                                        {fmt(t.imageInfo, { unit: current?.data?.imageUnit ?? 'FITS' })}
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
                                        aria-label={m.common.zoomOut}
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
                                        aria-label={m.common.zoomIn}
                                    >
                                        +
                                    </button>
                                </div>
                            )}

                            {ready && objects.length === 0 && (
                                <span className="pointer-events-none absolute bottom-4 left-4 flex items-center gap-1.5 rounded-full bg-[#05070f]/70 px-3 py-1 text-xs text-slate-300 backdrop-blur">
                                    <MousePointerClick size={14} /> {t.clickHint}
                                </span>
                            )}

                            {!ready && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                                    {loading ? (
                                        <>
                                            <Hourglass size={34} className="animate-spin text-sky-300 [animation-duration:2.4s]" />
                                            <p className="font-display text-lg text-white">
                                                {fetching ? `${t.querying}${cubeProgress === null ? '' : ` ${cubeProgress}%`}` : t.loading}
                                            </p>
                                            {fetching && <p className="max-w-sm text-sm text-slate-400">{t.firstDownload}</p>}
                                        </>
                                    ) : (
                                        <>
                                            <Layers size={34} className="text-sky-300" />
                                            <p className="font-display text-lg text-white">{channels[channel] && !channels[channel].available ? t.missingChannel : t.chooseRegion}</p>
                                            <p className="max-w-sm text-sm text-slate-400">
                                                {t.searchHint}
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
                                    {t.cube}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">{t.cubeText}</p>
                                {current?.data && (
                                    <div className={ready ? '' : 'pointer-events-none opacity-40'}>
                                        <SpectralCube channel={channel} onSelect={selectChannel} />
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                                <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-sky-300">
                                    {t.objectsTitle}
                                </p>
                                <SpectrumCompareChart
                                    series={series}
                                    channel={channel}
                                    unit={unit}
                                    onChannelChange={selectChannel}
                                />
                                {objects.length === 0 ? (
                                    <div className="mt-2">
                                        <p className="text-sm leading-6 text-slate-400">
                                            {fmt(t.objectsEmpty, { max: MAX_OBJECTS })}
                                        </p>
                                        <button
                                            type="button"
                                            disabled={!ready}
                                            onClick={() => onSelectPoint(0.5, 0.5)}
                                            className="mt-3 rounded-full border border-sky-400/50 px-4 py-2 text-sm font-medium text-sky-200 hover:bg-sky-400/10 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            {t.centerSpectrum}
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <ul className="mt-2 space-y-1.5">
                                            {objects.map((o) => {
                                                const s = spectra[o.id];
                                                return (
                                                    <li key={o.id} className="flex items-center gap-2 text-xs">
                                                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: OBJECT_COLORS[o.slot] }} />
                                                        <span className="font-medium text-slate-200">{fmt(t.object, { n: o.slot + 1 })}</span>
                                                        <span className="font-display flex-1 truncate tabular-nums text-slate-500">
                                                            {o.ra.toFixed(4)}°, {o.dec >= 0 ? '+' : ''}
                                                            {o.dec.toFixed(4)}°
                                                        </span>
                                                        {s && 'points' in s && (
                                                            <span className="text-slate-400" title={t.qualityTitle}>
                                                                {s.points[channel]?.available
                                                                    ? `NHITS ${s.points[channel].nhits} · FLAGS ${s.points[channel].flags}`
                                                                    : t.noData}
                                                            </span>
                                                        )}
                                                        {!s && <span className="animate-pulse text-slate-500">{t.loadingShort}</span>}
                                                        {s && 'error' in s && <span className="text-violet-300">{t.error}</span>}
                                                        <button
                                                            type="button"
                                                            onClick={() => removeObject(o.id)}
                                                            aria-label={fmt(t.removeObject, { n: o.slot + 1 })}
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
                                {m.modules.fields.intro}
                            </p>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
                                <label className="block">
                                    <span className="text-[11px] font-medium uppercase tracking-[0.25em] text-sky-300">{m.modules.fields.ra}</span>
                                    <input
                                        className={inputClass}
                                        inputMode="decimal"
                                        value={form.ra}
                                        placeholder="10.68470"
                                        onChange={(e) => setForm((f) => ({ ...f, ra: e.target.value }))}
                                        required
                                    />
                                    <span className="mt-1 block text-[11px] text-slate-500">{m.modules.fields.raHelp}</span>
                                </label>
                                <label className="block">
                                    <span className="text-[11px] font-medium uppercase tracking-[0.25em] text-sky-300">{m.modules.fields.dec}</span>
                                    <input
                                        className={inputClass}
                                        inputMode="decimal"
                                        value={form.dec}
                                        placeholder="41.26875"
                                        onChange={(e) => setForm((f) => ({ ...f, dec: e.target.value }))}
                                        required
                                    />
                                    <span className="mt-1 block text-[11px] text-slate-500">{m.modules.fields.decHelp}</span>
                                </label>
                                <label className="block">
                                    <span className="text-[11px] font-medium uppercase tracking-[0.25em] text-sky-300">{m.modules.fields.fov}</span>
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
                                            aria-label={m.modules.fields.fovUnit}
                                            value={form.fovUnit}
                                            onChange={(e) => setForm((f) => ({ ...f, fovUnit: e.target.value as FormValues['fovUnit'] }))}
                                            className="border-l border-white/10 bg-transparent px-2 text-sm text-slate-300 focus:outline-none [&>option]:bg-[#0a1230]"
                                        >
                                            <option value="deg">°</option>
                                            <option value="arcmin">′</option>
                                        </select>
                                    </div>
                                    <span className="mt-1 block text-[11px] text-slate-500">{m.modules.fields.fovHelp}</span>
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
                                playing={playing}
                                onPlay={() => setPlaying(true)}
                                onPause={() => setPlaying(false)}
                                disabled={!current?.data}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
