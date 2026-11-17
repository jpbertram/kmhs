# Airborne loss-smoke reconstruction

Airborne smoke for falling B-24s now occupies a separate 1,100-point pool. It is reconstructed from the previous 13 playback seconds of each aircraft's authored loss trajectory at fixed 0.35-second emission intervals. The same time and loss state produce the same positions after pause, seek or replay. No emission occurs before the loss event or after impact; existing airborne particles expire naturally. Scrub/reset clears the dedicated pool before reconstruction.

The smaller 1.2-scene-unit point size replaces the former 9-unit airborne-loss puffs without changing ground-column and other smoke effects. This is a visual tuning choice, not a measured smoke-plume diameter. Deterministic dispersion and rise remain illustrative; wind, buoyancy, combustion, engine-specific emission points, per-particle opacity and damage-source localization are not physically validated.

Tests cover repeated/pause/rewind sampling, no mutation of aircraft state, exclusion before damage, expiry after impact, complete 25-loss-aircraft pool capacity, timeline inversion and runtime integration. Full visual verification remains outstanding. The trail samples the authored path before the runtime's separate inter-aircraft clearance correction, so instantaneous corrected positions can still differ; resolving aircraft dynamics and collision avoidance remains necessary.
