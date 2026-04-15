import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Share2, UtensilsCrossed, Users } from 'lucide-react-native';

import { useAuth } from '@/components/auth/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { logAppError, toUserErrorMessage } from '@/lib/app-errors';
import { getFamily, getFamilySharedItems, getSavedItems, postFamilySharedItem } from '@/lib/api';
import { showToast } from '@/lib/toast';
import { useThemePalette } from '@/lib/use-theme-palette';

import type { FamilySharedItemWithId, FamilyWithId, SavedItemWithId } from '@/types';

type SharedItemsListProps = {
  familyId: string;
};

export function SharedItemsList({ familyId }: SharedItemsListProps) {
  const p = useThemePalette();
  const [sharedItems, setSharedItems] = useState<FamilySharedItemWithId[]>([]);
  const [family, setFamily] = useState<FamilyWithId | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    async function load() {
      if (!familyId) return;
      setLoading(true);
      try {
        const [items, familyData] = await Promise.all([
          getFamilySharedItems(familyId),
          getFamily(familyId),
        ]);
        setSharedItems(items);
        setFamily(familyData);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [familyId]);

  async function refreshItems() {
    const items = await getFamilySharedItems(familyId);
    setSharedItems(items);
  }

  if (loading) {
    return (
      <View className="items-center py-8">
        <ActivityIndicator color={p.primary} />
      </View>
    );
  }

  return (
    <View className="gap-4">
      <View className="flex-row items-center justify-between rounded-xl border border-border/50 bg-card p-4 shadow-sm dark:border-darkBorder dark:bg-darkCard">
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-lg bg-primary/10 dark:bg-darkPrimary/10">
            <Users size={20} color={p.primary} />
          </View>
          <View>
            <Text className="font-semibold text-foreground dark:text-darkForeground">{family?.name ?? 'Family'}</Text>
            <Text className="text-xs text-muted-foreground dark:text-darkMutedForeground">
              {family?.members?.length ?? 0} member{(family?.members?.length ?? 0) !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
        {family?.inviteCode ? (
          <View className="items-end">
            <Text className="text-xs text-muted-foreground dark:text-darkMutedForeground">Invite code</Text>
            <Text className="text-sm font-bold tracking-wider text-foreground dark:text-darkForeground">
              {family.inviteCode}
            </Text>
          </View>
        ) : null}
      </View>

      <Button className="w-full" onPress={() => setShareOpen(true)}>
        <View className="flex-row items-center justify-center gap-2">
          <Share2 size={16} color={p.primaryForeground} />
          <Text className="font-semibold text-primary-foreground dark:text-darkPrimaryForeground">Share an item</Text>
        </View>
      </Button>

      <View className="gap-3">
        <Text className="text-sm font-semibold text-foreground dark:text-darkForeground">Shared items</Text>
        {sharedItems.length === 0 ? (
          <View className="items-center gap-2 rounded-xl border border-dashed border-border py-8 dark:border-darkBorder">
            <UtensilsCrossed size={32} color={p.mutedForeground} />
            <Text className="text-center text-sm text-muted-foreground dark:text-darkMutedForeground">
              No shared items yet. Share your favorite meals with the family!
            </Text>
          </View>
        ) : (
          <View className="gap-2">
            {sharedItems.map((item) => (
              <View
                key={item.id}
                className="flex-row items-center justify-between rounded-xl border border-border/50 bg-card px-4 py-3 shadow-sm dark:border-darkBorder dark:bg-darkCard"
              >
                <View className="gap-0.5">
                  <Text className="text-sm font-medium text-foreground dark:text-darkForeground">{item.itemName}</Text>
                  <Text className="text-xs text-muted-foreground dark:text-darkMutedForeground">
                    Shared by {item.sharedByName}
                  </Text>
                </View>
                <Text className="text-sm font-semibold text-foreground dark:text-darkForeground">
                  ~{item.defaultCalories} cal
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <ShareItemModal
        open={shareOpen}
        onOpenChange={setShareOpen}
        familyId={familyId}
        onSuccess={refreshItems}
      />
    </View>
  );
}

function ShareItemModal({
  open,
  onOpenChange,
  familyId,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  familyId: string;
  onSuccess: () => void;
}) {
  const { user } = useAuth();
  const [myItems, setMyItems] = useState<SavedItemWithId[]>([]);
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [calories, setCalories] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && user) {
      void getSavedItems().then(setMyItems);
    }
  }, [open, user]);

  function selectMyItem(item: SavedItemWithId) {
    setItemName(item.itemName);
    setQuantity(String(item.defaultQuantity));
    setCalories(String(item.defaultCalories));
  }

  async function handleShare() {
    if (!user || !itemName.trim() || !calories) return;
    setLoading(true);
    try {
      await postFamilySharedItem(familyId, {
        itemName: itemName.trim(),
        defaultQuantity: Number(quantity) || 1,
        defaultCalories: Number(calories),
        sharedByName: user.displayName || 'A family member',
      });
      showToast('Item shared with family!', 'success');
      onSuccess();
      onOpenChange(false);
      setItemName('');
      setQuantity('1');
      setCalories('');
    } catch (err) {
      logAppError('family/share-item', err);
      showToast(toUserErrorMessage(err, 'Could not share item'), 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={() => onOpenChange(false)}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={() => onOpenChange(false)}>
        <Pressable className="max-h-[85%] rounded-t-3xl bg-card p-4 dark:bg-darkCard" onPress={(e) => e.stopPropagation()}>
          <Text className="text-xl font-semibold text-foreground dark:text-darkForeground">Share an item</Text>
          <Text className="mt-1 text-sm text-muted-foreground dark:text-darkMutedForeground">
            Share a food item with your family. Only the item name and calories are shared.
          </Text>

          <ScrollView className="mt-4 max-h-96" keyboardShouldPersistTaps="handled">
            {myItems.length > 0 ? (
              <View className="mb-4 gap-2">
                <Label>From my items</Label>
                <View className="flex-row flex-wrap gap-2">
                  {myItems.slice(0, 6).map((item) => (
                    <Pressable
                      key={item.id}
                      className={`rounded-full border px-3 py-1.5 ${
                        itemName === item.itemName
                          ? 'border-primary bg-primary/5 dark:border-darkPrimary dark:bg-darkPrimary/5'
                          : 'border-border dark:border-darkBorder'
                      }`}
                      onPress={() => selectMyItem(item)}
                    >
                      <Text className="text-xs font-medium text-foreground dark:text-darkForeground">{item.itemName}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            <View className="gap-4">
              <View className="gap-2">
                <Label>Item name</Label>
                <Input placeholder="e.g. Chicken sandwich" value={itemName} onChangeText={setItemName} />
              </View>
              <View className="flex-row gap-3">
                <View className="flex-1 gap-2">
                  <Label>Quantity</Label>
                  <Input keyboardType="decimal-pad" value={quantity} onChangeText={setQuantity} />
                </View>
                <View className="flex-1 gap-2">
                  <Label>Calories</Label>
                  <Input keyboardType="number-pad" placeholder="e.g. 400" value={calories} onChangeText={setCalories} />
                </View>
              </View>
            </View>
          </ScrollView>

          <View className="mt-4 flex-row gap-2">
            <Button variant="outline" className="flex-1" onPress={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button className="flex-1" disabled={loading || !itemName.trim() || !calories} onPress={handleShare}>
              {loading ? 'Sharing...' : 'Share'}
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
