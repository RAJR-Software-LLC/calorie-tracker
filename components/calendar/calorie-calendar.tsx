import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isAfter,
  isSameMonth,
  startOfMonth,
  subDays,
  subMonths,
} from 'date-fns';

import { useAuth } from '@/components/auth/auth-provider';
import { DayDetailModal } from '@/components/calendar/day-detail-modal';
import { WeeklyTrendChart } from '@/components/calendar/weekly-trend-chart';
import { logAppError, toUserErrorMessage } from '@/lib/app-errors';
import { getEntries, getMe } from '@/lib/api';
import { formatDate } from '@/lib/date';
import { showToast } from '@/lib/toast';
import { useThemePalette } from '@/lib/use-theme-palette';

export function CalorieCalendar() {
  const p = useThemePalette();
  const { user } = useAuth();
  const [month, setMonth] = useState(new Date());
  const [daySummaries, setDaySummaries] = useState<Record<string, { date: string; total: number }>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [goalCalories, setGoalCalories] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMonth = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const monthStart = formatDate(startOfMonth(month));
      const monthEnd = formatDate(endOfMonth(month));
      const weekStart = formatDate(subDays(new Date(), 6));
      const weekEnd = formatDate(new Date());

      const [monthEntries, weekEntries, profile] = await Promise.all([
        getEntries({ startDate: monthStart, endDate: monthEnd }),
        getEntries({ startDate: weekStart, endDate: weekEnd }),
        getMe(),
      ]);
      setGoalCalories(profile?.goalCalories ?? null);

      const grouped: Record<string, { date: string; total: number }> = {};
      const seen = new Set<string>();
      for (const entry of [...monthEntries, ...weekEntries]) {
        if (seen.has(entry.id)) continue;
        seen.add(entry.id);
        const d = entry.date;
        if (!grouped[d]) {
          grouped[d] = { date: d, total: 0 };
        }
        grouped[d].total += entry.estimatedCalories || 0;
      }
      setDaySummaries(grouped);
    } catch (err) {
      logAppError('calendar/loadMonth', err);
      showToast(toUserErrorMessage(err, "Couldn't load calendar data."), 'error');
    } finally {
      setLoading(false);
    }
  }, [user, month]);

  useEffect(() => {
    void loadMonth();
  }, [loadMonth]);

  function getDayStatus(d: Date): 'on-track' | 'over' | 'none' {
    const dateStr = formatDate(d);
    const summary = daySummaries[dateStr];
    if (!summary || summary.total === 0) return 'none';
    const goal = goalCalories || 2000;
    if (summary.total <= goal * 1.1) return 'on-track';
    return 'over';
  }

  const last7Days = useMemo(() => {
    const t = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const date = subDays(t, 6 - i);
      const dateStr = formatDate(date);
      const summary = daySummaries[dateStr];
      return {
        date: format(date, 'EEE'),
        calories: summary?.total || 0,
        goal: goalCalories || 2000,
      };
    });
  }, [daySummaries, goalCalories]);

  const calendarDays = useMemo(() => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const startWeekday = start.getDay();
    const days: (Date | null)[] = [];
    for (let i = 0; i < startWeekday; i++) {
      days.push(null);
    }
    eachDayOfInterval({ start, end }).forEach((d) => days.push(d));
    return days;
  }, [month]);

  if (loading) {
    return (
      <View className="items-center py-12">
        <ActivityIndicator color={p.primary} />
      </View>
    );
  }

  const today = new Date();

  return (
    <View className="gap-5">
      <WeeklyTrendChart data={last7Days} goal={goalCalories || 2000} />

      <View className="flex-row items-center justify-between px-2">
        <Pressable hitSlop={12} onPress={() => setMonth((m) => subMonths(m, 1))}>
          <Text className="text-lg text-primary">‹</Text>
        </Pressable>
        <Text className="font-semibold text-foreground dark:text-darkForeground">
          {format(month, 'MMMM yyyy')}
        </Text>
        <Pressable hitSlop={12} onPress={() => setMonth((m) => addMonths(m, 1))}>
          <Text className="text-lg text-primary">›</Text>
        </Pressable>
      </View>

      <View className="rounded-2xl border border-border/50 bg-card p-2 dark:border-darkBorder dark:bg-darkCard">
        <View className="mb-2 flex-row">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <Text
              key={d}
              className="flex-1 text-center text-[10px] text-muted-foreground dark:text-darkMutedForeground"
            >
              {d}
            </Text>
          ))}
        </View>
        <View className="flex-row flex-wrap">
          {calendarDays.map((d, i) => {
            if (!d) {
              return <View key={`empty-${i}`} className="aspect-square w-[14.28%] p-1" />;
            }
            const dateStr = formatDate(d);
            const summary = daySummaries[dateStr];
            const status = getDayStatus(d);
            const disabled = isAfter(d, today);
            const dot =
              summary && summary.total > 0
                ? status === 'over'
                  ? 'bg-amber-500'
                  : 'bg-primary dark:bg-darkPrimary'
                : '';

            return (
              <Pressable
                key={dateStr}
                disabled={disabled}
                className={`aspect-square w-[14.28%] items-center justify-center rounded-lg p-1 ${
                  selectedDate === dateStr ? 'bg-primary/10 dark:bg-darkPrimary/10' : ''
                } ${disabled ? 'opacity-40' : ''}`}
                onPress={() => setSelectedDate(dateStr)}
              >
                <Text
                  className={`text-sm ${
                    isSameMonth(d, month) ? 'text-foreground dark:text-darkForeground' : 'text-muted-foreground'
                  }`}
                >
                  {format(d, 'd')}
                </Text>
                {dot ? <View className={`mt-0.5 h-1.5 w-1.5 rounded-full ${dot}`} /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      <DayDetailModal
        open={!!selectedDate}
        onOpenChange={(open) => {
          if (!open) setSelectedDate(null);
        }}
        date={selectedDate || ''}
        goal={goalCalories}
        onEntryChange={loadMonth}
      />
    </View>
  );
}
