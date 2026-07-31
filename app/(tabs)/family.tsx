import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/components/auth/auth-provider';
import { FamilyManager } from '@/components/family/family-manager';
import { SharedItemsList } from '@/components/family/shared-items-list';
import { AppScreen } from '@/components/layout/app-screen';
import { invalidateMe, queryKeys, useMe } from '@/lib/queries';
import { useThemePalette } from '@/lib/use-theme-palette';

export default function FamilyScreen() {
  const p = useThemePalette();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [version, setVersion] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const { data: profile, isPending, refetch } = useMe();

  const onFamilyJoined = useCallback(() => {
    setVersion((v) => v + 1);
    void refetch();
  }, [refetch]);

  const familyId = user ? (isPending ? undefined : (profile?.familyId ?? null)) : undefined;

  const onRefresh = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      const fid = profile?.familyId ?? null;
      await Promise.all([
        invalidateMe(queryClient, user.uid),
        fid
          ? queryClient.invalidateQueries({ queryKey: queryKeys.family(user.uid, fid) })
          : Promise.resolve(),
        fid
          ? queryClient.invalidateQueries({
              queryKey: queryKeys.familySharedItems(user.uid, fid),
            })
          : Promise.resolve(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [queryClient, user, profile?.familyId]);

  return (
    <AppScreen
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />
      }
    >
      <View className="gap-1">
        <Text className="text-lg font-semibold text-foreground dark:text-darkForeground">
          Family
        </Text>
        <Text className="text-sm text-muted-foreground dark:text-darkMutedForeground">
          Share saved items with your household.
        </Text>
      </View>

      {familyId === undefined ? (
        <View className="items-center py-12">
          <ActivityIndicator color={p.primary} />
        </View>
      ) : !familyId ? (
        <FamilyManager onFamilyJoined={onFamilyJoined} />
      ) : (
        <SharedItemsList key={version} familyId={familyId} />
      )}
    </AppScreen>
  );
}
