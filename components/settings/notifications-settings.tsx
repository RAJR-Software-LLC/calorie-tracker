import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Award,
  Bell,
  Check,
  ChevronRight,
  Clock,
  Flame,
  Globe,
  MapPin,
  Moon,
  Plus,
  Search,
  Settings,
  Users,
  Utensils,
  X,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '@/components/auth/auth-provider';
import { Card, CardContent } from '@/components/ui/card';
import { patchMe } from '@/lib/api';
import { ApiError } from '@/lib/api/errors';
import { captureMonitoringError } from '@/lib/monitoring';
import {
  getDefaultNotifications,
  getDeviceTimezone,
  withNotificationDefaults,
} from '@/lib/notifications/defaults';
import { syncLocalMealReminders } from '@/lib/notifications/local-reminders';
import {
  clearPendingNotificationPatch,
  savePendingNotificationPatch,
  scheduleNotificationPatchRetry,
} from '@/lib/notifications/preference-sync';
import { registerPushToken, unregisterPushToken } from '@/lib/notifications/push-token';
import { showToast } from '@/lib/toast';
import { useThemePalette } from '@/lib/use-theme-palette';
import type {
  GetMeResponse,
  NotificationsSettings as NotificationPrefs,
  PatchNotificationsBody,
} from '@/types';

// Convert 24h "HH:MM" to Date object
function hhmmToDate(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map((x) => Number.parseInt(x, 10));
  const d = new Date();
  d.setHours(Number.isFinite(h) ? h : 8, Number.isFinite(m) ? m : 0, 0, 0);
  return d;
}

// Convert Date to 24h "HH:MM" for storage
function dateToHHMM(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// Format 24h "HH:MM" to 12h display (e.g., "8:00 AM")
function formatTime12h(hhmm: string): string {
  const [h, m] = hhmm.split(':').map((x) => Number.parseInt(x, 10));
  const hour = Number.isFinite(h) ? h : 0;
  const minute = Number.isFinite(m) ? m : 0;
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${String(minute).padStart(2, '0')} ${period}`;
}

function buildPatchBody(s: NotificationPrefs): PatchNotificationsBody {
  return {
    enabled: s.enabled,
    reminderTimes: [...s.reminderTimes],
    categories: { ...s.categories },
    quietHours: s.quietHours,
    timezone: s.timezone,
    goalStatusTime: s.goalStatusTime,
  };
}

// Group timezones by region for better UX
function listTimezones(): { region: string; zones: string[] }[] {
  let allZones: string[] = [];
  try {
    const fn = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] })
      .supportedValuesOf;
    if (typeof fn === 'function') {
      allZones = fn.call(Intl, 'timeZone');
    }
  } catch {
    /* ignore */
  }

  if (allZones.length === 0) {
    allZones = [
      'UTC',
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'America/Toronto',
      'America/Vancouver',
      'Europe/London',
      'Europe/Paris',
      'Europe/Berlin',
      'Asia/Tokyo',
      'Asia/Shanghai',
      'Asia/Singapore',
      'Australia/Sydney',
      'Pacific/Auckland',
    ];
  }

  const regions: Record<string, string[]> = {};
  for (const tz of allZones) {
    const parts = tz.split('/');
    const region = parts.length > 1 ? parts[0] : 'Other';
    if (!regions[region]) regions[region] = [];
    regions[region].push(tz);
  }

  // Sort regions with Americas first (most common for US apps)
  const order = [
    'America',
    'Europe',
    'Asia',
    'Australia',
    'Pacific',
    'Africa',
    'Atlantic',
    'Indian',
    'Antarctica',
    'Other',
    'Etc',
  ];
  const sorted = Object.entries(regions).sort(([a], [b]) => {
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  return sorted.map(([region, zones]) => ({
    region,
    zones: zones.sort(),
  }));
}

// Get friendly timezone name
function formatTimezone(tz: string): string {
  const city = tz.split('/').pop()?.replace(/_/g, ' ') ?? tz;
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    });
    const parts = formatter.formatToParts(now);
    const offset = parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
    return `${city} (${offset})`;
  } catch {
    return city;
  }
}

type SettingsToggleRowProps = {
  icon: React.ReactNode;
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
};

function SettingsToggleRow({
  icon,
  label,
  description,
  value,
  onValueChange,
}: SettingsToggleRowProps) {
  const p = useThemePalette();
  return (
    <View className="flex-row items-center gap-3 py-3">
      <View className="h-9 w-9 items-center justify-center rounded-xl bg-primary/10 dark:bg-darkPrimary/20">
        {icon}
      </View>
      <View className="flex-1">
        <Text className="text-base font-medium text-foreground dark:text-darkForeground">
          {label}
        </Text>
        {description ? (
          <Text className="text-xs text-muted-foreground dark:text-darkMutedForeground">
            {description}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: p.border, true: p.primary }}
        thumbColor="#fff"
        accessibilityLabel={label}
      />
    </View>
  );
}

type TimePickerRowProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (hhmm: string) => void;
  onRemove?: () => void;
};

function TimePickerRow({ icon, label, value, onChange, onRemove }: TimePickerRowProps) {
  const p = useThemePalette();
  const [show, setShow] = useState(false);
  const date = useMemo(() => hhmmToDate(value), [value]);

  const onPick = useCallback(
    (event: { type?: string }, selected?: Date) => {
      if (Platform.OS === 'android' && event?.type === 'dismissed') {
        setShow(false);
        return;
      }
      if (selected) {
        onChange(dateToHHMM(selected));
      }
    },
    [onChange]
  );

  return (
    <>
      <View className="flex-row items-center gap-3 py-3">
        <View className="h-9 w-9 items-center justify-center rounded-xl bg-primary/10 dark:bg-darkPrimary/20">
          {icon}
        </View>
        <View className="flex-1">
          <Text className="text-base font-medium text-foreground dark:text-darkForeground">
            {label}
          </Text>
        </View>
        <Pressable
          onPress={() => setShow(true)}
          className="rounded-lg bg-secondary px-3 py-2 active:opacity-70 dark:bg-darkSecondary"
        >
          <Text className="text-base font-semibold text-foreground dark:text-darkForeground">
            {formatTime12h(value)}
          </Text>
        </Pressable>
        {onRemove ? (
          <Pressable
            onPress={onRemove}
            className="ml-1 h-8 w-8 items-center justify-center rounded-full bg-destructive/10 active:opacity-70 dark:bg-darkDestructive/20"
          >
            <X size={16} color={p.destructive} />
          </Pressable>
        ) : null}
      </View>

      {show && Platform.OS === 'android' ? (
        <DateTimePicker
          value={date}
          mode="time"
          display="default"
          onChange={onPick}
          is24Hour={false}
        />
      ) : null}

      {show && Platform.OS === 'ios' ? (
        <Modal transparent animationType="slide">
          <View className="flex-1 justify-end bg-black/40">
            <View className="rounded-t-3xl bg-background p-4 pb-8 dark:bg-darkBackground">
              <View className="mb-4 flex-row items-center justify-between">
                <Text className="text-lg font-semibold text-foreground dark:text-darkForeground">
                  {label}
                </Text>
                <Pressable
                  onPress={() => setShow(false)}
                  className="rounded-full bg-primary px-4 py-2 active:opacity-80"
                >
                  <Text className="font-semibold text-primary-foreground dark:text-darkPrimaryForeground">
                    Done
                  </Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={date}
                mode="time"
                display="spinner"
                onChange={onPick}
                style={{ height: 180 }}
              />
            </View>
          </View>
        </Modal>
      ) : null}
    </>
  );
}

function SettingsDivider() {
  return <View className="h-px bg-border/50 dark:bg-darkBorder/50" />;
}

type TimezoneModalProps = {
  visible: boolean;
  current: string;
  onSelect: (tz: string) => void;
  onClose: () => void;
};

function TimezoneModal({ visible, current, onSelect, onClose }: TimezoneModalProps) {
  const p = useThemePalette();
  const [filter, setFilter] = useState('');
  const groupedTimezones = useMemo(() => listTimezones(), []);

  const filteredGroups = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return groupedTimezones;

    return groupedTimezones
      .map(({ region, zones }) => ({
        region,
        zones: zones.filter(
          (z) => z.toLowerCase().includes(q) || formatTimezone(z).toLowerCase().includes(q)
        ),
      }))
      .filter(({ zones }) => zones.length > 0);
  }, [groupedTimezones, filter]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-background dark:bg-darkBackground">
        {/* Header */}
        <View className="border-b border-border px-4 pb-4 pt-6 dark:border-darkBorder">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-xl font-bold text-foreground dark:text-darkForeground">
              Select Timezone
            </Text>
            <Pressable onPress={onClose} className="rounded-full p-2 active:opacity-70">
              <X size={24} color={p.foreground} />
            </Pressable>
          </View>

          {/* Search */}
          <View className="flex-row items-center gap-2 rounded-xl bg-secondary px-3 dark:bg-darkSecondary">
            <Search size={18} color={p.mutedForeground} />
            <TextInput
              className="flex-1 py-3 text-base text-foreground dark:text-darkForeground"
              placeholder="Search cities or regions..."
              placeholderTextColor={p.mutedForeground}
              value={filter}
              onChangeText={setFilter}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {filter ? (
              <Pressable onPress={() => setFilter('')}>
                <X size={18} color={p.mutedForeground} />
              </Pressable>
            ) : null}
          </View>

          {/* Device timezone shortcut */}
          <Pressable
            onPress={() => {
              onSelect(getDeviceTimezone());
              onClose();
            }}
            className="mt-3 flex-row items-center gap-3 rounded-xl bg-primary/10 p-3 active:opacity-70 dark:bg-darkPrimary/20"
          >
            <MapPin size={20} color={p.primary} />
            <View className="flex-1">
              <Text className="font-medium text-foreground dark:text-darkForeground">
                Use Device Timezone
              </Text>
              <Text className="text-sm text-muted-foreground dark:text-darkMutedForeground">
                {formatTimezone(getDeviceTimezone())}
              </Text>
            </View>
            {current === getDeviceTimezone() ? <Check size={20} color={p.primary} /> : null}
          </Pressable>
        </View>

        {/* Timezone list */}
        <ScrollView className="flex-1 px-4" keyboardShouldPersistTaps="handled">
          {filteredGroups.map(({ region, zones }) => (
            <View key={region} className="mb-4">
              <Text className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground dark:text-darkMutedForeground">
                {region}
              </Text>
              <Card>
                <CardContent className="p-0">
                  {zones.map((tz, index) => (
                    <View key={tz}>
                      {index > 0 ? <SettingsDivider /> : null}
                      <Pressable
                        onPress={() => {
                          onSelect(tz);
                          onClose();
                        }}
                        className="flex-row items-center justify-between px-4 py-3 active:bg-secondary dark:active:bg-darkSecondary"
                      >
                        <Text className="flex-1 text-base text-foreground dark:text-darkForeground">
                          {formatTimezone(tz)}
                        </Text>
                        {current === tz ? <Check size={20} color={p.primary} /> : null}
                      </Pressable>
                    </View>
                  ))}
                </CardContent>
              </Card>
            </View>
          ))}
          <View className="h-8" />
        </ScrollView>
      </View>
    </Modal>
  );
}

type NotificationsSettingsProps = {
  initial: NotificationPrefs | null;
  onSaved?: (me: GetMeResponse) => void;
  /** When true, renders without Card wrappers for embedding inside a parent Card */
  embedded?: boolean;
};

export function NotificationsSettings({
  initial,
  onSaved,
  embedded = false,
}: NotificationsSettingsProps) {
  const { user } = useAuth();
  const p = useThemePalette();
  const base = initial ?? getDefaultNotifications();
  const [local, setLocal] = useState<NotificationPrefs>(() => withNotificationDefaults(base));
  const lastGoodRef = useRef<NotificationPrefs>(withNotificationDefaults(base));
  const lastSyncedJson = useRef(JSON.stringify(withNotificationDefaults(base)));
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(base.quietHours !== null);
  const [timezoneModal, setTimezoneModal] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  useEffect(() => {
    const next = withNotificationDefaults(initial ?? undefined);
    lastGoodRef.current = next;
    lastSyncedJson.current = JSON.stringify(next);
    setLocal(next);
    setQuietHoursEnabled(next.quietHours !== null);
  }, [initial]);

  useEffect(() => {
    if (!user?.uid) return;
    const json = JSON.stringify(local);
    if (json === lastSyncedJson.current) return;

    const t = setTimeout(() => {
      void (async () => {
        const body = buildPatchBody(local);
        let merged: NotificationPrefs;
        try {
          const me = await patchMe({ notifications: body });
          await clearPendingNotificationPatch(user.uid);
          merged = withNotificationDefaults(me?.notifications ?? undefined);
          lastGoodRef.current = merged;
          lastSyncedJson.current = JSON.stringify(merged);
          setLocal(merged);
          setQuietHoursEnabled(merged.quietHours !== null);
          setSyncError(false);
          onSavedRef.current?.(me);
        } catch (e) {
          captureMonitoringError(e, 'notifications/settings_patch', { uid: user.uid });
          setLocal(lastGoodRef.current);
          setQuietHoursEnabled(lastGoodRef.current.quietHours !== null);
          setSyncError(true);
          await savePendingNotificationPatch(user.uid, body);
          scheduleNotificationPatchRetry(user.uid);
          let msg = 'Could not save notification settings';
          if (e instanceof ApiError) {
            msg = e.message || msg;
          }
          showToast(msg, 'error');
          return;
        }

        try {
          await syncLocalMealReminders(merged);
        } catch (e) {
          captureMonitoringError(e, 'notifications/sync_local_meal_reminders', { uid: user.uid });
        }
        try {
          if (merged.enabled) {
            await registerPushToken(user.uid);
          } else {
            try {
              await unregisterPushToken(user.uid);
            } catch {
              /* pending delete */
            }
          }
        } catch (e) {
          captureMonitoringError(e, 'notifications/settings_push_token_after_patch', {
            uid: user.uid,
          });
        }
      })();
    }, 500);

    return () => clearTimeout(t);
  }, [local, user?.uid]);

  const setCategories = useCallback((patch: Partial<NotificationPrefs['categories']>) => {
    setLocal((prev) => ({
      ...prev,
      categories: { ...prev.categories, ...patch },
    }));
  }, []);

  const categoryConfig = [
    {
      key: 'mealReminders' as const,
      label: 'Meal Reminders',
      desc: 'Local device notifications',
      icon: Utensils,
    },
    {
      key: 'goalStatus' as const,
      label: 'Goal Status',
      desc: 'Daily progress updates',
      icon: Award,
    },
    { key: 'streaks' as const, label: 'Streaks', desc: 'Keep your momentum going', icon: Flame },
    { key: 'familyEvents' as const, label: 'Family', desc: 'Shared activity alerts', icon: Users },
    {
      key: 'accountAdmin' as const,
      label: 'Account',
      desc: 'Security and admin notices',
      icon: Settings,
    },
  ];

  // Section wrapper - renders with or without Card based on embedded prop
  const Section = useCallback(
    ({ children, className = '' }: { children: React.ReactNode; className?: string }) =>
      embedded ? (
        <View className={`mt-4 ${className}`}>{children}</View>
      ) : (
        <Card>
          <CardContent className={`p-4 ${className}`}>{children}</CardContent>
        </Card>
      ),
    [embedded]
  );

  // Section label for embedded mode
  const SectionLabel = useCallback(
    ({ children }: { children: React.ReactNode }) => (
      <Text className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground dark:text-darkMutedForeground">
        {children}
      </Text>
    ),
    []
  );

  return (
    <View className={embedded ? '' : 'gap-4'}>
      {syncError ? (
        <Section>
          <View className="flex-row items-center gap-3">
            <View className="h-9 w-9 items-center justify-center rounded-xl bg-destructive/10 dark:bg-darkDestructive/20">
              <X size={18} color={p.destructive} />
            </View>
            <Text className="flex-1 text-sm text-destructive dark:text-darkDestructiveForeground">
              Changes will retry automatically when you&apos;re back online.
            </Text>
          </View>
        </Section>
      ) : null}

      {/* Master Toggle */}
      <Section>
        {embedded ? <SectionLabel>Push Notifications</SectionLabel> : null}
        <SettingsToggleRow
          icon={<Bell size={18} color={p.primary} />}
          label={embedded ? 'Enabled' : 'Push Notifications'}
          description={embedded ? undefined : 'Enable all notifications'}
          value={local.enabled}
          onValueChange={(v) => setLocal((prev) => ({ ...prev, enabled: v }))}
        />
      </Section>

      {/* Categories */}
      <Section>
        <SectionLabel>Categories</SectionLabel>
        {categoryConfig.map(({ key, label, desc, icon: Icon }, index) => (
          <View key={key}>
            {index > 0 ? <SettingsDivider /> : null}
            <SettingsToggleRow
              icon={<Icon size={18} color={p.primary} />}
              label={label}
              description={desc}
              value={local.categories[key]}
              onValueChange={(v) => setCategories({ [key]: v })}
            />
          </View>
        ))}
      </Section>

      {/* Quiet Hours */}
      <Section>
        <SectionLabel>Quiet Hours</SectionLabel>
        <SettingsToggleRow
          icon={<Moon size={18} color={p.primary} />}
          label="Do Not Disturb"
          description="Pause notifications during sleep"
          value={quietHoursEnabled}
          onValueChange={(v) => {
            setQuietHoursEnabled(v);
            setLocal((prev) => ({
              ...prev,
              quietHours: v ? (prev.quietHours ?? { start: '22:00', end: '07:00' }) : null,
            }));
          }}
        />
        {quietHoursEnabled && local.quietHours ? (
          <>
            <SettingsDivider />
            <TimePickerRow
              icon={<Clock size={18} color={p.mutedForeground} />}
              label="Start"
              value={local.quietHours.start}
              onChange={(start) =>
                setLocal((prev) =>
                  prev.quietHours ? { ...prev, quietHours: { ...prev.quietHours, start } } : prev
                )
              }
            />
            <SettingsDivider />
            <TimePickerRow
              icon={<Clock size={18} color={p.mutedForeground} />}
              label="End"
              value={local.quietHours.end}
              onChange={(end) =>
                setLocal((prev) =>
                  prev.quietHours ? { ...prev, quietHours: { ...prev.quietHours, end } } : prev
                )
              }
            />
          </>
        ) : null}
      </Section>

      {/* Timezone */}
      <Section>
        <SectionLabel>Timezone</SectionLabel>
        <Pressable
          onPress={() => setTimezoneModal(true)}
          className="flex-row items-center gap-3 py-1 active:opacity-70"
        >
          <View className="h-9 w-9 items-center justify-center rounded-xl bg-primary/10 dark:bg-darkPrimary/20">
            <Globe size={18} color={p.primary} />
          </View>
          <View className="flex-1">
            <Text className="text-base font-medium text-foreground dark:text-darkForeground">
              {formatTimezone(local.timezone)}
            </Text>
          </View>
          <ChevronRight size={20} color={p.mutedForeground} />
        </Pressable>
      </Section>

      <TimezoneModal
        visible={timezoneModal}
        current={local.timezone}
        onSelect={(tz) => setLocal((prev) => ({ ...prev, timezone: tz }))}
        onClose={() => setTimezoneModal(false)}
      />

      {/* Goal Status Time */}
      <Section>
        <SectionLabel>Daily Summary</SectionLabel>
        <TimePickerRow
          icon={<Award size={18} color={p.primary} />}
          label="Goal Status Time"
          value={local.goalStatusTime}
          onChange={(goalStatusTime) => setLocal((prev) => ({ ...prev, goalStatusTime }))}
        />
      </Section>

      {/* Meal Reminder Times */}
      <Section>
        <SectionLabel>Meal Reminders</SectionLabel>
        {local.reminderTimes.map((rt, index) => (
          <View key={`${index}-${rt}`}>
            {index > 0 ? <SettingsDivider /> : null}
            <TimePickerRow
              icon={<Utensils size={18} color={p.primary} />}
              label={`Reminder ${index + 1}`}
              value={rt}
              onChange={(next) =>
                setLocal((prev) => {
                  const copy = [...prev.reminderTimes];
                  copy[index] = next;
                  return { ...prev, reminderTimes: copy };
                })
              }
              onRemove={
                local.reminderTimes.length > 1
                  ? () =>
                      setLocal((prev) => ({
                        ...prev,
                        reminderTimes: prev.reminderTimes.filter((_, i) => i !== index),
                      }))
                  : undefined
              }
            />
          </View>
        ))}
        <SettingsDivider />
        <Pressable
          onPress={() =>
            setLocal((prev) => ({
              ...prev,
              reminderTimes: [...prev.reminderTimes, '12:00'],
            }))
          }
          className="flex-row items-center gap-3 py-3 active:opacity-70"
        >
          <View className="h-9 w-9 items-center justify-center rounded-xl bg-accent/20 dark:bg-darkAccent/25">
            <Plus size={18} color={p.accent} />
          </View>
          <Text className="text-base font-medium text-accent dark:text-darkAccent">
            Add Reminder
          </Text>
        </Pressable>
      </Section>
    </View>
  );
}
