import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/components/auth/auth-provider';
import { ApiError } from '@/lib/api/errors';
import { logAppError, toUserErrorMessage } from '@/lib/app-errors';
import { formatDate, formatDateInTimeZone } from '@/lib/date';
import {
  invalidateMe,
  queryKeys,
  useEntries,
  useExercise,
  useFamilySharedItems,
  useMe,
  useSavedItems,
  useWaterDaily,
} from '@/lib/queries';
import { showToast } from '@/lib/toast';
import { mergeUserHabits } from '@/lib/utils/user-habits';
import type {
  CalorieEntryWithId,
  CalorieGoal,
  ExerciseWithId,
  FamilySharedItemWithId,
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
  familySharedItems: FamilySharedItemWithId[];
  familyId: string | null;
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
  refreshDayData: () => Promise<void>;
  /** Refetch today's day queries only when already stale (tab focus). */
  refreshDayDataIfStale: () => Promise<void>;
  refreshAll: () => Promise<void>;
  updateSavedItemLocally: (itemId: string, patch: Partial<SavedItemWithId>) => void;
  removeSavedItemLocally: (itemId: string) => void;
}

const DashboardContext = createContext<DashboardContextType | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: profile, isPending: mePending } = useMe();

  const calendarDay = useMemo(() => {
    const tz = profile?.notifications?.timezone;
    if (!tz) return formatDate(new Date());
    return formatDateInTimeZone(new Date(), tz);
  }, [profile?.notifications?.timezone]);

  const habits = useMemo(() => mergeUserHabits(profile?.habits), [profile?.habits]);
  const familyId = profile?.familyId ?? null;
  const calorieGoal = profile?.calorieGoal ?? null;
  const maintenanceCalories = profile?.maintenanceCalories ?? null;

  const waterEnabled = habits.waterTrackingEnabled !== false;
  const exerciseEnabled = habits.exerciseTrackingEnabled !== false;

  const entriesQuery = useEntries(calendarDay);
  const waterQuery = useWaterDaily(calendarDay, waterEnabled);
  const exerciseQuery = useExercise(calendarDay, exerciseEnabled);
  const savedItemsQuery = useSavedItems();
  const familySharedQuery = useFamilySharedItems(familyId);

  const entries = entriesQuery.data ?? [];
  const exercises = exerciseEnabled ? (exerciseQuery.data ?? []) : [];
  const savedItems = savedItemsQuery.data ?? [];
  const familySharedItems = familySharedQuery.data ?? [];
  const waterDaily = waterEnabled ? (waterQuery.data ?? null) : null;

  useEffect(() => {
    if (!waterQuery.error || !waterEnabled) return;
    const err = waterQuery.error;
    logAppError('dashboard/getMeWater', err, {
      date: calendarDay,
      timezone: profile?.notifications?.timezone ?? 'UTC',
    });
    if (err instanceof ApiError && (err.status === 400 || err.status === 422)) {
      showToast(
        toUserErrorMessage(
          err,
          'Could not load water for this day. Check your profile timezone in Settings.'
        ),
        'error'
      );
    }
  }, [waterQuery.error, waterEnabled, calendarDay, profile?.notifications?.timezone]);

  const loading =
    !!user &&
    (mePending ||
      (entriesQuery.isPending && entriesQuery.data === undefined) ||
      (savedItemsQuery.isPending && savedItemsQuery.data === undefined));

  const invalidateEntries = useCallback(async () => {
    if (!user) return;
    await queryClient.invalidateQueries({
      queryKey: queryKeys.entries(user.uid, calendarDay),
    });
  }, [queryClient, user, calendarDay]);

  const invalidateWater = useCallback(async () => {
    if (!user) return;
    await queryClient.invalidateQueries({
      queryKey: queryKeys.water(user.uid, calendarDay),
    });
  }, [queryClient, user, calendarDay]);

  const invalidateExercises = useCallback(async () => {
    if (!user) return;
    await queryClient.invalidateQueries({
      queryKey: queryKeys.exercise(user.uid, calendarDay),
    });
  }, [queryClient, user, calendarDay]);

  const refreshSavedItems = useCallback(async () => {
    if (!user) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.savedItems(user.uid) }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.familySharedItems(user.uid, familyId),
      }),
    ]);
  }, [queryClient, user, familyId]);

  const refreshDayData = useCallback(async () => {
    if (!user) return;
    await Promise.all([invalidateEntries(), invalidateWater(), invalidateExercises()]);
  }, [user, invalidateEntries, invalidateWater, invalidateExercises]);

  const refreshDayDataIfStale = useCallback(async () => {
    if (!user) return;
    await Promise.all([
      queryClient.refetchQueries({
        queryKey: queryKeys.entries(user.uid, calendarDay),
        stale: true,
      }),
      queryClient.refetchQueries({
        queryKey: queryKeys.water(user.uid, calendarDay),
        stale: true,
      }),
      queryClient.refetchQueries({
        queryKey: queryKeys.exercise(user.uid, calendarDay),
        stale: true,
      }),
    ]);
  }, [queryClient, user, calendarDay]);

  const refreshAll = useCallback(async () => {
    if (!user) return;
    try {
      await Promise.all([
        invalidateMe(queryClient, user.uid),
        refreshDayData(),
        refreshSavedItems(),
      ]);
    } catch (err) {
      logAppError('dashboard/refreshAll', err);
      showToast(
        toUserErrorMessage(err, "Couldn't load today's data. Pull to refresh or try again."),
        'error'
      );
    }
  }, [user, queryClient, refreshDayData, refreshSavedItems]);

  const updateSavedItemLocally = useCallback(
    (itemId: string, patch: Partial<SavedItemWithId>) => {
      if (!user) return;
      queryClient.setQueryData<SavedItemWithId[]>(queryKeys.savedItems(user.uid), (prev) =>
        (prev ?? []).map((item) => (item.id === itemId ? { ...item, ...patch } : item))
      );
    },
    [queryClient, user]
  );

  const removeSavedItemLocally = useCallback(
    (itemId: string) => {
      if (!user) return;
      queryClient.setQueryData<SavedItemWithId[]>(queryKeys.savedItems(user.uid), (prev) =>
        (prev ?? []).filter((item) => item.id !== itemId)
      );
    },
    [queryClient, user]
  );

  const totalCalories = entries.reduce((sum, e) => sum + (e.estimatedCalories || 0), 0);
  const exerciseCalories = exercises.reduce((sum, e) => sum + (e.caloriesBurned || 0), 0);

  const value = useMemo(
    () => ({
      calendarDay,
      entries,
      exercises,
      savedItems,
      familySharedItems,
      familyId,
      totalCalories,
      exerciseCalories,
      calorieGoal,
      maintenanceCalories,
      habits,
      waterDaily,
      loading,
      refreshEntries: invalidateEntries,
      refreshExercises: invalidateExercises,
      refreshSavedItems,
      refreshWater: invalidateWater,
      refreshDayData,
      refreshDayDataIfStale,
      refreshAll,
      updateSavedItemLocally,
      removeSavedItemLocally,
    }),
    [
      calendarDay,
      entries,
      exercises,
      savedItems,
      familySharedItems,
      familyId,
      totalCalories,
      exerciseCalories,
      calorieGoal,
      maintenanceCalories,
      habits,
      waterDaily,
      loading,
      invalidateEntries,
      invalidateExercises,
      refreshSavedItems,
      invalidateWater,
      refreshDayData,
      refreshDayDataIfStale,
      refreshAll,
      updateSavedItemLocally,
      removeSavedItemLocally,
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
