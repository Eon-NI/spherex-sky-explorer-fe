import { useEffect, useState } from 'react';
import { AlertTriangle, Check, CheckCircle2, Copy, ExternalLink, Trash2, X } from 'lucide-react';
import { fetchSpectrum, type Observation, type SpectrumResponse } from '../../api/spherex';
import { ACTIONS } from './pointActions';
import SpectrumChart from './SpectrumChart';
import { formatDate, formatDateTime, formatDecDms, formatRaHms } from './skyMath';
import type { ChangeRecord, PointAction, SelectedPoint } from './types';
import { useI18n } from '../../i18n/useI18n';
import { fmt } from '../../i18n/format';

type PointDetailsPanelProps = {
  action: PointAction;
  onActionChange: (a: PointAction) => void;
  point: SelectedPoint;
  observation: Observation | undefined;
  imageSize: number;
  shareUrl: string;
  records: ChangeRecord[];
  onRecord: (note: string) => void;
  onRemoveRecord: (id: string) => void;
  onSelectRecord: (r: ChangeRecord) => void;
  onClose: () => void;
};

const sectionLabel = 'text-[11px] font-medium uppercase tracking-[0.25em] text-mist';

export default function PointDetailsPanel(props: PointDetailsPanelProps) {
  const { m } = useI18n();
  const { action, onActionChange, onClose } = props;

  return (
    <div className="liquid-glass liquid-glass-dark pointer-events-auto flex max-h-full w-full min-w-0 flex-col rounded-3xl">
      <div className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] bg-night/40" />

      {/* pestañas */}
      <div className="flex items-center gap-1 border-b border-white/10 p-2">
        {ACTIONS.map(({ id, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onActionChange(id)}
            title={m.modules.point[id]}
            aria-pressed={action === id}
            className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition ${
              action === id ? 'flex-1 bg-white/10 text-paper' : 'text-mist hover:text-paper'
            }`}
          >
            <Icon size={15} className="shrink-0" />
            {/* solo la pestaña activa muestra su nombre, así cabe en 360 px */}
            {action === id && <span className="truncate">{m.modules.point[id]}</span>}
          </button>
        ))}
        <button
          type="button"
          onClick={onClose}
          aria-label={m.modules.point.closePanel}
          className="ml-1 rounded-full p-2 text-mist hover:bg-white/10 hover:text-paper"
        >
          <X size={15} />
        </button>
      </div>

      <div className="overflow-y-auto p-5">
        {action === 'coordinates' && <CoordinatesTab {...props} />}
        {action === 'spectrum' && <SpectrumTab {...props} />}
        {action === 'metadata' && <MetadataTab {...props} />}
        {action === 'share' && <ShareTab {...props} />}
      </div>
    </div>
  );
}

/* ---------- utilidades ---------- */
function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied((c) => (c === id ? null : c)), 1500);
    } catch {
      /* el navegador no permite copiar: el texto sigue visible para copiar a mano */
    }
  };
  return { copied, copy };
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-white/5 py-1.5 text-sm last:border-0">
      <span className="text-mist">{k}</span>
      <span className="font-hud text-right tabular-nums text-paper">{v}</span>
    </div>
  );
}

/* ---------- Coordenadas + registro de cambios ---------- */
function CoordinatesTab({ point, observation, imageSize, records, onRecord, onRemoveRecord, onSelectRecord }: PointDetailsPanelProps) {
  const { m } = useI18n();
  const t = m.modules.point;
  const [note, setNote] = useState('');
  const { copied, copy } = useCopy();
  const text = `${point.ra.toFixed(5)}, ${point.dec.toFixed(5)}`;

  return (
    <div className="space-y-4">
      <div>
        <p className={sectionLabel}>{t.coordsTitle}</p>
        <p className="font-hud mt-2 text-2xl font-semibold tabular-nums text-paper">
          {point.ra.toFixed(5)}°
          <span className="text-mist/70">, </span>
          {point.dec >= 0 ? '+' : ''}
          {point.dec.toFixed(5)}°
        </p>
      </div>

      <div>
        <Row k="RA (hms)" v={formatRaHms(point.ra)} />
        <Row k="Dec (dms)" v={formatDecDms(point.dec)} />
        <Row k={t.pixel} v={`${Math.round(point.u * imageSize)}, ${Math.round(point.v * imageSize)}`} />
        {observation && <Row k={t.frame} v={formatDate(observation.observationTime)} />}
      </div>

      <button
        type="button"
        onClick={() => copy(text, 'coords')}
        className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm text-paper/90 transition hover:bg-white/10"
      >
        {copied === 'coords' ? <Check size={15} /> : <Copy size={15} />}
        {copied === 'coords' ? t.copied : t.copyCoords}
      </button>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onRecord(note.trim());
          setNote('');
        }}
        className="space-y-2 border-t border-white/10 pt-4"
      >
        <p className={sectionLabel}>{t.recordTitle}</p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder={t.recordPlaceholder}
          className="w-full resize-none rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-paper placeholder:text-mist/70 focus:border-star focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-full bg-star px-4 py-2 text-sm font-semibold text-night transition hover:bg-star-hover"
        >
          {t.recordButton}
        </button>
      </form>

      {records.length > 0 && (
        <div className="space-y-2">
          <p className={sectionLabel}>{fmt(t.records, { count: records.length })}</p>
          <ul className="space-y-1.5">
            {records.map((r) => (
              <li key={r.id} className="flex items-start gap-2 rounded-xl bg-white/5 px-3 py-2">
                <button type="button" onClick={() => onSelectRecord(r)} className="flex-1 text-left">
                  <span className="font-hud block text-xs tabular-nums text-star">
                    {r.ra.toFixed(4)}°, {r.dec.toFixed(4)}° · {formatDate(r.observationTime)}
                  </span>
                  <span className="block text-sm text-paper/80">{r.note || t.noNote}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveRecord(r.id)}
                  aria-label={t.deleteRecord}
                  className="rounded-full p-1 text-mist/70 hover:bg-white/10 hover:text-paper"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ---------- Espectro (102 canales) ---------- */
function SpectrumTab({ point, observation }: PointDetailsPanelProps) {
  const { m } = useI18n();
  const t = m.modules.point;
  const key = `${point.ra.toFixed(6)},${point.dec.toFixed(6)}`;
  const [state, setState] = useState<{ key: string; data?: SpectrumResponse; error?: string } | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchSpectrum(point.ra, point.dec, ctrl.signal)
      .then((data) => setState({ key, data }))
      .catch((e: Error) => {
        if (e.name !== 'AbortError') setState({ key, error: e.message });
      });
    return () => ctrl.abort();
  }, [key, point.ra, point.dec]);

  const current = state?.key === key ? state : null;

  return (
    <div className="space-y-3">
      <p className={sectionLabel}>
        {t.spectrumTitle} <span className="normal-case tracking-normal text-mist">· 0.75 – 5 µm</span>
      </p>
      {!current && <p className="animate-pulse text-sm text-mist">{t.spectrumLoading}</p>}
      {current?.error && <p className="text-sm text-star">{current.error}</p>}
      {current?.data && (
        <>
          <SpectrumChart
            ariaLabel={t.spectrumAria}
            points={current.data.points}
            unit={current.data.unit}
            highlight={observation ? [observation.wavelengthMin, observation.wavelengthMax] : undefined}
          />
          <p className="text-xs leading-5 text-mist">
            {fmt(t.spectrumHelp, { detector: observation?.detector ?? '' })}
          </p>
        </>
      )}
    </div>
  );
}

/* ---------- Metadatos de la observación ---------- */
function MetadataTab({ point, observation }: PointDetailsPanelProps) {
  const { m } = useI18n();
  const t = m.modules.point;
  if (!observation) return <p className="text-sm text-mist">{t.noObservation}</p>;
  const ok = observation.flags.length === 0;

  return (
    <div className="space-y-4">
      <p className={sectionLabel}>{t.metaTitle}</p>
      <div>
        <Row k={t.metaId} v={observation.id} />
        <Row k={t.metaDate} v={formatDateTime(observation.observationTime)} />
        <Row k={t.metaDetector} v={observation.detector} />
        <Row k={t.metaBand} v={`${observation.wavelengthMin.toFixed(2)} – ${observation.wavelengthMax.toFixed(2)} µm`} />
        {observation.dataRelease && <Row k={t.metaRelease} v={observation.dataRelease} />}
        <Row k={t.metaPoint} v={`${point.ra.toFixed(5)}°, ${point.dec.toFixed(5)}°`} />
      </div>

      <div
        className={`flex items-start gap-2 rounded-xl px-3 py-2 text-sm ${
          ok ? 'bg-emerald-400/10 text-emerald-300' : 'bg-star/10 text-star'
        }`}
      >
        {ok ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0" />}
        <span>{ok ? m.modules.viewer.validObs : fmt(t.flags, { flags: observation.flags.join(', ') })}</span>
      </div>

      <a
        href={observation.imageUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 text-sm text-star hover:text-star-hover"
      >
        {t.openImage} <ExternalLink size={14} />
      </a>
    </div>
  );
}

/* ---------- Compartir URL ---------- */
function ShareTab({ shareUrl }: PointDetailsPanelProps) {
  const { m } = useI18n();
  const t = m.modules.point;
  const { copied, copy } = useCopy();
  const embed = `<iframe src="${shareUrl}" width="900" height="600" style="border:0" loading="lazy"></iframe>`;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className={sectionLabel}>{t.shareTitle}</p>
        <p className="text-xs leading-5 text-mist">
          {t.shareHelp}
        </p>
        <div className="flex gap-2">
          <input
            readOnly
            value={shareUrl}
            onFocus={(e) => e.currentTarget.select()}
            className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-paper/90"
          />
          <button
            type="button"
            onClick={() => copy(shareUrl, 'url')}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-star px-4 text-sm font-semibold text-night hover:bg-star-hover"
          >
            {copied === 'url' ? <Check size={15} /> : <Copy size={15} />}
            {copied === 'url' ? t.done : t.copy}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <p className={sectionLabel}>{t.embedTitle}</p>
        <textarea
          readOnly
          rows={3}
          value={embed}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full resize-none rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-paper/80"
        />
        <button
          type="button"
          onClick={() => copy(embed, 'embed')}
          className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm text-paper/90 hover:bg-white/10"
        >
          {copied === 'embed' ? <Check size={15} /> : <Copy size={15} />}
          {copied === 'embed' ? t.copied : t.copyCode}
        </button>
      </div>
    </div>
  );
}
