# Loss-path consistency — 1 October 2026

The runtime now shares one authored trajectory sampler between loss position, attitude and bailout launch origin. Previously loss attitude differentiated only the underlying Bezier, ignoring lateral escape and spiral displacement. Bailout launch likewise omitted spiral and vertical airframe displacement. The normalized +X aircraft nose now follows the complete authored tangent with bank applied about that axis.

Tests exercise 24,975 poses across all 25 current loss profiles with real Three.js quaternion transformations. They verify forward-axis alignment, finite positions, reproducible sampling, formation-start and crash-site endpoints. An existing delayed-spin radius did not vanish at impact; it now tapers to zero. Vertical flutter also vanishes at both endpoints.

These tests do not validate aerodynamic forces, documentary crash paths, damage-induced angular motion, or exact crash geography. A freely tumbling wreck is not constrained to align its nose with velocity in real physics. The remaining choreography needs replacement by a source-constrained six-degree-of-freedom model before that behavior can be claimed. Existing inter-aircraft avoidance still modifies positions after trajectory sampling; its correction is not represented by the sampler tangent and remains a separate reconstruction problem.

Individual exits still receive the existing hashed separation after launch. Exit-opening coordinates and station-specific departure motions remain unfinished; a shared aircraft origin is not an exact hatch model. No visual battle verification was performed this turn because browser access to the open local-file preview was prohibited.
