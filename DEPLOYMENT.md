# Deploy the customer-site refresh

Your Cloudflare Pages project deploys automatically from GitHub. Upload the contents of this folder to the root of the connected repository, preserving this structure:

```text
index.html
styles.css
app.js
assets/
  gotcracked-favicon.png
  gotcracked-mark.png
  gotcracked-portal-logo.png
```

Replace the existing `index.html`, `styles.css`, `app.js`, and the matching image files in `assets/`. Commit the changes to `main`; Cloudflare Pages will create the production deployment automatically.

The favicon is already linked in `index.html`. It is cache-busted with `?v=2`, so browsers should load the new icon after deployment.
