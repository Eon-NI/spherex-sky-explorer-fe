import { Hourglass } from 'lucide-react';
import { DETECTORS, type Detector } from '../../api/spherex';
import type { SearchFormValues } from './types';
import { useI18n } from '../../i18n/useI18n';
import { fmt } from '../../i18n/format';

type FieldsProps = {
  values: SearchFormValues;
  onChange: (patch: Partial<SearchFormValues>) => void;
};

const label = 'text-[11px] font-medium uppercase tracking-[0.25em] text-mist';
const hint = 'mt-1 block text-[11px] text-mist/70';
export const inputClass =
  'font-hud mt-1.5 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm tabular-nums text-paper placeholder:text-mist/70 transition focus:border-star focus:bg-white/10 focus:outline-none';

/** RA, Dec, campo de visión y detector */
export function CoordinateFields({ values, onChange }: FieldsProps) {
  const { m } = useI18n();
  const t = m.modules.fields;
  return (
    <div>
      <p className="mb-3 text-sm text-mist">
        {t.intro}
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="block">
          <span className={label}>{t.ra}</span>
          <input
            className={inputClass}
            inputMode="decimal"
            placeholder="210.80227"
            value={values.ra}
            onChange={(e) => onChange({ ra: e.target.value })}
            required
          />
          <span className={hint}>{t.raHelp}</span>
        </label>

        <label className="block">
          <span className={label}>{t.dec}</span>
          <input
            className={inputClass}
            inputMode="decimal"
            placeholder="54.34895"
            value={values.dec}
            onChange={(e) => onChange({ dec: e.target.value })}
            required
          />
          <span className={hint}>{t.decHelp}</span>
        </label>

        <label className="block">
          <span className={label}>{t.fov}</span>
          <div className="mt-1.5 flex overflow-hidden rounded-xl border border-white/15 bg-white/5 focus-within:border-star">
            <input
              className="font-hud w-full min-w-0 bg-transparent px-3 py-2 text-sm tabular-nums text-paper placeholder:text-mist/70 focus:outline-none"
              inputMode="decimal"
              placeholder="0.1"
              value={values.fov}
              onChange={(e) => onChange({ fov: e.target.value })}
              required
            />
            <select
              aria-label={t.fovUnit}
              value={values.fovUnit}
              onChange={(e) => onChange({ fovUnit: e.target.value as SearchFormValues['fovUnit'] })}
              className="border-l border-white/10 bg-transparent px-2 text-sm text-paper/80 focus:outline-none [&>option]:bg-night-soft"
            >
              <option value="deg">°</option>
              <option value="arcmin">′</option>
            </select>
          </div>
          <span className={hint}>{t.fovHelp}</span>
        </label>

        <label className="block">
          <span className={label}>{t.band}</span>
          <select
            className={`${inputClass} [&>option]:bg-night-soft`}
            value={values.detector}
            onChange={(e) => onChange({ detector: e.target.value as Detector })}
          >
            {DETECTORS.filter(d => d.id !== 'All').map((d) => (
              <option key={d.id} value={d.id}>
                {d.id === 'All' ? t.allBands : d.id}
              </option>
            ))}
          </select>
          <span className={hint}>{t.bandHelp}</span>
        </label>
      </div>
    </div>
  );
}

/** Fecha de inicio — reloj de arena — fecha final */
export function DateRangeFields({
  values,
  onChange,
  loading,
  count,
}: FieldsProps & { loading: boolean; count: number }) {
  const { m } = useI18n();
  const t = m.modules.fields;
  return (
    <div className="flex items-end gap-3">
      <label className="block flex-1">
        <span className={label}>{t.start}</span>
        <input
          type="date"
          className={`${inputClass} [color-scheme:dark]`}
          value={values.start}
          onChange={(e) => onChange({ start: e.target.value })}
          required
        />
      </label>

      <div
        className="flex shrink-0 flex-col items-center pb-1.5 text-star"
        title={loading ? t.loadingObs : fmt(t.countObs, { count })}
      >
        <Hourglass size={22} className={loading ? 'animate-spin [animation-duration:2.4s]' : ''} />
        <span className="font-hud mt-1 text-[11px] tabular-nums text-mist">
          {loading ? '…' : count}
        </span>
      </div>

      <label className="block flex-1">
        <span className={label}>{t.end}</span>
        <input
          type="date"
          className={`${inputClass} [color-scheme:dark]`}
          value={values.end}
          onChange={(e) => onChange({ end: e.target.value })}
          required
        />
      </label>
    </div>
  );
}
