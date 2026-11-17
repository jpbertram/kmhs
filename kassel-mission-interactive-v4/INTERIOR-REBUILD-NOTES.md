# Interior and loss-camera iteration — September 30, 2026

## Implemented

- Active crew interiors now use `interior-rebuild.js`, not the old overlapping GLB/photo-wall enclosures. No reference photographs are applied to walls or other surfaces. Original supplied assets remain intact.
- Eleven viewpoints share the exterior's local +X nose coordinate frame. Pilot/co-pilot share a flight deck; navigator/bombardier/nose share a forward compartment. Separate radio, waist, and turret reconstructions have equipment and eye positions authored together.
- Added modeled frames, stringers, glazing, instrument bezels and dial artwork, engine-control levers, seats, control columns, oxygen equipment, radio equipment, guns, and a bombsight representation.
- Corrected Fw 190 model orientation using the asset itself: Cylinder18-FACES propeller lies at native Z +2.2688, fin Line02-FACES at Z -4.8139. Positive ninety-degree Y rotation maps its nose to local +X. The old negative rotation put the tail forward.
- Controlled/gliding loss profiles last at least 180 reconstructed battle seconds, with longer distance-based trajectories. Breakup and tumbling cases remain distinct. Loss time continues beyond the attack-clock cap into the return phase.
- Crew view automatically pulls into chase when the selected ship's loss starts. Aircraft selection and crew station are preserved, including the caption. After impact the camera holds that ship's site rather than silently switching crews.
- Parachutes use smoother canopies, 24 suspension lines, seam lines, rounded jointed airmen, boots, and harness/riser geometry instead of rectangular limbs.

## Evidence and limitations

General compartment order and equipment references: [IBCC original Liberator training notes](https://ibccdigitalarchive.omeka.net/collections/document/39554); cockpit component reference: [recovered B-24J parts](https://questmasters.us/B-24_Page_2.html). RAF notes are not a definitive drawing for every US B-24J block. Neither source justifies claiming this geometry is factory-schematic exact.

The new interior is a reference-led procedural reconstruction, NOT a finished museum-grade asset. Window geometry, turret internals, individual instrument layouts, radio variants, and fittings still need validation against exact factory drawings and aircraft-specific modifications. Dials are illustrative artwork rather than fully functional flight instruments. Loss durations and bailout timing remain reconstruction estimates; extending playback does not turn the path model into a validated aerodynamic solver.

## Claude search

Checked this Mac's Claude Code project transcripts and desktop session/audit folders, plus mounted user home folders under `/Volumes/jpbertram` and `/Volumes/jpbertram-1`. Found Kassel website/wireframe work in `Library/Application Support/Claude/local-agent-mode-sessions/design-extract/kmhs-wireframe`, but no verified separate air-battle implementation in the inspected local session records. Raw string hits inside image/signature data are not treated as evidence. Mounted folders are not proof that every remote session has been searched.

## Validation

Syntax checks and existing timing/roster regression suite pass. Live browser: all eleven station controls loaded without console errors; seeking into Chilton's loss changed Pilot to Chase Camera while retaining Chilton and his pilot caption. Earlier builds and original assets remain available; this update is local only, not published to Webflow.
