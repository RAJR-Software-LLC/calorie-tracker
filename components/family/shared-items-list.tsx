import { Share2, Users, UtensilsCrossed } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { useAuth } from '@/components/auth/auth-provider';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  getFamily,
  getFamilySharedItems,
  getMe,
  getSavedItems,
  postFamilySharedItem,
} from '@/lib/api';
import { logAppError, toUserErrorMessage } from '@/lib/app-errors';
import { showToast } from '@/lib/toast';
import { useThemePalette } from '@/lib/use-theme-palette';

import type {
  FamilySharedItemWithId,
  FamilyWithId,
  SavedItemWithId,
  UserProfilePhotoWithDownload,
} from '@/types';

type SharedItemsListProps = {
  familyId: string;
};

function toDownloadPhoto(profilePhoto: unknown): UserProfilePhotoWithDownload | null {
  if (
    profilePhoto &&
    typeof profilePhoto === 'object' &&
    'downloadUrl' in profilePhoto &&
    typeof profilePhoto.downloadUrl === 'string' &&
    profilePhoto.downloadUrl.length > 0
  ) {
    return profilePhoto as UserProfilePhotoWithDownload;
  }
  return null;
}

export function SharedItemsList({ familyId }: SharedItemsListProps) {
  const p = useThemePalette();
  const { user } = useAuth();
  const [sharedItems, setSharedItems] = useState<FamilySharedItemWithId[]>([]);
  const [family, setFamily] = useState<FamilyWithId | null>(null);
  const [mePhoto, setMePhoto] = useState<UserProfilePhotoWithDownload | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const hasRetriedAvatarRefreshRef = useRef(false);

  useEffect(() => {
    async function load() {
      if (!familyId) return;
      setLoading(true);
      hasRetriedAvatarRefreshRef.current = false;
      try {
        const [items, familyData, me] = await Promise.all([
          getFamilySharedItems(familyId),
          getFamily(familyId),
          getMe(),
        ]);
        setSharedItems(items);
        setFamily(familyData);
        setMePhoto(toDownloadPhoto(me?.profilePhoto));
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [familyId]);

  async function refreshFamily() {
    const familyData = await getFamily(familyId);
    setFamily(familyData);
  }

  async function refreshMePhoto() {
    const me = await getMe();
    setMePhoto(toDownloadPhoto(me?.profilePhoto));
  }

  async function handleAvatarRefreshNeeded() {
    if (hasRetriedAvatarRefreshRef.current) return;
    hasRetriedAvatarRefreshRef.current = true;
    try {
      await Promise.all([refreshFamily(), refreshMePhoto()]);
    } catch {
      // Keep existing avatar fallback UI if refresh fails.
    }
  }

  async function refreshItems() {
    const items = await getFamilySharedItems(familyId);
    setSharedItems(items);
  }

  const displayMembers =
    family?.memberProfiles?.map((profile) => ({
      uid: profile.uid,
      displayName: profile.displayName,
      photoUrl: profile.profilePhoto?.downloadUrl ?? null,
    })) ??
    family?.members?.map((uid) => ({
      uid,
      displayName: null,
      photoUrl: null,
    })) ??
    [];

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
            <Text className="font-semibold text-foreground dark:text-darkForeground">
              {family?.name ?? 'Family'}
            </Text>
            <Text className="text-xs text-muted-foreground dark:text-darkMutedForeground">
              {family?.members?.length ?? 0} member{(family?.members?.length ?? 0) !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
        {family?.inviteCode ? (
          <View className="items-end">
            <Text className="text-xs text-muted-foreground dark:text-darkMutedForeground">
              Invite code
            </Text>
            <Text className="text-sm font-bold tracking-wider text-foreground dark:text-darkForeground">
              {family.inviteCode}
            </Text>
          </View>
        ) : null}
      </View>

      <Button className="w-full" onPress={() => setShareOpen(true)}>
        <View className="flex-row items-center justify-center gap-2">
          <Share2 size={16} color={p.primaryForeground} />
          <Text className="font-semibold text-primary-foreground dark:text-darkPrimaryForeground">
            Share an item
          </Text>
        </View>
      </Button>

      <View className="gap-3">
        <Text className="text-sm font-semibold text-foreground dark:text-darkForeground">
          Family members
        </Text>
        {displayMembers.length === 0 ? (
          <View className="rounded-xl border border-dashed border-border px-4 py-3 dark:border-darkBorder">
            <Text className="text-sm text-muted-foreground dark:text-darkMutedForeground">
              No members found.
            </Text>
          </View>
        ) : (
          <View className="gap-2">
            {displayMembers.map((member) => {
              const displayName = member.displayName?.trim() || '';
              const isCurrentUser = user?.uid === member.uid;
              const rowLabel = isCurrentUser ? 'Me' : displayName || 'Unknown member';
              const avatarName = displayName || null;
              const avatarPhoto = member.photoUrl
                ? { downloadUrl: member.photoUrl }
                : isCurrentUser
                  ? mePhoto
                  : null;
              return (
                <View
                  key={member.uid}
                  className="flex-row items-center gap-3 rounded-xl border border-border/50 bg-card px-4 py-3 shadow-sm dark:border-darkBorder dark:bg-darkCard"
                >
                  <Avatar
                    size={36}
                    name={avatarName}
                    photo={avatarPhoto}
                    onRefreshNeeded={handleAvatarRefreshNeeded}
                  />
                  <Text className="flex-1 text-sm font-medium text-foreground dark:text-darkForeground">
                    {rowLabel}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      <View className="gap-3">
        <Text className="text-sm font-semibold text-foreground dark:text-darkForeground">
          Shared items
        </Text>
        {sharedItems.length === 0 ? (
          <View className="items-center gap-2 rounded-xl border border-dashed border-border py-8 dark:border-darkBorder">
            <UtensilsCrossed size={32} color={p.mutedForeground} />
            <Text className="text-center text-sm text-muted-foreground dark:text-darkMutedForeground">
              No shared items yet.
              {'\n'}
              Share your favorite meals with the family!
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
                  <Text className="text-sm font-medium text-foreground dark:text-darkForeground">
                    {item.itemName}
                  </Text>
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
    <Modal
      visible={open}
      animationType="slide"
      transparent
      onRequestClose={() => onOpenChange(false)}
    >
      <Pressable className="flex-1 justify-end bg-black/40" onPress={() => onOpenChange(false)}>
        <Pressable
          className="h-[80%] rounded-t-3xl bg-card p-4 dark:bg-darkCard"
          onPress={(e) => e.stopPropagation()}
        >
          <Text className="text-xl font-semibold text-foreground dark:text-darkForeground">
            Share an item
          </Text>
          <Text className="mt-1 text-sm text-muted-foreground dark:text-darkMutedForeground">
            Share a food item with your family. Only the item name and calories are shared.
          </Text>

          <ScrollView className="mt-4 flex-1" keyboardShouldPersistTaps="handled">
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
                      <Text className="text-xs font-medium text-foreground dark:text-darkForeground">
                        {item.itemName}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            <View className="gap-4">
              <View className="gap-2">
                <Label>Item name</Label>
                <Input
                  placeholder="e.g. Chicken sandwich"
                  value={itemName}
                  onChangeText={setItemName}
                />
              </View>
              <View className="flex-row gap-3">
                <View className="flex-1 gap-2">
                  <Label>Quantity</Label>
                  <Input keyboardType="decimal-pad" value={quantity} onChangeText={setQuantity} />
                </View>
                <View className="flex-1 gap-2">
                  <Label>Calories</Label>
                  <Input
                    keyboardType="number-pad"
                    placeholder="e.g. 400"
                    value={calories}
                    onChangeText={setCalories}
                  />
                </View>
              </View>
            </View>
          </ScrollView>

          <View className="mt-4 flex-row gap-2">
            <Button variant="outline" className="flex-1" onPress={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={loading || !itemName.trim() || !calories}
              onPress={handleShare}
            >
              {loading ? 'Sharing...' : 'Share'}
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
