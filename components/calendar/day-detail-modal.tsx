import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { format, isToday, parseISO } from 'date-fns';
import { Plus, Trash2, UtensilsCrossed } from 'lucide-react-native';

import { useAuth } from '@/components/auth/auth-provider';
import { LogEntryModal } from '@/components/dashboard/log-entry-modal';
import { Button } from '@/components/ui/button';
import { logAppError, toUserErrorMessage } from '@/lib/app-errors';
import { deleteEntry, getEntries } from '@/lib/api';
import { showToast } from '@/lib/toast';
import { useThemePalette } from '@/lib/use-theme-palette';

import type { CalorieEntryWithId } from '@/types';

type DayDetailModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  goal: number | null;
  onEntryChange: () => void;
};

export function DayDetailModal({
  open,
  onOpenChange,
  date,
  goal,
  onEntryChange,
}: DayDetailModalProps) {
  const p = useThemePalette();
  const { user } = useAuth();
  const [entries, setEntries] = useState<CalorieEntryWithId[]>([]);
  const [logOpen, setLogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadEntries = useCallback(async () => {
    if (!user || !date) return;
    setLoading(true);
    try {
      const data = await getEntries({ date });
      setEntries(data);
    } catch (err) {
      logAppError('calendar/day-detail/loadEntries', err);
      showToast(toUserErrorMessage(err, "Couldn't load entries for this day."), 'error');
    } finally {
      setLoading(false);
    }
  }, [user, date]);

  useEffect(() => {
    if (open && date) {
      void loadEntries();
    }
  }, [open, date, loadEntries]);

  async function handleDelete(entryId: string) {
    if (!user) return;
    try {
      await deleteEntry(entryId);
      await loadEntries();
      onEntryChange();
      showToast('Entry removed', 'success');
    } catch (err) {
      logAppError('calendar/day-detail/deleteEntry', err);
      showToast(toUserErrorMessage(err, 'Could not remove entry'), 'error');
    }
  }

  if (!date) return null;

  const parsedDate = parseISO(date);
  const dateLabel = isToday(parsedDate) ? 'Today' : format(parsedDate, 'EEEE, MMM d');
  const total = entries.reduce((sum, e) => sum + (e.estimatedCalories || 0), 0);
  const effectiveGoal = goal || 2000;

  return (
    <>
      <Modal visible={open} animationType="slide" transparent onRequestClose={() => onOpenChange(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-end bg-black/40"
        >
          <Pressable className="flex-1" onPress={() => onOpenChange(false)} />
          <View className="max-h-[80%] rounded-t-3xl bg-card p-4 dark:bg-darkCard">
            <Text className="text-xl font-semibold text-foreground dark:text-darkForeground">{dateLabel}</Text>
            <Text className="mt-1 text-sm text-muted-foreground dark:text-darkMutedForeground">
              {total > 0
                ? `${total.toLocaleString()} of ${effectiveGoal.toLocaleString()} cal`
                : 'No entries yet'}
            </Text>

            <ScrollView className="mt-4 max-h-80">
              {loading ? (
                <ActivityIndicator color={p.primary} />
              ) : entries.length === 0 ? (
                <View className="items-center gap-2 py-8">
                  <UtensilsCrossed size={32} color={p.mutedForeground} />
                  <Text className="text-sm text-muted-foreground dark:text-darkMutedForeground">
                    No meals logged for this day
                  </Text>
                </View>
              ) : (
                <View className="gap-2">
                  {entries.map((entry) => (
                    <View
                      key={entry.id}
                      className="flex-row items-center justify-between rounded-xl bg-muted/50 px-4 py-3 dark:bg-darkMuted"
                    >
                      <View className="gap-0.5">
                        <Text className="text-sm font-medium text-foreground dark:text-darkForeground">
                          {entry.itemName}
                        </Text>
                        <Text className="text-xs text-muted-foreground dark:text-darkMutedForeground">
                          Qty: {entry.quantity}
                        </Text>
                      </View>
                      <View className="flex-row items-center gap-3">
                        <Text className="text-sm font-semibold text-foreground dark:text-darkForeground">
                          ~{entry.estimatedCalories} cal
                        </Text>
                        <Button variant="ghost" size="icon" onPress={() => handleDelete(entry.id)}>
                          <Trash2 size={16} color={p.mutedForeground} />
                        </Button>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {total > 0 ? (
                <View className="mt-3 gap-1.5">
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-muted-foreground">{total.toLocaleString()} cal</Text>
                    <Text className="text-xs text-muted-foreground">{effectiveGoal.toLocaleString()} cal goal</Text>
                  </View>
                  <View className="h-2 w-full overflow-hidden rounded-full bg-muted dark:bg-darkMuted">
                    <View
                      className={`h-full rounded-full ${
                        total <= effectiveGoal * 1.1
                          ? 'bg-primary dark:bg-darkPrimary'
                          : 'bg-muted-foreground dark:bg-darkMutedForeground'
                      }`}
                      style={{ width: `${Math.min((total / effectiveGoal) * 100, 100)}%` }}
                    />
                  </View>
                </View>
              ) : null}
            </ScrollView>

            <Button className="mt-4 w-full" onPress={() => setLogOpen(true)}>
              <View className="flex-row items-center justify-center gap-2">
                <Plus size={16} color={p.primaryForeground} />
                <Text className="font-semibold text-primary-foreground dark:text-darkPrimaryForeground">
                  Log for {isToday(parsedDate) ? 'today' : format(parsedDate, 'MMM d')}
                </Text>
              </View>
            </Button>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <LogEntryModal
        open={logOpen}
        onOpenChange={setLogOpen}
        date={date}
        onLogged={() => {
          void loadEntries();
          onEntryChange();
        }}
      />
    </>
  );
}
