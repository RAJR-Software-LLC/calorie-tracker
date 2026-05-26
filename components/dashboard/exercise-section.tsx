import { useRouter } from 'expo-router';
import { ChevronRight, Dumbbell, Plus, Trash2 } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { useAuth } from '@/components/auth/auth-provider';
import { useDashboard } from '@/components/dashboard/dashboard-context';
import { Button } from '@/components/ui/button';
import { deleteExercise } from '@/lib/api';
import { logAppError, toUserErrorMessage } from '@/lib/app-errors';
import { showToast } from '@/lib/toast';
import { useThemePalette } from '@/lib/use-theme-palette';

type ExerciseSectionProps = {
  date: string;
};

export function ExerciseSection({ date: _date }: ExerciseSectionProps) {
  const p = useThemePalette();
  const router = useRouter();
  const { user } = useAuth();
  const { exercises, refreshExercises, habits } = useDashboard();

  if (habits.exerciseTrackingEnabled === false) {
    return null;
  }

  function openExerciseTab(): void {
    router.push('/(tabs)/exercise');
  }

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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open exercise tab"
          className="flex-row items-center gap-2"
          onPress={openExerciseTab}
        >
          <Dumbbell size={18} color={p.primary} />
          <Text className="text-sm font-semibold text-foreground dark:text-darkForeground">
            {"Today's exercise"}
          </Text>
          <ChevronRight size={16} color={p.mutedForeground} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add exercise on exercise tab"
          className="flex-row items-center gap-1"
          onPress={openExerciseTab}
        >
          <Plus size={16} color={p.primary} />
          <Text className="text-sm font-medium text-primary dark:text-darkPrimary">Add</Text>
        </Pressable>
      </View>

      {exercises.length > 0 ? (
        <View className="gap-2">
          {exercises.map((ex) => (
            <View
              key={ex.id}
              className="flex-row items-center justify-between rounded-xl border border-border/50 bg-card px-4 py-3 shadow-sm dark:border-darkBorder dark:bg-darkCard"
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open exercise tab for ${ex.name}`}
                className="min-w-0 flex-1 flex-row items-center gap-2"
                onPress={openExerciseTab}
              >
                <Dumbbell size={16} color={p.mutedForeground} />
                <Text
                  className="min-w-0 flex-1 text-sm font-medium text-foreground dark:text-darkForeground"
                  numberOfLines={1}
                >
                  {ex.name}
                </Text>
              </Pressable>
              <View className="flex-row items-center gap-3">
                <Text className="text-sm font-semibold text-primary dark:text-darkPrimary">
                  -{ex.caloriesBurned} cal
                </Text>
                <Button
                  variant="ghost"
                  size="icon"
                  accessibilityLabel={`Remove ${ex.name}`}
                  onPress={() => void handleDelete(ex.id)}
                >
                  <Trash2 size={16} color={p.mutedForeground} />
                </Button>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log your first exercise"
          className="rounded-xl border border-dashed border-border/70 bg-card px-4 py-3 dark:border-darkBorder dark:bg-darkCard"
          onPress={openExerciseTab}
        >
          <Text className="text-sm text-muted-foreground dark:text-darkMutedForeground">
            No workouts logged today. Tap to add on the Exercise tab.
          </Text>
        </Pressable>
      )}
    </View>
  );
}
