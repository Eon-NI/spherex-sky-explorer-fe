import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import ModuleHeader from '../ModuleHeader';
import { useI18n } from '../../i18n/useI18n';
import { fmt, rich } from '../../i18n/format';
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

/* =========================================================
   Formulario, URL y validación
   ========================================================= */
type FormValues = { ra: string; dec: string; fov: string; fovUnit: 'deg' | 'arcmin' };

const DEFAULT_FORM: FormValues = { ra: '210.80227', dec: '54.34895', fov: '0.1', fovUnit: 'deg' };
const MISSION_START = '2025-05-01';
const DETECTOR = 'D2';
const MODES: ViewMode[] = ['single', 'blink'];
const RECORDS_KEY = 'eon:timelapse:changes'; // compartido con el Timelapse

type ValidationError = 'ra' | 'dec' | 'fov';
const MAX_FOV = 0.2;

function validate(f: FormValues): { query?: ObservationQuery; error?: ValidationError } {
  const ra = Number(f.ra.replace(',', '.'));
  const dec = Number(f.dec.replace(',', '.'));
  const raw = Number(f.fov.replace(',', '.'));
  const fovDeg = f.fovUnit === 'arcmin' ? raw / 60 : raw;
  if (!Number.isFinite(ra) || ra < 0 || ra >= 360) return { error: 'ra' };
  if (!Number.isFinite(dec) || dec < -90 || dec > 90) return { error: 'dec' };
  if (!Number.isFinite(fovDeg) || fovDeg <= 0 || fovDeg > MAX_FOV)
    return { error: 'fov' };
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
  const { m } = useI18n();
  const sm = m.modules.search;
  const fl = m.modules.fields;
  const loc = m.common.dateLocale;
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
  const [formError, setFormError] = useState<ValidationError | 'check' | null>(null);
  const [query, setQuery] = useState<ObservationQuery | null>(() =>
    initial.auto ? (validate(initial.form).query ?? null) : null,
  );
  const queryKey = query ? JSON.stringify(query) : '';
  const [processing, setProcessing] = useState('');
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
    setProcessing('');
    fetchObservations(query, ctrl.signal, 2, status => { if (!ctrl.signal.aborted) setProcessing(status); })
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
          setResult({ key: queryKey, error: e.message || 'server' });
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

  /* ---------- lo que muestra el visor según la acción ---------- */
  const viewImages = useMemo(() => {
    if (!loaded) return [];
    if (mode === 'single') return [obsImages[a]];
    return observations.length > 1 && a !== b ? [obsImages[a], obsImages[b]] : [];
  }, [loaded, mode, obsImages, observations.length, a, b]);

  const player = useTimelapsePlayer(viewImages.length);

  const shownIndex = mode === 'blink' ? (player.index === 0 ? a : b) : a;
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
      setFormError(error ?? 'check');
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

  const errorMessage = formError
    ? formError === 'check'
      ? m.common.checkData
      : fmt(m.modules.validation[formError], { max: MAX_FOV })
    : current?.error
      ? m.common.serverError
      : preload.error
        ? m.common.imageLoadError
        : null;
  const modeLabel: Record<ViewMode, string> = {
    single: observation ? formatDate(observation.observationTime, loc) : '',
    blink: observation
      ? fmt(sm.labelBlink, { epoch: player.index === 0 ? 'A' : 'B', date: formatDate(observation.observationTime, loc) })
      : sm.actions.blink,
  };

  return (
    <section id="search" className="px-4 pt-5 pb-16 md:px-8 md:pt-6">
      <div className="mx-auto max-w-7xl">
        <ModuleHeader
          eyebrow={sm.eyebrow}
          title={rich(sm.title, { hl: (t) => <span className="text-star">{t}</span> })}
          text={sm.text}
        />

        <div className="liquid-glass rounded-3xl p-3 md:p-4">
          {/* ---------- visor ---------- */}
          <div className="relative">
            <div
              ref={viewerBoxRef}
              className="relative h-[max(260px,calc(100svh-32rem))] overflow-hidden rounded-2xl bg-night ring-1 ring-white/10"
            >
              <TimelapseViewer
                ariaLabel={m.modules.viewer.aria}
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
                  <span className="font-hud rounded-full bg-night/70 px-3 py-1 text-sm tabular-nums text-paper backdrop-blur">
                    {modeLabel[mode]}
                  </span>
                  <span className="rounded-full bg-night/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-star backdrop-blur">
                    {DETECTOR}
                  </span>
                </div>
              )}

              {ready && observation && (
                <div className="pointer-events-none absolute bottom-4 left-4">
                  {observation.flags.length === 0 ? (
                    <span className="flex items-center gap-1.5 rounded-full bg-night/70 px-3 py-1 text-xs text-emerald-300 backdrop-blur">
                      <CheckCircle2 size={14} /> {m.modules.viewer.validObs}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 rounded-full bg-night/70 px-3 py-1 text-xs text-star backdrop-blur">
                      <AlertTriangle size={14} /> {observation.flags.join(', ')}
                    </span>
                  )}
                </div>
              )}

              {ready && (
                <div className="absolute bottom-4 right-4 flex items-center gap-1 rounded-full bg-night/70 p-1 backdrop-blur">
                  {!point && (
                    <span className="hidden items-center gap-1.5 px-2 text-xs text-paper/80 md:flex">
                      <MousePointerClick size={14} /> {m.modules.viewer.clickShort}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.max(1, z / 1.5))}
                    disabled={zoom <= 1}
                    className="h-8 w-8 rounded-full text-paper/80 hover:bg-white/10 disabled:opacity-30"
                    aria-label={m.common.zoomOut}
                  >
                    −
                  </button>
                  <span className="font-hud w-10 text-center text-xs tabular-nums text-paper/80">
                    {zoom.toFixed(1)}×
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.min(8, z * 1.5))}
                    disabled={zoom >= 8}
                    className="h-8 w-8 rounded-full text-paper/80 hover:bg-white/10 disabled:opacity-30"
                    aria-label={m.common.zoomIn}
                  >
                    +
                  </button>
                </div>
              )}

              {!ready && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                  {loading ? (
                    <>
                      <Hourglass size={34} className="animate-spin text-star [animation-duration:2.4s]" />
                      <p className="text-lg text-paper">
                        {fetching
                          ? (processing.startsWith('running') ? m.modules.timelapse.preparing : sm.querying)
                          : sm.loading}
                      </p>
                      {!fetching && preload.total > 0 && (
                        <p className="font-hud text-xs tabular-nums text-mist">
                          {preload.loaded} / {preload.total}
                        </p>
                      )}
                    </>
                  ) : current?.data && observations.length === 0 ? (
                    <>
                      <Satellite size={34} className="text-mist/70" />
                      <p className="text-lg text-paper">{sm.noObs}</p>
                    </>
                  ) : (
                    <>
                      <Satellite size={34} className="text-star" />
                      <p className="text-lg text-paper">{m.modules.viewer.chooseRegion}</p>
                      <p className="max-w-sm text-sm text-mist">{m.modules.viewer.chooseShort}</p>
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
              <p className="mb-4 text-sm text-mist">
                {fl.intro}
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
                <label className="block">
                  <span className="text-[11px] font-medium uppercase tracking-[0.25em] text-mist">{fl.ra}</span>
                  <input
                    className={inputClass}
                    inputMode="decimal"
                    value={form.ra}
                    placeholder="210.80227"
                    onChange={(e) => setForm((f) => ({ ...f, ra: e.target.value }))}
                    required
                  />
                  <span className="mt-1 block text-[11px] text-mist/70">{fl.raHelp}</span>
                </label>
                <label className="block">
                  <span className="text-[11px] font-medium uppercase tracking-[0.25em] text-mist">{fl.dec}</span>
                  <input
                    className={inputClass}
                    inputMode="decimal"
                    value={form.dec}
                    placeholder="54.34895"
                    onChange={(e) => setForm((f) => ({ ...f, dec: e.target.value }))}
                    required
                  />
                  <span className="mt-1 block text-[11px] text-mist/70">{fl.decHelp}</span>
                </label>
                <label className="block">
                  <span className="text-[11px] font-medium uppercase tracking-[0.25em] text-mist">{fl.fov}</span>
                  <div className="mt-1.5 flex overflow-hidden rounded-xl border border-white/15 bg-white/5 focus-within:border-star">
                    <input
                      className="font-hud w-full min-w-0 bg-transparent px-3 py-2 text-sm tabular-nums text-paper placeholder:text-mist/70 focus:outline-none"
                      inputMode="decimal"
                      value={form.fov}
                      placeholder="0.1"
                      onChange={(e) => setForm((f) => ({ ...f, fov: e.target.value }))}
                      required
                    />
                    <select
                      aria-label={fl.fovUnit}
                      value={form.fovUnit}
                      onChange={(e) => setForm((f) => ({ ...f, fovUnit: e.target.value as FormValues['fovUnit'] }))}
                      className="border-l border-white/10 bg-transparent px-2 text-sm text-paper/80 focus:outline-none [&>option]:bg-night-soft"
                    >
                      <option value="deg">°</option>
                      <option value="arcmin">′</option>
                    </select>
                  </div>
                  <span className="mt-1 block text-[11px] text-mist/70">{fl.fovHelp}</span>
                </label>
                <div className="pb-5">
                  <button
                    type="submit"
                    disabled={fetching}
                    className="w-full rounded-full bg-star px-7 py-2.5 text-sm font-bold tracking-[0.2em] text-night transition hover:bg-star-hover disabled:opacity-50"
                  >
                    {fetching ? '…' : fl.go}
                  </button>
                </div>
              </div>
              {errorMessage && (
                <p role="alert" className="mt-1 flex items-center gap-2 text-sm text-star">
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
                onEpochA={i => { setEpochA(i); if (i === epochB && observations.length > 1) setEpochB((i + 1) % observations.length); }}
                onEpochB={i => { if (i !== epochA) setEpochB(i); }}
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
