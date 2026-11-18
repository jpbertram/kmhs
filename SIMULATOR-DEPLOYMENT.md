# Deploy the Battle Simulator from GitHub

The Webflow Maps page embeds the simulator in `km3d-v3-frame`. Its current custom script replaces the iframe source with the November 16, 2026 edition, which hides Crew Station. When promoting a new release, update the iframe source and remove that legacy override in Webflow.

## Build and stage

1. Review the changed files and commit them to a release branch of the private source repository.
2. Check out the intended commit in your static host or CI. Run `npm test`, then `node build-simulator.cjs dist` in a clean checkout. The output directory must be new.
3. Set the static host's publish directory to `dist` and stage it on HTTPS. The output includes the simulator, its local JavaScript dependencies, and an allowlist of runtime textures. The external aircraft models retain their existing CDN URLs.
4. Open the staged URL directly and embed it in a Webflow staging page. Check the viewport, playback, fullscreen, and the public visibility decision for Crew Station. Review any additional asset before adding it to the release allowlist. The archival sheet is blank in the public build.
5. Promote the staged URL in Webflow after review. Retain the previous iframe URL for rollback. Publish the Webflow page and open the public Maps page to verify the selected version.

Use a provider that can build from the private repo and serve an HTTPS static directory, for example Cloudflare Pages or a static host you already operate. GitHub Pages also works where your plan supports the repo's visibility and intended access. A plain GitHub file URL serves repository content and should not be used as the iframe source.

## Webflow embed

Keep the simulator's existing responsive container and fullscreen permission. Use the public release URL in the `src` attribute.

```html
<iframe
  id="km3d-v3-frame"
  src="https://sim.kasselmission.org/releases/RELEASE/"
  title="Kassel Mission historical 3D battle simulation"
  allow="fullscreen"
  allowfullscreen
  style="display:block;width:100%;height:min(1180px,96vh);min-height:720px;border:0"
></iframe>
```

If the host enforces embedding restrictions, allow framing by `https://www.kasselmission.org` and the Webflow staging host. Use an immutable release URL for a predictable cache and quick rollback.


## Esri imagery

Create a browser API key using the [Esri World Imagery app instructions](https://developers.arcgis.com/maplibre-gl-js/maps/raster-tile-basemaps/display-multiple-basemap-layers/). Grant the basemap privilege and restrict referrers to the origin that serves the simulator iframe and any staging origin. Set `KM_ESRI_BROWSER_KEY` in the host's build environment. The build writes the key to `dist/simulator-config.js`, so visitors can read it. Use a referrer-restricted browser key with minimal privileges. Keep the key out of Git.

The simulator requests imagery from Esri at viewing time and shows the service and data credits beside the viewport. Without a credential, or when the service rejects requests, the simulator uses the elevation mesh without satellite imagery. The release builder excludes the local mosaics, prepared imagery derivatives and archival flight record.

## Connect the existing Cloudflare Worker to GitHub

In Cloudflare, open **Workers & Pages → kassel-mission-simulator → Settings → Builds → Connect**. Authorize the Cloudflare GitHub app for `jpbertram/kmhs` and use these settings:

| Setting | Value |
| --- | --- |
| Production branch | `simulator-release` |
| Root directory | Repository root |
| Build command | `npm test && node build-simulator.cjs dist` |
| Deploy command | `npx wrangler deploy` |

Set `KM_ESRI_BROWSER_KEY` as a build variable if using imagery. Turn on preview builds for other branches if you want to review updates separately. A push to `simulator-release` publishes to the existing Worker after a successful build. The Worker name in `wrangler.jsonc` matches the existing Worker. Production can be rolled back from its **Deployments** tab.
