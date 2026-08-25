# GotCracked customer website deployment

Upload this package's extracted contents to the root of the `gotcracked-site` GitHub repository. Do not upload the ZIP itself.

Cloudflare Pages settings:

- Production branch: `main`
- Root directory: blank
- Build command: blank
- Output directory: `.`
- Custom domain: `gotcracked.co`

The `assets` folder is required. If the logo does not appear after deployment, confirm that GitHub contains `assets/gotcracked-mark.png`, then redeploy or purge the Cloudflare cache. The navigation has a text fallback, but the full hero artwork requires the supplied image.
