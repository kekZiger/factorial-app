import { useEffect } from 'react'
import { Tabs } from 'expo-router'
import { Text } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAllowanceSummary, useLeaveTypes } from '../../src/hooks/useLeaves'
import { useSettingsStore } from '../../src/store/settings'

function TabIcon({ symbol, focused }: { symbol: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>{symbol}</Text>
  )
}

export default function TabLayout() {
  const insets = useSafeAreaInsets()
  // Prefetch im Hintergrund sobald der Nutzer eingeloggt ist
  useAllowanceSummary()
  useLeaveTypes()
  const loadSettings = useSettingsStore((s) => s.load)
  const settingsLoaded = useSettingsStore((s) => s.isLoaded)
  useEffect(() => { if (!settingsLoaded) loadSettings() }, [])

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#F3F4F6',
          height: 50 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 6,
        },
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Stempel',
          tabBarIcon: ({ focused }) => <TabIcon symbol="⏱" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="hours"
        options={{
          title: 'Stunden',
          tabBarIcon: ({ focused }) => <TabIcon symbol="📅" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="absences"
        options={{
          title: 'Abwesenheit',
          tabBarIcon: ({ focused }) => <TabIcon symbol="🗓" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Einstellungen',
          tabBarIcon: ({ focused }) => <TabIcon symbol="⚙️" focused={focused} />,
        }}
      />
    </Tabs>
  )
}
