# Crew loss-camera reconstruction

The selected station now follows its own depicted airman's parachute as soon as that chute exists, rather than waiting until the aircraft disappears. Until then it follows the selected aircraft. Without a matching airman's chute, it retains the aircraft/impact target rather than substituting another crew member. Hidden chutes are excluded. Ordinary exterior chase remains aircraft-focused while the aircraft is visible.

Camera heading now uses the aircraft's quaternion-transformed +X nose rather than an Euler yaw component, which can change under combined bank and pitch. A near-vertical aircraft retains its previous horizontal heading to avoid undefined azimuth.

`verify-crew-loss-focus.js` tests identity-preserving selection and the airman/aircraft/impact branches. The primary verifier checks script loading order and runtime integration. These are logic checks, not visual proof of camera smoothness, clipping, individual bailout chronology or full battle correctness. Original generic waist-role assignments can remain uncertain; the focus module inherits that limitation. Full browser verification remains outstanding.
