# Terrain contact reconstruction — 1 October 2026

The deterministic mission branch previously clamped parachutists to elevation sampled at launch and continued moving them sideways after contact. It now searches the illustrative descent trajectory for the first terrain intersection, incorporates the figure's foot offset, and fixes the world-space touchdown position. Rewind restores the airborne path; replay returns to the same contact. A late-loaded DEM invalidates the cached intersection.

Tests include flat, rising and undulating surfaces, and execute the actual mission spawn/update functions over a rising surface. They check foot-to-terrain contact, absence of post-contact sliding and reversible replay. The contact scan uses quarter-second intervals with bracket refinement; terrain features narrower than an interval can be missed. This is not continuous collision detection for arbitrary geometry.

Remaining: documented aircraft openings and exit geometry, exact individual sequence, freefall posture and deployment, evidence-backed canopy model and wind, credible landed poses, SI scene integration. Existing descent speed and sway remain illustrative scene-unit animations, not validated aerodynamic simulation. The legacy non-timeline fade branch is not covered by this change. Browser battle-view verification remains outstanding.
