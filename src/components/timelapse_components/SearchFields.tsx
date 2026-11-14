import { Hourglass } from 'lucide-react';
import { DETECTORS, type Detector } from '../../api/spherex';
import type { SearchFormValues } from './types';

type FieldsProps = {
  values: SearchFormValues;
  onChange: (patch: Partial<SearchFormValues>) => void;
};

const label = 'text-[11px] font-medium uppercase tracking-[0.25em] text-sky-300';
const hint = 'mt-1 block text-[11px] text-slate-500';
export const inputClass =
  'font-display mt-1.5 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm tabular-nums text-white placeholder:text-slate-500 transition focus:border-sky-400 focus:bg-white/10 focus:outline-none';

/** RA, Dec, campo de visión y detector */
export function CoordinateFields({ values, onChange }: FieldsProps) {
  return (
    <div>
      <p className="mb-3 text-sm text-slate-400">
        Ingresa la ascensión recta, la declinación y el campo de visión.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="block">
          <span className={label}>RA</span>
          <input
            className={inputClass}
            inputMode="decimal"
            placeholder="210.80227"
            value={values.ra}
            onChange={(e) => onChange({ ra: e.target.value })}
            required
          />
          <span className={hint}>Right Ascension (°)</span>
        </label>

        <label className="block">
          <span className={label}>Dec</span>
          <input
            className={inputClass}
            inputMode="decimal"
            placeholder="54.34895"
            value={values.dec}
            onChange={(e) => onChange({ dec: e.target.value })}
            required
          />
          <span className={hint}>Declination (°)</span>
        </label>

        <label className="block">
          <span className={label}>FOV</span>
          <div className="mt-1.5 flex overflow-hidden rounded-xl border border-white/15 bg-white/5 focus-within:border-sky-400">
            <input
              className="font-display w-full min-w-0 bg-transparent px-3 py-2 text-sm tabular-nums text-white placeholder:text-slate-500 focus:outline-none"
              inputMode="decimal"
              placeholder="0.1"
              value={values.fov}
              onChange={(e) => onChange({ fov: e.target.value })}
              required
            />
            <select
              aria-label="Unidad del campo de visión"
              value={values.fovUnit}
              onChange={(e) => onChange({ fovUnit: e.target.value as SearchFormValues['fovUnit'] })}
              className="border-l border-white/10 bg-transparent px-2 text-sm text-slate-300 focus:outline-none [&>option]:bg-[#0a1230]"
            >
              <option value="deg">°</option>
              <option value="arcmin">′</option>
            </select>
          </div>
          <span className={hint}>Field of view</span>
        </label>

        <label className="block">
          <span className={label}>Banda</span>
          <select
            className={`${inputClass} [&>option]:bg-[#0a1230]`}
            value={values.detector}
            onChange={(e) => onChange({ detector: e.target.value as Detector })}
          >
            {DETECTORS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.id === 'All' ? 'Todas' : d.id}
              </option>
            ))}
          </select>
          <span className={hint}>Detector</span>
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
  return (
    <div className="flex items-end gap-3">
      <label className="block flex-1">
        <span className={label}>Fecha inicio</span>
        <input
          type="date"
          className={`${inputClass} [color-scheme:dark]`}
          value={values.start}
          onChange={(e) => onChange({ start: e.target.value })}
          required
        />
      </label>

      <div
        className="flex shrink-0 flex-col items-center pb-1.5 text-sky-300"
        title={loading ? 'Cargando observaciones…' : `${count} observaciones`}
      >
        <Hourglass size={22} className={loading ? 'animate-spin [animation-duration:2.4s]' : ''} />
        <span className="font-display mt-1 text-[11px] tabular-nums text-slate-400">
          {loading ? '…' : count}
        </span>
      </div>

      <label className="block flex-1">
        <span className={label}>Fecha final</span>
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
