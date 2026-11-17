# V4 iteration — 30 September 2026

This is a local successor to V3.1.3. It is an improved reconstruction, not a claim that every historical detail or physical quantity has been verified.

## Implemented

- A five-minute, single-play documentary timeline with continuous route velocity at phase boundaries. Clock cues follow the supplied specification: 08:00 departure, approximate 10:30 IP, 10:45 bombs, 11:00 attack, 11:06 rally, 12:30 return window.
- Battle playback expanded from roughly 19 seconds to the specified 75-second segment. The route progress slider now represents playback time and supports Home, End, and five-second arrow-key seeks.
- Crew cameras inherit the aircraft's bank, preserve seat-relative sightlines, and limit head movement to the specified 120 degrees yaw / 60 degrees pitch.
- Interior fitting uses the complete supplied aircraft's bounds rather than stretching the filtered interior. Legacy supplementary rooms are scaled to the supplied geometry. The supplied local GLB loads on demand with a visible loading/error state and retry.
- Wider crew-view field of view, reduced exposure, daylight departure, compact portraits, accessible phone station controls, and aircraft switching while seated.
- Fighter position/orientation comes from the pass tangent, eliminating the previous-frame dependence that could leave a fighter tail-first after a seek. Nose pitch has the correct sign. Late Mustangs intercept from high astern and maintain forward-pointing cover.
- Loss origins are sampled at the aircraft's loss time instead of the time the user seeks to. Named parachutes reconstruct after a seek, scale with the aircraft, and descend from their calculated release point.
- Waist captions use only waist-role records. Unspecified sides and multiple candidates are identified instead of presented as verified assignments.
- Donald Smith's role corrected from bombardier to pilot, supported by the supplied Cruel Sky OCR: The SMITH crew, page 125 / printed page 117. The stored middle initial H conflicts with the text's W at line 1098 and remains a data discrepancy to reconcile; it was not silently changed.
- Geography labels/crash-map markers stay in map views rather than obscuring immersive aircraft views. Rendering capped at 30 fps to leave headroom for controls.

## Evidence and remaining work

The governing build spec is included in `reference/`. Historical narrative evidence is the user's `Cruel Sky - full OCR text (for verification).txt` in the parent project folder. Existing model attribution and linked KMHS crew records remain in the runtime.

Release timestamps for each airman remain interpolated; the roster identifies survivors/outcomes, not exact bailout seconds. A named parachute is a reconstruction, not new historical evidence. Generic waist roles do not establish which side a man occupied. Multiple navigators on command aircraft likewise require individual assignment records.

The underlying scene uses compressed geographic altitude and model scale, and scripted loss curves. It is not an aerodynamic flight solver. The supplied interior and procedural supplementary surfaces still need further visual refinement and confirmation against B-24J station photographs. Aircraft breakup geometry, cloud-deck treatment, authentic instruments, takeoff/landing sequencing, individual emergency landing routes, and audio are not certified complete by this iteration.

No Webflow staging or production publication was performed for V4.

## Verification

Run `node verify.js`. It checks timing landmarks, 30,000 monotonic route/inverse samples, continuous phase velocity, clock cues, all 35 aircraft / 336 crew records, waist-role isolation, script parsing, and bundled assets.

Browser review confirmed 08:00 departure, 12:30 at the timeline endpoint, the peak-battle clock/caption, aircraft switching UI, pilot and radio captions, and zero captured console errors in the reviewed session. Desktop and phone layouts were inspected. Browser control experienced intermittent timeouts, so these checks are not a full animation or per-station historical signoff.
