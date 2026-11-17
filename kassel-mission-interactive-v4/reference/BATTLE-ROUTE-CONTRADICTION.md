# Battle-route contradiction — unresolved

## Runtime correction, October 1, 2026

The prior misplaced southern leg described below has now been removed. The active route uses Whitefield's inferred 1003 region (10.0367 E, 50.9854 N), an estimated short 245-degree continuation and the corrected 1016 radar fix. The intermediate NE rally point and connecting curvature are explicitly illustrative. Event-cue arc mapping now anchors bomb release, attack onset and battle end to their geographic events; whole-route distance proportions no longer determine those positions. The actual runtime mapper passes geographic-anchor and 10,001-sample monotonicity checks. This does not validate exact headings, loss-site coordinates, aircraft-specific onset times, turns or aerodynamic dynamics. The original contradiction analysis below remains a record of the replaced geometry, not a description of the active route.

The current route is not a validated flown track. Its attack waypoint is 10.13 E, 50.53 N, although the adjacent code calls it near Eisenach. The subsequent westbound leg stays near 50.5 N, substantially south of the current local loss-site cluster. `audit-loss-geography.js` samples the current merged route at each roster loss cue: 18 of 25 German-loss endpoints project behind the route-centre forward direction. This excludes individual formation offsets; it is a diagnostic count, not proof of 18 historical reversals.

The quadratic loss curve begins with a forward control point and ends at the site. A site behind that control point therefore forces a reverse terminal horizontal tangent. Making the aircraft nose follow that tangent exposes the underlying geography contradiction rather than resolving it. A synthetic case using the actual loss sampler confirms forward motion becoming backward motion.

## Evidence inspected October 1, 2026

- Supplied build specification: describes the attack over Seulingswald between Bad Hersfeld and Eisenach, after the Göttingen bomb release and westward turn. This is a requirement/source summary, not independently established track coordinates.
- Municipality of Ludwigsau, account by Walter Hassenpflug: describes the return direction as prescribed south-southwest and the attack a few kilometres northwest of Eisenach. It supports rejecting the present southern attack waypoint, but does not specify the complete actual flown track or each aircraft heading. https://www.gemeinde-ludwigsau.de/fliegergedenkstaette/
- Society mission maps page: identifies the 445th field-order map as a planning document. The linked original map was downloaded and visually inspected. It depicts planned outbound/return routes and timing annotations; it must not be treated as proof of the post-error actual battle loop. https://www.kasselmission.org/mission/maps
- Original field-order map inspected: https://cdn.prod.website-files.com/642b4bd98014250aa392775f/658dd6ce5a05f359b118604b_Mission%2Bmap%2Bfrom%2B445th%2Bfield%2Border%2Bstraightened.png

## Required correction

Participant evidence now inspected: George Collar's Society overview describes a southward turn after Göttingen, followed by a right turn west in the vicinity of Eisenach, with the rear attack occurring as that turn was made. Paul Swofford's 2004 account places regrouping and setting an exit course before the attack. These accounts constrain the sequence, but neither provides numerical fixes for the present large eastern loop. Structured source statements and their limitations are retained in `battle-route-source-constraints.json`. Sources: https://www.kasselmission.org/mission/overview and https://www.kasselmission.org/written/paul-swofford

Reconcile the actual bombing/rally track and attack origin with dated mission reports, navigator/crew accounts and the crash-site map. Keep planned and actual routes separate. Establish evidence and uncertainty for each loss cue and crash coordinate. Recompute actual per-aircraft origins and compare heading/displacement, then check feasible descent durations and documented turns. Do not shift crash markers, silently infer attack origins backwards from endpoints, or claim that a smooth curve is aerodynamic validation.

The active geometry has not yet been replaced: a plausible-looking replacement without source constraints would conceal the contradiction rather than solve it.

## Reproduced reverse-projection calculation

`reconstruct-navigation.js` independently applies Whitefield page 6's 13-minute reverse projection at 145 knots along bearing 65 degrees. Full-resolution inspection corrected an initial transcription error: the 1016 log entry is read as 50°46′ N, **09°17′ E**, not 08°17′ E. Subsequent 1020 longitude 09°01′ and 1023 longitude 08°50′ corroborate the westward progression. The corrected projection yields approximately **50.9854 N, 10.0367 E**, consistent with an Eisenach-area attack rather than the runtime's 50.53 N waypoint. This is inferred from an estimated radar fix and retrospective track/speed, not an observed attack fix. The prior western estimate was a transcription artifact and must not be used as historical evidence. The calculation remains outside the runtime pending route/timing integration. Arithmetic tests verify a cardinal geodesic reference and independently recover travelled distance; they do not certify exact historical track or aerodynamic dynamics.
