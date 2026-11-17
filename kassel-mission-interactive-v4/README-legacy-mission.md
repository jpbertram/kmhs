# Kassel Mission 3D — V4

Local iteration dated 30 September 2026, preserving V3.1.3 and its handoff archive.

Run this folder through a local server:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open http://127.0.0.1:8765/index.html. The supplied B-24 interior is bundled locally; Three.js, fighter/exterior models, terrain sources, fonts and historical portrait links still require internet access.

- `index.html`: interface and bootstrap
- `km3d-v3.js`: aircraft, terrain, cameras, effects and battle reconstruction
- `mission-timeline.js`: five-minute playback and approximate mission clock
- `crew-stations.js`: roster-role resolution with uncertainty handling
- `verify.js`: repeatable validation; run `node verify.js`
- `b24j.glb`, `b24j-interior-olive.obj`: supplied model assets
- `reference/Kassel Mission Build Spec.html`: supplied governing specification
- `ITERATION-NOTES.md`: exact changes, validation and remaining historical/visual limitations
- `STATION-AND-ATTITUDE-ITERATION.md`: latest source-led turret, eyeline and attitude corrections
- `ball-turret.js`, `turret-review.html`: A-13 reconstruction and component review
- `flight-attitude.js`: tangent-aligned render attitudes; not aerodynamic forces

V4 is a local review build. It has not been published to Webflow. Read the iteration notes before treating any reconstruction as documented physical or historical certainty.
