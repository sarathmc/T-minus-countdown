# Handshake Frontend Deployment

No hosting credentials or deployment authorization are configured in this environment. The public submission URL remains a placeholder in `docs/HANDSHAKE_SUBMISSION.md`.

## Recommended provider: Cloudflare Pages

Cloudflare Pages is suitable for this guest-first static PWA: HTTPS is included, SPA fallback is supported, and the free tier is generally sufficient for a competition demo. Provider quotas and pricing can change.

Create a Pages project connected to the repository with:

| Setting | Value |
|---|---|
| Build command | `npm ci && npm run build` |
| Output directory | `dist/t-minus-ng/browser` |
| Node version | 20 or newer |
| Runtime secrets | None required for guest mode |

Add the existing domain in Pages and update its DNS as instructed by Cloudflare. Do not add `DATABASE_URL`, `VAPID_PRIVATE_KEY`, Supabase service-role keys, or JWT secrets to Pages variables. The default `public/config.js` intentionally has empty cloud settings and preserves guest mode.

## Netlify alternative

Use:

- Build command: `npm ci && npm run build`
- Publish directory: `dist/t-minus-ng/browser`

`public/_redirects` supplies `/* /index.html 200` for SPA deep links. `public/_headers` supplies revalidation for `index.html`, `config.js`, and service-worker files while allowing immutable caching for hashed assets.

## Manual verification after deployment

Replace `<PUBLIC_URL>` with the actual provider URL:

```powershell
$url = '<PUBLIC_URL>'
Invoke-WebRequest "$url/"
Invoke-WebRequest "$url/countdowns/new"
Invoke-WebRequest "$url/wallpaper-studio"
Invoke-WebRequest "$url/ngsw-worker.js"
Invoke-WebRequest "$url/manifest.webmanifest"
```

In a real browser:

1. Open `/` over HTTPS.
2. Create a countdown as a guest.
3. Refresh and confirm IndexedDB persistence.
4. Open `/countdowns/<id>` and `/wallpaper-studio/<id>` directly, then refresh.
5. Export mobile and desktop PNG wallpapers.
6. Confirm the service worker registers in DevTools.
7. Confirm `config.js` contains no private or database credentials.

The backend is intentionally not required for this demo. Cloud synchronization and server push should remain disabled/empty until separately deployed and verified.

## Current status

- Production build: locally verified.
- Guest workflows, wallpaper export, accessibility, and Chromium E2E: locally verified.
- Public HTTPS URL: **not available**.
- Provider deployment, DNS, HTTPS certificate, deep-link refresh, service-worker registration, and public-browser behavior: **not verified**.
