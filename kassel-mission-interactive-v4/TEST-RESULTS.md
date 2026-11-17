# Coordinated-turn acceptance results

Executed `node verify.js` on the final model/browser build. Exit code: 0. Results apply to `index.html` -> `coordinated-turn.html`, not the separately preserved legacy mission page.

Baseline was run before the replacement implementation: `node test-coordinated-turn.js --legacy`, exit code 1. The actual old formation sampler reversed 19 of 35 aircraft. Its other metric contracts were missing; no claim is made that its browser performance was measured below 30 fps.

| Acceptance test | Result | Actual final output |
|---|---|---|
| No negative forward velocity, >=20 varied-rate/random-seed runs | PASS | 20 runs, 35 aircraft; minimum forward projection 80.53466137704372 m/s; zero negative samples |
| Heading change <= max turn rate × dt | PASS | Maximum 0.013308896347364318 rad/s, limit 0.025 rad/s; 6 runs cross +180°, 4 cross -180° without wrapping the state |
| Separation >0.5 wingspans throughout turn | PASS | Minimum 65.74921903779553 m; threshold 16.764 m; all pairs at 0.1-second intervals |
| Post-turn slot tolerance | PASS | Maximum independently reconstructed error 6.944067667844825e-12 m; tolerance 1 m |
| Browser >=30 fps with full formation | PASS | Minimum one-second window 59.99400059993999 fps; maximum frame interval 16.80000000000291 ms (59.523809523799216 fps); 35 aircraft, all three views, no page errors |
| Every dimension has provenance label | PASS | Parameter metadata + every slot checked; every estimated parameter present in README; complete parameter/slot table present in browser |

Additional checks: PASS velocity versus finite differences, PASS full banked leader-body-frame slot reconstruction throughout the turn, PASS pause, PASS browser parameter-table completeness. Minimum airspeed 80.53466137704375 m/s exceeds the estimated 50 m/s stall floor. Maximum airspeed 100.43862667523348 m/s remains below the selected published maximum 134.112 m/s. Maximum bank 0.1273308290224342 rad stays below the estimated π/6 limit. Climb limits are enforced at every model sample.

Browser conditions: headless Google Chrome 154, local Mac host, WebGL, 1280×720, pixel ratio 1, 120-frame warmup, 20-second full-turn sweep. 28 draw calls, 29,276 triangles in the final cockpit-view sample. Hardware/OS scheduling on other machines may differ; this is an observed benchmark, not a universal performance guarantee.

Machine-readable evidence: `turn-test-results.json`, `turn-test-logs.json` (per aircraft every five seconds), `turn-browser-results.json`. The numerical state outputs are derived reconstruction estimates, not measured aircraft flight data. Browser timing is an observed performance measurement. No aerodynamic validation is claimed.
