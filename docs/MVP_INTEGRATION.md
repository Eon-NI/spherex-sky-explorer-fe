# EON real MVP frontend integration

Branch: feature/eon-mvp-integration, based on development. The working tree was
clean before changes; no frontend AGENTS.md exists. No branch switch/pull/merge,
commit or push was performed. Backend is a separate repository and branch.

## Real temporal client

Search Image/Blink and Timelapse no longer use synthetic observations. The client:

1. Queries BE-01 /api/v1/observations/temporal/ with ra_deg/dec_deg/size_deg,
   detector=SPHEREx-Dn and limit=100.
2. Filters the selected UTC date interval using catalogue MJD and chooses unique
   candidate times. Search prepares two endpoints for Image A and instant Blink;
   Timelapse selects up to five distributed times, including interval endpoints.
3. Posts genuine product_ids and matching geometry to Jobs /api/v1/timelapses/.
4. Polls pending/running/completed/failed with an eight-minute deadline, abortable
   90-second HTTP requests and no automatic valid-job resubmission.
5. Uses returned FITS acquisition timestamps and center wavelength/bandwidth, and
   loads the separate browser delivery URLs. Private object keys are not image URLs.

Maximum temporal field side is 0.2 deg and one detector is required; All is not
available. Blink cannot use identical A/B selections or invent a second epoch when
only one real acquisition remains. The verified region is M101, RA 210.80227,
Dec 54.34895, size 0.1, D2. Other detector inputs are supported but not live-tested.

Date labels explicitly say UTC, avoiding the previous local-date shift for an
acquisition such as 2026-06-24T03:19:00.063Z. Timelapse image loading requests
anonymous CORS so real cross-origin PNGs do not taint its canvas. Processing/loading
and errors use actual backend state, without a mock fallback. Difference/Stack
controls are excluded from the active MVP; their old implementation is not validated.

## Browser URLs and configuration

The running Docker frontend is http://localhost:8080 (also reachable at 127.0.0.1).
Temporal API defaults, configurable with Vite build-time variables:

- VITE_OBSERVATION_API_URL: http://localhost:8001
- VITE_JOBS_API_URL: http://localhost:8004

Spectral retains its original VITE_SPECTRAL_API_URL/default http://localhost:8003.
Vite variables are baked at build time; use an ignored .env.production.local for
alternative public origins before building. Do not put internal service tokens or
S3 credentials in VITE variables. The browser never needs minio:9000 or another
Docker-only hostname. Jobs streams private PNGs and grants the configured browser
origin. Backend defaults allow localhost/127.0.0.1 on 5173 and 8080; other origins
require EON_BROWSER_ORIGINS configuration server-side.

Temporal mocks are explicitly disabled. The old mock fixture file remains unused;
its presence is not evidence of real data. Generic internal Jobs authentication is
handled server-side; no browser internal token was added.

## Spectral preserved as reference

No Spectral UI component or scientific/client function was changed. The tail of
src/api/spherex.ts beginning with SPECTRAL_API_URL remains identical to the base
branch. Existing public submission/status polling, error/loading states and HTTP
preview patterns informed temporal integration; no HiPS logic was copied.

Initial live validation: real 102-channel metadata returned 200, cube submission
502, and the frontend origin 8080 had no CORS grant. Those were documented before
shared backend configuration corrections; initial full Spectral success is not
claimed. Final real Edge regression passed on the unchanged implementation:
prepared official tile 677, displayed its PNG, clicked the existing center-spectrum
button and rendered 102 real samples with null flux at blank indices 50/51.
One necessary cold tile (320,909,760 bytes) was acquired; repeats used cached data.

## Real browser and scientific results

- Search Image: displayed the first real PNG; two endpoint images were prepared
  once for shared Blink use. Job c9585bf7-f7a6-4c17-b34e-1ea7a7fcd961.
- Search Blink: two real acquisition times 2025-05-10T17:04:37.741Z and
  2026-06-24T03:19:00.063Z, common WCS grid/shared scale. Trusted controls started
  playback and canvas hashes changed. Selecting A equal to B automatically keeps
  the two selections distinct; this guard was exercised in the browser.
- Timelapse: five real chronological PNGs, job
  a18d40b0-08fc-449f-ba31-7f47b71a48a3; source times span the same endpoints. Public
  submission returned 202, status/PNG requests 200, CORS preflight 204. Actual canvas
  playback changes were verified, not inferred from backend completion.
- Backend audit independently matched PNG bytes to MinIO, checked all source FITS
  sizes, verified an actual FITS/header/checksum/timestamp, and compared stored and
  returned manifests. All frames use a common 59x59 grid and sequence-wide scaling.

These are technical exploratory views: passbands differ by exposure/position,
FLAGS are not a calibrated mask, and brightness or apparent shifts do not prove
variability/motion. No PSF/background/photometry calibration was added. Candidate
selection is bounded to a chronological prefix of 100; dates are filtered locally.
A catalogue reaching that bound can omit later observations. The verified M101
catalogue contained 84 real products. IRSA outages surface as errors. Optional
legacy point tools were not included in the new temporal feature acceptance.

## Builds and regression checks

The final production Dockerfile runs pnpm build (tsc -b plus Vite), rather than
skipping TypeScript. Type checking and production build passed. Vite still reports
its existing large-chunk warning; no unrelated bundler refactor was introduced.
Five Node contract tests use existing TypeScript tooling, no new npm dependency.

```cmd
docker compose -p spherex-sky-explorer-fe build frontend
docker compose -p spherex-sky-explorer-fe up -d --no-deps frontend
docker build --target build -t eon-mvp-fe-check .
docker run --rm --entrypoint node eon-mvp-fe-check --test scripts/temporal-client.test.mjs
```

Backend-owned browser commands (installed Edge and standard-library CDP; no extra
browser package) are scripts.browser_mvp search/blink/timelapse/spectral --save.
Backend tests: 171 passed/6 optional skipped, 24 focused tests and five smoke checks.
Those mocks/unit tests are distinct from real browser/Celery/FITS/S3 results.

See backend docs/MVP_INTEGRATION.md and docs/evidence/mvp_integration/ for public
contracts, raw browser/network summaries and scientific artifact audit. No .env,
Spectral components, package dependencies/lockfile, unrelated project or persisted
scientific data was modified/deleted. Changes remain uncommitted.
