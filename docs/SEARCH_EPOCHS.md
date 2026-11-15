# Search: dynamic observation selection

Search previously called `fetchObservations(..., 2)`, which sampled the earliest
and latest unique catalogue times before preparing images. The two options were
real products, not mocks or hardcoded dates, but the rest of the catalogue was
never exposed to the selectors.

Search now separates discovery from image preparation. It reads BE-01
`GET /api/v1/observations/temporal/` with `ra_deg`, `dec_deg`, `size_deg`,
`detector=SPHEREx-D2` and `limit=100`. The existing Search detector remains D2.
The expected envelope is `{ results: [{ product_id, time_bounds_lower, detector }] }`.
`time_bounds_lower` is numeric MJD, converted with `(MJD - 40587) * 86400000`.
The existing mission/date interval is filtered in UTC. Distinct product IDs remain
available even when they share an acquisition time. Duplicate IDs are removed;
ordering is MJD then product ID. Missing IDs/MJD or a missing results array fail
explicitly without generated scientific metadata.

Options show the real product ID and localized UTC date/time with milliseconds.
Existing English/Spanish labels are reused. On a submitted query the catalogue,
prepared images and selections reset. Keys prevent an earlier query/selection
from supplying current options or images; aborted requests cannot publish results.
Image prepares A; Blink prepares distinct A/B products together through the existing
Jobs `POST /api/v1/timelapses/` geometry and detector contract. Changing a selection
aborts polling and starts preparation for that selection. Backend common WCS grid,
sequence scaling, delivery URLs and scientific warnings are retained. Frame IDs,
counts, timestamps with explicit timezone, delivery and wavelength metadata are
validated. Zero results create no job; one result supports Image and disables Blink.

## Backend requirements and limitations

No additional field is required within the documented contract. BE-01 must return
nonempty stable product IDs, finite numeric acquisition MJD and the detector.
Jobs must accept a single product for Image or two distinct products for Blink,
and return matching product IDs, acquisition timestamps with timezone, scientific
metadata and public delivery URLs. These expectations are covered by simulated
contract tests, not a new live backend verification.

Discovery remains bounded to the first 100 products. The locally documented
contract does not specify pagination, total count or a continuation token, so
completeness beyond that bound cannot be claimed. Exhaustive selection requires
a documented backend pagination contract. MJD labels reflect catalogue precision;
the viewer uses the returned FITS acquisition timestamp. No timestamps are inferred
from product names. Switching selections may start another backend job; aborting
browser polling does not cancel backend work. There is no new live browser test.
Difference/Stack, Spectral and Timelapse UI are outside this change.

## Verification

```text
docker build --target build -t eon-search-epochs-check .
docker run --rm --entrypoint node eon-search-epochs-check --test scripts/temporal-client.test.mjs scripts/search-epochs.test.mjs
```

Production build (`tsc -b && vite build`) passed. All 13 tests passed, covering
catalogue options, localized control rendering, UTC, shared dates/times, stale
result exclusion, empty/single results, distinct Blink selections, malformed
metadata and Image/Blink submission. Vite retains the large bundle warning.

Work stayed on the existing `fix/search-epocs` branch (the requested spelling was
`fix/search-epochs`). No branch switch, commit or push was performed.
