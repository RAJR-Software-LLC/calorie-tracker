import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { useAuth } from '@/components/auth/auth-provider';
import { FamilyManager } from '@/components/family/family-manager';
import { SharedItemsList } from '@/components/family/shared-items-list';
import { AppScreen } from '@/components/layout/app-screen';
import { logAppError } from '@/lib/app-errors';
import { getMe } from '@/lib/api';
import { useThemePalette } from '@/lib/use-theme-palette';

export default function FamilyScreen() {
  const p = useThemePalette();
  const { user } = useAuth();
  const [version, setVersion] = useState(0);
  const [familyId, setFamilyId] = useState<string | null | undefined>(undefined);

  const load = useCallback(async () => {
    if (!user) {
      setFamilyId(undefined);
      return;
    }
    try {
      const me = await getMe();
      setFamilyId(me?.familyId ?? null);
    } catch (err) {
      logAppError('family/screen-loadMe', err);
      setFamilyId(null);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load, version]);

  const onFamilyJoined = useCallback(() => {
    setVersion((v) => v + 1);
  }, []);

  return (
    <AppScreen>
      <View className="gap-1">
        <Text className="text-lg font-semibold text-foreground dark:text-darkForeground">Family</Text>
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
        <SharedItemsList familyId={familyId} />
      )}
    </AppScreen>
  );
}
