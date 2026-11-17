# Formation turn scale defect — release blocker

The actual runtime `formPos` sampler was checked for all 35 aircraft between mission fractions 0.56 and 0.84. Finite-difference displacement was compared with each assigned nose heading. Nineteen aircraft have a negative forward dot product; several reach -1, proving exactly tail-first motion, not simply a camera illusion.

The sampler offsets each aircraft from the route along the route normal. In a planar constant-offset curve its forward derivative is proportional to `1 - lateralOffset * signedCurvature`. An inside offset larger than the local radius reverses this derivative. Runtime offsets reach 58.24 scene units, while the geographic turn is rendered on a much smaller scale. Checking only the lead curve's geographic radius therefore missed the defect.

The geographic renderer is not uniformly metric: longitude and Mercator latitude are separately fitted to authored scene anchors; terrain height uses another factor, with 1.55-fold vertical exaggeration. The formation's 0.28 lateral multiplier and the aircraft's 0.09 display scale do not establish metre-based separation. A realistic geographic turn alone cannot repair that mismatch.

Required correction: metre-based formation distances and aircraft dimensions, one consistent coordinate transform, and per-aircraft paths with positive forward velocity and appropriate turn-dependent speed/bank. Exact lateral/longitudinal distances still require source evidence; do not label guesses as measured formation spacing. Strategic readability should be handled by explicit map symbols, not by enlarging physical separation beyond a turn's radius.

Do not flip aircraft headings by 180 degrees, clamp inner aircraft in place, shrink only the inside box during a turn, or widen the historical track solely to hide this failure. These conceal or replace the intended flight behavior.

`verify.js` now includes the actual formation forward-motion audit and returns nonzero while this defect remains. Numerical continuity checks elsewhere are not release approval or aerodynamic validation. No runtime fix is claimed by this document.
