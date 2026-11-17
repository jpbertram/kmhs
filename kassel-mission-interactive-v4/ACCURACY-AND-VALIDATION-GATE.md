# Museum-grade / schematic-exact / aerodynamic validation gate

## Current status: NOT met

The current simulation remains a historical visualization. It is not a validated flight-dynamics simulator and is not factory-schematic exact. This is a release gate, not fine print. Neither the 35-aircraft roster checks nor smooth animation constitute aerodynamic validation.

## Screenshot defect

The cigar-shaped aircraft matches the active procedural Bf 109 fallback in `index.html`: coarse lathed fuselage, rectangular wing/tail, spherical canopy. The damaged imported 109 asset had been disabled, leaving this inadequate fallback. `historical-geometry.js` replaces it with a G-family dimensional proxy with tapered fuselage cross-sections, tapered wing and stabilizers, shaped fin, framed canopy, radiators, cowling bulges, exhausts, and an X-axis rotating propeller. It is deliberately NOT described as a certified specific subtype, paint scheme, or serial-numbered aircraft.

Airmen now have contoured torsos, narrower shaped heads, leather flying helmets, tapered limbs, separate gloves/boots, flat webbing, fittings, leg loops, and risers. No precise individual face or equipment issue is invented. Those details require each man's photographic/documentary references. These figures are still modeled reconstructions, not scanned human assets.

## Primary source access

- [AirCorps Library B-24 catalog](https://app.aircorpslibrary.com/aircraft/consolidated-b-24-liberator): identifies original July/August 1944 AN 01-5EE-1 G/H/J operating instructions and structural/equipment publications; content requires membership.
- [Original B-24 acceptance and performance reports](https://www.wwiiaircraftperformance.com/org/B-24/B-24.html): published original C/D/E/G test reports. These are useful benchmarks, but cannot by themselves certify a J-block model, asymmetric damage, or an exact loss trajectory.
- [USAF Museum Bf 109G-10](https://www.nationalmuseum.af.mil/Visit/Museum-Exhibits/Fact-Sheets/Display/Article/196264/messerschmitt-bf-109g-10/): museum aircraft reference, not proof of the subtype of every fighter on this mission.

No purchase, membership signup, or remote document disclosure has been performed. The user has no drawing subscription and requested continued searching. Freely accessible originals have now been saved under `reference/original-manuals/`: AAF 50-12 training manual Parts 1, 4 and 7 from the 461st archives, and the April 20, 1944 B-24G 42-78095 flight-test report, Engineering Report 47-1736-A. The revised training manual is not automatically evidence for a September 1944 J-block installation. The G test is not a J validation certificate.

`flight-dynamics-core.js` supplies SI rigid-body integration without invented default aircraft coefficients. `verify-flight-dynamics.js` passes analytic translation, gravity, constant-force, rotation, and conservation checks. It is deliberately not driving the mission visualizer yet. Connecting it without defensible aircraft forces would conceal the remaining uncertainty.

`reference/b24g-flight-benchmarks.json` records manually transcribed measured points and discrepancies from the scanned report. Printed page 5's 294 mph point and the 291 mph maximum-speed summary are separate observations/configurations, not interchangeable targets. The report's summary and detailed maximum-speed section also give different instantaneous weights; both are retained rather than silently reconciled.

`flight-benchmark-validation.js` now compares independent level-flight speed and engine-power predictions with withheld measured points. It requires matching aircraft identity and configuration, disjoint calibration/withheld rows, explicit tolerances and their basis. Its model input excludes the expected speed and horsepower, and its report retains residuals and failures. `verify-flight-benchmark-validation.js` exercises that infrastructure using deliberately failing synthetic predictions. No actual aircraft model has passed it. The fixture's tolerances and partition are not a release protocol or measured uncertainty. A caller's declaration of withheld data still requires an external audit of the model's fitting/training history.

The airman's head now uses a CC0 MakeHuman anatomical mesh, with a generic flying-clothing reconstruction. This is not a crewman's portrait. Attribution and the reproducible head conversion are in `build-airman-anatomy.js` and `airman-anatomy.js`.

## What must be replaced or verified before aerodynamic release

1. Unify simulation coordinates in SI units. Current aircraft scale, map distances, altitude exaggeration, compressed route playback, and HUD speeds do not form one physical unit system.
2. Replace route interpolation and loss Bezier paths with a fixed-step six-degree-of-freedom rigid-body solver. A numerical solver alone is not validation.
3. Supply variant/block-specific mass, center of gravity, inertia tensor, fuel/bomb/crew loads, aerodynamic coefficient tables, stability derivatives, control-surface limits, engine/propeller performance versus altitude, and documented configurations.
4. Introduce damage as physical changes in lift, drag, moments, mass and inertia, propulsion, and control authority. Breakup needs independent bodies and forces. Unknown damage coefficients must remain explicitly uncertain, not chosen simply to hit a crash marker.
5. Feed mission route intent through a flight-control/autopilot layer; integrate forces to obtain positions. Do not teleport aircraft onto a spline or force a physically impossible crash endpoint.
6. Compare withheld measured test points against predictions: level-flight speeds/power, climb, stall, glide, trim and dynamic responses, at matched mass/configuration/atmosphere. Record residuals, tolerances and failures; show independent numerical convergence/energy/rotation tests separately from empirical validation.
7. Treat documented loss sites and witnesses as reconstruction constraints with uncertainty. No data currently supports validating every exact damage/bailout/spin event. Preserve uncertainty even after nominal intact-flight performance is validated.

## What must be verified before schematic-exact interior release

Match each represented aircraft's production block and modifications; identify correct nose/top/tail turret installation, equipment variants and station arrangement. Build dimensions from original station/cross-section/component drawings, with drawing number and revision attached to each mesh. Validate camera eye positions using seated/standing anthropometry and equipment clearances. Have a B-24 specialist/restoration reviewer check the result. Reference photographs are observation evidence, never arbitrary surface skins.

## Continuing source work

Continue searching open engineering archives and use the downloaded training/manual pages to establish station arrangement and equipment, with page-specific provenance. Factory station dimensions, inertia, stability derivatives, and block-specific configurations remain unresolved. Additional authorized originals would help, but the search is not paused waiting for user access. Until those engineering and review gates are passed, the museum-grade, schematic-exact, and fully validated aerodynamic labels must not be applied.
