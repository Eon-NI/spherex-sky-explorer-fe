import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import ModuleHeader from '../ModuleHeader';
import { AlertTriangle, CheckCircle2, Hourglass, MousePointerClick, Satellite } from 'lucide-react';

import { fetchObservations, type ObservationQuery, type ObservationsResponse } from '../../api/spherex';
import TimelapseViewer from '../timelapse_components/TimelapseViewer';
import PointActionsMenu from '../timelapse_components/PointActionsMenu';
import PointDetailsPanel from '../timelapse_components/PointDetailsPanel';
import { inputClass } from '../timelapse_components/SearchFields';
import { useFramePreloader } from '../timelapse_components/useFramePreloader';
import { useTimelapsePlayer } from '../timelapse_components/useTimelapsePlayer';
import { formatDate, skyToUv, uvToSky } from '../timelapse_components/skyMath';
import type { ChangeRecord, PointAction, SelectedPoint } from '../timelapse_components/types';
import ActionsPanel, { type ViewMode } from './ActionsPanel';
import { differenceImage, stackImage } from './imageOps';

/* =========================================================
   Formulario, URL y validación
   ========================================================= */
type FormValues = { ra: string; dec: string; fov: string; fovUnit: 'deg' | 'arcmin' };

const DEFAULT_FORM: FormValues = { ra: '210.80227', dec: '54.34895', fov: '0.1', fovUnit: 'deg' };
const MISSION_START = '2025-05-01';
const DETECTOR = 'D2';
const MODES: ViewMode[] = ['single', 'blink', 'difference', 'stack'];
const RECORDS_KEY = 'eon:timelapse:changes'; // compartido con el Timelapse

function validate(f: FormValues): { query?: ObservationQuery; error?: string } {
    const ra = Number(f.ra.replace(',', '.'));
    const dec = Number(f.dec.replace(',', '.'));
    const raw = Number(f.fov.replace(',', '.'));
    const fovDeg = f.fovUnit === 'arcmin' ? raw / 60 : raw;
    if (!Number.isFinite(ra) || ra < 0 || ra >= 360) return { error: 'RA debe estar entre 0° y 360°.' };
    if (!Number.isFinite(dec) || dec < -90 || dec > 90) return { error: 'Dec debe estar entre −90° y +90°.' };
    if (!Number.isFinite(fovDeg) || fovDeg <= 0 || fovDeg > 2)
        return { error: 'El campo de visión debe ser mayor que 0 y como máximo 2°.' };
    // todas las observaciones de la misión hasta hoy
    const end = new Date().toISOString().slice(0, 10);
    return { query: { ra, dec, fovDeg, start: MISSION_START, end, detector: DETECTOR } };
}

function loadRecords(): ChangeRecord[] {
    try {
        return JSON.parse(localStorage.getItem(RECORDS_KEY) ?? '[]') as ChangeRecord[];
    } catch {
        return [];
    }
}

/* =========================================================
   Módulo Search
   ========================================================= */
export default function SearchModule() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [initial] = useState(() => {
        const form: FormValues = {
            ...DEFAULT_FORM,
            ra: searchParams.get('ra') ?? DEFAULT_FORM.ra,
            dec: searchParams.get('dec') ?? DEFAULT_FORM.dec,
            fov: searchParams.get('fov') ?? DEFAULT_FORM.fov,
        };
        const mode = searchParams.get('mode') as ViewMode | null;
        const pra = Number(searchParams.get('pra'));
        const pdec = Number(searchParams.get('pdec'));
        return {
            form,
            auto: searchParams.has('ra') && searchParams.has('dec'),
            mode: mode && MODES.includes(mode) ? mode : ('single' as ViewMode),
            point: searchParams.has('pra') && Number.isFinite(pra) && Number.isFinite(pdec) ? { ra: pra, dec: pdec } : undefined,
        };
    });

    const [form, setForm] = useState<FormValues>(initial.form);
    const [formError, setFormError] = useState<string | null>(null);
    const [query, setQuery] = useState<ObservationQuery | null>(() =>
        initial.auto ? (validate(initial.form).query ?? null) : null,
    );
    const queryKey = query ? JSON.stringify(query) : '';
    const [result, setResult] = useState<{ key: string; data?: ObservationsResponse; error?: string } | null>(null);
    const pendingPoint = useRef(initial.point);

    const [mode, setMode] = useState<ViewMode>(initial.mode);
    const [epochA, setEpochA] = useState(0);
    const [epochB, setEpochB] = useState(0);
    const [zoom, setZoom] = useState(1);
    const [point, setPoint] = useState<SelectedPoint | null>(null);
    const [menu, setMenu] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
    const [action, setAction] = useState<PointAction | null>(null);
    const [records, setRecords] = useState<ChangeRecord[]>(loadRecords);
    const viewerBoxRef = useRef<HTMLDivElement>(null);

    /* ---------- observaciones de la región ---------- */
    useEffect(() => {
        if (!query) return;
        const ctrl = new AbortController();
        fetchObservations(query, ctrl.signal)
            .then((data) => {
                setResult({ key: queryKey, data });
                setEpochA(0);
                setEpochB(Math.max(0, data.observations.length - 1));
                const p = pendingPoint.current;
                if (p) {
                    const { u, v } = skyToUv(p.ra, p.dec, query.ra, query.dec, query.fovDeg);
                    if (u >= 0 && u <= 1 && v >= 0 && v <= 1) {
                        setPoint({ u, v, ra: p.ra, dec: p.dec, frameIndex: 0 });
                        setAction('coordinates');
                    }
                    pendingPoint.current = undefined;
                }
            })
            .catch((e: Error) => {
                if (e.name !== 'AbortError')
                    setResult({ key: queryKey, error: e.message || 'No se pudo conectar con el servidor.' });
            });
        return () => ctrl.abort();
    }, [query, queryKey]);

    const current = result?.key === queryKey ? result : null;
    const fetching = !!query && !current;
    const observations = useMemo(
        () =>
            [...(current?.data?.observations ?? [])].sort(
                (a, b) => new Date(a.observationTime).getTime() - new Date(b.observationTime).getTime(),
            ),
        [current],
    );
    const urls = useMemo(() => observations.map((o) => o.imageUrl), [observations]);
    const preload = useFramePreloader(urls, 'anonymous');
    const obsImages = preload.images;
    const loaded = obsImages.length > 0;
    const a = Math.min(epochA, Math.max(0, obsImages.length - 1));
    const b = Math.min(epochB, Math.max(0, obsImages.length - 1));

    /* ---------- difference / stack (se calculan en el navegador) ---------- */
    const computedKey = loaded && (mode === 'difference' || mode === 'stack') ? `${queryKey}|${mode}|${a}|${b}` : '';
    const [computed, setComputed] = useState<{ key: string; url?: string; error?: string } | null>(null);

    useEffect(() => {
        if (!computedKey) return;
        let cancelled = false;
        let created: string | undefined;
        const job = mode === 'difference' ? differenceImage(obsImages[a], obsImages[b]) : stackImage(obsImages);
        job
            .then((url) => {
                created = url;
                if (cancelled) URL.revokeObjectURL(url);
                else setComputed({ key: computedKey, url });
            })
            .catch((e: Error) => {
                if (cancelled) return;
                setComputed({
                    key: computedKey,
                    error:
                        e.name === 'SecurityError'
                            ? 'El servidor de imágenes debe permitir CORS para calcular la diferencia o el apilado.'
                            : e.message,
                });
            });
        return () => {
            cancelled = true;
            if (created) URL.revokeObjectURL(created);
        };
    }, [computedKey, mode, obsImages, a, b]);

    const computedUrls = useMemo(
        () => (computed?.key === computedKey && computed.url ? [computed.url] : []),
        [computed, computedKey],
    );
    const computedPreload = useFramePreloader(computedUrls);

    /* ---------- lo que muestra el visor según la acción ---------- */
    const viewImages = useMemo(() => {
        if (!loaded) return [];
        if (mode === 'single') return [obsImages[a]];
        if (mode === 'blink') return [obsImages[a], obsImages[b]];
        return computedPreload.images;
    }, [loaded, mode, obsImages, a, b, computedPreload.images]);

    const player = useTimelapsePlayer(viewImages.length);
    const computing = loaded && (mode === 'difference' || mode === 'stack') && viewImages.length === 0;
    const computeError = computed?.key === computedKey ? computed.error : undefined;

    const shownIndex = mode === 'blink' ? (player.index === 0 ? a : b) : mode === 'difference' ? b : a;
    const observation = observations[shownIndex];
    const ready = viewImages.length > 0;
    const loading = fetching || preload.loading;

    const changeMode = (m: ViewMode) => {
        setMode(m);
        if (m === 'blink') {
            player.setLoop(true);
            player.setFps(2.2);
            player.play();
        } else {
            player.pause();
        }
    };

    /* ---------- registro de cambios (compartido con el Timelapse) ---------- */
    useEffect(() => {
        try {
            localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
        } catch {
            /* almacenamiento no disponible */
        }
    }, [records]);
    const region = query ? `${query.ra.toFixed(4)},${query.dec.toFixed(4)}` : '';
    const regionRecords = useMemo(() => records.filter((r) => r.region === region), [records, region]);
    const markers = useMemo(() => regionRecords.map((r) => ({ u: r.u, v: r.v })), [regionRecords]);

    const shareUrl = useMemo(() => {
        if (!query) return '';
        const url = new URL(window.location.href);
        url.search = '';
        url.hash = '';
        url.searchParams.set('ra', String(query.ra));
        url.searchParams.set('dec', String(query.dec));
        url.searchParams.set('fov', String(query.fovDeg));
        url.searchParams.set('mode', mode);
        if (point) {
            url.searchParams.set('pra', point.ra.toFixed(6));
            url.searchParams.set('pdec', point.dec.toFixed(6));
        }
        return url.toString();
    }, [query, mode, point]);

    /* ---------- eventos ---------- */
    const onSubmit = (e: FormEvent) => {
        e.preventDefault();
        const { query: q, error } = validate(form);
        if (!q) {
            setFormError(error ?? 'Revisa los datos.');
            return;
        }
        setFormError(null);
        setPoint(null);
        setMenu(null);
        setAction(null);
        setZoom(1);
        pendingPoint.current = undefined;
        setQuery(q);
        setSearchParams(
            { ra: String(q.ra), dec: String(q.dec), fov: String(q.fovDeg), mode },
            { replace: true, preventScrollReset: true },
        );
    };

    const onSelect = (u: number, v: number, x: number, y: number) => {
        if (!query) return;
        const sky = uvToSky(u, v, query.ra, query.dec, query.fovDeg);
        setPoint({ u, v, ...sky, frameIndex: shownIndex });
        const box = viewerBoxRef.current?.getBoundingClientRect();
        setMenu({ x, y, w: box?.width ?? 800, h: box?.height ?? 500 });
    };

    const closeMenu = useCallback(() => setMenu(null), []);

    const onRecord = (note: string) => {
        if (!point || !observation) return;
        setRecords((prev) => [
            {
                id: crypto.randomUUID(),
                region,
                ra: point.ra,
                dec: point.dec,
                u: point.u,
                v: point.v,
                observationTime: observation.observationTime,
                note,
                createdAt: new Date().toISOString(),
            },
            ...prev,
        ]);
    };

    const errorMessage = formError ?? current?.error ?? preload.error ?? computeError;
    const modeLabel: Record<ViewMode, string> = {
        single: observation ? formatDate(observation.observationTime) : '',
        blink: observation ? `Blink · ${player.index === 0 ? 'A' : 'B'} · ${formatDate(observation.observationTime)}` : 'Blink',
        difference:
            observations[a] && observations[b]
                ? `B − A · ${formatDate(observations[b].observationTime)} − ${formatDate(observations[a].observationTime)}`
                : 'Difference',
        stack: `Stack · ${observations.length} observaciones`,
    };

    return (
        <section id="search" className="px-4 pt-6 pb-16 md:px-8 md:pt-8">
            <div className="mx-auto max-w-7xl">
                <ModuleHeader
                    eyebrow="Módulo · Search"
                    title={
                        <>
                            Busca un punto de <span className="text-star">interés</span>
                        </>
                    }
                    text="Compara las observaciones de una región con blink, difference o stack, y haz clic sobre un objeto para analizarlo."
                />

                <div className="liquid-glass rounded-3xl p-3 md:p-4">
                    {/* ---------- visor ---------- */}
                    <div className="relative">
                        <div
                            ref={viewerBoxRef}
                            className="relative h-[55vh] min-h-[340px] overflow-hidden rounded-2xl bg-[#05070f] ring-1 ring-white/10"
                        >
                            <TimelapseViewer
                                images={viewImages}
                                posRef={player.posRef}
                                fade={mode === 'blink' ? 0.12 : 1}
                                zoom={zoom}
                                onZoomChange={setZoom}
                                selected={point}
                                markers={markers}
                                onSelect={onSelect}
                            />

                            {ready && (
                                <div className="pointer-events-none absolute left-4 top-4 flex flex-wrap gap-2">
                                    <span className="font-display rounded-full bg-[#05070f]/70 px-3 py-1 text-sm tabular-nums text-white backdrop-blur">
                                        {modeLabel[mode]}
                                    </span>
                                    <span className="rounded-full bg-[#05070f]/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-sky-300 backdrop-blur">
                                        {DETECTOR}
                                    </span>
                                </div>
                            )}

                            {ready && observation && mode !== 'stack' && (
                                <div className="pointer-events-none absolute bottom-4 left-4">
                                    {observation.flags.length === 0 ? (
                                        <span className="flex items-center gap-1.5 rounded-full bg-[#05070f]/70 px-3 py-1 text-xs text-emerald-300 backdrop-blur">
                                            <CheckCircle2 size={14} /> Observación válida
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5 rounded-full bg-[#05070f]/70 px-3 py-1 text-xs text-violet-200 backdrop-blur">
                                            <AlertTriangle size={14} /> {observation.flags.join(', ')}
                                        </span>
                                    )}
                                </div>
                            )}

                            {ready && (
                                <div className="absolute bottom-4 right-4 flex items-center gap-1 rounded-full bg-[#05070f]/70 p-1 backdrop-blur">
                                    {!point && (
                                        <span className="hidden items-center gap-1.5 px-2 text-xs text-slate-300 md:flex">
                                            <MousePointerClick size={14} /> Clic en un objeto
                                        </span>
                                    )}
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

                            {!ready && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                                    {loading || computing ? (
                                        <>
                                            <Hourglass size={34} className="animate-spin text-sky-300 [animation-duration:2.4s]" />
                                            <p className="font-display text-lg text-white">
                                                {fetching
                                                    ? 'Buscando observaciones de SPHEREx…'
                                                    : computing
                                                        ? mode === 'stack'
                                                            ? 'Apilando observaciones…'
                                                            : 'Calculando la diferencia…'
                                                        : 'Cargando imágenes…'}
                                            </p>
                                            {!fetching && !computing && preload.total > 0 && (
                                                <p className="font-display text-xs tabular-nums text-slate-400">
                                                    {preload.loaded} / {preload.total}
                                                </p>
                                            )}
                                        </>
                                    ) : current?.data && observations.length === 0 ? (
                                        <>
                                            <Satellite size={34} className="text-slate-500" />
                                            <p className="font-display text-lg text-white">Sin observaciones en esa región</p>
                                        </>
                                    ) : (
                                        <>
                                            <Satellite size={34} className="text-sky-300" />
                                            <p className="font-display text-lg text-white">Elige una región del cielo</p>
                                            <p className="max-w-sm text-sm text-slate-400">Escribe RA, Dec y campo de visión y pulsa «GO».</p>
                                        </>
                                    )}
                                </div>
                            )}

                            {menu && (
                                <PointActionsMenu
                                    x={menu.x}
                                    y={menu.y}
                                    containerWidth={menu.w}
                                    containerHeight={menu.h}
                                    onClose={closeMenu}
                                    onChoose={(act) => {
                                        setAction(act);
                                        setMenu(null);
                                    }}
                                />
                            )}
                        </div>

                        {/* panel de detalles: donde la nota amarilla del wireframe */}
                        {point && action && (
                            <div className="mt-3 flex lg:pointer-events-none lg:absolute lg:bottom-4 lg:right-4 lg:top-4 lg:mt-0 lg:w-[360px] lg:items-start">
                                <div className="flex max-h-full w-full">
                                    <PointDetailsPanel
                                        action={action}
                                        onActionChange={setAction}
                                        point={point}
                                        observation={observation}
                                        imageSize={obsImages[0]?.naturalWidth ?? 0}
                                        shareUrl={shareUrl}
                                        records={regionRecords}
                                        onRecord={onRecord}
                                        onRemoveRecord={(id) => setRecords((prev) => prev.filter((r) => r.id !== id))}
                                        onSelectRecord={(r) => setPoint({ u: r.u, v: r.v, ra: r.ra, dec: r.dec, frameIndex: shownIndex })}
                                        onClose={() => {
                                            setAction(null);
                                            setPoint(null);
                                        }}
                                    />
                                </div>
                            </div>
                        )}
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
                                        placeholder="210.80227"
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
                                        placeholder="54.34895"
                                        onChange={(e) => setForm((f) => ({ ...f, dec: e.target.value }))}
                                        required
                                    />
                                    <span className="mt-1 block text-[11px] text-slate-500">Declination (°)</span>
                                </label>
                                <label className="block">
                                    <span className="text-[11px] font-medium uppercase tracking-[0.25em] text-sky-300">FV</span>
                                    <div className="mt-1.5 flex overflow-hidden rounded-xl border border-white/15 bg-white/5 focus-within:border-sky-400">
                                        <input
                                            className="font-display w-full min-w-0 bg-transparent px-3 py-2 text-sm tabular-nums text-white placeholder:text-slate-500 focus:outline-none"
                                            inputMode="decimal"
                                            value={form.fov}
                                            placeholder="0.1"
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
                            <ActionsPanel
                                mode={mode}
                                onModeChange={changeMode}
                                observations={observations}
                                epochA={a}
                                epochB={b}
                                onEpochA={setEpochA}
                                onEpochB={setEpochB}
                                disabled={!loaded}
                                blinkPlaying={player.playing}
                                onToggleBlink={() => {
                                    if (player.playing) player.pause();
                                    else {
                                        player.setLoop(true);
                                        player.setFps(2.2);
                                        player.play();
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
