# Continuing reconstruction audit

The complete museum-grade / schematic-exact / empirically validated aerodynamic goal remains open. These are incremental engineering findings, not acceptance of the experience.

## Supplied interior

`audit-supplied-interior.js` reads the supplied GLB without modifying it, evaluates every interior position vertex through its scene hierarchy, and writes `reference/supplied-interior-geometry-audit.json`. The report records the source SHA-256, named parts, material identities and native bounds. It found 217 interior meshes, including cockpit equipment, radio equipment, gun assemblies and twelve modeled bombs. Node counts and mesh counts are not interchangeable.

The detail-template filter **does retain** the named `cockpit` under `interior`. The more important current defect is the early return in `V2.attachInterior`: the reconstructed station room bypasses lazy loading and attachment of the supplied GLB altogether. The generic rooms therefore cannot honestly be described as the supplied interior rebuilt. Reconnecting parts without aligning the room, equipment and camera would create another incorrect layered interior; that is not an acceptable fix.

The original asset's static `instrument-dials` are identifiable individual gauge-face meshes. They should be distinguished from the rejected legacy full-room photograph walls. Their correctness, arrangement and instrumentation variant still require original references. The original exterior's instrument-animation node names do not by themselves establish which meshes can safely be retained inside a camera-clear cabin.

Native source cockpit landmarks include pilot cushion center `[-0.5,-0.22,3.6]`, instrument-panel center `[0,-0.02,4.4]`, navigator table `[-0.42,-0.5,5.2]`, and radio table `[-0.6,-0.32,1.05]`. These are **asset coordinates**, not factory dimensions. Each must use the same full-airframe transformation as its exterior, not a compartment-specific normalization.

## Restored navigation

`crew-navigation.js` provides left/right navigation over all eleven available station views, up/down aircraft selection using the actual picker IDs, and Escape to overview. Lost aircraft remain in the cycle so their selected crew can still be inspected. Native buttons, editable fields, the timeline, dropdowns and modified shortcuts retain their own keys. `verify-crew-navigation.js` checks those boundaries and wraparound.

## Fighter asset check

The disabled imported Bf 109 asset identifies itself as GRIP420's **BF 109 F-2 Messerschmitt**, CC-BY-4.0. It contains `Grounded` and `FakeFly` animations, a skinned body and gear bones. Simply deleting a failing animation or re-enabling it would not establish a correctly posed in-flight mesh or a historically appropriate mission subtype. It remains excluded pending pose, variant and visual verification; the existing G-family dimensional proxy is not certified either.

## Open engineering source search

The NASA research-authorization finding aid was found through search, but the direct document download returned HTTP 403. No inertia tensor or stability derivative has been extracted from it. Existing B-24G measured benchmarks and the tested rigid-body integrator are separate pieces of evidence, not a B-24J flight-model validation. The mission still uses reconstructed animation paths rather than the validated aircraft-specific aerodynamic solver required for final acceptance.

## Direct source-model inspection

`supplied-interior-review.html` loads the original GLB and displays only its named interior branch, preserving mesh materials and gauge-face textures. It does not attach photo walls or replacement equipment. It uses on-demand rendering to avoid a perpetual background graphics loop.

Direct inspection and the geometry audit show the source pilot seat back at native Z 3.80, ahead of its cushion at Z 3.60, although +Z is the nose. A camera above the cushion looks through the misplaced backrest. The source top-turret center at Z -3.15 is also well aft of the source cockpit. These source landmarks are reasons to correct/rebuild equipment placement, not to accept the supplied model as schematic evidence. The inspection camera heights remain estimates.

## Airman and parachute articulation

`parachute-geometry.js` is shared by the mission and `parachute-review.html`. It requires the reconstructed airman rather than silently inserting the rejected spherical figure. The figure has a CC0 anatomical head, shaped boots and collar, distinct curled glove fingers/thumbs and harness details. It is still a generic reconstruction, not an individual's likeness or a verified uniform/parachute issue.

Static figure geometry is batched into five material meshes; canopy and line geometry add three draws. Twenty-four separate seam draws have become one line batch. Higher detail does not require dozens of rendering calls per person.

`parachute-pose.js` isolates opening/collapse transforms to the canopy rig. The previous whole-group Y scaling compressed the airman's body along with the cloth. Landing height now incorporates the modeled foot offset and removes the old four-unit terrain padding. The test executes the actual mission template/spawn/update functions, checks constant figure and root scale through deployment/landing/rewind, tests feet on sampled flat terrain, checks that collapsed rig bounds do not go below it, and verifies rewind restores the canopy.

Remaining parachute gates include a rigged landing body pose, documented equipment variants, canopy dimensions/porosity and deployment dynamics, actual wind, physically integrated fall/drag, terrain intersection along the full trajectory, and crew-specific documented exit positions/timing. These geometric corrections do not validate parachute aerodynamics or individual bailout histories.

The simplified settled-cloth pose places the rig beside the figure to avoid passing fabric through his legs. Its lateral displacement is an explicit visual estimate, not historical wind evidence or simulated fluid dynamics. The production and review scripts use versioned URLs for revised geometry/pose/runtime assets: browser inspection had continued showing the old cube-shaped boots even though a direct server read matched the new source. Versioned loading visibly delivered the revised boots and collar. Full mission browser verification remains pending after repeated local preview timeouts; no JavaScript errors were captured during that check.
