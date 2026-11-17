# Time domains and remaining validation

The five-minute documentary playback compresses several hours of the mission. It must not be treated as elapsed physical time for an aerodynamic integrator.

- `secondsAt(route)` is documentary playback time (0–300 seconds).
- `missionSecondsAt(route)` is the approximate mission clock elapsed since 08:00, derived from supplied narrative cues. The attack interval is 11:00–11:06, or 360 seconds.
- `battleAt(route)` retains 0–420 legacy choreography coordinates so existing attack/loss cues are not silently moved. These are not physical seconds.
- `playbackAtBattleCue(cue)` inverts each legacy cue through the actual Hermite route mapping. Cues beyond 420 retain the legacy return continuation rate explicitly.
- Parachutist ages now use `ageSinceBattleCue`, not legacy cue differences divided by 5.6. This removes route-speed-dependent age and the competing return-phase clock calculation.

Verification checks cue inversion and age at 421 cue values across multiple elapsed intervals. The actual mission parachute update test now uses the real timeline API, including touchdown, rewind and replay after the return boundary.

Remaining: the aircraft loss paths and parachute speeds still use illustrative scene units. This change does not connect the SI flight-dynamics solver to the mission, establish aerodynamic coefficients, or validate individual crash durations. Exact historical times require source-specific uncertainty, rather than treating this approximate mission-clock interpolation as measured evidence.

Full browser verification was unavailable this turn: the open preview used a file URL rejected by browser security policy. No alternate browser route was used to circumvent that restriction.
