import type { TemporalProduct } from '../../api/spherex';

export function catalogueObservations(products: TemporalProduct[]) {
  return products.map(p => ({ id: p.product_id, detector: p.detector,
    observationTime: new Date((p.time_bounds_lower - 40587) * 86400000).toISOString() }));
}

export function resolveEpochs(count: number, epochA: number, epochB: number) {
  const a = count ? Math.max(0, Math.min(epochA, count - 1)) : -1;
  const b = count < 2 ? -1 : epochB >= 0 && epochB < count && epochB !== a ? epochB : (a + 1) % count;
  return { a, b };
}

export function formatEpoch(iso: string, locale: string) {
  return new Date(iso).toLocaleString(locale, { timeZone: 'UTC', year: 'numeric', month: 'short',
    day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3,
    hourCycle: 'h23' }) + ' UTC';
}

/** Results from another query or selection must never supply options or images. */
export function currentSearchResult<T extends { key: string }>(result: T | null, key: string): T | null {
  return result?.key === key ? result : null;
}
