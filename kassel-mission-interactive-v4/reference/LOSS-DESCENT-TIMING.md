# Loss descent timing (INFERRED)

No source in this package gives elapsed times for the falls. Miner's 1999
interview (see MINER-LOSS-EVIDENCE.md) gives order only: he held the burning
aircraft while the crew left, released the controls near 10,000 ft, and the
aircraft was spinning as he dropped clear through the nose-wheel opening.

Previously each loss route (fixed start, documented crash site) was flown at
the formation's cruise ground speed, so Miner's ~44.5 km route took about
10.3 sim minutes, and at the attack's quarter pace about three minutes on
screen.

Runtime rule (inferred, not measured): ships whose loss is a fall, fire,
explosion, break-up or spin travel the same route at an average ground speed
of 125 m/s (about 280 mph), a steep burning descent for a B-24. Routes that
were already faster than that are unchanged. Ships flown under control to a
bailout or belly landing keep cruise speed: Golden, Bruland, Fromm,
Reynolds and Hautman. Crash sites and routes are unchanged.

Resulting sim durations (cue x 6/7 s): Miner 10.3 -> 5.9 min (about
3,700 ft/min average from ~22,000 ft, with the spin at the end), Jones
9.6 -> 5.0, Potts 9.3 -> 3.9, Bolin 8.1 -> 4.0, Pearson 7.1 -> 3.2, and
smaller cuts elsewhere.

Presentation: while the chase or crew camera follows a ship that is going
down, the attack's quarter pace is skipped, so Miner's fall plays in about
35 seconds at 1x (was about 3 minutes).

## Sink-rate floor and fall-out stage (2026-11-19, INFERRED)

The 125 m/s ground-speed cap made ships whose wrecks lie close under the
fight fall unrealistically fast (Bonnie Vee covered 23,000 ft in about 33 s).
Each loss now also takes at least its height divided by an average sink rate:
75 m/s for spins, tumbles, explosions and break-ups, 40 m/s for burning
glides, wing fires and controlled descents. Bonnie Vee now takes about
1.6 sim minutes, Hansen 1.5, Seeds 2.0; Miner is unchanged at 5.9.

Every fall now starts with a fall-out stage (loss-trajectory.js, ONSET):
about 3% of the height is lost while ground speed eases to 80% of the
formation's and the ship slides back and out, before it falls off on a wing
into its dive, spin or documented break-up. Shares are estimates from the
order of events in the crew accounts, not timings. Bailouts are spread from
mid-onset to just before any documented explosion or break-up (or to 72% of
the fall, 62% for controlled bailouts).
