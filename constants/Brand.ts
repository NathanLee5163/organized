/** In-app voice + naming — keep product name “Todo Calendar” for the store. */
export const Brand = {
  short: 'Organized',
  tagline: 'Tasks that stick to your day',
  tabs: {
    today: 'Runway',
    calendar: 'Month',
    anytime: 'Goals',
    settings: 'Deck',
  },
} as const;

export const Copy = {
  emptyRunway: 'Nothing on the runway',
  emptyRunwayHint: 'Dock a timed task — or reserve a Goals block on the runway.',
  dockTask: 'Dock a task',
  dockAnytime: 'Add a goal',
  syncLocal: 'On-device · hook up Google in Deck',
  anytimeLead: 'Ambitious aims · block runway time, Finished logs the work.',
  settingsLead: 'Manage account, sync, and preferences.',
  editTitle: 'Dock this',
  themeSection: 'Appearance',
  themeLead: 'Choose a theme for the app.',
} as const;
