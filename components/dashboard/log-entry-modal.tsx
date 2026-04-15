import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';
import { format, parseISO } from 'date-fns';
import { Plus, Search } from 'lucide-react-native';

import { useAuth } from '@/components/auth/auth-provider';
import { useDashboard } from '@/components/dashboard/dashboard-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { logAppError, toUserErrorMessage } from '@/lib/app-errors';
import { patchSavedItemUsage, postEntry, postSavedItem } from '@/lib/api';
import { getAfterLogMessage } from '@/lib/utils/messages';
import { showToast } from '@/lib/toast';
import { useThemePalette } from '@/lib/use-theme-palette';

export type LogEntryModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  onLogged?: () => void;
};

export function LogEntryModal({ open, onOpenChange, date, onLogged }: LogEntryModalProps) {
  const isToday = date === new Date().toISOString().split('T')[0];
  const dateLabel = isToday ? 'today' : format(parseISO(date), 'MMM d');

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={() => onOpenChange(false)}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end bg-black/40"
      >
        <Pressable className="flex-1" onPress={() => onOpenChange(false)} />
        <View className="max-h-[90%] rounded-t-3xl bg-card p-4 dark:bg-darkCard">
          <Text className="text-2xl font-semibold text-foreground dark:text-darkForeground">Log a meal</Text>
          <Text className="mt-1 text-sm text-muted-foreground dark:text-darkMutedForeground">
            Logging for {dateLabel}
          </Text>
          <ScrollView className="mt-4" keyboardShouldPersistTaps="handled">
            <LogEntryForm
              date={date}
              onSuccess={() => {
                onLogged?.();
                onOpenChange(false);
              }}
            />
          </ScrollView>
          <Button variant="outline" className="mt-4" onPress={() => onOpenChange(false)}>
            Cancel
          </Button>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function LogEntryForm({ date, onSuccess }: { date: string; onSuccess: () => void }) {
  const p = useThemePalette();
  const { user } = useAuth();
  const { savedItems, refreshEntries, refreshSavedItems } = useDashboard();
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [calories, setCalories] = useState('');
  const [saveItem, setSaveItem] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredItems = savedItems.filter((item) =>
    item.itemName.toLowerCase().includes(itemName.toLowerCase())
  );

  function selectSavedItem(item: (typeof savedItems)[0]) {
    setItemName(item.itemName);
    setQuantity(String(item.defaultQuantity));
    setCalories(String(item.defaultCalories));
    setShowSuggestions(false);
  }

  async function handleSubmit() {
    if (!user || !itemName.trim()) return;

    const qtyRaw = Number(String(quantity).trim());
    const qty = Number.isFinite(qtyRaw) && qtyRaw > 0 ? qtyRaw : 1;

    const calStr = String(calories).trim();
    if (!calStr) {
      showToast('Enter estimated calories.', 'error');
      return;
    }
    const calRaw = Number(calStr);
    if (!Number.isFinite(calRaw) || calRaw < 0) {
      showToast('Enter a valid calorie amount.', 'error');
      return;
    }

    setLoading(true);
    try {
      await postEntry({
        date,
        itemName: itemName.trim(),
        quantity: qty,
        estimatedCalories: calRaw,
      });

      const matchingItem = savedItems.find(
        (item) => item.itemName.toLowerCase() === itemName.trim().toLowerCase()
      );
      if (matchingItem) {
        await patchSavedItemUsage(matchingItem.id);
      } else if (saveItem) {
        await postSavedItem({
          itemName: itemName.trim(),
          defaultQuantity: qty,
          defaultCalories: calRaw,
        });
        await refreshSavedItems();
      }

      await refreshEntries();
      showToast(getAfterLogMessage(), 'success');
      setItemName('');
      setQuantity('1');
      setCalories('');
      setSaveItem(false);
      onSuccess();
    } catch (err) {
      logAppError('dashboard/log-entry', err);
      showToast(toUserErrorMessage(err, 'Could not log entry. Please try again.'), 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="gap-4">
      <View className="relative z-10">
        <Label>What did you eat?</Label>
        <View className="relative mt-2">
          <View className="pointer-events-none absolute inset-y-0 left-3 z-10 justify-center">
            <Search size={16} color={p.mutedForeground} />
          </View>
          <Input
            className="pl-9"
            placeholder="e.g. Chicken sandwich"
            value={itemName}
            onChangeText={(t) => {
              setItemName(t);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          />
        </View>
        {showSuggestions && itemName.length > 0 && filteredItems.length > 0 && (
          <View className="absolute left-0 right-0 top-[76px] z-20 rounded-lg border border-border bg-background shadow-lg dark:border-darkBorder dark:bg-darkBackground">
            {filteredItems.slice(0, 5).map((item) => (
              <Pressable
                key={item.id}
                className="flex-row items-center justify-between px-3 py-2"
                onPress={() => selectSavedItem(item)}
              >
                <Text className="text-sm text-foreground dark:text-darkForeground">{item.itemName}</Text>
                <Text className="text-xs text-muted-foreground dark:text-darkMutedForeground">
                  ~{item.defaultCalories} cal
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1 gap-2">
          <Label>Quantity</Label>
          <Input
            keyboardType="decimal-pad"
            placeholder="1"
            value={quantity}
            onChangeText={setQuantity}
          />
        </View>
        <View className="flex-1 gap-2">
          <Label>Estimated calories</Label>
          <Input
            keyboardType="number-pad"
            placeholder="e.g. 400"
            value={calories}
            onChangeText={setCalories}
          />
        </View>
      </View>

      <View className="flex-row items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5 dark:bg-darkMuted">
        <Switch value={saveItem} onValueChange={setSaveItem} />
        <Text className="flex-1 text-sm text-muted-foreground dark:text-darkMutedForeground">
          Save to My Items for quick reuse
        </Text>
      </View>

      <Button disabled={loading} className="w-full" onPress={handleSubmit}>
        <View className="flex-row items-center justify-center gap-2">
          <Plus size={16} color={p.primaryForeground} />
          <Text className="text-base font-semibold text-primary-foreground dark:text-darkPrimaryForeground">
            {loading ? 'Logging...' : 'Log it'}
          </Text>
        </View>
      </Button>
    </View>
  );
}
