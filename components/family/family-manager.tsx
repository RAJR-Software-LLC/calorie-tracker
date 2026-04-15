import { useState } from 'react';
import { Text, View } from 'react-native';
import { Plus, UserPlus, Users } from 'lucide-react-native';

import { useAuth } from '@/components/auth/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { logAppError, toUserErrorMessage } from '@/lib/app-errors';
import { postFamily, postJoinFamily } from '@/lib/api';
import { showToast } from '@/lib/toast';
import { useThemePalette } from '@/lib/use-theme-palette';

type FamilyManagerProps = {
  onFamilyJoined: () => void;
};

export function FamilyManager({ onFamilyJoined }: FamilyManagerProps) {
  const p = useThemePalette();
  const { user } = useAuth();
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!user || !familyName.trim()) return;
    setLoading(true);
    try {
      const result = await postFamily({ name: familyName.trim() });
      showToast(`Family created! Invite code: ${result.inviteCode}`, 'success');
      onFamilyJoined();
    } catch (err) {
      logAppError('family/create', err);
      showToast(toUserErrorMessage(err, 'Could not create family'), 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!user || !inviteCode.trim()) return;
    setLoading(true);
    try {
      const result = await postJoinFamily({ inviteCode: inviteCode.trim().toUpperCase() });
      showToast(`Joined ${result.name}!`, 'success');
      onFamilyJoined();
    } catch (err) {
      logAppError('family/join', err);
      showToast(toUserErrorMessage(err, 'Could not join family'), 'error');
    } finally {
      setLoading(false);
    }
  }

  if (mode === 'choose') {
    return (
      <View className="gap-4">
        <View className="items-center">
          <View className="mb-3 h-12 w-12 items-center justify-center rounded-xl bg-primary/10 dark:bg-darkPrimary/10">
            <Users size={24} color={p.primary} />
          </View>
          <Text className="text-lg font-semibold text-foreground dark:text-darkForeground">Family sharing</Text>
          <Text className="mt-1 text-center text-sm text-muted-foreground dark:text-darkMutedForeground">
            Share food items with your family. Daily entries and calorie totals stay private.
          </Text>
        </View>

        <Button size="lg" className="w-full flex-row gap-3 py-6" onPress={() => setMode('create')}>
          <Plus size={20} color={p.primaryForeground} />
          <View className="flex-1 items-start">
            <Text className="font-semibold text-primary-foreground dark:text-darkPrimaryForeground">Create a family</Text>
            <Text className="text-xs text-primary-foreground/80 dark:text-darkPrimaryForeground/80">
              Start a new group and invite others
            </Text>
          </View>
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="w-full flex-row gap-3 py-6"
          onPress={() => setMode('join')}
        >
          <UserPlus size={20} color={p.primary} />
          <View className="flex-1 items-start">
            <Text className="font-semibold text-foreground dark:text-darkForeground">Join a family</Text>
            <Text className="text-xs text-muted-foreground dark:text-darkMutedForeground">Enter an invite code</Text>
          </View>
        </Button>
      </View>
    );
  }

  if (mode === 'create') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Create your family</CardTitle>
          <CardDescription>Give your family group a name</CardDescription>
        </CardHeader>
        <CardContent className="gap-4">
          <View className="gap-2">
            <Label>Family name</Label>
            <Input placeholder="e.g. The Smiths" value={familyName} onChangeText={setFamilyName} />
          </View>
          <View className="flex-row gap-2">
            <Button variant="outline" className="flex-1" onPress={() => setMode('choose')}>
              Back
            </Button>
            <Button className="flex-1" disabled={loading || !familyName.trim()} onPress={handleCreate}>
              {loading ? 'Creating...' : 'Create'}
            </Button>
          </View>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Join a family</CardTitle>
        <CardDescription>Enter the invite code shared with you</CardDescription>
      </CardHeader>
      <CardContent className="gap-4">
        <View className="gap-2">
          <Label>Invite code</Label>
          <Input
            autoCapitalize="characters"
            placeholder="e.g. ABC123"
            value={inviteCode}
            onChangeText={(t) => setInviteCode(t.toUpperCase())}
            maxLength={6}
            className="text-center text-lg font-bold tracking-widest"
          />
        </View>
        <View className="flex-row gap-2">
          <Button variant="outline" className="flex-1" onPress={() => setMode('choose')}>
            Back
          </Button>
          <Button className="flex-1" disabled={loading || !inviteCode.trim()} onPress={handleJoin}>
            {loading ? 'Joining...' : 'Join'}
          </Button>
        </View>
      </CardContent>
    </Card>
  );
}
