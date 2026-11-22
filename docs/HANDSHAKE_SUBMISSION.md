# Handshake AI Skills Studio Submission

## Project title

**T-Minus Countdown — Your Deadline, Your Design**

## Project description

T-Minus Countdown turns a deadline into a calm, actionable lock-screen plan. Create a countdown as a guest, get automatically planned milestones, mark progress as you go, then customize and export a readable wallpaper for mobile or desktop. The app is local-first, so the core experience works without registration or cloud credentials.

## Cover image

Use the actual generated application export:

`docs/assets/t-minus-launch-day-mobile.png`

Dimensions: **1080 × 1920 PNG**. The sample uses a distinctive gradient treatment, large high-contrast countdown typography, and centered content with top safe space for the phone clock and status icons.

## Project URL

`<PUBLIC_HTTPS_URL_TO_BE_FILLED_AFTER_HOSTING>`

The URL is intentionally a placeholder until a public HTTPS host is provisioned and tested.

## Optional source link

`<PUBLIC_SOURCE_REPOSITORY_URL>`

## Demonstration script

1. Open the public URL as a guest.
2. Choose **Create a countdown** and enter “Launch Day”, a future date, timezone, and category.
3. Open the countdown detail page and point out the generated T-60/T-30/T-14/T-7/T-0 planning milestones.
4. Add a custom milestone such as “Book venue”, then mark it complete to show the progress indicator.
5. Open **Wallpaper Studio** from the navigation or countdown detail.
6. Choose **Gradient focus**, switch between mobile and desktop formats, and adjust alignment or colors.
7. Show the live preview and the clock-safe upper whitespace.
8. Download the PNG and show that it is immediately usable as a phone lock-screen image.
9. Refresh the page to demonstrate local persistence; mention that account/cloud synchronization is optional and not required for the core demo.

## Verified versus unverified

Verified locally: guest creation, editing, deletion, IndexedDB persistence, milestones, wallpaper export, mobile/desktop dimensions, Chromium E2E flows, axe accessibility checks, and production build.

Unverified: public hosting, DNS/HTTPS, live Supabase authentication/RLS, cloud synchronization, browser-closed push notifications, and real deployment infrastructure.
