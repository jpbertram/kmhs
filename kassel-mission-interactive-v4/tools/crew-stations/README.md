# B-24 crew-compartment models

Source for the seven models the mission page loads for crew views
(`crew-compartments.js`):

| File | Stations | Built from |
|---|---|---|
| `b24-flight-deck.glb` | pilot, co-pilot (also seen from the radio seat) | the VR cockpit JP reviewed (`b24-cockpit-vr.html`), trimmed by `trim.mjs` where the aft deck joins it |
| `b24-aft-deck.glb` | radio operator, top-turret bay | `aftdeck.py` |
| `b24-nose-compartment.glb` | navigator, bombardier, nose turret | `nose.py` |
| `b24-waist.glb` | left and right waist gunners | `waist.py` |
| `b24-top-turret.glb` | top turret gunner (also seen from the pilots' and radio seats) | `turrets.py top` |
| `b24-ball-turret.glb` | ball turret gunner | `turrets.py ball` |
| `b24-tail-turret.glb` | tail gunner | `turrets.py tail` |

Everything is drawn here: `textures.py` paints the zinc-chromate, bronze-green,
olive-drab and black-crinkle finishes, the BC-348 / BC-375 faces, gauge faces,
the navigator's chart and the stencils. No photograph is used as a surface.

References: JP's renders and NMUSAF B-24 photographs (navigator and bombardier,
Norden bombsight, radio operator, waist gunners), plus Project Warbird's
restoration notes for the radio station layout (on the B-24D to J-175 the
radio operator sat on the right behind the co-pilot, his table against the
right wall, with the upper turret just behind him). The 445th BG flew
nose-turret B-24H/Js at Kassel, so the nose has the Emerson turret, not the
B-24D's framed glass nose in one reference photo.

## Turrets and the Kassel aircraft

The 445th BG flew a mix of B-24Hs and B-24Js on 27 September 1944 (34
serials in `reference/society-crew-cms-snapshot.json`). Builder blocks found
in Joe Baugher's serial lists and the American Air Museum include H-15/20/25
Fort Worth, J-1/J-5 Ford and H/J Douglas Tulsa ships; the rest were not
confirmed. Turret fits by block follow Hangar Thirteen's "US Powered Aircraft
Gun Turrets" table:

- Top: Martin A-3C with an N-6 reflector sight on the Fort Worth Hs (modelled);
  the later Ford and Douglas ships had the A-3D with a K-9 computing sight.
- Ball: Sperry A-13 on every block present. The K-4 computing sight is the
  Sperry ball's standard sight, but no source read ties it to these blocks.
- Tail: Consolidated A-6B (Motor Products built) on the H and later J blocks,
  with ammunition boxes outside the turret feeding along rails.
- Waist: enclosed Plexiglas windows with the gun on a K-6 mount at the sill
  (modelled), not the open hatches of museum photos.
- Nose: Emerson A-15 on the Fort Worth and Douglas Tulsa ships (modelled);
  San Diego Js carried the Consolidated A-6A/B nose turret instead.

Shapes follow the period turret illustrations JP supplied (Martin cutaway,
Sperry ball, Consolidated tail diagram and interior photo). Exteriors are olive
drab to match the mission page's olive-drab aircraft; Liberators delivered
after March 1944 were natural metal.

These are reconstructions, not factory drawings: dimensions, gauge layouts,
placards and wiring are estimates.

## Rebuild

```
BLENDER_PY=/path/to/python-with-bpy COCKPIT_SRC=/path/to/b24-cockpit.glb ./build.sh
```

`BLENDER_PY` is any Python that can `import bpy` (`pip install bpy` on Python
3.11 works headless). The script paints the textures, models the three
compartments in Blender, trims the cockpit, then `prep.mjs` bakes emissive
strength and quantizes geometry so three r128's GLTFLoader reads them with no
decoder, and finally runs `verify-crew-compartments.js`.
