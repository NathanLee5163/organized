# Organized

Todo + calendar iPhone app built with **Expo**, with bidirectional **Google Calendar** sync.

- **Runway** — timed tasks ↔ timed calendar events  
- **Loose / Anytime** — untimed tasks ↔ all-day events  
- Categories that map to your Google calendars  
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

## Bundle ID

`app.nathanlee.todocalendar`
