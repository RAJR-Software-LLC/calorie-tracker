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
import { getEntries, getExerciseForDate, getMe, getMeWater, getSavedItems } from '@/lib/api';
import { ApiError } from '@/lib/api/errors';
import { logAppError, toUserErrorMessage } from '@/lib/app-errors';
import { formatDate, formatDateInTimeZone } from '@/lib/date';
import { getFirebaseIdTokenForApi } from '@/lib/firebase';
import { showToast } from '@/lib/toast';
import { mergeUserHabits } from '@/lib/utils/user-habits';
import type {
  CalorieEntryWithId,
  CalorieGoal,
  ExerciseWithId,
  SavedItemWithId,
  UserHabits,
  WaterDailyWithId,
} from '@/types';

interface DashboardContextType {
  /** `YYYY-MM-DD` for entries, exercise, and water (aligned with `notifications.timezone` after load). */
  calendarDay: string;
  entries: CalorieEntryWithId[];
  exercises: ExerciseWithId[];
  savedItems: SavedItemWithId[];
  totalCalories: number;
  exerciseCalories: number;
  calorieGoal: CalorieGoal | null;
  maintenanceCalories: number | null;
  habits: UserHabits;
  waterDaily: WaterDailyWithId | null;
  loading: boolean;
  refreshEntries: () => Promise<void>;
  refreshExercises: () => Promise<void>;
  refreshSavedItems: () => Promise<void>;
  refreshWater: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

const DashboardContext = createContext<DashboardContextType | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<CalorieEntryWithId[]>([]);
  const [exercises, setExercises] = useState<ExerciseWithId[]>([]);
  const [savedItems, setSavedItems] = useState<SavedItemWithId[]>([]);
  const [calorieGoal, setCalorieGoal] = useState<CalorieGoal | null>(null);
  const [maintenanceCalories, setMaintenanceCalories] = useState<number | null>(null);
  const [habits, setHabits] = useState<UserHabits>(() => mergeUserHabits(undefined));
  const [waterDaily, setWaterDaily] = useState<WaterDailyWithId | null>(null);
  const [loading, setLoading] = useState(true);
  const [calendarDay, setCalendarDay] = useState(() => formatDate(new Date()));

  const refreshEntries = useCallback(async () => {
    if (!user) return;
    const data = await getEntries({ date: calendarDay });
    setEntries(data);
  }, [user, calendarDay]);

  const refreshExercises = useCallback(async () => {
    if (!user) return;
    if (habits.exerciseTrackingEnabled === false) {
      setExercises([]);
      return;
    }
    const data = await getExerciseForDate(calendarDay);
    setExercises(data);
  }, [user, calendarDay, habits.exerciseTrackingEnabled]);

  const refreshWater = useCallback(async () => {
    if (!user) return;
    if (habits.waterTrackingEnabled === false) {
      setWaterDaily(null);
      return;
    }
    const row = await getMeWater({ date: calendarDay });
    setWaterDaily(row);
  }, [user, calendarDay, habits.waterTrackingEnabled]);

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
      const profile = await getMe();
      const tz = profile?.notifications?.timezone ?? 'UTC';
      const day = formatDateInTimeZone(new Date(), tz);
      setCalendarDay(day);

      const h = mergeUserHabits(profile?.habits);
      setHabits(h);

      const [entriesData, savedData] = await Promise.all([
        getEntries({ date: day }),
        getSavedItems(),
      ]);
      setEntries(entriesData);
      setSavedItems(savedData);
      setCalorieGoal(profile?.calorieGoal ?? null);
      setMaintenanceCalories(profile?.maintenanceCalories ?? null);

      const exercisesData =
        h.exerciseTrackingEnabled === false ? [] : await getExerciseForDate(day);
      setExercises(exercisesData);

      let waterRow: WaterDailyWithId | null = null;
      if (h.waterTrackingEnabled !== false) {
        try {
          waterRow = await getMeWater({ date: day });
        } catch (err) {
          logAppError('dashboard/getMeWater', err, { date: day, timezone: tz });
          if (err instanceof ApiError && (err.status === 400 || err.status === 422)) {
            showToast(
              toUserErrorMessage(
                err,
                'Could not load water for this day. Check your profile timezone in Settings.'
              ),
              'error'
            );
          } else {
            throw err;
          }
        }
      }
      setWaterDaily(waterRow);
    } catch (err) {
      logAppError('dashboard/refreshAll', err);
      showToast(
        toUserErrorMessage(err, "Couldn't load today's data. Pull to refresh or try again."),
        'error'
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setEntries([]);
      setExercises([]);
      setSavedItems([]);
      setCalorieGoal(null);
      setMaintenanceCalories(null);
      setHabits(mergeUserHabits(undefined));
      setWaterDaily(null);
      setCalendarDay(formatDate(new Date()));
      setLoading(false);
      return;
    }
    void refreshAll();
  }, [user, refreshAll]);

  const totalCalories = entries.reduce((sum, e) => sum + (e.estimatedCalories || 0), 0);
  const exerciseCalories = exercises.reduce((sum, e) => sum + (e.caloriesBurned || 0), 0);

  const value = useMemo(
    () => ({
      calendarDay,
      entries,
      exercises,
      savedItems,
      totalCalories,
      exerciseCalories,
      calorieGoal,
      maintenanceCalories,
      habits,
      waterDaily,
      loading,
      refreshEntries,
      refreshExercises,
      refreshSavedItems,
      refreshWater,
      refreshAll,
    }),
    [
      calendarDay,
      entries,
      exercises,
      savedItems,
      totalCalories,
      exerciseCalories,
      calorieGoal,
      maintenanceCalories,
      habits,
      waterDaily,
      loading,
      refreshEntries,
      refreshExercises,
      refreshSavedItems,
      refreshWater,
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
