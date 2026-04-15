import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useAuth } from '@/components/auth/auth-provider';
import {
  getEntries,
  getExerciseForDate,
  getMe,
  getSavedItems,
} from '@/lib/api';
import { logAppError, toUserErrorMessage } from '@/lib/app-errors';
import { formatDate } from '@/lib/date';
import { getFirebaseIdTokenForApi } from '@/lib/firebase';
import { showToast } from '@/lib/toast';
import type { CalorieEntryWithId, ExerciseWithId, SavedItemWithId } from '@/types';

interface DashboardContextType {
  entries: CalorieEntryWithId[];
  exercises: ExerciseWithId[];
  savedItems: SavedItemWithId[];
  totalCalories: number;
  exerciseCalories: number;
  goalCalories: number | null;
  maintenanceCalories: number | null;
  loading: boolean;
  refreshEntries: () => Promise<void>;
  refreshExercises: () => Promise<void>;
  refreshSavedItems: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

const DashboardContext = createContext<DashboardContextType | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<CalorieEntryWithId[]>([]);
  const [exercises, setExercises] = useState<ExerciseWithId[]>([]);
  const [savedItems, setSavedItems] = useState<SavedItemWithId[]>([]);
  const [goalCalories, setGoalCalories] = useState<number | null>(null);
  const [maintenanceCalories, setMaintenanceCalories] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const today = useMemo(() => formatDate(new Date()), []);

  const refreshEntries = useCallback(async () => {
    if (!user) return;
    const data = await getEntries({ date: today });
    setEntries(data);
  }, [user, today]);

  const refreshExercises = useCallback(async () => {
    if (!user) return;
    const data = await getExerciseForDate(today);
    setExercises(data);
  }, [user, today]);

  const refreshSavedItems = useCallback(async () => {
    if (!user) return;
    const data = await getSavedItems();
    setSavedItems(data);
  }, [user]);

  const refreshAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      await getFirebaseIdTokenForApi({ forceRefresh: true });
      const [entriesData, exercisesData, savedData, profile] = await Promise.all([
        getEntries({ date: today }),
        getExerciseForDate(today),
        getSavedItems(),
        getMe(),
      ]);
      setEntries(entriesData);
      setExercises(exercisesData);
      setSavedItems(savedData);
      setGoalCalories(profile?.goalCalories ?? null);
      setMaintenanceCalories(profile?.maintenanceCalories ?? null);
    } catch (err) {
      logAppError('dashboard/refreshAll', err);
      showToast(toUserErrorMessage(err, "Couldn't load today's data. Pull to refresh or try again."), 'error');
    } finally {
      setLoading(false);
    }
  }, [user, today]);

  useEffect(() => {
    if (!user) {
      setEntries([]);
      setExercises([]);
      setSavedItems([]);
      setGoalCalories(null);
      setMaintenanceCalories(null);
      setLoading(false);
      return;
    }
    void refreshAll();
  }, [user, refreshAll]);

  const totalCalories = entries.reduce((sum, e) => sum + (e.estimatedCalories || 0), 0);
  const exerciseCalories = exercises.reduce((sum, e) => sum + (e.caloriesBurned || 0), 0);

  const value = useMemo(
    () => ({
      entries,
      exercises,
      savedItems,
      totalCalories,
      exerciseCalories,
      goalCalories,
      maintenanceCalories,
      loading,
      refreshEntries,
      refreshExercises,
      refreshSavedItems,
      refreshAll,
    }),
    [
      entries,
      exercises,
      savedItems,
      totalCalories,
      exerciseCalories,
      goalCalories,
      maintenanceCalories,
      loading,
      refreshEntries,
      refreshExercises,
      refreshSavedItems,
      refreshAll,
    ]
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard(): DashboardContextType {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error('useDashboard must be used within DashboardProvider');
  }
  return ctx;
}
