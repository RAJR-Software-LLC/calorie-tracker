import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import { Dumbbell, Plus, Trash2 } from 'lucide-react-native';

import { useAuth } from '@/components/auth/auth-provider';
import { useDashboard } from '@/components/dashboard/dashboard-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { logAppError, toUserErrorMessage } from '@/lib/app-errors';
import { deleteExercise, postExercise } from '@/lib/api';
import { showToast } from '@/lib/toast';
import { useThemePalette } from '@/lib/use-theme-palette';

type ExerciseSectionProps = {
  date: string;
};

export function ExerciseSection({ date }: ExerciseSectionProps) {
  const p = useThemePalette();
  const { user } = useAuth();
  const { exercises, refreshExercises } = useDashboard();
  const [open, setOpen] = useState(false);

  async function handleDelete(exerciseId: string) {
    if (!user) return;
    try {
      await deleteExercise(exerciseId);
      await refreshExercises();
      showToast('Exercise removed', 'success');
    } catch (err) {
      logAppError('dashboard/exercise/delete', err);
      showToast(toUserErrorMessage(err, 'Could not remove exercise'), 'error');
    }
  }

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-foreground dark:text-darkForeground">Exercise</Text>
        <Pressable className="flex-row items-center gap-1" onPress={() => setOpen(true)}>
          <Plus size={16} color={p.primary} />
          <Text className="text-sm font-medium text-primary dark:text-darkPrimary">Log exercise</Text>
        </Pressable>
      </View>

      {exercises.length > 0 && (
        <View className="gap-2">
          {exercises.map((ex) => (
            <View
              key={ex.id}
              className="flex-row items-center justify-between rounded-xl border border-border/50 bg-card px-4 py-3 shadow-sm dark:border-darkBorder dark:bg-darkCard"
            >
              <View className="flex-row items-center gap-2">
                <Dumbbell size={16} color={p.mutedForeground} />
                <Text className="text-sm font-medium text-foreground dark:text-darkForeground">{ex.name}</Text>
              </View>
              <View className="flex-row items-center gap-3">
                <Text className="text-sm font-semibold text-primary dark:text-darkPrimary">-{ex.caloriesBurned} cal</Text>
                <Button
                  variant="ghost"
                  size="icon"
                  accessibilityLabel={`Remove ${ex.name}`}
                  onPress={() => handleDelete(ex.id)}
                >
                  <Trash2 size={16} color={p.mutedForeground} />
                </Button>
              </View>
            </View>
          ))}
        </View>
      )}

      <ExerciseModal open={open} onOpenChange={setOpen} date={date} />
    </View>
  );
}

function ExerciseModal({
  open,
  onOpenChange,
  date,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
}) {
  const { user } = useAuth();
  const { refreshExercises } = useDashboard();
  const [name, setName] = useState('');
  const [caloriesBurned, setCaloriesBurned] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!user || !name.trim() || !caloriesBurned) return;
    setLoading(true);
    try {
      await postExercise({
        date,
        name: name.trim(),
        caloriesBurned: Number(caloriesBurned),
      });
      await refreshExercises();
      showToast('Exercise logged!', 'success');
      setName('');
      setCaloriesBurned('');
      onOpenChange(false);
    } catch (err) {
      logAppError('dashboard/exercise/post', err);
      showToast(toUserErrorMessage(err, 'Could not log exercise'), 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={() => onOpenChange(false)}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end bg-black/40"
      >
        <Pressable className="flex-1" onPress={() => onOpenChange(false)} />
        <View className="rounded-t-3xl bg-card p-4 dark:bg-darkCard">
          <Text className="text-xl font-semibold text-foreground dark:text-darkForeground">Log exercise</Text>
          <Text className="mt-1 text-sm text-muted-foreground dark:text-darkMutedForeground">
            Add calories you burned
          </Text>
          <View className="mt-4 gap-4">
            <View className="gap-2">
              <Label>Activity</Label>
              <Input placeholder="e.g. 30 min run" value={name} onChangeText={setName} />
            </View>
            <View className="gap-2">
              <Label>Estimated calories burned</Label>
              <Input
                keyboardType="number-pad"
                placeholder="e.g. 250"
                value={caloriesBurned}
                onChangeText={setCaloriesBurned}
              />
            </View>
            <Button disabled={loading} className="w-full" onPress={handleSubmit}>
              {loading ? 'Logging...' : 'Log exercise'}
            </Button>
            <Button variant="outline" onPress={() => onOpenChange(false)}>
              Cancel
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
