# B-24 crew-compartment models

Source for the four models the mission page loads for crew views
(`crew-compartments.js`):

| File | Stations | Built from |
|---|---|---|
| `b24-flight-deck.glb` | pilot, co-pilot (also seen from the radio seat) | the VR cockpit JP reviewed (`b24-cockpit-vr.html`), trimmed by `trim.mjs` where the aft deck joins it |
| `b24-aft-deck.glb` | radio operator, top-turret bay | `aftdeck.py` |
| `b24-nose-compartment.glb` | navigator, bombardier, nose turret | `nose.py` |
| `b24-waist.glb` | left and right waist gunners | `waist.py` |

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
