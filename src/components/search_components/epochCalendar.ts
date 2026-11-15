export type EpochOption = { id: string; observationTime: string; detector?: string };

export function groupEpochs(observations: EpochOption[]) {
  const days = new Map<string, EpochOption[]>();
  [...observations].sort((a, b) => Date.parse(a.observationTime) - Date.parse(b.observationTime) || a.id.localeCompare(b.id))
    .forEach(o => {
      if (!o.id || !Number.isFinite(Date.parse(o.observationTime))) return;
      const day = new Date(o.observationTime).toISOString().slice(0, 10);
      days.set(day, [...(days.get(day) ?? []), o]);
    });
  return days;
}

export function observationMonths(days: Map<string, EpochOption[]>) {
  return [...new Set([...days.keys()].map(day => day.slice(0, 7)))];
}

export function adjacentObservationMonth(months: string[], month: string, direction: -1 | 1) {
  const index = months.indexOf(month);
  return index < 0 ? undefined : months[index + direction];
}

export function calendarCells(month: string) {
  const first = new Date(`${month}-01T00:00:00Z`);
  if (!Number.isFinite(first.getTime())) return [];
  const offset = (first.getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return Array.from({ length: offset + count }, (_, i) => i < offset ? null : `${month}-${String(i - offset + 1).padStart(2, '0')}`);
}

export function exactEpoch(observations: EpochOption[], id: string, excludedId?: string) {
  return id !== excludedId ? observations.find(o => o.id === id) : undefined;
}
