import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';

const moduleCache = new Map();
async function moduleUrl(path) {
  if (moduleCache.has(path)) return moduleCache.get(path);
  let source = readFileSync(path, 'utf8').replaceAll('import.meta.env', '({})');
  if (path.endsWith('/useI18n.ts')) source = `export const useI18n = () => ({m: ${readFileSync('src/i18n/locales/es.json', 'utf8')}});`;
  let code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const imports = [...code.matchAll(/from ['"]([^'"]+)['"]/g)];
  for (const match of imports) {
    const name = match[1];
    let url;
    if (name.startsWith('.')) {
      const base = (await import('node:path')).posix.normalize(path.slice(0, path.lastIndexOf('/') + 1) + name);
      const { existsSync } = await import('node:fs');
      const target = [base, base + '.ts', base + '.tsx'].find(p => existsSync(p));
      url = await moduleUrl(target);
    } else url = import.meta.resolve(name);
    code = code.replace(match[0], `from ${JSON.stringify(url)}`);
  }
  const url = 'data:text/javascript;base64,' + Buffer.from(code).toString('base64');
  moduleCache.set(path, url);
  return url;
}
async function load(path) { return import(await moduleUrl(path)); }
const api = await load('src/api/spherex.ts');
const epochs = await load('src/components/search_components/epochs.ts');
const q = { ra: 210.8, dec: 54.3, fovDeg: .1, start: '2025-05-01', end: '2026-11-15', detector: 'D2' };
const product = (id, time = 60805) => ({ product_id: id, time_bounds_lower: time, detector: 'SPHEREx-D2' });

const calendar = await load('src/components/search_components/epochCalendar.ts');

test('Rendered calendar enables only real available days and excludes the other Blink product', async () => {
  const { EpochCalendar } = await load('src/components/search_components/EpochPicker.tsx');
  const observations = [{ id: 'a', observationTime: '2026-01-02T00:00:00Z' }, { id: 'b', observationTime: '2026-01-04T12:00:00Z' }];
  const html = renderToStaticMarkup(createElement(EpochCalendar, { observations, month: '2026-01', day: '2026-01-02', excludedId: 'b', onDay() {} }));
  assert.equal((html.match(/Observaciones disponibles/g) ?? []).length, 2);
  assert.equal((html.match(/disabled=""/g) ?? []).length, 30);
  assert.match(html, /aria-pressed="true"/);
});

test('Rendered Image/Blink controls hide technical IDs in visible text and retain precise UTC selection', async () => {
  const { default: Panel } = await load('src/components/search_components/ActionsPanel.tsx');
  const observations = [{ id: 'private-product-a', detector: 'SPHEREx-D2', observationTime: '2026-01-02T00:00:00.063Z' },
    { id: 'private-product-b', detector: 'SPHEREx-D2', observationTime: '2026-01-02T00:00:00.063Z' }];
  const props = { mode: 'blink', observations, epochA: 0, epochB: 1, disabled: false, blinkPlaying: false,
    onModeChange() {}, onEpochA() {}, onEpochB() {}, onToggleBlink() {} };
  for (const mode of ['single', 'blink']) {
    const html = renderToStaticMarkup(createElement(Panel, { ...props, mode }));
    assert.doesNotMatch(html, /<select/);
    assert.doesNotMatch(html.replace(/<[^>]*>/g, ''), /private-product/);
    assert.match(html, /00:00:00.063 UTC/);
    assert.match(html, /SPHEREx-D2/);
    assert.match(html, /Observación 1\/2/);
    assert.match(html, /Observación 2\/2/);
    assert.match(html, /value="private-product-b"/);
    if (mode === 'blink') {
      const inputs = html.match(/<input[^>]*>/g) ?? [];
      assert.ok(inputs.some(input => input.includes('value="private-product-b"') && input.includes('disabled=""')));
      assert.ok(inputs.some(input => input.includes('value="private-product-a"') && input.includes('disabled=""')));
    }
  }
  const empty = renderToStaticMarkup(createElement(Panel, { ...props, observations: [], disabled: true }));
  assert.match(empty, /aria-disabled="true"/);
  assert.doesNotMatch(empty, /type="radio"/);
});

test('Calendar groups at UTC midnight, retains all same-day products and orders available months', () => {
  const observations = [
    { id: 'late', observationTime: '2026-03-01T00:00:00Z' },
    { id: 'b', observationTime: '2026-01-31T23:59:59.999Z' },
    { id: 'a', observationTime: '2026-02-01T01:59:59.999+02:00' },
  ];
  const days = calendar.groupEpochs(observations);
  assert.deepEqual([...days.keys()], ['2026-01-31', '2026-03-01']);
  assert.deepEqual(days.get('2026-01-31').map(o => o.id), ['a', 'b']);
  assert.deepEqual(calendar.observationMonths(days), ['2026-01', '2026-03']);
  assert.equal(calendar.calendarCells('2026-02').filter(Boolean).length, 28);
  assert.equal(calendar.calendarCells('2028-02').filter(Boolean).length, 29);
  assert.deepEqual(calendar.observationMonths(calendar.groupEpochs([])), []);
});

test('Exact time selection preserves product identity even for identical timestamps and rejects Blink duplicate', () => {
  const observations = [{ id: 'a', observationTime: '2026-01-01T00:00:00Z' }, { id: 'b', observationTime: '2026-01-01T00:00:00Z' }];
  assert.equal(calendar.exactEpoch(observations, 'b'), observations[1]);
  assert.equal(calendar.exactEpoch(observations, 'b', 'b'), undefined);
  assert.equal(calendar.exactEpoch(observations, 'unknown'), undefined);
  assert.equal(calendar.exactEpoch([], 'a'), undefined);
});

test('Month navigation skips empty months and stops at both catalogue boundaries', async () => {
  const months = ['2025-12', '2026-03', '2026-11'];
  assert.equal(calendar.adjacentObservationMonth(months, '2025-12', 1), '2026-03');
  assert.equal(calendar.adjacentObservationMonth(months, '2026-03', -1), '2025-12');
  assert.equal(calendar.adjacentObservationMonth(months, '2025-12', -1), undefined);
  assert.equal(calendar.adjacentObservationMonth(months, '2026-11', 1), undefined);
  assert.equal(calendar.adjacentObservationMonth([], '2026-01', 1), undefined);
  const { default: Picker } = await load('src/components/search_components/EpochPicker.tsx');
  const observations = [{ id: 'a', observationTime: '2025-12-01T00:00:00Z' }, { id: 'b', observationTime: '2026-03-01T00:00:00Z' }];
  const first = renderToStaticMarkup(createElement(Picker, { label: 'A', observations, value: 'a', onChange() {} }));
  assert.match(first, /disabled="" aria-label="Mes anterior con observaciones"/);
  assert.doesNotMatch(first, /disabled="" aria-label="Mes siguiente con observaciones"/);
  const last = renderToStaticMarkup(createElement(Picker, { label: 'A', observations, value: 'b', onChange() {} }));
  assert.match(last, /disabled="" aria-label="Mes siguiente con observaciones"/);
  assert.match(last, /marzo de 2026/);
});

test('Search discovers every genuine product, chronologically, including shared dates and times', async () => {
  globalThis.fetch = async url => {
    assert.match(String(url), /ra_deg=210.8&dec_deg=54.3&size_deg=0.1&detector=SPHEREx-D2/);
    return Response.json({ results: [product('c', 60806), product('b'), product('a'), product('d', 60805.5), product('a')] });
  };
  const found = await api.discoverSearchProducts(q);
  assert.deepEqual(found.map(p => p.product_id), ['a', 'b', 'd', 'c']);
  const options = epochs.catalogueObservations(found);
  assert.equal(options.length, 4);
  assert.equal(options[0].observationTime, options[1].observationTime);
  assert.equal(options[0].id, 'a');
});

test('Labels retain UTC time and milliseconds regardless of browser timezone', () => {
  const label = epochs.formatEpoch('2026-06-24T03:19:00.063Z', 'en-GB');
  assert.match(label, /24 Jun 2026/);
  assert.match(label, /03:19:00.063 UTC/);
});

test('Zero, one and multiple epochs have valid Image and distinct Blink selections', () => {
  assert.deepEqual(epochs.resolveEpochs(0, 8, 8), { a: -1, b: -1 });
  assert.deepEqual(epochs.resolveEpochs(1, 8, 8), { a: 0, b: -1 });
  assert.deepEqual(epochs.resolveEpochs(4, 2, 2), { a: 2, b: 3 });
  assert.deepEqual(epochs.resolveEpochs(4, 0, 3), { a: 0, b: 3 });
});

test('Changed query or selected products immediately hide previous options and frames', () => {
  const previous = { key: JSON.stringify(q), products: [product('a')] };
  assert.equal(epochs.currentSearchResult(previous, JSON.stringify({ ...q, ra: 12 })), null);
  assert.equal(epochs.currentSearchResult(previous, JSON.stringify(q)), previous);
  assert.equal(epochs.currentSearchResult({ key: 'query:a,b' }, 'query:a,c'), null);
});

test('Empty discovery is a valid empty catalogue; malformed metadata never invents epochs', async () => {
  globalThis.fetch = async () => Response.json({ results: [] });
  assert.deepEqual(await api.discoverSearchProducts(q), []);
  for (const results of [[{ detector: 'SPHEREx-D2' }], [product('', 60805)], [product('a', null)], null]) {
    globalThis.fetch = async () => Response.json({ results });
    await assert.rejects(api.discoverSearchProducts(q), /Missing/);
  }
});

test('Image and Blink prepare only selected products together, with genuine manifest metadata', async () => {
  for (const selected of [[product('a')], [product('a'), product('b', 60806)]]) {
    let body;
    globalThis.fetch = async (url, init = {}) => {
      if (init.method === 'POST') {
        body = JSON.parse(init.body);
        return Response.json({ job_id: 'job', status_url: '/job' });
      }
      return Response.json({ status: 'completed', delivery: selected.map((_, index) => ({ index, url: `/image${index}.png` })),
        result: { job_id: 'job', status: 'completed', frames: selected.map((p, index) => ({ index, product_id: p.product_id, timestamp: '2025-05-10T12:00:00Z' })),
          provenance: { warning: 'Exploratory: common grid', observations: selected.map(() => ({ wavelength_um: 1.5, bandwidth_um: .04 })) } } });
    };
    const result = await api.prepareSearchProducts(q, selected);
    assert.deepEqual(body.product_ids, selected.map(p => p.product_id));
    assert.equal(body.ra_deg, q.ra);
    assert.equal(body.detector, 'SPHEREx-D2');
    assert.equal(result.observations.length, selected.length);
    assert.deepEqual(result.observations[0].flags, ['Exploratory: common grid']);
  }
  await assert.rejects(api.prepareSearchProducts(q, [product('a'), product('a')]), /distinct/);
});

test('Unexpected product or missing acquisition timestamp rejects processing manifest', async () => {
  for (const frame of [{ product_id: 'other', timestamp: '2025-05-10T12:00:00Z' }, { product_id: 'a' }, { product_id: 'a', timestamp: '2025-05-10T12:00:00' }]) {
    globalThis.fetch = async (url, init = {}) => init.method === 'POST'
      ? Response.json({ job_id: 'job', status_url: '/job' })
      : Response.json({ status: 'completed', delivery: [], result: { job_id: 'job', status: 'completed', frames: [frame], provenance: { observations: [] } } });
    await assert.rejects(api.prepareSearchProducts(q, [product('a')]), /Unexpected frame/);
  }
});
