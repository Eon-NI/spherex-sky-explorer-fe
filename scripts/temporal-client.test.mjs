import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync('src/api/spherex.ts', 'utf8').replaceAll('import.meta.env', '({})');
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const api = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
const products = Array.from({ length: 9 }, (_, i) => ({ product_id: String(i).padStart(64, '0'), time_bounds_lower: 60805 + i, detector: 'SPHEREx-D2' }));
const query = { ra: 210.80227, dec: 54.34895, fovDeg: .1, start: '2025-05-01', end: '2026-11-01', detector: 'D2' };

test('Blink selects genuine time extremes; five frames span interval', () => {
  assert.deepEqual(api.selectTemporalProducts(products, 2), [products[0], products[8]]);
  assert.deepEqual(api.selectTemporalProducts(products, 5).map(x => x.time_bounds_lower), [60805,60807,60809,60811,60813]);
});
test('Duplicate acquisition times do not create artificial epochs', () => {
  assert.equal(api.selectTemporalProducts([products[0], products[0], products[1]], 5).length, 2);
});
test('All detector and oversized fields are rejected before HTTP', async () => {
  await assert.rejects(api.fetchObservations({ ...query, detector: 'All' }), /one detector/);
  await assert.rejects(api.fetchObservations({ ...query, fovDeg: .3 }), /0.2/);
});
test('Discovery and orchestration map scientific metadata and delivery without exposing S3', async () => {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    if (String(url).includes('/observations/')) return Response.json({ results: products });
    if (init.method === 'POST') return Response.json({ job_id: 'example', status_url: '/api/v1/timelapses/example/' }, { status: 202 });
    return Response.json({ status: 'completed', delivery: [{ index: 0, url: 'http://localhost:8004/frame.png' }], result: {
      job_id: 'example', status: 'completed', frames: [{ index: 0, product_id: products[0].product_id, timestamp: '2025-05-10T00:00:00Z', object_key: 'private/key' }],
      provenance: { warning: 'Exploratory', observations: [{ wavelength_um: 1.5, bandwidth_um: .04 }] }
    } });
  };
  const result = await api.fetchObservations(query, undefined, 1);
  assert.equal(result.observations[0].imageUrl, 'http://localhost:8004/frame.png');
  assert.equal(result.observations[0].wavelengthMin, 1.48);
  assert.match(calls[0].url, /detector=SPHEREx-D2/);
  assert.equal(JSON.parse(calls[1].init.body).product_ids.length, 1);
  assert.equal(result.observations[0].observationTime, '2025-05-10T00:00:00Z');
});
test('Empty date selection does not create a job', async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; return Response.json({ results: products }); };
  await assert.rejects(api.fetchObservations({ ...query, start: '2030-01-01', end: '2030-02-01' }), /No real observations/);
  assert.equal(calls, 1);
});
