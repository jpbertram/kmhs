#!/usr/bin/env bash
# Rebuild the seven crew-compartment models into kassel-mission-interactive-v4/.
#   BLENDER_PY  python that can `import bpy` (pip install bpy, Python 3.11) or `blender -b --python`
#   COCKPIT_SRC the stand-alone VR cockpit GLB (b24-cockpit.glb) the flight deck comes from
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"; out="$here/../.."; work="${WORK:-$(mktemp -d)}"
BLENDER_PY="${BLENDER_PY:-python3.11}"
(cd "$here" && npm install --no-save --silent)
python3 "$here/textures.py" "$work/tex"
for part in nose aftdeck waist; do
  (cd "$here" && B24_TEX="$work/tex" PYTHONPATH="$here" "$BLENDER_PY" "$here/$part.py" -- "$work/$part.glb")
done
for t in top ball tail; do
  (cd "$here" && B24_TEX="$work/tex" PYTHONPATH="$here" "$BLENDER_PY" "$here/turrets.py" -- "$work/$t.glb" "$t")
done
node "$here/trim.mjs" "$COCKPIT_SRC" "$work/deck-trimmed.glb"
node "$here/prep.mjs" "$work/deck-trimmed.glb" "$out/b24-flight-deck.glb"
node "$here/prep.mjs" "$work/aftdeck.glb" "$out/b24-aft-deck.glb"
node "$here/prep.mjs" "$work/nose.glb" "$out/b24-nose-compartment.glb"
node "$here/prep.mjs" "$work/waist.glb" "$out/b24-waist.glb"
node "$here/prep.mjs" "$work/top.glb" "$out/b24-top-turret.glb"
node "$here/prep.mjs" "$work/ball.glb" "$out/b24-ball-turret.glb"
node "$here/prep.mjs" "$work/tail.glb" "$out/b24-tail-turret.glb"
(cd "$out" && node verify-crew-compartments.js)
