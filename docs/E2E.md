# Browser end-to-end testing

Playwright runs deterministic Chromium tests from `e2e/` against the Angular development server. Each test uses an isolated browser context and clears `localStorage`, `sessionStorage`, and the application IndexedDB database before use.

```powershell
npm install
npx playwright install chromium
npm run e2e
npm run e2e:report
```

The configuration records HTML reports, failure screenshots, videos, and traces. CI runs with one worker and retries failures; local runs reuse an existing Angular server when available.

Coverage includes:

- Guest countdown creation, editing, deletion, reload persistence, validation, pause, resume, and archive.
- Milestone creation, completion, reopening, and progress updates.
- Wallpaper Studio lazy route, template/format changes, PNG export, signature, and dimensions.
- Reminder creation, update, deletion, IndexedDB persistence, and unsupported Notification API behavior.
- Mocked authentication, guest migration queueing, HTTP 409 conflict retrieval, and conflict parking.
- Accessible names and keyboard focus for the account form.

The suite does not verify live Supabase, PostgreSQL/RLS, real push delivery, browser-closed notifications, or production service-worker cache behavior. Those require dedicated infrastructure and a production-built PWA environment. Automated accessibility checks are smoke checks, not a replacement for manual screen-reader or WCAG review.
