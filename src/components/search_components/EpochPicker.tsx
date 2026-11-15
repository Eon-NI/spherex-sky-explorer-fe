import { useId, useRef, useState } from 'react';
import { useI18n } from '../../i18n/useI18n';
import { formatEpoch } from './epochs';
import { adjacentObservationMonth, calendarCells, exactEpoch, groupEpochs, observationMonths, type EpochOption } from './epochCalendar';

type Props = {
  label: string;
  observations: EpochOption[];
  value?: string;
  excludedId?: string;
  disabled?: boolean;
  onChange: (id: string) => void;
};

const buttonClass = 'rounded-lg border border-white/15 bg-white/5 px-2 py-2 text-sm text-paper focus-visible:outline-2 focus-visible:outline-star disabled:cursor-not-allowed disabled:opacity-30';

export function EpochCalendar({ observations, month, day, excludedId, onDay }: {
  observations: EpochOption[]; month: string; day: string; excludedId?: string; onDay: (day: string) => void;
}) {
  const { m } = useI18n();
  const days = groupEpochs(observations);
  const locale = m.common.dateLocale;
  return <div className="grid grid-cols-7 gap-1" role="group" aria-label={m.modules.search.picker.calendar}>
    {Array.from({ length: 7 }, (_, i) => <span key={`weekday-${i}`} className="text-center text-[10px] text-mist" aria-hidden="true">
      {new Date(Date.UTC(2024, 0, 1 + i)).toLocaleDateString(locale, { weekday: 'narrow', timeZone: 'UTC' })}
    </span>)}
    {calendarCells(month).map((date, i) => date ? <button key={date} type="button"
      className={`${buttonClass} relative min-w-0 px-0 ${date === day ? 'border-star bg-star/15' : ''}`}
      disabled={!days.get(date)?.some(o => o.id !== excludedId)} aria-pressed={date === day}
      aria-label={`${new Date(`${date}T00:00:00Z`).toLocaleDateString(locale, { dateStyle: 'full', timeZone: 'UTC' })} UTC${days.has(date) ? ` · ${m.modules.search.picker.available}` : ''}`}
      onClick={() => onDay(date)}>
      {Number(date.slice(-2))}
      {days.has(date) && <span aria-hidden="true" className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-star" />}
    </button> : <span key={`blank-${i}`} />)}
  </div>;
}

export default function EpochPicker({ label, observations, value, excludedId, disabled, onChange }: Props) {
  const { m } = useI18n();
  const t = m.modules.search.picker;
  const locale = m.common.dateLocale;
  const days = groupEpochs(observations);
  const months = observationMonths(days);
  const selected = observations.find(o => o.id === value);
  const initialDay = selected ? new Date(selected.observationTime).toISOString().slice(0, 10) : [...days.keys()][0] ?? '';
  const [month, setMonth] = useState(initialDay.slice(0, 7));
  const [day, setDay] = useState(initialDay);
  const [draft, setDraft] = useState(value ?? '');
  const details = useRef<HTMLDetailsElement>(null);
  const summary = useRef<HTMLElement>(null);
  const radioName = useId();
  const unavailable = disabled || !observations.length;
  const previousMonth = adjacentObservationMonth(months, month, -1);
  const nextMonth = adjacentObservationMonth(months, month, 1);
  const close = () => {
    if (details.current) details.current.open = false;
    summary.current?.focus();
  };
  const timeLabel = (o: EpochOption) => {
    const same = (days.get(new Date(o.observationTime).toISOString().slice(0, 10)) ?? [])
      .filter(other => Date.parse(other.observationTime) === Date.parse(o.observationTime));
    return `${o.detector ? `${o.detector} · ` : ''}${same.length > 1 ? `${t.observation} ${same.findIndex(other => other.id === o.id) + 1}/${same.length}` : ''}`;
  };
  return <div className="min-w-0">
    <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-mist">{label} · UTC</p>
    <details ref={details} className="mt-1.5 min-w-0" onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); close(); } }}>
      <summary ref={summary} aria-disabled={unavailable}
        aria-label={`${label}: ${selected ? formatEpoch(selected.observationTime, locale) : m.modules.search.noObs}`}
        onClick={e => {
          if (unavailable) e.preventDefault();
          else if (!details.current?.open) { setMonth(initialDay.slice(0, 7)); setDay(initialDay); setDraft(value ?? ''); }
        }}
        onKeyDown={e => { if (unavailable && (e.key === 'Enter' || e.key === ' ')) e.preventDefault(); }}
        className={`${buttonClass} list-none break-words ${unavailable ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}>
        {selected ? formatEpoch(selected.observationTime, locale) : m.modules.search.noObs}
      </summary>
      {!unavailable && <div className="mt-2 min-w-0 rounded-xl border border-white/15 bg-night p-3">
        <div className="mb-3 flex items-center justify-between gap-1">
          <button type="button" className={buttonClass} disabled={!previousMonth} aria-label={t.previousMonth}
            onClick={() => { if (previousMonth) { setMonth(previousMonth); setDay(''); setDraft(''); } }}>‹</button>
          <span className="text-center text-sm text-paper" aria-live="polite">{new Date(`${month}-01T00:00:00Z`).toLocaleDateString(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' })}</span>
          <button type="button" className={buttonClass} disabled={!nextMonth} aria-label={t.nextMonth}
            onClick={() => { if (nextMonth) { setMonth(nextMonth); setDay(''); setDraft(''); } }}>›</button>
        </div>
        <EpochCalendar observations={observations} month={month} day={day} excludedId={excludedId}
          onDay={date => { setDay(date); setDraft(''); }} />
        <fieldset className="mt-3 max-h-40 space-y-1 overflow-y-auto">
          <legend className="mb-2 text-xs text-mist">{t.times} · UTC</legend>
          {(days.get(day) ?? []).map(o => <label key={o.id} className={`flex items-start gap-2 rounded-lg p-2 text-xs text-paper ${o.id === excludedId ? 'opacity-40' : 'hover:bg-white/5'}`}>
            <input type="radio" name={radioName} value={o.id} checked={draft === o.id} disabled={o.id === excludedId}
              onChange={() => setDraft(o.id)} className="mt-0.5 accent-star" />
            <span className="min-w-0 break-words">{new Date(o.observationTime).toLocaleTimeString(locale, { timeZone: 'UTC', hourCycle: 'h23', hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 })}
              <span className="block text-mist">{timeLabel(o)}{o.id === excludedId ? ` · ${t.otherEpoch}` : ''}</span>
            </span>
          </label>)}
        </fieldset>
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <button type="button" className={buttonClass} onClick={close}>{t.cancel}</button>
          <button type="button" className={`${buttonClass} border-star text-star`} disabled={!exactEpoch(observations, draft, excludedId)}
            onClick={() => { const observation = exactEpoch(observations, draft, excludedId); if (observation) { onChange(observation.id); close(); } }}>{t.confirm}</button>
        </div>
      </div>}
    </details>
  </div>;
}
