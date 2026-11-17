GOAL: Finish the complete B-24 mission reconstruction (mission-reconstruction.html) to the highest historical accuracy and visual fidelity the available evidence allows. This is the whole project, not a demo. Work autonomously. Do not stop to ask me about data gaps, and do not mark the goal complete until every milestone below passes its checks. A finished milestone is not a finished goal. After each one, update PROGRESS.md and start the next.

STANDING DECISIONS (already approved, do not ask again)
1. Where measurements or records are missing, research published sources first (manuals, museum and archive documentation, mission reports, crew accounts, reputable aviation histories). If gaps remain, use clearly labeled reconstruction estimates. Tag every dimension, parameter and event as DOCUMENTED, PUBLISHED or ESTIMATED, with the source or reasoning, in a SOURCES register. Never present an estimate as documented. Never invent a crew member's fate, a loss sequence or a coordinate.
2. Aerodynamic accuracy means aircraft-specific parameters (mass, wing area, thrust or power, speeds, turn and climb performance) from published figures, compared against documented performance. Anything not backed by data is labeled ESTIMATED and stated plainly in the README. Missing flight-test data is never a reason to stop.
3. The corrected formation model must be integrated into the full battle and become the default experience. Do not build isolated demos.

MILESTONES (in this order, each with its own acceptance checks)

M1. Integrate the corrected flight model into the full mission.
Checks: zero reversing or backward-moving aircraft across the whole mission over 20 or more seeded runs. Crash coordinates constrain a plausible trajectory and never pull an aircraft backward toward a marker. No heading discontinuities. Minimum separation maintained until a documented collision or loss.

M2. Natural formation motion. The current turn is too stiff.
Build it the way real formations behave: the leader rolls in first, and each wingman rolls in with a delay that cascades with distance from the leader. Inside aircraft slow and outer aircraft speed up within real limits. Add small independent throttle and position corrections, a slight accordion effect through the turn, gentle turbulence and wingman bank anticipation. Keep the separation and no-reversal checks passing.
Checks: per-aircraft bank and heading traces show staggered, smooth roll-in and roll-out. Slot error varies naturally but stays within a stated tolerance. Side-by-side video capture against reference footage or descriptions of real B-24 formation turns.

M3. One fully verified vertical slice.
One B-24 variant: accurate exterior (silhouette, wings, nacelles, turrets, props, markings, materials, damage geometry checked against references), complete crew-station interior built on documented dimensions (all stations, correct eyelines, window visibility, turret positions, equipment), and one documented loss sequence including individual treatment of each crew member's documented escape circumstances, running inside the full battle.
Checks: reference comparison images saved for every exterior view. Interior dimension table with sources. Crew station audit. A recorded playback of the loss sequence.

M4. Extend the slice across the whole formation and battle.
Variant-specific exteriors for every aircraft and type present, fighter approaches, late escort arrival, attack position and each aircraft's loss sequence reconciled against the records. No generic aircraft standing in for identifiable types.
Checks: per-aircraft record sheet linking each element to its source and its DOCUMENTED or ESTIMATED label. Timeline reconciliation table.

M5. Effects and final quality.
Historically appropriate parachute equipment and human animation (opening, descent, landing). Convincing fire, smoke and breakup. Full mission playback at 30 fps or better on a mid-range laptop.
Checks: performance log, full mission capture, a visual review pass with before and after screenshots.

M6. Expert review package.
Produce a REVIEW.md listing every ESTIMATED item, every open question, and the sources, so a historian or technical expert can audit it quickly.

PROCESS RULES
- Maintain PROGRESS.md with each milestone's status, the check results (real output, not summaries) and anything blocked.
- Write checks first, show them failing, fix, rerun until they pass.
- Report failures plainly. Never claim a milestone or the goal is complete on partial results. If something cannot be done to the standard, say what is missing and mark it, then move on to the next milestone.
- Only stop when all six milestones are complete, or when the remaining work is blocked solely by evidence that cannot be found, in which case list exactly what that evidence is.

**TOKEN AND QUOTA DISCIPLINE (applies to everything above)**
Usage limits are scarce. Treat tokens as a budget and spend them where they change the result.

1. Session scope: I will tell you at the start of each session which milestone(s) to work on. Do only those, then stop at a clean checkpoint. You cannot see my quota, so do not try to guess it. When a milestone is done, update PROGRESS.md and stop, and do not roll into the next milestone unless I say so.
2. PROGRESS.md is your memory. Keep it under 60 lines: milestone status, last passing check results, the next three concrete steps, and open blockers. At the start of a session read only PROGRESS.md and the files you are about to change. Do not reread the whole project.
3. Cheapest check first: numeric tests, logs and headless assertions before screenshots or video. Capture visuals only at milestone checkpoints, not per tweak.
4. Terse output: test runs print a one-line summary plus failures only. Status reports to me are 10 lines or fewer. No restating the plan, no recaps of what the code does.
5. Edit, do not regenerate: patch the specific functions. Never rewrite a large file to change a small part. Use search to find code instead of opening whole files.
6. Research once: gather sources into the SOURCES register the first time, then reuse it. Do not re-search a settled fact.
7. Build once, parameterize: make the verified B-24 exterior, interior and loss-sequence code data-driven (variant tables, crew tables, loss event tables) so M4 is filling in data, not hand-building each aircraft again.
8. Cap debug loops: if the same problem survives 3 attempts, write the findings into PROGRESS.md, mark it blocked, and move on or ask me one specific question. No open-ended thrashing.
9. Do not ask permission, reopen decisions or present options when a standing decision already covers it. Questions cost tokens.
10. Priority if budget is tight: M1, then M2, then M3 on the single slice. Polish (M5) comes last and is the first thing cut.