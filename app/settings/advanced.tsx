import { SettingsRow } from '@/src/components/settings/SettingsRow';
import { SettingsScreenShell } from '@/src/components/settings/SettingsScreenShell';
import { SettingsSection } from '@/src/components/settings/SettingsSection';
import { usePreferences } from '@/src/preferences/PreferencesContext';

export default function AdvancedSettingsScreen() {
  const {
    hapticsEnabled,
    setHapticsEnabled,
    defaultDuration,
    cycleDefaultDuration,
    weekStartsOn,
    cycleWeekStartsOn,
  } = usePreferences();

  return (
    <SettingsScreenShell subtitle="Behavior defaults used across Runway and new tasks.">
      <SettingsSection title="Defaults">
        <SettingsRow
          label="Default duration"
          subtitle="For new timed tasks"
          value={`${defaultDuration} min`}
          onPress={cycleDefaultDuration}
        />
        <SettingsRow
          label="Week starts on"
          subtitle="Week strip ordering"
          value={weekStartsOn === 1 ? 'Monday' : 'Sunday'}
          onPress={cycleWeekStartsOn}
          last
        />
      </SettingsSection>

      <SettingsSection title="Feedback">
        <SettingsRow
          kind="toggle"
          label="Haptics"
          subtitle="Vibration on toggles and pickers"
          value={hapticsEnabled}
          onValueChange={setHapticsEnabled}
          last
        />
      </SettingsSection>
    </SettingsScreenShell>
  );
}
