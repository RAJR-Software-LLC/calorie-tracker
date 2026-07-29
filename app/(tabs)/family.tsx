import { useCallback, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { useAuth } from '@/components/auth/auth-provider';
import { FamilyManager } from '@/components/family/family-manager';
import { SharedItemsList } from '@/components/family/shared-items-list';
import { AppScreen } from '@/components/layout/app-screen';
import { useMe } from '@/lib/queries';
import { useThemePalette } from '@/lib/use-theme-palette';

export default function FamilyScreen() {
  const p = useThemePalette();
  const { user } = useAuth();
  const [version, setVersion] = useState(0);
  const { data: profile, isPending, refetch } = useMe();

  const onFamilyJoined = useCallback(() => {
    setVersion((v) => v + 1);
    void refetch();
  }, [refetch]);

  const familyId = user ? (isPending ? undefined : (profile?.familyId ?? null)) : undefined;

  return (
    <AppScreen>
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
