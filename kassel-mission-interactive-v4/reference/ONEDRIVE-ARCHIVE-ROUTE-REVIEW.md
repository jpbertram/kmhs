# Local archive route review — started October 1, 2026

Verified accessible root: `/Users/jp/Library/Mobile Documents/com~apple~CloudDocs/OneDrive-2020-06-03/`. The project log's older `/Users/jpbertram/` root is not present on this host. Originals are preserved unchanged.

## Original report inspected

`Eighth Air Force/September 27 1944 Docs/445th BG/mission report.pdf`, PDF page 1, Air Commander's Teletype Report dated September 27: bombing run at Göttingen rather than Kassel, bombs on the western outskirts, and heavy Focke-Wulf attacks south of Göttingen. The visible attack interval reads 1003–1009. This does not match the simulation's approximately 1100 mission clock; determine time convention and corroborate against navigator logs before adjusting timing. The report does not supply exact attack coordinates on this page. Its right edge is clipped in places; do not complete clipped text by guesswork.

## Maps inspected

`Maps/Mission Maps/Kassel3 navigational error map (2).png` shows a clockwise post-bombing track toward Eisenach, but its heading says October 27, 1944 and the latitude labels appear inconsistent with labelled cities. Treat it as an unverified secondary schematic, not a georeferencing authority.

`Eighth Air Force/September 27 1944 Docs/Navigation/Mission routes email 4 possibly 445_ESCAPE_ROUTE.jpg` is a later Google Earth interpretation with actual/intended route annotations. Its filename itself carries uncertainty. The accompanying correspondence and navigator sources must establish which lines are claims, proposals or final conclusions.

## Located, not yet read

### Navigator review update

Lead Navigator's Report001.pdf page 1 was visually inspected in full: 0929 and 0941/0945 event entries, reported 22,900-ft target altitude, and return/base time 1256. Letter-coded fields need the reporting-form key before every value can be interpreted safely.

KM Flight Log001.pdf page 1 was visually inspected in full: the general-observation entry at 1003 records a fighter hit and the lead knocked out. The 0941½ row records bombs away and a group turn right. These are source-clock readings; the offset to the simulation's displayed local clock remains unestablished. Coordinates are navigational estimates, not guaranteed true positions.

Don Whitefield, Dep Lead Nav, log and replot of Kassel Mission001.pdf pages 1–6 were visually inspected. Page 2 explicitly describes multiple possible post-bombing interpretations. Page 6 rejects the 0957 radar fix and the 1003 dead-reckoning position as inaccurate. It estimates an attack area by reverse projection from later fixes (1016–1029½), using approximately 145 knots groundspeed and a 245-degree fix-line track. It also discusses wind estimates; do not silently turn those estimates into measured mission-wide weather. An apparent 1057 time in the prose conflicts with the surrounding chronology and must be checked against the accompanying map/log, not corrected silently.

This changes the next action: do not plot the 1003 logged coordinate as the true attack origin. Inspect the remaining replot overlays and final route correspondence, then reproduce the navigator's uncertainty-aware calculation.

Pages 7–10 have now been visually inspected in full. Page 7 distinguishes true COURSE from true HEADING and gives five dead-reckoning intervals; these are retained in `whitefield-route-segments.json`, including the rejected final interval's warning. Source speed/distance unit selection remains to be verified, rather than guessed from the log's printed MPH/K header. Page 8 describes subsequent return navigation. Page 9 is explicitly counterfactual (the deputy taking lead), not the flown route. Page 10 documents Pathfinder bomb-run control handoffs between pilot, radar operator and bombardier; it is useful crew-experience evidence, not a geometric schematic. Remaining overlay pages still need review.

All 12 pages of the Whitefield PDF have now been visually inspected. Page 11 is another counterfactual deputy-lead heading calculation, with time labels that need reconciliation; page 12 is the annotated map, showing both a DR-derived 1003 point and later fixes. It does not erase the author's explicit rejection of the DR point on page 6. No missing overlay should be assumed present in this PDF.

The native plain-text body streams of Tom Harrison's overview .msg and Mission Routes email 4.msg have been read using the installed OLE reader, preserving the originals. Harrison calls the analysis a continuing work in progress even while expressing high confidence. His explanation includes speculative radar-range settings and a proposed change to a briefed targeting parameter. Email 4 covers attachments 13–15 and the outgoing bomb/rally leg, ending with a promise of later material; it does not yet supply the complete escape/battle course. These are research interpretations, not contemporary flight fixes. Their claims must remain distinguished from the navigator's log and original report.

- Remaining pages/overlays of Navigation/Don Whitefield, Dep Lead Nav, log and replot of Kassel Mission001.pdf
- Navigation/Don Whitefield's Re-logging of the Kassel Mission.doc
- Navigation/Tom Harrison Mission Routes Overview explanatin - Tom Harrison - Final Routes Analysis ...........msg
- Maps/Germany/Crash Sites/Germans list of crash locations by plane001.pdf
- Maps/Germany/Crash Sites/Possible crash site order001.pdf
- Squadron-specific crew folders, including MACRs and crash records

## Crash-location compilation inspected

`Navigation/Mission Routes email 2.msg` native plain-text body has now been read. It distinguishes briefed (white) and proposed flown (red) tracks, uses Whitefield's 67-degree true heading / 77-degree ground course, and explicitly calls its departure-point inference an interpretation rather than an explanation of why the error occurred. Its speculative radionavigation/grid interpretation is not adopted as verified equipment behavior. Together with email 4, this correspondence still does not establish the complete post-hit escape track.

Both pages of `Maps/Germany/Crash Sites/Germans list of crash locations by plane001.pdf` were visually inspected. Page 2 identifies the compiler as Walter Hassenpflug. This is a later compilation (it uses DDR), not itself an original 1944 German report. It lists 25 losses, MACR numbers, aircraft serials, squadrons and locations. Its casualty totals must be reconciled with individual crew records; handwritten corrections/question marks are present.

Important constraints: Chilton is listed 1.8 km east of Friedlos; Hautman 2.5 km southeast of Bassenheim, annotated 11 km west of Koblenz; Bolin 1.8 km southeast of Krauthausen; Miner at Grebenau (Vogelsbergkreis); Pearson 1.8 km northeast of Herleshausen (Siegelshof); Reynolds 2.5 km east of Polch, annotated 18 km southwest of Koblenz. These do not establish airborne loss positions or descent headings, but constrain endpoints more specifically than generic town coordinates.

Page 2 also lists Golden 2.5 km northeast of Braunhausen; a questioned handwritten Meeks entry at Lauchröden; Bruland at Gießen (Am Schiffenberg); Bruce 750 m west of Richelsdorf; Hansen 1 km southwest of Richelsdorf; Carrow at Iba. Transcription is evidence, not permission to fabricate precise coordinates.

No route geometry or crash markers changed from these preliminary findings. Reconcile route, coordinate and clock conventions before fitting individual trajectories. A known endpoint alone cannot justify an invented reversal, spiral or bailout sequence.
