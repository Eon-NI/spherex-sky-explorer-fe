import type { TemporalProduct } from '../../api/spherex';
import { formatDateTime } from '../timelapse_components/skyMath';

export function catalogueObservations(products: TemporalProduct[]) {
  return products.map(p => ({ id: p.product_id, detector: p.detector,
    observationTime: new Date((p.time_bounds_lower - 40587) * 86400000).toISOString() }));
}

export function resolveEpochs(count: number, epochA: number, epochB: number) {
  const a = count ? Math.max(0, Math.min(epochA, count - 1)) : -1;
  const b = count < 2 ? -1 : epochB >= 0 && epochB < count && epochB !== a ? epochB : (a + 1) % count;
  return { a, b };
}

/** "05/13/2025 14:03:22.123 UTC" (MM/DD/YYYY) */
export function formatEpoch(iso: string) {
  return formatDateTime(iso, true);
}

/** Results from another query or selection must never supply options or images. */
export function currentSearchResult<T extends { key: string }>(result: T | null, key: string): T | null {
  return result?.key === key ? result : null;
}
