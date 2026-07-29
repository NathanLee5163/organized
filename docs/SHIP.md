# Ship checklist

Use this before TestFlight / App Store.

## Product checks (done in app)

- [x] Recurring tasks: **This day** vs **Entire series** on save and delete (EXDATE sync to Google)
- [x] Search by title (Runway → Search)
- [x] Clearer empty states + sync / sign-in strip
- [x] Mock seed todos only in `__DEV__` (empty DB)
- [x] In-app Privacy screen (Deck → Privacy)

## Before you submit

1. Host a public **Privacy Policy URL** (can mirror `app/settings/privacy.tsx`) and set it in App Store Connect + Google Cloud OAuth consent screen.
2. App Privacy nutrition labels: Calendar, User ID / Email if collected via Google Sign-In.
3. OAuth: move Google project toward **production** verification for Calendar scopes (or keep Testing + listed reviewers as test users).
4. `eas.json` → `submit.production.ios.ascAppId` set to your App Store Connect app ID.
5. Screenshots for 6.7" and 6.1"; demo Google account for review if needed.
6. Production build: `eas build --profile production --platform ios` then TestFlight.

## Smoke test on a device build

- Sign in → create timed + anytime + weekly task → appear in Google Calendar.
- Edit **this day** of a weekly task → that day changes; other days keep old title.
- Delete **this day** → day gone in app + EXDATE on Google; series continues.
- Delete **entire series** → gone both places.
- Search finds a task by title.
- Sign out / airplane: local edits queue; reconnect syncs.
- Category chips filter lists and month dots.
