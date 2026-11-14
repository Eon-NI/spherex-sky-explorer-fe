import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { AlertTriangle, CheckCircle2, Hourglass, MousePointerClick, Satellite } from 'lucide-react';

import {
    DETECTORS,
    USE_MOCK,
    fetchObservations,
    type Detector,
    type ObservationQuery,
    type ObservationsResponse,
} from '../../api/spherex';
import TimelapseViewer from './TimelapseViewer';
import { CoordinateFields, DateRangeFields } from './SearchFields';
import { PlaybackButtons, Timeline } from './PlaybackControls';
import ViewerTools from './ViewerTools';
import PointActionsMenu from './PointActionsMenu';
import PointDetailsPanel from './PointDetailsPanel';
import { useFramePreloader } from './useFramePreloader';
import { useTimelapsePlayer } from './useTimelapsePlayer';
import { formatDate, skyToUv, uvToSky } from './skyMath';
import type { ChangeRecord, PointAction, SearchFormValues, SelectedPoint } from './types';

/* =========================================================
   Valores por defecto y URL
   ========================================================= */
const DEFAULT_FORM: SearchFormValues = {
    ra: '210.80227',
    dec: '54.34895',
    fov: '0.1',
    fovUnit: 'deg',
    start: '2025-05-01',
    end: '2026-11-01',
    detector: 'D2',
};

const RECORDS_KEY = 'eon:timelapse:changes';

function readUrl(sp: URLSearchParams) {
    const get = (k: string) => sp.get(k) ?? undefined;
    const det = get('det') as Detector | undefined;
    const form: SearchFormValues = {
        ...DEFAULT_FORM,
        ra: get('ra') ?? DEFAULT_FORM.ra,
        dec: get('dec') ?? DEFAULT_FORM.dec,
        fov: get('fov') ?? DEFAULT_FORM.fov,
        start: get('start') ?? DEFAULT_FORM.start,
        end: get('end') ?? DEFAULT_FORM.end,
        detector: det && DETECTORS.some((d) => d.id === det) ? det : DEFAULT_FORM.detector,
    };
    const pra = Number(get('pra'));
    const pdec = Number(get('pdec'));
    const frame = Number(get('frame'));
    return {
        form,
        /** Si la URL trae coordenadas, se busca automáticamente */
        auto: sp.has('ra') && sp.has('dec'),
        frame: Number.isFinite(frame) && sp.has('frame') ? frame : undefined,
        point: sp.has('pra') && Number.isFinite(pra) && Number.isFinite(pdec) ? { ra: pra, dec: pdec } : undefined,
    };
}

function validate(f: SearchFormValues): { query?: ObservationQuery; error?: string } {
    const ra = Number(f.ra.replace(',', '.'));
    const dec = Number(f.dec.replace(',', '.'));
    const fovRaw = Number(f.fov.replace(',', '.'));
    const fovDeg = f.fovUnit === 'arcmin' ? fovRaw / 60 : fovRaw;

    if (!Number.isFinite(ra) || ra < 0 || ra >= 360) return { error: 'RA debe estar entre 0° y 360°.' };
    if (!Number.isFinite(dec) || dec < -90 || dec > 90) return { error: 'Dec debe estar entre −90° y +90°.' };
    if (!Number.isFinite(fovDeg) || fovDeg <= 0 || fovDeg > 2)
        return { error: 'El campo de visión debe ser mayor que 0 y como máximo 2°.' };
    if (!f.start || !f.end || f.start >= f.end) return { error: 'La fecha de inicio debe ser anterior a la final.' };

    return { query: { ra, dec, fovDeg, start: f.start, end: f.end, detector: f.detector } };
}

function loadRecords(): ChangeRecord[] {
    try {
        return JSON.parse(localStorage.getItem(RECORDS_KEY) ?? '[]') as ChangeRecord[];
    } catch {
        return [];
    }
}

/* =========================================================
   Módulo Timelapse
   ========================================================= */
export default function TimelapseModule() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [initial] = useState(() => readUrl(searchParams));

    const [form, setForm] = useState<SearchFormValues>(initial.form);
    const [formError, setFormError] = useState<string | null>(null);
    const [query, setQuery] = useState<ObservationQuery | null>(() =>
        initial.auto ? (validate(initial.form).query ?? null) : null,
    );
    const queryKey = query ? JSON.stringify(query) : '';
    const [result, setResult] = useState<{ key: string; data?: ObservationsResponse; error?: string } | null>(null);

    // frame y punto que vienen de un enlace compartido
    const pending = useRef<{ frame?: number; point?: { ra: number; dec: number } }>({
        frame: initial.frame,
        point: initial.point,
    });

    const [point, setPoint] = useState<SelectedPoint | null>(null);
    const [menu, setMenu] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
    const [action, setAction] = useState<PointAction | null>(null);
    const [zoom, setZoom] = useState(1);
    const [fade, setFade] = useState(0.65);
    const [records, setRecords] = useState<ChangeRecord[]>(loadRecords);
    const viewerBoxRef = useRef<HTMLDivElement>(null);

    /* ---------- petición al backend ---------- */
    useEffect(() => {
        if (!query) return;
        const ctrl = new AbortController();
        fetchObservations(query, ctrl.signal)
            .then((data) => {
                setResult({ key: queryKey, data });
                const p = pending.current.point;
                if (p) {
                    const { u, v } = skyToUv(p.ra, p.dec, query.ra, query.dec, query.fovDeg);
                    if (u >= 0 && u <= 1 && v >= 0 && v <= 1) {
                        setPoint({ u, v, ra: p.ra, dec: p.dec, frameIndex: pending.current.frame ?? 0 });
                        setAction('coordinates');
                    }
                    pending.current.point = undefined;
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
    const preload = useFramePreloader(urls);
    const player = useTimelapsePlayer(preload.images.length);
    const { jumpTo } = player;
    const loading = fetching || preload.loading;
    const observation = observations[player.index];
    const imageSize = preload.images[0]?.naturalWidth ?? 0;

    // aplica el frame del enlace compartido cuando las imágenes están listas
    useEffect(() => {
        if (preload.images.length === 0 || pending.current.frame === undefined) return;
        jumpTo(pending.current.frame);
        pending.current.frame = undefined;
    }, [preload.images.length, jumpTo]);

    // guarda los cambios registrados en el navegador
    useEffect(() => {
        try {
            localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
        } catch {
            /* almacenamiento no disponible */
        }
    }, [records]);

    const region = query ? `${query.ra.toFixed(4)},${query.dec.toFixed(4)}` : '';
    const regionRecords = useMemo(() => records.filter((r) => r.region === region), [records, region]);

    /* ---------- URL para compartir ---------- */
    const shareUrl = useMemo(() => {
        if (!query) return '';
        const url = new URL(window.location.href);
        url.search = '';
        url.hash = 'timelapse';
        url.searchParams.set('ra', String(query.ra));
        url.searchParams.set('dec', String(query.dec));
        url.searchParams.set('fov', String(query.fovDeg));
        url.searchParams.set('start', query.start);
        url.searchParams.set('end', query.end);
        url.searchParams.set('det', query.detector);
        url.searchParams.set('frame', String(player.index));
        if (point) {
            url.searchParams.set('pra', point.ra.toFixed(6));
            url.searchParams.set('pdec', point.dec.toFixed(6));
        }
        return url.toString();
    }, [query, point, player.index]);

    /* ---------- acciones ---------- */
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
        pending.current = {};
        setQuery(q);
        setSearchParams(
            {
                ra: String(q.ra),
                dec: String(q.dec),
                fov: String(q.fovDeg),
                start: q.start,
                end: q.end,
                det: q.detector,
            },
            { replace: true, preventScrollReset: true },
        );
    };

    const onSelect = (u: number, v: number, x: number, y: number) => {
        if (!query) return;
        const sky = uvToSky(u, v, query.ra, query.dec, query.fovDeg);
        player.pause();
        setPoint({ u, v, ...sky, frameIndex: player.index });
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

    const markers = useMemo(() => regionRecords.map((r) => ({ u: r.u, v: r.v })), [regionRecords]);
    const errorMessage = formError ?? current?.error ?? preload.error;
    const ready = preload.images.length > 0;

    return (
        <section id="timelapse" className="px-4 py-16 md:px-5">
            <div className="mx-auto max-w-7xl">
                {/* ---------- encabezado ---------- */}
                <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        
                        <h2 className="font-display mt-3 text-3xl font-bold text-white md:text-4xl">
                            El cielo a través del tiempo
                        </h2>
                        <p className="mt-3 max-w-2xl text-slate-400">
                            Elige una región y un rango de fechas: verás sus imágenes de SPHEREx como un vídeo.
                            Haz clic sobre cualquier objeto que cambie para analizarlo.
                        </p>
                    </div>
                    {USE_MOCK && (
                        <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-xs font-medium text-sky-200">
                            Datos simulados
                        </span>
                    )}
                </div>

                <div className="liquid-glass rounded-3xl p-3 md:p-4">
                    {/* ---------- visor ---------- */}
                    <div className="relative">
                        <div
                            ref={viewerBoxRef}
                            className="relative h-[55vh] min-h-[340px] overflow-hidden rounded-2xl bg-[#05070f] ring-1 ring-white/10"
                        >
                            <TimelapseViewer
                                images={preload.images}
                                posRef={player.posRef}
                                fade={fade}
                                zoom={zoom}
                                onZoomChange={setZoom}
                                selected={point}
                                markers={markers}
                                onSelect={onSelect}
                            />

                            {/* info del frame */}
                            {ready && observation && (
                                <div className="pointer-events-none absolute left-4 top-4 flex flex-wrap gap-2">
                                    <span className="font-display rounded-full bg-[#05070f]/70 px-3 py-1 text-sm tabular-nums text-white backdrop-blur">
                                        {formatDate(observation.observationTime)}
                                    </span>
                                    <span className="rounded-full bg-[#05070f]/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-sky-300 backdrop-blur">
                                        {observation.detector}
                                    </span>
                                    <span className="font-display rounded-full bg-[#05070f]/70 px-3 py-1 text-xs tabular-nums text-slate-300 backdrop-blur">
                                        {player.index + 1} / {observations.length}
                                    </span>
                                </div>
                            )}

                            {/* calidad */}
                            {ready && observation && (
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

                            {ready && !point && (
                                <span className="pointer-events-none absolute bottom-4 right-4 hidden items-center gap-1.5 rounded-full bg-[#05070f]/70 px-3 py-1 text-xs text-slate-300 backdrop-blur md:flex">
                                    <MousePointerClick size={14} /> Haz clic en un objeto para analizarlo
                                </span>
                            )}

                            {/* estados vacíos / carga */}
                            {!ready && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                                    {loading ? (
                                        <>
                                            <Hourglass size={34} className="animate-spin text-sky-300 [animation-duration:2.4s]" />
                                            <p className="font-display text-lg text-white">
                                                {fetching ? 'Consultando observaciones de SPHEREx…' : 'Preparando imágenes…'}
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
                                    ) : current?.data && observations.length === 0 ? (
                                        <>
                                            <Satellite size={34} className="text-slate-500" />
                                            <p className="font-display text-lg text-white">Sin observaciones en ese rango</p>
                                            <p className="max-w-sm text-sm text-slate-400">
                                                Prueba con un rango de fechas más amplio, otra banda o un campo de visión mayor.
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <Satellite size={34} className="text-sky-300" />
                                            <p className="font-display text-lg text-white">Elige una región del cielo</p>
                                            <p className="max-w-sm text-sm text-slate-400">
                                                Escribe RA, Dec, campo de visión y fechas, y pulsa «Buscar región».
                                            </p>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* menú del clic */}
                            {menu && (
                                <PointActionsMenu
                                    x={menu.x}
                                    y={menu.y}
                                    containerWidth={menu.w}
                                    containerHeight={menu.h}
                                    onClose={closeMenu}
                                    onChoose={(a) => {
                                        setAction(a);
                                        setMenu(null);
                                    }}
                                />
                            )}
                        </div>

                        {/* panel de detalles (arriba a la derecha en escritorio, debajo en móvil) */}
                        {point && action && (
                            <div className="mt-3 flex lg:pointer-events-none lg:absolute lg:bottom-4 lg:right-4 lg:top-4 lg:mt-0 lg:w-[360px] lg:items-start">
                                <div className="flex max-h-full w-full">
                                    <PointDetailsPanel
                                        action={action}
                                        onActionChange={setAction}
                                        point={point}
                                        observation={observation}
                                        imageSize={imageSize}
                                        shareUrl={shareUrl}
                                        records={regionRecords}
                                        onRecord={onRecord}
                                        onRemoveRecord={(id) => setRecords((prev) => prev.filter((r) => r.id !== id))}
                                        onSelectRecord={(r) => {
                                            setPoint({ u: r.u, v: r.v, ra: r.ra, dec: r.dec, frameIndex: player.index });
                                            const i = observations.findIndex((o) => o.observationTime === r.observationTime);
                                            if (i >= 0) player.goTo(i);
                                        }}
                                        onClose={() => {
                                            setAction(null);
                                            setPoint(null);
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ---------- línea de tiempo ---------- */}
                    <div className="px-1 pt-4">
                        <Timeline
                            observations={observations}
                            index={player.index}
                            disabled={!ready}
                            onSeek={player.goTo}
                        />
                    </div>

                    {/* ---------- controles ---------- */}
                    <form
                        onSubmit={onSubmit}
                        className="mt-4 grid gap-6 border-t border-white/10 px-1 pb-1 pt-5 lg:grid-cols-[1.3fr_1fr_auto] lg:items-end"
                    >
                        <CoordinateFields values={form} onChange={(p) => setForm((f) => ({ ...f, ...p }))} />

                        <div className="space-y-4">
                            <DateRangeFields
                                values={form}
                                onChange={(p) => setForm((f) => ({ ...f, ...p }))}
                                loading={loading}
                                count={observations.length}
                            />
                            <PlaybackButtons
                                playing={player.playing}
                                disabled={!ready}
                                onPlay={player.play}
                                onPause={player.pause}
                                onStop={player.stop}
                                onPrev={player.prev}
                                onNext={player.next}
                            />
                        </div>

                        <div className="flex flex-col gap-4 lg:items-end">
                            <ViewerTools
                                zoom={zoom}
                                onZoomChange={setZoom}
                                fps={player.fps}
                                onFpsChange={player.setFps}
                                loop={player.loop}
                                onLoopChange={player.setLoop}
                                fade={fade}
                                onFadeChange={setFade}
                            />
                            <button
                                type="submit"
                                disabled={fetching}
                                className="rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:opacity-50"
                            >
                                {fetching ? 'Buscando…' : 'Buscar región'}
                            </button>
                        </div>

                        {errorMessage && (
                            <p role="alert" className="flex items-center gap-2 text-sm text-violet-300 lg:col-span-3">
                                <AlertTriangle size={16} /> {errorMessage}
                            </p>
                        )}
                    </form>
                </div>
            </div>
        </section>
    );
}
