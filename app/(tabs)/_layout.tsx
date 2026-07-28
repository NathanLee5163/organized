import { Tabs } from 'expo-router';

import { Brand } from '@/constants/Brand';
import { FloatingTabBar } from '@/src/components/FloatingTabBar';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...(props as Parameters<typeof FloatingTabBar>[0])} />}
      screenOptions={{
        headerShown: false,
      }}>
      <Tabs.Screen name="calendar" options={{ title: Brand.tabs.calendar }} />
      <Tabs.Screen name="index" options={{ title: Brand.tabs.today }} />
      <Tabs.Screen name="anytime" options={{ title: Brand.tabs.anytime }} />
      <Tabs.Screen name="settings" options={{ title: Brand.tabs.settings }} />
    </Tabs>
  );
}
