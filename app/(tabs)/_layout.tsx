import { Tabs } from 'expo-router';
import { Calculator, Calendar, Dumbbell, Home, Settings, Users } from 'lucide-react-native';
import { Platform, useWindowDimensions, View } from 'react-native';

import { DashboardProvider, useDashboard } from '@/components/dashboard/dashboard-context';
import { useColorScheme } from '@/components/useColorScheme';
import { dark, light } from '@/theme';

function TabIcon({
  Icon,
  color,
  focused,
  activeColor,
  compact,
}: {
  Icon: typeof Home;
  color: string;
  focused: boolean;
  activeColor: string;
  compact: boolean;
}) {
  return (
    <View className="items-center justify-center">
      <View
        className={`items-center justify-center rounded-2xl py-2 ${compact ? 'px-2' : 'px-5'} ${focused ? 'bg-primary/15 dark:bg-darkPrimary/20' : ''}`}
      >
        <Icon
          color={focused ? activeColor : color}
          size={compact ? 20 : 22}
          strokeWidth={focused ? 2.5 : 1.8}
        />
      </View>
      {focused ? (
        <View className="mt-1 h-1 w-1 rounded-full bg-primary dark:bg-darkPrimary" />
      ) : null}
    </View>
  );
}

function TabLayoutContent() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const p = isDark ? dark : light;
  const { habits } = useDashboard();
  const { width } = useWindowDimensions();
  const compactTabs = width < 390;
  const exerciseEnabled = habits.exerciseTrackingEnabled !== false;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: p.primary,
        tabBarInactiveTintColor: p.mutedForeground,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 28 : 16,
          left: compactTabs ? 12 : 20,
          right: compactTabs ? 12 : 20,
          height: 64,
          backgroundColor: isDark ? p.card : '#ffffff',
          borderRadius: 32,
          borderTopWidth: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDark ? 0.3 : 0.1,
          shadowRadius: 12,
          elevation: 8,
          paddingHorizontal: compactTabs ? 2 : 8,
        },
        tabBarItemStyle: {
          paddingVertical: 8,
          minWidth: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              Icon={Home}
              color={color}
              focused={focused}
              activeColor={p.primary}
              compact={compactTabs}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              Icon={Calendar}
              color={color}
              focused={focused}
              activeColor={p.primary}
              compact={compactTabs}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="calculator"
        options={{
          title: 'Calculator',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              Icon={Calculator}
              color={color}
              focused={focused}
              activeColor={p.primary}
              compact={compactTabs}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="exercise"
        options={{
          title: 'Exercise',
          href: exerciseEnabled ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              Icon={Dumbbell}
              color={color}
              focused={focused}
              activeColor={p.primary}
              compact={compactTabs}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="family"
        options={{
          title: 'Family',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              Icon={Users}
              color={color}
              focused={focused}
              activeColor={p.primary}
              compact={compactTabs}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              Icon={Settings}
              color={color}
              focused={focused}
              activeColor={p.primary}
              compact={compactTabs}
            />
          ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  return (
    <DashboardProvider>
      <TabLayoutContent />
    </DashboardProvider>
  );
}
