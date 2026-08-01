import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { MessageSquarePlus } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';

import { FeedbackListItem } from '@/components/feedback/feedback-list-item';
import { AppScreen } from '@/components/layout/app-screen';
import { Button } from '@/components/ui/button';
import { logAppError, toUserErrorMessage } from '@/lib/app-errors';
import { toFeedbackLoadErrorMessage } from '@/lib/feedback/errors';
import { FEEDBACK_STATUS_LABELS } from '@/lib/feedback/labels';
import { useDeleteFeedbackMutation, useFeedbackList } from '@/lib/queries';
import { showToast } from '@/lib/toast';
import { useThemePalette } from '@/lib/use-theme-palette';
import type { FeedbackStatus } from '@/types';

type StatusFilter = FeedbackStatus | 'all';

type DeleteMutate = ReturnType<typeof useDeleteFeedbackMutation>['mutate'];

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: FEEDBACK_STATUS_LABELS.open },
  { key: 'in_progress', label: FEEDBACK_STATUS_LABELS.in_progress },
  { key: 'resolved', label: FEEDBACK_STATUS_LABELS.resolved },
  { key: 'closed', label: FEEDBACK_STATUS_LABELS.closed },
];

function confirmDeleteFeedback(feedbackId: string, mutate: DeleteMutate): void {
  Alert.alert('Delete report?', 'This removes the report from your list. You cannot undo this.', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Delete',
      style: 'destructive',
      onPress: () => {
        mutate(feedbackId, {
          onError: (err) => {
            logAppError('feedback.delete', err, { feedbackId });
            showToast(toUserErrorMessage(err, "Couldn't delete report"), 'error');
          },
          onSuccess: () => showToast('Report deleted', 'success'),
        });
      },
    },
  ]);
}

export default function FeedbackListScreen() {
  const router = useRouter();
  const p = useThemePalette();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const listQuery = useFeedbackList(statusFilter);
  const deleteMutation = useDeleteFeedbackMutation();
  const refetchList = listQuery.refetch;

  useFocusEffect(
    useCallback(() => {
      void refetchList();
    }, [refetchList])
  );

  useEffect(() => {
    if (listQuery.isError) {
      logAppError('feedback.list', listQuery.error, { statusFilter });
    }
  }, [listQuery.isError, listQuery.error, statusFilter]);

  const items = listQuery.data ?? [];
  const isInitialLoading = listQuery.isLoading && !listQuery.data;

  return (
    <AppScreen scroll={false} showHeader={false}>
      <Stack.Screen
        options={{
          title: 'Feedback',
          headerBackTitle: 'Settings',
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      <View className="mb-3 flex-row flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const selected = statusFilter === filter.key;
          return (
            <Pressable
              key={filter.key}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setStatusFilter(filter.key)}
              className={`rounded-xl px-3 py-2 ${
                selected
                  ? 'bg-primary dark:bg-darkPrimary'
                  : 'border border-border bg-card dark:border-darkBorder dark:bg-darkCard'
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  selected
                    ? 'text-primary-foreground dark:text-darkPrimaryForeground'
                    : 'text-foreground dark:text-darkForeground'
                }`}
              >
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isInitialLoading ? (
        <View className="flex-1 items-center justify-center py-16">
          <ActivityIndicator size="large" color={p.primary} />
        </View>
      ) : listQuery.isError ? (
        <View className="flex-1 items-center justify-center gap-3 py-16">
          <Text className="text-center text-sm text-muted-foreground dark:text-darkMutedForeground">
            {toFeedbackLoadErrorMessage(listQuery.error)}
          </Text>
          <Button variant="outline" onPress={() => void listQuery.refetch()}>
            Try again
          </Button>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 12, paddingBottom: 120, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={listQuery.isRefetching && !listQuery.isLoading}
              onRefresh={() => void listQuery.refetch()}
              tintColor={p.primary}
            />
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center gap-3 px-4 py-16">
              <Text className="text-center text-base font-semibold text-foreground dark:text-darkForeground">
                No reports yet
              </Text>
              <Text className="text-center text-sm leading-5 text-muted-foreground dark:text-darkMutedForeground">
                Send feedback about a bug, request a feature, or share anything else. Examples:
                login issues, calorie math questions, or a wishlist item.
              </Text>
              <Button onPress={() => router.push('/feedback-new')}>New report</Button>
            </View>
          }
          renderItem={({ item }) => (
            <View className="gap-2">
              <FeedbackListItem
                item={item}
                onPress={() => router.push(`/feedback-detail/${item.id}`)}
              />
              <Pressable
                accessibilityRole="button"
                onPress={() => confirmDeleteFeedback(item.id, deleteMutation.mutate)}
                className="self-end px-1 py-1"
              >
                <Text className="text-xs font-medium text-destructive dark:text-darkDestructiveForeground">
                  Delete
                </Text>
              </Pressable>
            </View>
          )}
        />
      )}

      {items.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="New report"
          onPress={() => router.push('/feedback-new')}
          className="absolute bottom-8 right-4 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-md dark:bg-darkPrimary"
        >
          <MessageSquarePlus size={24} color="#fff" />
        </Pressable>
      ) : null}
    </AppScreen>
  );
}
