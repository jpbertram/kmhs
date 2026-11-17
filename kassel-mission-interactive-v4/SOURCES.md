# Full mission source register
M1 formation integration only; this register will expand with later milestones.

| Item | Classification | Value / evidence |
| --- | --- | --- |
| Formation relative topology | PUBLISHED | Existing `reference/FORMATION-ARCHIVE-RECONCILIATION.md`, Formations025.pdf printed p24; distances not established by diagram. |
| Horizontal slot scale | ESTIMATED | 4 m per existing diagram unit, reused from `turn-parameters.js`; not measured historical spacing. |
| Vertical slot scale | ESTIMATED | 30.48/14 m per diagram unit; nominal 100 ft box stagger, individual station spacing inferred. |
| Return spread | ESTIMATED | Existing 1 to 1.55 factor over mission fraction .92 to .96; presentation of stragglers, not recorded individual tracks. |
| Return longitudinal straggle | ESTIMATED | Up to 120 m, deterministic aircraft-identity hash; no historical individual displacement claim. |
| Nominal formation airspeed | ESTIMATED | Existing 105 m/s for curvature/bank calculation; not aircraft-specific performance validation. |
| Metre conversion | ESTIMATED | Local projection at latitude 51.4 deg, 111195 m/degree; vertical scale 7010/115 m/scene unit. Legacy terrain and aircraft display scaling remain nonuniform. |
| Formation derivative interval | ESTIMATED | Existing numerical difference 0.25 m in `formation-kinematics.js`; numerical method, not evidence of aircraft behavior. |
| Minimum numerical separation gate | ESTIMATED | Half published B-24 span, not a documented operational spacing rule. |
| B-24 wingspan | PUBLISHED | 110 ft, Society catalog linked in `turn-parameters.js`; production-block geometry not yet verified. |
| Gravity for bank estimate | PUBLISHED | Conventional standard gravity 9.80665 m/s², existing parameter register links NIST. |
| Full route and crash coordinates | ESTIMATED | Existing route, coordinate and timeline provenance in `reference/ONEDRIVE-ARCHIVE-ROUTE-REVIEW.md` and `reference/CRASH-COORDINATE-PROVENANCE.md`; not newly validated by formation gate. |

| Forward endpoint route | ESTIMATED | Initial circular arc and tangent approach, 2500 m radius, chosen shortest valid tangent candidate. Geometric method: https://lavalle.pl/planning/node821.html (forward bounded-curvature primitives); not evidence of a historical maneuver. |
| Route duration | ESTIMATED | Path length divided by aircraft's reconstructed entry velocity in legacy cue units; maintains initial horizontal momentum. It is not documented time-to-impact. |
| Descent profile | ESTIMATED | Cubic smoothstep from hit altitude to unchanged endpoint elevation; no damaged-aircraft glide-polar validation. |
| Roll transition length | ESTIMATED | 200 m at route arc boundaries, graphical roll smoothing, not a validated control model. |
| Curvature finite difference | ESTIMATED | 5 m interval to reduce cancellation at large map coordinates; convergence is checked against analytic circular paths. |

The actual mission now uses metre-based formation sampling and forward geometric endpoint approaches. This does not make departures, loss descent/damage mechanics, fighter paths, terrain scaling or aircraft models physically validated. No casualty, crash coordinate or historical loss event was changed. Reconstructed connecting turns must not be interpreted as eyewitness descriptions.

| Measured mesh map fit | ESTIMATED | Imported/procedural native bounding width is fit to catalog span using the local horizontal map metric. Mesh proportions are preserved; vertical terrain exaggeration is NOT an SI world-frame conversion. |
| Mustang map span | PUBLISHED | 37 ft, P-51D catalog: https://www.nationalmuseum.af.mil/Visit/Museum-Exhibits/Fact-Sheets/Display/Article/196263/north-american-p-51d-mustang/ — actual participating production variants remain unverified. |
| German fighter map spans | ESTIMATED | FW190 10.51 m and Bf109 9.92 m are reconstruction fit values pending variant-specific verification; not catalog claims established this session. |
| Return landing envelope | ESTIMATED | Smoothstep over route fractions .975–1; inferred pacing, not documented landing profiles. Uses actual rendered-mesh support depth and runtime terrain height if DEM is available. |
| Fallback ground height | ESTIMATED | Existing render-terrain minimum .6 scene units; not a surveyed Tibenham elevation. DEM-backed positions still require runtime verification. |
| Extended playback end | ESTIMATED | Full route ends at original 300 s cue, but remaining reconstructed loss/departure paths can keep running. Current maximum 2886.479 playback seconds is provisional and NOT a historical duration. UI and playback pacing still require review. |
| Initial loss/departure attitude | ESTIMATED | Preserves actual runtime entry velocity, pitch and bank. Vertical Hermite slope is from the authored route, not an independently documented damage response. |
