import { Tabs } from 'expo-router';
import { Calculator, Calendar, Home, Settings, Users } from 'lucide-react-native';

import { DashboardProvider } from '@/components/dashboard/dashboard-context';
import { useColorScheme } from '@/components/useColorScheme';
import { dark, light } from '@/theme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const p = isDark ? dark : light;

  return (
    <DashboardProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: p.primary,
          tabBarInactiveTintColor: p.mutedForeground,
          tabBarStyle: {
            backgroundColor: p.background,
            borderTopColor: p.border,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            title: 'Calendar',
            tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="calculator"
          options={{
            title: 'Calculator',
            tabBarIcon: ({ color, size }) => <Calculator color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="family"
          options={{
            title: 'Family',
            tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
          }}
        />
      </Tabs>
    </DashboardProvider>
  );
}
