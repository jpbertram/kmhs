# B-24 coordinated-turn reconstruction

Open `index.html` (redirects to the complete `mission-reconstruction.html`). M1 integration is IN PROGRESS; current checkpoint and real test outputs are in `PROGRESS.md`, with classifications in `SOURCES.md`. The full mission now uses corrected formation placement and estimated forward-only endpoint approaches. Neither M1 nor aerodynamic validation is complete. Imported-model clearance, DEM-backed ground contact, browser controls and the provisional extended loss-playback pacing remain unverified. The focused `coordinated-turn.html` demonstrator and its original tests remain available separately; the results below describe that demonstrator, NOT certification of the complete battle.

## Scope and root cause

This is a **visual and kinematic recreation, not aerodynamic validation**. Exterior meshes and cockpit are explicitly simplified placeholders. It is a focused formation-turn demonstration, not the complete Kassel battle, original interiors, terrain, casualties or individual loss reconstruction.

The old sampler combined a geographic route with oversized display-space lateral offsets. For an offset curve, along-track velocity scales with `1 - offset × curvature`; inside slots exceeding the rendered turn radius reversed. Nineteen of 35 aircraft failed the baseline audit. Flipping headings would hide the defect, not fix it.

The new model uses metres throughout. Slots are rigid offsets in the leader's heading **and banked body frame**, transformed into world coordinates. The leader's smooth turn-rate command is limited for the entire box. Differentiating the rotating slots gives each aircraft its own velocity, airspeed, pitch, heading rate and bank. Inside aircraft slow and outside aircraft accelerate; there is no reverse steering, angle-wrap interpolation, speed-floor teleport or turn-specific shrinking. Headings remain unwrapped. Position integration uses a deterministic fixed grid; pause/seek and propeller phase derive from simulation time. Render-origin rebasing does not change distances.

This exact-slot choreography is an idealization, not a force-integrated autopilot: there is no pursuit controller, turbulence, pilot reaction delay, wind, sideslip, aerodynamic coefficient set, damage or stall dynamics. The estimated stall floor and limits are hard **simulation** invariants, not certified B-24 operating limits. Published maximum-speed/climb catalog values have configuration/altitude qualifications and are not validated mission envelopes. No published B-24J turn curve was acquired: turn-rate and bank figures are estimates, not disguised as published data.

## Tests

`node test-coordinated-turn.js --legacy` demonstrates the original failure. Legacy heading/separation/slot/data-label contracts were absent; the baseline reports those as missing, not as measured violations.

`node verify.js` runs the headless numerical suite and the real Chrome/WebGL benchmark. Numerical coverage: 20 deterministic pseudorandom seeds, varied turn rates, both turn directions, full-turn 0.1-second samples, all 35 aircraft, all pairs for separation. Checks include airspeed floor/ceiling, forward projection, maximum heading rate/bank and post-turn slot tolerance. Independent position differences check velocity every five seconds. The final slot test reconstructs body-frame coordinates rather than trusting the model's reported error. Logs include heading, velocity, airspeed and bank for each bomber every five seconds.

Browser benchmark: installed Google Chrome headless, 1280×720, pixel ratio 1, 120 warmup frames, 20 seconds sweeping the entire turn through all three views. The FPS criterion is >=30 in every measured approximately one-second window **and** no measured frame interval above 1/30 second. Startup loading is excluded; materials are precompiled before interaction. The benchmark is host/browser-specific, not a universal device guarantee. Results, browser errors, draw calls and triangles are saved in `turn-browser-results.json`; numerical results and per-bomber logs are saved in `turn-test-results.json` and `turn-test-logs.json`. Chrome/Playwright executable locations are local-host dependencies in `test-turn-browser.js`.

## Published values

Source: https://www.kasselmission.org/mission/b-24s/kassel-mission (Society specification listing, not an original flight-test report). Wingspan 110 ft = 33.528 m; length 67 ft 2 in = 20.4724 m; height 18 ft = 5.4864 m; combat speed 180–215 mph = 80.4672–96.1136 m/s; maximum 300 mph = 134.112 m/s at 30,000 ft; climb 1,025 ft/min = 5.207 m/s (catalog weight/altitude unspecified). Conventional standard gravity 9.80665 m/s²: https://physics.nist.gov/cgi-bin/cuu/Value?gn. The 30 fps acceptance criterion is supplied by the user, not an aircraft specification. No value is claimed MEASURED.

## Every ESTIMATED value

`turn-parameters.js` is the authoritative labeled data table; the Sources & estimates button displays **every** parameter and all 35 slot vectors, with value, unit, label and source/reasoning. Derived mesh dimensions and slot coordinates inherit the labels of their operands. Color choices, integer tessellation counts and mathematical conversion constants are rendering/algorithm choices, not physical measurements.

| Parameter | Estimated value | Reason / limit |
|---|---:|---|
| leadSpeedMps | 90 m/s | Demonstration speed within published combat band |
| stallSpeedMps | 50 m/s | Assumed floor; not a documented mission stall speed |
| stallReserve | 1.1 | Turn-governor reserve |
| nominalTurnRateRadS | 0.008 rad/s | Gentle authored turn |
| maximumTurnRateRadS | 0.025 rad/s | Hard demonstration heading-rate limit |
| maximumBankRad | π/6 rad | 30° demonstration limit |
| rampDurationS | 45 s | Smooth bank/rate transition |
| nominalTurnAngleRad | π rad | 180° demonstration, not exact historical track |
| slotHorizontalMPerDiagramUnit | 4 m/unit | Spacing estimate retaining diagram topology |
| slotVerticalMPerDiagramUnit | 30.48/14 m/unit | Approximate high/low stagger |
| All 35 slot XYZ vectors | See browser table / roster | Estimated coordinates, not surveyed formation |
| slotToleranceM | 1 m | Post-turn acceptance tolerance |
| testStepS | 0.1 s | Acceptance sample spacing |
| integrationStepS | 1/120 s | Deterministic leader integration grid |
| altitudeM | 7000 m | Approximate mission cruise neighborhood |
| fuselageRadiusM | 1.25 m | Simplified exterior envelope |
| wingChordM | 3.2 m | Simplified wing |
| wingThicknessM | 0.28 m | Simplified wing |
| wingHeightM | 1 m | High-wing visual placement |
| engineRadiusM | 0.7 m | Simplified nacelle |
| engineLengthM | 3.5 m | Simplified nacelle |
| engineInnerSpanFraction | 0.18 | Inner engine visual placement |
| engineOuterSpanFraction | 0.35 | Outer engine visual placement |
| engineForeM | 2 m | Nacelle centre ahead of aircraft centre |
| propellerRadiusM | 1.8 m | Simplified propeller |
| propellerBladeWidthM | 0.18 m | Simplified blade |
| propellerBladeThicknessM | 0.04 m | Simplified blade |
| propellerRateRadS | 90 rad/s | Visual animation, not verified RPM |
| tailSpanM | 10 m | Simplified stabilizer |
| tailChordM | 2 m | Simplified stabilizer |
| tailForeFraction | -0.4 | Tail placement relative to length |
| finHeightM | 3 m | Simplified twin fins |
| finChordM | 2.2 m | Simplified twin fins |
| finThicknessM | 0.15 m | Simplified twin fins |
| cockpitForeFraction | 0.32 | Placeholder cockpit location |
| cockpitLengthM | 3 m | Placeholder enclosure |
| cockpitHeightM | 1.2 m | Placeholder enclosure / eyepoint offset |
| cockpitWidthM | 2 m | Placeholder enclosure |
| cameraFollowDistanceM | 180 m | Presentation distance |
| cameraFollowHeightM | 100 m | Presentation height |
| cameraNearM | 0.05 m | Rendering clip plane |
| cameraFarM | 100000 m | Rendering clip plane |
| terrainExtentM | 100000 m | Flat demo ground; not historical topography |
| gridSpacingM | 1000 m | Distance-reference grid, not aerial imagery |
| routeSampleStepS | 5 s | Visual route-line sampling |
| cameraFovDeg | 50° | Presentation field of view |
| boxCameraXM | -1300 m | Overview camera |
| boxCameraYM | 1100 m | Overview camera |
| boxCameraZM | 1500 m | Overview camera |
| boxLookXM | -300 m | Overview focal point |
| boxLookZM | 100 m | Overview focal point |
| hemisphereIntensity | 0.85 relative | Visual lighting |
| sunIntensity | 1.2 relative | Visual lighting |
| exposure | 0.8 ratio | Filmic tone mapping |
| interiorFloorThicknessM | 0.06 m | Cockpit placeholder |
| interiorPanelHeightM | 0.6 m | Cockpit placeholder |
| interiorPanelAheadM | 1 m | Panel relative to eye |
| interiorPanelBelowM | 0.5 m | Panel relative to eye |

## Known limits

Published dimensions define an approximate B-24J exterior envelope, not exact factory sections. The prototype uses a constant-chord wing, rounded fuselage, simplified twin fins and three-blade propellers. It is not a museum-quality exterior, schematic-exact cockpit, real terrain map or actual crew-station reconstruction. The 35 aircraft include historical H/J variants but share the J demonstration envelope. Relative squadron boxes are formation assignments, not necessarily the aircraft's owning squadron. This focused deliverable does not remove known defects from the preserved historical-mission page.
