# Todo Calendar

iPhone todo app built with **Expo** that syncs both ways with **Google Calendar**.

- **Schedule** — timed tasks ↔ timed calendar events  
- **Anytime** — untimed day tasks ↔ all-day events  
- Local SQLite cache + offline sync queue  
- Ready for **EAS Build** → TestFlight / App Store  

## Quick start

```bash
npm install
cp .env.example .env
npx expo start
```

Add Google OAuth client IDs to `.env` (see [docs/SETUP.md](docs/SETUP.md)).

## Scripts

| Command | Purpose |
|---------|---------|
| `npm start` | Expo dev server |
| `npm run ios` | Open iOS simulator |
| `npm run build:ios` | EAS production iOS build |
| `npm run submit:ios` | Submit latest build to App Store Connect |

## Project layout

```
app/                 Expo Router screens (Today, Settings, Edit)
src/auth/            Google OAuth + token storage
src/calendar/        Calendar API + sync
src/db/              SQLite models + offline queue
src/components/      Todo UI pieces
docs/SETUP.md        Google Cloud + Apple + EAS guide
```

## Bundle ID

`app.nathanlee.todocalendar`
