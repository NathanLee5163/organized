# Setup: Google Cloud, Apple Developer, and App Store

This guide gets **Todo Calendar** running on an iPhone and ready for TestFlight / App Store.

Bundle ID: `app.nathanlee.todocalendar`  
URL scheme: `todocalendar`

---

## 1. Google Cloud project (required for Calendar sync)

### Create the project

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g. `Todo Calendar`).
3. Select that project.

### Enable the Calendar API

1. Go to **APIs & Services → Library**.
2. Search for **Google Calendar API**.
3. Click **Enable**.

### OAuth consent screen

1. Go to **APIs & Services → OAuth consent screen**.
2. Choose **External** (unless you have a Google Workspace org).
3. App name: `Todo Calendar`.
4. Support email: your email.
5. Add scopes:
   - `.../auth/calendar`
   - `.../auth/userinfo.email`
   - `openid`
6. Under **Test users**, add the Gmail accounts that will sign in while the app is in Testing mode.
7. Save.

### Create OAuth clients

Go to **APIs & Services → Credentials → Create credentials → OAuth client ID**.

**iOS client (required for device / TestFlight / App Store)**

- Application type: **iOS**
- Bundle ID: `app.nathanlee.todocalendar`
- Copy the **Client ID**
- Also note the **iOS URL scheme** (reversed client ID), like `com.googleusercontent.apps.123456789-abc`

**Web client (recommended for Expo Go / token refresh)**

- Application type: **Web application**
- Authorized redirect URIs: add the URI printed by Expo when you run the app, and typically:
  - `https://auth.expo.io/@YOUR_EXPO_USERNAME/todo-calendar`
  - For local: Expo’s `makeRedirectUri` value (often `todocalendar://` or an `exp://` URL)
- Copy the **Client ID**

### Configure the app

```bash
cp .env.example .env
```

Fill in:

```env
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=....apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=....apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME=com.googleusercontent.apps.YOUR_PREFIX
```

Restart Expo after changing env vars (`npx expo start -c`).

### Sign in in the app

**Do not use Expo Go for Google sign-in.** Google rejects Expo Go’s `exp://` redirect (`Error 400: invalid_request` / “doesn’t comply with OAuth 2.0 policy”).

Use a **development build** (your own app install) with the **iOS** OAuth client:

```bash
npx expo install expo-dev-client
npx eas build --platform ios --profile development
```

Install the build on the simulator (or change `eas.json` → `development.ios.simulator` to `false` for a physical iPhone). Then:

```bash
npx expo start --dev-client
```

1. Open the **Todo Calendar** app (not Expo Go).
2. **Deck (Settings)** → **Connect Google**.
3. Approve Calendar access.
4. Pull to refresh on **Runway** — events sync; new tasks write to the **Todo App** calendar.

Your Gmail must be listed under OAuth consent screen → **Test users** while the app is in Testing.

A **Web** OAuth client is optional. You only need it if you want browser/Expo Go experiments later — not for shipping on iPhone.

---

## 2. Apple Developer account

1. Enroll at [developer.apple.com/programs](https://developer.apple.com/programs/) ($99/year).
2. After enrollment is active, sign in to [App Store Connect](https://appstoreconnect.apple.com/).
3. Create a new app:
   - Name: Todo Calendar
   - Bundle ID: register `app.nathanlee.todocalendar` under Certificates, Identifiers & Profiles if needed
   - SKU: e.g. `todocalendar1`
4. Note the **App Store Connect App ID** (numeric) for `eas.json` → `submit.production.ios.ascAppId`.

---

## 3. EAS Build & TestFlight

### One-time EAS setup

```bash
npm install
npx eas-cli login
npx eas init
```

Copy the project ID into `.env` as `EAS_PROJECT_ID` (and into `app.config.ts` extra if prompted).

### Build for iOS

Development / simulator:

```bash
npx eas build --platform ios --profile development
```

Internal preview (device):

```bash
npx eas build --platform ios --profile preview
```

Production (App Store):

```bash
npx eas build --platform ios --profile production
```

### Submit to App Store Connect

```bash
npx eas submit --platform ios --profile production
```

Or upload the `.ipa` from the EAS build page. Then add the build to **TestFlight** and invite testers.

---

## 4. App Store review checklist

- Privacy Policy URL (required for Calendar / account data). Host a simple page explaining that calendar data is sent to Google on the user’s behalf and tokens stay on device.
- App Privacy nutrition labels in App Store Connect (Calendar, Contact Info/Email if collected).
- Screenshots for 6.7" and 6.1" iPhones.
- Demo account: if reviewers cannot use their own Google account easily, provide a test Google user that is listed under OAuth test users.
- Complete OAuth verification with Google before wide production release (while in Testing, only listed test users can sign in).

---

## 5. Local development without a store build

```bash
npm install
cp .env.example .env   # add client IDs
npx expo start
```

- Press `i` for iOS Simulator, or scan the QR code with Expo Go.
- **Note:** Google iOS OAuth with a custom bundle ID works best in a **dev client** / EAS build. Expo Go may require the **Web client ID** and limited redirect support. Prefer `eas build --profile development` for reliable Google sign-in on device.

---

## Sync behavior (reference)

| App | Google Calendar |
|-----|-----------------|
| Timed task | Timed event |
| Anytime task | All-day event |
| Complete / edit / delete | Updates or deletes the event |
| Events on selected calendars | Appear under Schedule or Anytime |

Conflict rule: last write wins using `updated` timestamps. Offline edits are queued in SQLite and flushed on the next sync.
