# Delivery roadmap

## Phase 0.1 — Local-first PWA (implemented)
- [x] Multiple countdowns
- [x] Live countdown timer
- [x] T-minus preset milestones
- [x] Milestone completion checklist
- [x] Custom milestones
- [x] Three wallpaper themes and PNG export
- [x] PWA manifest and service worker shell cache

## Phase 0.2 — Quality and portability
- [ ] Add edit countdown and edit/delete custom milestone flows
- [ ] Add JSON export/import backup
- [ ] Add accessible confirmation dialogs and keyboard review
- [ ] Add automated unit tests for date boundaries / daylight-saving transitions
- [ ] Add automated browser tests and Lighthouse audit

## Phase 1 — Accounts and cloud sync
- [ ] Create Supabase project and configure Auth
- [ ] Apply `supabase/schema.sql`
- [ ] Implement repository interface and Supabase adapter
- [ ] Add sign-in, sign-out, account deletion and sync conflict handling
- [ ] Add migration/import from local storage

## Phase 2 — Reminders and sharing
- [ ] In-app reminder preferences and notification permission flow
- [ ] Web Push subscription endpoint
- [ ] Scheduled server-side reminders (required for reliable closed-app delivery)
- [ ] Shareable read-only countdown page with explicit privacy controls

## Phase 3 — AI-assisted planning and richer design
- [ ] Conversational plan generation with user-confirmed milestones
- [ ] Reference-image guided wallpaper design
- [ ] More wallpaper layouts and typography controls
- [ ] Calendar export / integration
