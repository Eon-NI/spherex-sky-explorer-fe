import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import ModuleHeader from '../ModuleHeader';
import { useI18n } from '../../i18n/useI18n';
import { fmt, rich } from '../../i18n/format';
import { AlertTriangle, Hourglass, Layers, MousePointerClick, X } from 'lucide-react';

import {
  CHANNEL_COUNT,
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

type ValidationError = 'ra' | 'dec' | 'fov';

function validate(f: FormValues): { query?: CubeQuery; error?: ValidationError } {
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
  const sp = m.modules.spectral;
  const fl = m.modules.fields;
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
  const [formError, setFormError] = useState<ValidationError | 'check' | null>(null);
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
          setResult({ key: queryKey, error: e.message || 'server' });
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
      setFormError(error ?? 'check');
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
    () => objects.map((o) => ({ u: o.u, v: o.v, color: OBJECT_COLORS[o.slot], label: fmt(sp.object, { n: o.slot + 1 }) })),
    [objects, sp.object],
  );

  const series: SpectrumSeries[] = objects.map((o) => {
    const s = spectra[o.id];
    return {
      id: o.id,
      label: fmt(sp.object, { n: o.slot + 1 }),
      color: OBJECT_COLORS[o.slot],
      points: s && 'points' in s ? s.points : undefined,
      loading: !s,
    };
  });
  const unit = Object.values(spectra).find((s): s is SpectrumResponse => 'points' in s)?.unit ?? sp.flux;
  const errorMessage = formError
    ? formError === 'check'
      ? m.common.checkData
      : fmt(m.modules.validation[formError], { max: MAX_FOV })
    : current?.error
      ? m.common.serverError
      : preload.error
        ? m.common.imageLoadError
        : null;
  const wl = channelWavelength(channel);

  return (
    <section id="spectral" className="px-4 pt-5 pb-16 md:px-8 md:pt-6">
      <div className="mx-auto max-w-7xl">
        <ModuleHeader
          eyebrow={sp.eyebrow}
          title={rich(sp.title, { hl: (t) => <span className="text-star">{t}</span> })}
          text={sp.text}
        />

        <div className="liquid-glass rounded-3xl p-3 md:p-4">
          <div className="grid gap-3 lg:h-[max(260px,calc(100svh-30rem))] lg:grid-cols-[1.55fr_1fr]">
            {/* ---------- visor del canal ---------- */}
            <div className="relative h-[52vh] min-h-[300px] overflow-hidden rounded-2xl bg-night ring-1 ring-white/10 lg:h-full lg:min-h-0">
              <TimelapseViewer
                ariaLabel={m.modules.viewer.aria}
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
                  <span className="font-hud rounded-full bg-night/70 px-3 py-1 text-sm tabular-nums text-paper backdrop-blur">
                    λ {wl.toFixed(2)} µm
                  </span>
                  <span className="font-hud rounded-full bg-night/70 px-3 py-1 text-xs tabular-nums text-paper/80 backdrop-blur">
                    CH {String(channel + 1).padStart(3, '0')} / {CHANNEL_COUNT}
                  </span>
                  <span className="rounded-full bg-night/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-star backdrop-blur">
                    {channelDetector(channel)}
                  </span>
                </div>
              )}

              {ready && (
                <div className="absolute bottom-4 right-4 flex items-center gap-1 rounded-full bg-night/70 p-1 backdrop-blur">
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

              {ready && objects.length === 0 && (
                <span className="pointer-events-none absolute bottom-4 left-4 flex items-center gap-1.5 rounded-full bg-night/70 px-3 py-1 text-xs text-paper/80 backdrop-blur">
                  <MousePointerClick size={14} /> {sp.clickHint}
                </span>
              )}

              {!ready && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                  {loading ? (
                    <>
                      <Hourglass size={34} className="animate-spin text-star [animation-duration:2.4s]" />
                      <p className="text-lg text-paper">
                        {fetching ? sp.querying : sp.loading}
                      </p>
                      {!fetching && preload.total > 0 && (
                        <div className="w-56">
                          <div className="h-1 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-star to-star-hover transition-[width]"
                              style={{ width: `${(preload.loaded / preload.total) * 100}%` }}
                            />
                          </div>
                          <p className="font-hud mt-2 text-xs tabular-nums text-mist">
                            {preload.loaded} / {preload.total}
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <Layers size={34} className="text-star" />
                      <p className="text-lg text-paper">{m.modules.viewer.chooseRegion}</p>
                      <p className="max-w-sm text-sm text-mist">
                        {m.modules.viewer.chooseShort}
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* ---------- cubo + espectros ---------- */}
            {/* en escritorio la columna mide lo mismo que el visor y hace scroll si hace falta */}
            <div className="flex flex-col gap-3 lg:min-h-0 lg:overflow-y-auto">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-mist">
                  {sp.cube}
                </p>
                <p className="mt-1 text-xs text-mist/70">{sp.cubeText}</p>
                <div className={ready ? '' : 'pointer-events-none opacity-40'}>
                  <div className="mx-auto max-w-[17rem]">
                    <SpectralCube channel={channel} onSelect={selectChannel} />
                  </div>
                </div>
              </div>

              <div className="flex-1 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-mist">
                  {sp.objectsTitle}
                </p>
                {objects.length === 0 ? (
                  <p className="mt-3 text-sm leading-6 text-mist">
                    {fmt(sp.objectsEmpty, { max: MAX_OBJECTS })}
                  </p>
                ) : (
                  <>
                    <SpectrumCompareChart
                      ariaLabel={sp.chartAria}
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
                            <span className="font-medium text-paper/90">{fmt(sp.object, { n: o.slot + 1 })}</span>
                            <span className="font-hud flex-1 truncate tabular-nums text-mist/70">
                              {o.ra.toFixed(4)}°, {o.dec >= 0 ? '+' : ''}
                              {o.dec.toFixed(4)}°
                            </span>
                            {!s && <span className="animate-pulse text-mist/70">{sp.loadingShort}</span>}
                            {s && 'error' in s && <span className="text-star">{sp.error}</span>}
                            <button
                              type="button"
                              onClick={() => removeObject(o.id)}
                              aria-label={fmt(sp.removeObject, { n: o.slot + 1 })}
                              className="rounded-full p-1 text-mist/70 hover:bg-white/10 hover:text-paper"
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
                    placeholder="10.68470"
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
                    placeholder="41.26875"
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
                      placeholder="0.5"
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
