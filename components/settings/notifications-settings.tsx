import DateTimePicker from '@react-native-community/datetimepicker';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '@/components/auth/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { patchMe } from '@/lib/api';
import { ApiError } from '@/lib/api/errors';
import { captureMonitoringError } from '@/lib/monitoring';
import {
  clearPendingNotificationPatch,
  savePendingNotificationPatch,
  scheduleNotificationPatchRetry,
} from '@/lib/notifications/preference-sync';
import { registerPushToken, unregisterPushToken } from '@/lib/notifications/push-token';
import {
  getDefaultNotifications,
  getDeviceTimezone,
  withNotificationDefaults,
} from '@/lib/notifications/defaults';
import { syncLocalMealReminders } from '@/lib/notifications/local-reminders';
import { showToast } from '@/lib/toast';
import type {
  GetMeResponse,
  NotificationsSettings as NotificationPrefs,
  PatchNotificationsBody,
} from '@/types';

function hhmmToDate(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map((x) => Number.parseInt(x, 10));
  const d = new Date();
  d.setHours(Number.isFinite(h) ? h : 8, Number.isFinite(m) ? m : 0, 0, 0);
  return d;
}

function dateToHHMM(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
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

function listTimezones(): string[] {
  try {
    const fn = (
      Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
    ).supportedValuesOf;
    if (typeof fn === 'function') {
      return fn.call(Intl, 'timeZone');
    }
  } catch {
    /* ignore */
  }
  return [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Australia/Sydney',
  ];
}

type TimePickerFieldProps = {
  label: string;
  value: string;
  onChange: (hhmm: string) => void;
};

function TimePickerField({ label, value, onChange }: TimePickerFieldProps) {
  const [show, setShow] = useState(false);
  const date = useMemo(() => hhmmToDate(value), [value]);

  const onPick = useCallback(
    (_event: unknown, selected?: Date) => {
      if (Platform.OS === 'android') {
        setShow(false);
      }
      if (selected) {
        onChange(dateToHHMM(selected));
      }
    },
    [onChange]
  );

  return (
    <View className="gap-1">
      <Label>{label}</Label>
      <Button variant="outline" className="w-full" onPress={() => setShow(true)}>
        <Text className="text-base font-semibold text-foreground dark:text-darkForeground">
          {value}
        </Text>
      </Button>
      {show && Platform.OS === 'android' ? (
        <DateTimePicker value={date} mode="time" display="default" onChange={onPick} />
      ) : null}
      {show && Platform.OS === 'ios' ? (
        <Modal transparent animationType="slide">
          <View className="flex-1 justify-end bg-black/40">
            <View className="rounded-t-2xl bg-background p-4 dark:bg-darkBackground">
              <View className="mb-3 flex-row justify-between">
                <Button variant="ghost" size="sm" onPress={() => setShow(false)}>
                  <Text className="text-primary dark:text-darkPrimary">Cancel</Text>
                </Button>
                <Button variant="ghost" size="sm" onPress={() => setShow(false)}>
                  <Text className="text-primary dark:text-darkPrimary">Done</Text>
                </Button>
              </View>
              <DateTimePicker
                value={date}
                mode="time"
                display="spinner"
                onChange={onPick}
              />
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

type NotificationsSettingsProps = {
  /** Notifications from GET /me or defaults when profile not loaded yet */
  initial: NotificationPrefs | null;
  onSaved?: (me: GetMeResponse) => void;
};

export function NotificationsSettings({ initial, onSaved }: NotificationsSettingsProps) {
  const { user } = useAuth();
  const base = initial ?? getDefaultNotifications();
  const [local, setLocal] = useState<NotificationPrefs>(() =>
    withNotificationDefaults(base)
  );
  const lastGoodRef = useRef<NotificationPrefs>(withNotificationDefaults(base));
  const lastSyncedJson = useRef(JSON.stringify(withNotificationDefaults(base)));
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(base.quietHours !== null);
  const [timezoneModal, setTimezoneModal] = useState(false);
  const [tzFilter, setTzFilter] = useState('');
  const [syncError, setSyncError] = useState(false);
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  const timezones = useMemo(() => listTimezones(), []);

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
        try {
          const me = await patchMe({ notifications: body });
          await clearPendingNotificationPatch(user.uid);
          const merged = withNotificationDefaults(me?.notifications);
          lastGoodRef.current = merged;
          lastSyncedJson.current = JSON.stringify(merged);
          setLocal(merged);
          setQuietHoursEnabled(merged.quietHours !== null);
          setSyncError(false);
          onSavedRef.current?.(me);
          await syncLocalMealReminders(merged);
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
        }
      })();
    }, 500);

    return () => clearTimeout(t);
  }, [local, user?.uid]);

  const setCategories = useCallback(
    (patch: Partial<NotificationPrefs['categories']>) => {
      setLocal((prev) => ({
        ...prev,
        categories: { ...prev.categories, ...patch },
      }));
    },
    []
  );

  const filteredTz = useMemo(() => {
    const q = tzFilter.trim().toLowerCase();
    if (!q) return timezones;
    return timezones.filter((z) => z.toLowerCase().includes(q));
  }, [timezones, tzFilter]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Notifications</CardTitle>
        <CardDescription>
          Generic reminders and preferences sync to your account. Sensitive details stay in the app.
        </CardDescription>
      </CardHeader>
      <CardContent className="gap-4">
        {syncError ? (
          <Text className="text-sm text-destructive dark:text-darkDestructiveForeground">
            Changes will retry automatically when you&apos;re back online.
          </Text>
        ) : null}

        <View className="flex-row items-center justify-between">
          <Label>Push &amp; alerts enabled</Label>
          <Switch
            accessibilityLabel="Master notifications toggle"
            value={local.enabled}
            onValueChange={(v) => setLocal((p) => ({ ...p, enabled: v }))}
          />
        </View>

        <View className="gap-2">
          <Label className="text-muted-foreground dark:text-darkMutedForeground">
            Categories
          </Label>
          {(
            [
              ['mealReminders', 'Meal reminders (device)'],
              ['goalStatus', 'Goal status'],
              ['streaks', 'Streaks'],
              ['familyEvents', 'Family'],
              ['accountAdmin', 'Account & admin'],
            ] as const
          ).map(([key, title]) => (
            <View key={key} className="flex-row items-center justify-between">
              <Label className="flex-1 pr-2">{title}</Label>
              <Switch
                accessibilityLabel={title}
                value={local.categories[key]}
                onValueChange={(v) => setCategories({ [key]: v })}
              />
            </View>
          ))}
        </View>

        <View className="gap-2">
          <View className="flex-row items-center justify-between">
            <Label>Quiet hours</Label>
            <Switch
              accessibilityLabel="Quiet hours"
              value={quietHoursEnabled}
              onValueChange={(v) => {
                setQuietHoursEnabled(v);
                setLocal((p) => ({
                  ...p,
                  quietHours: v
                    ? p.quietHours ?? { start: '22:00', end: '07:00' }
                    : null,
                }));
              }}
            />
          </View>
          {quietHoursEnabled && local.quietHours ? (
            <View className="gap-3">
              <TimePickerField
                label="Start"
                value={local.quietHours.start}
                onChange={(start) =>
                  setLocal((p) =>
                    p.quietHours
                      ? { ...p, quietHours: { ...p.quietHours, start } }
                      : p
                  )
                }
              />
              <TimePickerField
                label="End"
                value={local.quietHours.end}
                onChange={(end) =>
                  setLocal((p) =>
                    p.quietHours ? { ...p, quietHours: { ...p.quietHours, end } } : p
                  )
                }
              />
            </View>
          ) : null}
        </View>

        <View className="gap-2">
          <Label>Timezone</Label>
          <Text className="text-sm text-foreground dark:text-darkForeground">{local.timezone}</Text>
          <View className="flex-row gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onPress={() => setTimezoneModal(true)}
            >
              Choose timezone
            </Button>
            <Button
              variant="ghost"
              className="flex-1"
              onPress={() =>
                setLocal((p) => ({ ...p, timezone: getDeviceTimezone() }))
              }
            >
              Use device
            </Button>
          </View>
        </View>

        <TimePickerField
          label="Goal status time"
          value={local.goalStatusTime}
          onChange={(goalStatusTime) => setLocal((p) => ({ ...p, goalStatusTime }))}
        />

        <View className="gap-2">
          <Label>Meal reminder times (local)</Label>
          {local.reminderTimes.map((rt, index) => (
            <View key={`${index}-${rt}`} className="flex-row items-center gap-2">
              <View className="flex-1">
                <TimePickerField
                  label={`Reminder ${index + 1}`}
                  value={rt}
                  onChange={(next) =>
                    setLocal((p) => {
                      const copy = [...p.reminderTimes];
                      copy[index] = next;
                      return { ...p, reminderTimes: copy };
                    })
                  }
                />
              </View>
              <Button
                variant="outline"
                size="sm"
                onPress={() =>
                  setLocal((p) => ({
                    ...p,
                    reminderTimes: p.reminderTimes.filter((_, i) => i !== index),
                  }))
                }
              >
                Remove
              </Button>
            </View>
          ))}
          <Button
            variant="outline"
            className="w-full"
            onPress={() =>
              setLocal((p) => ({
                ...p,
                reminderTimes: [...p.reminderTimes, '12:00'],
              }))
            }
          >
            Add reminder time
          </Button>
        </View>

        <Modal visible={timezoneModal} animationType="slide" presentationStyle="pageSheet">
          <View className="flex-1 bg-background p-4 dark:bg-darkBackground">
            <Text className="mb-2 text-lg font-semibold text-foreground dark:text-darkForeground">
              Timezone
            </Text>
            <TextInput
              className="mb-3 rounded-xl border border-border bg-muted px-3 py-2 text-foreground dark:border-darkBorder dark:bg-darkMuted dark:text-darkForeground"
              placeholder="Filter…"
              placeholderTextColor="#888"
              value={tzFilter}
              onChangeText={setTzFilter}
            />
            <FlatList
              data={filteredTz}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Button
                  variant="ghost"
                  className="w-full justify-start py-3"
                  onPress={() => {
                    setLocal((p) => ({ ...p, timezone: item }));
                    setTimezoneModal(false);
                  }}
                >
                  <Text className="text-left text-base text-foreground dark:text-darkForeground">
                    {item}
                  </Text>
                </Button>
              )}
            />
            <Button variant="outline" className="mt-4 w-full" onPress={() => setTimezoneModal(false)}>
              Close
            </Button>
          </View>
        </Modal>
      </CardContent>
    </Card>
  );
}
