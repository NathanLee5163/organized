# Organized

**Tasks that stick to your day.**

Organized is an iPhone todo + calendar app built with [Expo](https://expo.dev/). It syncs both ways with **Google Calendar**: timed tasks become timed events, anytime tasks become all-day events, and your existing calendars show up as categories you can toggle on and off.

| | |
|---|---|
| **Platform** | iOS (primary), plus web for light UI work |
| **Stack** | Expo SDK 57 · Expo Router · React Native · TypeScript · SQLite |
| **Bundle ID** | `app.nathanlee.todocalendar` |
| **URL scheme** | `todocalendar` |

---

## Features

### Tasks & day planning
- **Runway (Today)** — week strip + timed timeline for the selected day
- **Month** — month grid with event dots; tap a day to see that day’s tasks
- **Loose (Anytime)** — untimed / all-day items for the selected day
- Create and edit title, date, time, duration (up to 23h 45m), and repeat rules
- Complete, delete, and offline-friendly edits with a local sync queue

### Google Calendar sync
- Bidirectional sync for the day (and whole-month prefetch when browsing months)
- **Timed task** ↔ timed Google event  
- **Anytime task** ↔ all-day Google event  
- Writes to a dedicated **Todo App** calendar by default (configurable)
- Reads from any calendars you enable as **categories**
- Optimistic UI: taps/updates feel instant; Google sync runs in the background

### Categories
- Each Google calendar (Family, shared calendars, Todo App, etc.) is a category
- Toggle categories from chips on Today / Anytime, or in **Deck → Google Calendar**
- Create or delete calendars from Settings (with confirmation) so it’s hard to do by accident

### App experience
- Multiple themes (minimal, coral, volt, ocean, sunset, lilac, rainbow)
- Local notifications for upcoming timed tasks + optional morning briefing
- Preferences: haptics, default duration, week start
- Dark, branded UI (Fraunces + Plus Jakarta)

---

## Screens

| Tab | In-app name | What it does |
|-----|-------------|--------------|
| Today | Runway | Timeline of timed tasks for the selected day |
| Calendar | Month | Month overview + day detail list |
| Anytime | Loose | Untimed tasks for the selected day |
| Settings | Deck | Themes, notifications, Google account, categories |

Supporting screens: **Edit task**, plus Settings drills for Customization, Notifications, Advanced, and Account / Google Calendar.

---

## Tech stack

- **Expo** `~57` + **Expo Router** (file-based navigation)
- **React Native** / **React 19**
- **TypeScript**
- **expo-sqlite** — local task cache (AsyncStorage fallback on web)
- **expo-auth-session** + **expo-secure-store** — Google OAuth + tokens
- **expo-notifications** — local reminders
- **EAS Build / Submit** — device builds and App Store delivery

---

## Project layout

```
app/                      Expo Router screens
  (tabs)/                 Runway, Month, Loose, Deck
  edit.tsx                Create / edit task
  settings/               Account, themes, notifications, advanced
src/
  auth/                   Google sign-in + token storage
  calendar/               Calendar API, sync, category context
  db/                     SQLite models + offline queue
  components/             UI (timeline, week strip, chips, settings rows)
  context/                Todo state (optimistic updates + sync)
  notifications/          Scheduling helpers
  preferences/            User prefs
  theme/                  Theme persistence
  utils/                  Dates, recurrence, helpers
constants/                Brand, colors, theme palettes
docs/SETUP.md             Google Cloud + Apple + EAS walkthrough
eas.json                  EAS build / submit profiles
app.config.ts             Expo config (bundle ID, plugins, OAuth scheme)
```

---

## Requirements

- Node.js 20+ recommended (see Expo / RN engine notes if npm warns)
- npm
- macOS + Xcode for iOS Simulator (optional)
- [Apple Developer](https://developer.apple.com/) account for device / TestFlight builds
- [Google Cloud](https://console.cloud.google.com/) project with Calendar API + OAuth clients
- Expo account + [EAS](https://expo.dev/eas) for cloud builds

---

## Quick start

```bash
git clone https://github.com/NathanLee5163/organized.git
cd organized
npm install
cp .env.example .env
```

Fill `.env` (see below), then:

```bash
npx expo start
```

- Press `i` for iOS Simulator, or scan the QR code  
- **Google sign-in does not work in Expo Go** — use a **development build** on a real iPhone (details below and in [docs/SETUP.md](docs/SETUP.md))

---

## Environment variables

Copy `.env.example` → `.env`:

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | iOS OAuth client ID (required for device login) |
| `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME` | Reversed client ID, e.g. `com.googleusercontent.apps.…` |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Optional; useful for some refresh / web flows |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Optional Android client |
| `EAS_PROJECT_ID` | EAS project UUID (also set in `app.config.ts` → `extra.eas.projectId`) |

Restart with a clean cache after changing env vars:

```bash
npx expo start -c
```

**Never commit `.env`.** It is gitignored. Only `.env.example` is in the repo.

---

## Google Calendar setup (summary)

Full step-by-step: **[docs/SETUP.md](docs/SETUP.md)**

1. Create a Google Cloud project and enable **Google Calendar API**
2. Configure the **OAuth consent screen** (Testing is fine for your own account)
3. Add yourself as a **Test user**
4. Create an **iOS** OAuth client with bundle ID `app.nathanlee.todocalendar`
5. Put the Client ID + reversed URL scheme in `.env`
6. Install a **development build**, open it (not Expo Go), connect Google from Deck

### Sync mapping

| In Organized | In Google Calendar |
|--------------|--------------------|
| Timed task | Timed event |
| Anytime task | All-day event |
| Complete / edit / delete | Updates or deletes the event |
| Enabled categories | Events imported into the app |

Conflict rule: last write wins using `updated` timestamps. Offline edits are queued and flushed on the next sync.

---

## Development build (required for Google login)

Expo Go uses an `exp://` redirect that Google rejects. Build a private install:

```bash
npx eas-cli login
npx eas build --platform ios --profile development
```

1. Install the build from the EAS link on your iPhone  
2. Trust the developer profile if iOS asks  
3. On your Mac (same Wi‑Fi):

```bash
npx expo start --dev-client
```

4. Open **Organized** / Todo Calendar on the phone and connect to Metro  
5. **Deck → Google Calendar → Connect Google**

If discovery fails on Wi‑Fi, try:

```bash
npx expo start --dev-client --tunnel
```

---

## Scripts

| Command | Purpose |
|---------|---------|
| `npm start` | Expo dev server |
| `npm run ios` | Open iOS Simulator |
| `npm run android` | Open Android |
| `npm run web` | Web (limited; SQLite path differs) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build:ios` | EAS production iOS build |
| `npm run submit:ios` | Submit latest build to App Store Connect |

Other useful commands:

```bash
npx eas build --platform ios --profile development   # device dev client
npx eas build --platform ios --profile preview       # internal preview
npx eas build --platform ios --profile production    # App Store binary
```

---

## EAS & App Store

- EAS project is linked in `app.config.ts` (`extra.eas.projectId`)
- Profiles live in `eas.json` (`development`, `preview`, `production`)
- Before production submit, set `submit.production.ios.ascAppId` to your App Store Connect app ID
- See [docs/SETUP.md](docs/SETUP.md) for Apple identifiers, TestFlight, and review checklist

---

## Privacy notes

- In-app policy: **Deck → Privacy** (also see [docs/SHIP.md](docs/SHIP.md))
- Google tokens are stored on-device (Secure Store on native)
- Calendar data is read/written only with the user’s OAuth consent
- While the Google OAuth app is in **Testing**, only listed test users can sign in
- For a public App Store release you’ll need a hosted privacy policy URL and Google’s verification for sensitive Calendar scopes

---

## Troubleshooting

| Problem | What to try |
|---------|-------------|
| Google “unverified app” | Normal in Testing — use Advanced → Continue; add your Gmail as a test user |
| `insufficient authentication scopes` | Add Calendar scope on the consent screen; revoke app access; sign in again |
| Events missing for a month | Open that month (Month tab) or that day — the app prefetches the visible month |
| Category toggle seems wrong | Toggle again or **Sync now** under Deck → Google Calendar |
| Dev client “searching for servers” | Start `npx expo start --dev-client`; same Wi‑Fi or `--tunnel` |
| Blank time pickers | Re-open the edit screen (known cold-open edge case was hardened) |

---

## License

Private project unless otherwise stated by the repository owner.

---

## Links

- Repo: [github.com/NathanLee5163/organized](https://github.com/NathanLee5163/organized)
- Setup guide: [docs/SETUP.md](docs/SETUP.md)
- Expo docs (SDK 57): [docs.expo.dev/versions/v57.0.0](https://docs.expo.dev/versions/v57.0.0/)
