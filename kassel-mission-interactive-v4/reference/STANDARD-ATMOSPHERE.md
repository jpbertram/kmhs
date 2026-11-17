# Standard atmosphere baseline

`standard-atmosphere.js` implements only the 0–11,000 m geopotential-height layer of the US Standard Atmosphere 1976. It supplies SI temperature, pressure, density and sound speed for engineering comparisons. It is deliberately not connected to the compressed legacy mission coordinate system.

Source: NOAA/NASA/USAF, *US Standard Atmosphere 1976*, preserved as `original-manuals/US-Standard-Atmosphere-1976.pdf`. Printed pages 2–3 (PDF 18–19) give sea-level constants and the layer gradient; printed pages 6 and 8–9 (PDF 22 and 24–25) give the gas law, height/gravity relations and mean molecular weight. These pages were visually inspected. The pressure expression follows by integrating the printed hydrostatic equation with the linear temperature gradient.

The two entry points explicitly distinguish geopotential height from geometric mean-sea-level height. WGS84 ellipsoid altitude must first be converted using an appropriate geoid model. Pressure altitude is also a distinct input convention: do not silently substitute GPS altitude when interpreting a flight-test report.

This idealized steady-state atmosphere is not evidence of actual September 27, 1944 temperature, pressure, wind or turbulence. No wind is inferred. Out-of-domain inputs are rejected rather than extrapolated. No engine, propeller, stability, stall or damage coefficients are supplied by this model.

The numerical tests check reference constants, the hydrostatic derivative and height conversion. They do not compare against an independently transcribed published atmosphere table or certify any aircraft simulation.
