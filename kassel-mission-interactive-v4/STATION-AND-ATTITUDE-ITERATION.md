# Station and attitude iteration - 30 September 2026

This is a partial improvement, not museum-grade certification.

## Implemented

- Replaced the generic ball-station enclosure with a spherical Sperry A-13 reconstruction. Diameter is the documented 44 inches; conversion uses the project's nominal 33-unit / 20.47 m exterior frame. Sighting aperture, side glazing, gun receivers, trunnions, controls, feed chutes, sight housing, access-door details and seat follow the original manual's component illustrations. Smaller dimensions and outlines remain estimates.
- Both the camera eye and sightline rotate with the turret's modeled downward elevation. The turret is not a cylindrical room with a floating camera. No other airman model is inserted in the selected station.
- Raised navigator and bombardier eyepoints: their former seat-to-eye heights were approximately 0.52 m and 0.31 m in the project's nominal frame, inconsistent with an ordinary seated posture. New heights are approximately 0.76 m. This is an anthropometric reconstruction, not factory station coordinates.
- Fighters and escorts now use an orthonormal frame aligned exactly with their instantaneous flight tangent. Removed artificial 0.7/0.45 pitch reduction. This does not validate their flight paths or aerodynamic forces.
- Ball-turret components are merged into five material batches rather than 285 individual draw calls. Glazing and opaque parts retain separate materials.
- Added `turret-review.html` with exterior and gunner-eye inspection modes.
- Station and aircraft controls now refresh the named crew caption synchronously, eliminating the old 400 ms interval mismatch after switching stations.

## Sources inspected using the PDF reading workflow

- `reference/original-manuals/Sperry-A13-Handbook-11-45G-1.pdf`: AN 11-45G-1, Section II printed p.2, Figures 2, 3 and 13, printed pp.4, 5 and 16. The introduction specifically distinguishes the B-24 A-13 from B-17 A-2/A-2A installations. The 44-inch diameter and 28-inch A-13 retraction are explicit. Component illustrations are not complete dimensioned factory CAD.
  Source: https://hangarthirteen.org/wp-content/uploads/2020/08/11-45G-1-Handbook-for-Sperry-Lower-Ball-Turrets-A-2-A-2A-A-13.pdf
- `reference/original-manuals/B24D-Operating-Instructions.pdf`: AN 01-5EC-1, printed pp.9-10, controls illustration and variant notes. This is a D/E manual, not permission to certify a J cockpit. Its cockpit instrument topology differs from the current generic repeated flight-gauge layout, which remains unresolved rather than being silently replaced with an earlier variant.
  Source: https://www.armyaircorpsmuseum.org/docs/B24D-operating-manual.pdf
- AAF 50-12 Part 1 printed pp.38-39 and Part 4 printed pp.122-123: checklist cockpit illustration, systems list, hydraulic equipment description. These are training/observation evidence, not factory dimensions.

## Verification

`node verify-flight-attitude.js`: 10,000 tangent/bank frames plus cardinal and vertical directions; unit/orthogonal axes, forward alignment and zero-vector rejection.

`node verify-turret.js /absolute/path/to/three-r128.js`: documented diameter, interior eyepoint, unit sightline, finite mesh vertices, immediate solid-geometry clearance, and <=5 render batches. The dependency is the same public Three.js r128 build used by the simulator.

`node verify.js` and `node verify-flight-dynamics.js`: existing roster/timeline/assets checks and numerical mechanics tests. Aircraft aerodynamic validation remains pending. Mission choreography is still not a full aerodynamic simulation.

## Still required

J/block-specific cockpit engineering data and station details, correct variant-specific turret choices per aircraft, specialist review, detailed radio/navigation/Norden equipment, measured mass/inertia/aerodynamic model and empirical residual checks. This iteration does not claim those tasks complete. Downloaded source PDFs remain local and are excluded from the lightweight code handoff ZIP.
