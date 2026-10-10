import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ApiError } from '../api/client';
import { getReminders, type ReminderItem } from '../api/reminders';
import type { AppStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Reminders'>;

export default function RemindersScreen({ navigation }: Props) {
  const [items, setItems] = useState<ReminderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Same overlapping-request/unmount guard as FriendListScreen's load().
  const latestRequestId = useRef(0);
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const load = useCallback(async (opts: { background?: boolean } = {}) => {
    const requestId = ++latestRequestId.current;
    if (opts.background) {
      setIsRefreshing(true);
      setIsLoading(false);
    } else {
      setIsLoading(true);
      setIsRefreshing(false);
    }
    setError(null);
    try {
      const data = await getReminders();
      if (!isMounted.current || requestId !== latestRequestId.current) return;
      setItems(data);
    } catch (e) {
      if (!isMounted.current || requestId !== latestRequestId.current) return;
      setError(e instanceof ApiError ? describeError(e) : 'Could not load reminders. Pull down to retry.');
    } finally {
      if (isMounted.current && requestId === latestRequestId.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, []);

  // Refetches on focus so logging a gathering from here (or from the friend list)
  // makes the reminder for that friend/type disappear without a manual pull-to-refresh.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error && items.length > 0 ? <Text style={styles.errorBanner}>{error}</Text> : null}
      <FlatList
        testID="reminders-list"
        data={items}
        keyExtractor={(item) => `${item.friend_id}-${item.gathering_type_id}`}
        renderItem={({ item }) => (
          <ReminderRow
            item={item}
            onPress={() => navigation.navigate('FriendForm', { friendId: item.friend_id })}
            onLogGathering={() =>
              navigation.navigate('LogGathering', { friendId: item.friend_id, gatheringTypeId: item.gathering_type_id })
            }
          />
        )}
        contentContainerStyle={items.length === 0 ? styles.emptyContent : styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => load({ background: true })} />}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {error ?? "You're all caught up! No overdue gatherings right now."}
          </Text>
        }
      />
    </View>
  );
}

function ReminderRow({
  item,
  onPress,
  onLogGathering,
}: {
  item: ReminderItem;
  onPress: () => void;
  onLogGathering: () => void;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.rowHeader}>
        <Text style={styles.name}>{item.friend_display_name}</Text>
        <Pressable onPress={onLogGathering} hitSlop={8} style={styles.logButton}>
          <Text style={styles.logButtonText}>Log gathering</Text>
        </Pressable>
      </View>
      <Text style={styles.type}>{item.gathering_type_label}</Text>
      <Text style={styles.meta}>{describeOverdue(item)}</Text>
    </Pressable>
  );
}

function describeOverdue(item: ReminderItem): string {
  if (item.last_gathering_date === null) return 'Never met up';
  const days = item.days_overdue ?? 0;
  return days === 1 ? '1 day overdue' : `${days} days overdue`;
}

function describeError(error: ApiError): string {
  if (error.status === 401) return 'Your session expired. Please log in again.';
  return typeof error.detail === 'string' ? error.detail : 'Something went wrong. Try again.';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },
  emptyContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 32 },
  emptyText: { textAlign: 'center', color: '#666', fontSize: 15, lineHeight: 22 },
  errorBanner: {
    color: '#d33',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  row: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 17, fontWeight: '700', flexShrink: 1 },
  logButton: { backgroundColor: '#eef3fd', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  logButtonText: { color: '#2f6fed', fontSize: 12, fontWeight: '600' },
  type: { fontSize: 13, color: '#888', marginTop: 4 },
  meta: { fontSize: 14, color: '#d9822b', marginTop: 4, fontWeight: '600' },
});
