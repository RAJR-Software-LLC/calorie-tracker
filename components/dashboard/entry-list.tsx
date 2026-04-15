import { Text, View } from 'react-native';
import { Trash2, UtensilsCrossed } from 'lucide-react-native';

import { useAuth } from '@/components/auth/auth-provider';
import { useDashboard } from '@/components/dashboard/dashboard-context';
import { Button } from '@/components/ui/button';
import { logAppError, toUserErrorMessage } from '@/lib/app-errors';
import { deleteEntry } from '@/lib/api';
import { showToast } from '@/lib/toast';
import { useThemePalette } from '@/lib/use-theme-palette';

export function EntryList() {
  const p = useThemePalette();
  const { user } = useAuth();
  const { entries, loading, refreshEntries } = useDashboard();

  async function handleDelete(entryId: string) {
    if (!user) return;
    try {
      await deleteEntry(entryId);
      await refreshEntries();
      showToast('Entry removed', 'success');
    } catch (err) {
      logAppError('dashboard/entry/delete', err);
      showToast(toUserErrorMessage(err, 'Could not remove entry'), 'error');
    }
  }

  if (loading) {
    return (
      <View className="gap-3">
        <Text className="text-sm font-semibold text-foreground dark:text-darkForeground">Today&apos;s meals</Text>
        {[1, 2].map((i) => (
          <View key={i} className="h-16 rounded-xl bg-muted dark:bg-darkMuted" />
        ))}
      </View>
    );
  }

  return (
    <View className="gap-3">
      <Text className="text-sm font-semibold text-foreground dark:text-darkForeground">Today&apos;s meals</Text>

      {entries.length === 0 ? (
        <View className="items-center gap-2 rounded-xl border border-dashed border-border py-8 dark:border-darkBorder">
          <UtensilsCrossed size={32} color={p.mutedForeground} />
          <Text className="text-center text-sm text-muted-foreground dark:text-darkMutedForeground">
            No meals logged yet. Tap the button above to start!
          </Text>
        </View>
      ) : (
        <View className="gap-2">
          {entries.map((entry) => (
            <View
              key={entry.id}
              className="flex-row items-center justify-between rounded-xl border border-border/50 bg-card px-4 py-3 shadow-sm dark:border-darkBorder dark:bg-darkCard"
            >
              <View className="gap-0.5">
                <Text className="text-sm font-medium text-foreground dark:text-darkForeground">{entry.itemName}</Text>
                <Text className="text-xs text-muted-foreground dark:text-darkMutedForeground">
                  Qty: {entry.quantity}
                </Text>
              </View>
              <View className="flex-row items-center gap-3">
                <Text className="text-sm font-semibold text-foreground dark:text-darkForeground">
                  ~{entry.estimatedCalories} cal
                </Text>
                <Button
                  variant="ghost"
                  size="icon"
                  accessibilityLabel={`Remove ${entry.itemName}`}
                  onPress={() => handleDelete(entry.id)}
                >
                  <Trash2 size={16} color={p.mutedForeground} />
                </Button>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
