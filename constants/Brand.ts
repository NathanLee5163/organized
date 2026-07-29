/** In-app voice + naming — keep product name “Todo Calendar” for the store. */
export const Brand = {
  short: 'Organized',
  tagline: 'Tasks that stick to your day',
  tabs: {
    today: 'Runway',
    calendar: 'Month',
    anytime: 'Loose',
    settings: 'Deck',
  },
} as const;

export const Copy = {
  emptyRunway: 'Nothing on the runway',
  emptyRunwayHint: 'Dock a timed task — we’ll mirror it to Google Calendar when you’re connected.',
  dockTask: 'Dock a task',
  dockAnytime: 'Add a loose end',
  syncLocal: 'On-device · hook up Google in Deck',
  anytimeLead: 'Open list · tap Dock to land something on the runway.',
  settingsLead: 'Manage account, sync, and preferences.',
  editTitle: 'Dock this',
  themeSection: 'Appearance',
  themeLead: 'Choose a theme for the app.',
} as const;
