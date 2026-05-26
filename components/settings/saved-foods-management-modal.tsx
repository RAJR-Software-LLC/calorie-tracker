import { Pencil, Trash2, UtensilsCrossed } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/components/auth/auth-provider';
import { useDashboard } from '@/components/dashboard/dashboard-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { deleteSavedItem, getSavedItems, patchSavedItem } from '@/lib/api';
import { logAppError, toUserErrorMessage } from '@/lib/app-errors';
import { showToast } from '@/lib/toast';
import {
  classifySavedItemMutationError,
  formatSavedItemCaloriesForList,
  isKnownCalories,
  isPersonalItemSharedWithFamily,
  sortSavedItemsForManagement,
  toIfUnmodifiedSince,
} from '@/lib/utils/saved-items';
import { useThemePalette } from '@/lib/use-theme-palette';
import type { PatchSavedItemBody, SavedItemWithId } from '@/types';

export type SavedFoodsManagementModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SavedFoodsManagementModal({ open, onOpenChange }: SavedFoodsManagementModalProps) {
  const p = useThemePalette();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const {
    savedItems,
    familySharedItems,
    refreshSavedItems,
    updateSavedItemLocally,
    removeSavedItemLocally,
  } = useDashboard();
  const [loading, setLoading] = useState(false);
  const [editingItem, setEditingItem] = useState<SavedItemWithId | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const sortedItems = useMemo(() => sortSavedItemsForManagement(savedItems), [savedItems]);

  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        await refreshSavedItems();
      } catch (err) {
        logAppError('settings/saved-foods/load', err);
        if (!cancelled) {
          showToast(toUserErrorMessage(err, 'Could not load saved foods.'), 'error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, refreshSavedItems, user]);

  const performDelete = useCallback(
    async (item: SavedItemWithId) => {
      setDeletingId(item.id);
      try {
        await deleteSavedItem(item.id, toIfUnmodifiedSince(item.updatedAt));
        removeSavedItemLocally(item.id);
        showToast('Saved food removed.', 'success');
      } catch (err) {
        const kind = classifySavedItemMutationError(err);
        logAppError('settings/saved-foods/delete', err, { itemId: item.id, kind });
        if (kind === 'stale' || kind === 'missing_concurrency') {
          showToast('This item was updated elsewhere. Refreshing — try again.', 'error');
          await refreshSavedItems();
        } else if (kind === 'not_found') {
          removeSavedItemLocally(item.id);
          showToast('This saved food is no longer available.', 'error');
          await refreshSavedItems();
        } else {
          showToast(toUserErrorMessage(err, 'Could not delete saved food.'), 'error');
        }
      } finally {
        setDeletingId(null);
      }
    },
    [refreshSavedItems, removeSavedItemLocally]
  );

  const handleDeletePress = useCallback(
    (item: SavedItemWithId) => {
      const shared = isPersonalItemSharedWithFamily(item, familySharedItems, user?.uid);
      if (shared) {
        Alert.alert(
          'Delete shared food?',
          `"${item.itemName}" is shared with your family. Deleting removes it from your saved list only — family members will still see the shared copy.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () => void performDelete(item),
            },
          ]
        );
        return;
      }
      void performDelete(item);
    },
    [familySharedItems, performDelete, user?.uid]
  );

  return (
    <>
      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => onOpenChange(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-end bg-black/40"
        >
          <Pressable className="flex-1" onPress={() => onOpenChange(false)} />
          <View
            className="max-h-[90%] rounded-t-3xl bg-card px-4 pt-4 dark:bg-darkCard"
            style={{ paddingBottom: insets.bottom + 24 }}
          >
            <Text className="text-2xl font-semibold text-foreground dark:text-darkForeground">
              Saved foods
            </Text>
            <Text className="mt-1 text-sm text-muted-foreground dark:text-darkMutedForeground">
              Edit or remove personal items. Add new ones when logging a meal.
            </Text>

            {loading ? (
              <View className="items-center py-12">
                <ActivityIndicator color={p.primary} />
              </View>
            ) : sortedItems.length === 0 ? (
              <View className="items-center gap-3 py-12">
                <UtensilsCrossed size={36} color={p.mutedForeground} />
                <Text className="text-center text-sm text-muted-foreground dark:text-darkMutedForeground">
                  No saved foods yet.{'\n'}
                  Log a meal on the Dashboard and turn on{'\n'}
                  &quot;Save to My Items&quot; to create one.
                </Text>
              </View>
            ) : (
              <ScrollView className="mt-4 max-h-[420px]" keyboardShouldPersistTaps="handled">
                <View className="gap-2">
                  {sortedItems.map((item) => {
                    const caloriesLabel = formatSavedItemCaloriesForList(item.defaultCalories);
                    const isUnknown = !isKnownCalories(item.defaultCalories);
                    const isDeleting = deletingId === item.id;
                    return (
                      <View
                        key={item.id}
                        className="flex-row items-center gap-2 rounded-xl border border-border/50 bg-background px-3 py-3 dark:border-darkBorder dark:bg-darkBackground"
                      >
                        <View className="min-w-0 flex-1">
                          <Text
                            className="text-sm font-medium text-foreground dark:text-darkForeground"
                            numberOfLines={1}
                          >
                            {item.itemName}
                          </Text>
                          <Text
                            className={`text-xs ${isUnknown ? 'text-muted-foreground dark:text-darkMutedForeground' : 'text-foreground dark:text-darkForeground'}`}
                          >
                            Qty {item.defaultQuantity} · {caloriesLabel}
                          </Text>
                        </View>
                        <Pressable
                          accessibilityLabel={`Edit ${item.itemName}`}
                          onPress={() => setEditingItem(item)}
                          className="rounded-lg p-2 active:opacity-70"
                          disabled={isDeleting}
                        >
                          <Pencil size={18} color={p.primary} />
                        </Pressable>
                        <Pressable
                          accessibilityLabel={`Delete ${item.itemName}`}
                          onPress={() => handleDeletePress(item)}
                          className="rounded-lg p-2 active:opacity-70"
                          disabled={isDeleting}
                        >
                          {isDeleting ? (
                            <ActivityIndicator size="small" color={p.destructive} />
                          ) : (
                            <Trash2 size={18} color={p.destructive} />
                          )}
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            )}

            <Button variant="outline" className="mt-4" onPress={() => onOpenChange(false)}>
              Close
            </Button>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <EditSavedFoodModal
        item={editingItem}
        onOpenChange={(next) => {
          if (!next) setEditingItem(null);
        }}
        onSaved={async (itemId, patch) => {
          updateSavedItemLocally(itemId, patch);
          setEditingItem(null);
          try {
            const fresh = await getSavedItems();
            const updated = fresh.find((row) => row.id === itemId);
            if (updated) {
              updateSavedItemLocally(itemId, updated);
            }
          } catch (err) {
            logAppError('settings/saved-foods/sync-after-save', err);
          }
        }}
        onStale={async () => {
          showToast('This item was updated elsewhere. Refreshing — try again.', 'error');
          await refreshSavedItems();
          setEditingItem(null);
        }}
        onNotFound={async (itemId) => {
          removeSavedItemLocally(itemId);
          showToast('This saved food is no longer available.', 'error');
          await refreshSavedItems();
          setEditingItem(null);
        }}
      />
    </>
  );
}

type EditSavedFoodModalProps = {
  item: SavedItemWithId | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (itemId: string, patch: Partial<SavedItemWithId>) => void;
  onStale: () => void | Promise<void>;
  onNotFound: (itemId: string) => void | Promise<void>;
};

function EditSavedFoodModal({
  item,
  onOpenChange,
  onSaved,
  onStale,
  onNotFound,
}: EditSavedFoodModalProps) {
  const insets = useSafeAreaInsets();
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [caloriesUnknown, setCaloriesUnknown] = useState(false);
  const [calories, setCalories] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [caloriesError, setCaloriesError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!item) return;
    setItemName(item.itemName);
    setQuantity(String(item.defaultQuantity));
    if (isKnownCalories(item.defaultCalories)) {
      setCaloriesUnknown(false);
      setCalories(String(item.defaultCalories));
    } else {
      setCaloriesUnknown(true);
      setCalories('');
    }
    setNameError(null);
    setCaloriesError(null);
  }, [item]);

  async function handleSave() {
    if (!item) return;
    setNameError(null);
    setCaloriesError(null);

    const trimmedName = itemName.trim();
    if (!trimmedName) {
      setNameError('Enter a name.');
      return;
    }

    const qtyRaw = Number(String(quantity).trim());
    if (!Number.isFinite(qtyRaw) || qtyRaw <= 0) {
      setCaloriesError('Enter a valid quantity.');
      return;
    }

    let defaultCalories: number | 'unknown';
    if (caloriesUnknown) {
      defaultCalories = 'unknown';
    } else {
      const calRaw = Number(String(calories).trim());
      if (!Number.isFinite(calRaw) || calRaw < 0 || !Number.isInteger(calRaw)) {
        setCaloriesError('Enter a valid calorie amount.');
        return;
      }
      defaultCalories = calRaw;
    }

    const body: PatchSavedItemBody = {};
    if (trimmedName !== item.itemName) body.itemName = trimmedName;
    if (qtyRaw !== item.defaultQuantity) body.defaultQuantity = qtyRaw;
    if (defaultCalories !== item.defaultCalories) body.defaultCalories = defaultCalories;

    if (Object.keys(body).length === 0) {
      onOpenChange(false);
      return;
    }

    setSaving(true);
    try {
      await patchSavedItem(item.id, body, toIfUnmodifiedSince(item.updatedAt));
      onSaved(item.id, {
        itemName: trimmedName,
        defaultQuantity: qtyRaw,
        defaultCalories,
      });
      showToast('Saved food updated.', 'success');
    } catch (err) {
      const kind = classifySavedItemMutationError(err);
      logAppError('settings/saved-foods/edit', err, { itemId: item.id, kind });
      if (kind === 'duplicate_name') {
        setNameError('You already have a saved food with this name.');
      } else if (kind === 'stale' || kind === 'missing_concurrency') {
        await onStale();
      } else if (kind === 'not_found') {
        await onNotFound(item.id);
      } else {
        showToast(toUserErrorMessage(err, 'Could not save changes.'), 'error');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      visible={item != null}
      animationType="slide"
      transparent
      onRequestClose={() => onOpenChange(false)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end bg-black/40"
      >
        <Pressable className="flex-1" onPress={() => onOpenChange(false)} />
        <View
          className="rounded-t-3xl bg-card px-4 pt-4 dark:bg-darkCard"
          style={{ paddingBottom: insets.bottom + 24 }}
        >
          <Text className="text-xl font-semibold text-foreground dark:text-darkForeground">
            Edit saved food
          </Text>

          <View className="mt-4 gap-4">
            <View className="gap-2">
              <Label>Item name</Label>
              <Input value={itemName} onChangeText={setItemName} placeholder="e.g. Chicken sandwich" />
              {nameError ? <Text className="text-sm text-destructive">{nameError}</Text> : null}
            </View>

            <View className="gap-2">
              <Label>Default quantity</Label>
              <Input
                keyboardType="decimal-pad"
                value={quantity}
                onChangeText={setQuantity}
                placeholder="1"
              />
            </View>

            <View className="flex-row items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5 dark:bg-darkMuted">
              <Switch
                value={caloriesUnknown}
                onValueChange={(next) => {
                  setCaloriesUnknown(next);
                  setCaloriesError(null);
                }}
              />
              <Text className="flex-1 text-sm text-muted-foreground dark:text-darkMutedForeground">
                Calories unknown
              </Text>
            </View>

            {!caloriesUnknown ? (
              <View className="gap-2">
                <Label>Default calories (per unit)</Label>
                <Input
                  keyboardType="number-pad"
                  value={calories}
                  onChangeText={setCalories}
                  placeholder="e.g. 400"
                />
                {caloriesError ? (
                  <Text className="text-sm text-destructive">{caloriesError}</Text>
                ) : null}
              </View>
            ) : caloriesError ? (
              <Text className="text-sm text-destructive">{caloriesError}</Text>
            ) : null}
          </View>

          <View className="mt-6 flex-row gap-2">
            <Button variant="outline" className="flex-1" onPress={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button className="flex-1" disabled={saving} onPress={() => void handleSave()}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export { EditSavedFoodModal };
