# Migration verification — November 17, 2026

Verified on the original Mac, Node v25.6.1. No cloud resources were created,
no repository was uploaded, and no Linux execution is claimed.

## Source-copy audit
Before this migration note was added, SHA-256 comparison checked all 140
source files (excluding .DS_Store): missing=0. Differences were exactly:
- test-turn-browser.js: standard Playwright import, optional browser executable,
  and corrected demonstration URL instead of the full-mission redirect.
- turn-browser-preview.png and turn-browser-results.json: regenerated demo run.

All other copied mission files, models, OBJ interior and reference manuals
matched the source byte-for-byte. This copied PROGRESS.md now adds migration
status; the original project's PROGRESS.md remains unchanged. Large iCloud
assets were materialized, not replaced by links or placeholders.

Selected source archive collection output: `Evidence copies: 9/9; inventory written`.
See EVIDENCE-INVENTORY.json for byte counts and hashes. This is NOT the whole
OneDrive archive. MODEL_URLS and other external services remain dependencies.

## Installation and numeric verification
`npm ci --ignore-scripts --no-audit --no-fund`: added 3 packages, success.
Numeric suite ran from the COPIED workspace after copying finished:

```
PASS forward endpoint geometry: 359640 samples, 360 endpoint bearings, exact endpoints, forward launch and tangent-aligned motion; ESTIMATED routes, not aerodynamics
PASS M1 actual animation scheduler: survives 300-second home boundary, parks route at 1, stops at remaining-trajectory end; no browser verification
PASS M1 exact boundary gates: runs=20 checks=620 poseJumps=0 endpointsBeyondPlayback=0 endpointMisses=0 playbackEndSeconds=2886.479 failures=[]; animation scheduler/ground terrain not covered
PASS M1 return fallback-ground: runs=20 checks=80 hovering=0 landingJumps=0 maximumGroundErrorM=0.000; mesh support and DEM terrain not covered
PASS M1 formation-only: runs=20 aircraft=35 samples=1399300 backwards=0 headingJumps=0 minimumForwardDot=0.999848 minimumSeparationM=60.625; loss/departure gates NOT covered
PASS M1 actual placement transitions {"runs":20,"samples":977278,"backwards":0,"poseJumps":0,"largePoseSteps":312,"radiusViolations":0,"minimumRadiusM":2499.999999168551,"minimumControlledRadiusM":1947.2358199228968,"worst":{}}; terrain/effects/browser excluded
PASS M1 rendered bounds: runs=20 timeline=0..300 model=actual-procedural-B24 overlaps=0 groundMisses=0 first=null; imported models/fighters/DEM not covered
PASS M1 moving-anchor fighters: runs=20 samples=308981 backwards=0 visibleStops=0 earlyEscorts=0 failures=[]; bounds/forces not covered
PASS packaged M1 numeric suite: tests=8 failures=0; printed exclusions still apply; M1 remains incomplete
```

An earlier attempt ran before the copy finished and failed five checks because
loss-trajectory.js had not yet been copied. No simulation change was made to
obtain the final pass; the suite was rerun after the files were present.

## Preview and browser check
Local preview returned HTTP 302 from / to the full mission entry point and
HTTP 200 with appropriate MIME types for the B-24 GLB and bundled Three.js.
This is delivery verification, not a full-mission browser test.

The separate turn-demo browser test passed with 35 aircraft, 28 draw calls,
29276 triangles and zero page errors. Minimum 1-second FPS 59.998032851381986;
minimum instantaneous FPS 59.523809523799216. It ran in local headless Chrome
157 through the optional CHROME_EXECUTABLE_PATH override. It proves neither
Linux/WebGL readiness nor target-laptop performance. Full JSON and preview
are inside the mission directory.

## Still open
M1 is NOT complete: imported/fighter bounds, actual DEM contact, full battle
browser controls/camera, full extended timeline and provisional ~48-minute
loss playback need work. No museum-grade or aerodynamic-validation claim.
Cloud startup must run npm ci, install Chromium, verify integrity and rerun
the numeric tests before resuming implementation. Package manifests prove
bytes and completeness, not historical truth or simulation correctness.
