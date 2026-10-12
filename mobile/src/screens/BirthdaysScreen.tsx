import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ApiError } from '../api/client';
import { getBirthdays, type BirthdayItem } from '../api/birthdays';
import type { AppStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Birthdays'>;

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export default function BirthdaysScreen({ navigation }: Props) {
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [items, setItems] = useState<BirthdayItem[]>([]);
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

  const load = useCallback(
    async (opts: { background?: boolean } = {}) => {
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
        const data = await getBirthdays(month);
        if (!isMounted.current || requestId !== latestRequestId.current) return;
        setItems(data);
      } catch (e) {
        if (!isMounted.current || requestId !== latestRequestId.current) return;
        setError(e instanceof ApiError ? describeError(e) : 'Could not load birthdays. Pull down to retry.');
      } finally {
        if (isMounted.current && requestId === latestRequestId.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [month],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const goToPreviousMonth = () => setMonth((m) => (m === 1 ? 12 : m - 1));
  const goToNextMonth = () => setMonth((m) => (m === 12 ? 1 : m + 1));

  return (
    <View style={styles.container}>
      <View style={styles.monthRow}>
        <Pressable onPress={goToPreviousMonth} hitSlop={8} style={styles.monthArrow}>
          <Text style={styles.monthArrowText}>‹</Text>
        </Pressable>
        <Text style={styles.monthLabel}>{MONTH_NAMES[month - 1]}</Text>
        <Pressable onPress={goToNextMonth} hitSlop={8} style={styles.monthArrow}>
          <Text style={styles.monthArrowText}>›</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator />
        </View>
      ) : (
        <>
          {error && items.length > 0 ? <Text style={styles.errorBanner}>{error}</Text> : null}
          <FlatList
            testID="birthdays-list"
            data={items}
            keyExtractor={(item) => String(item.person_id)}
            renderItem={({ item }) => (
              <BirthdayRow
                item={item}
                onPress={() => navigation.navigate('FriendForm', { friendId: item.friend_id })}
              />
            )}
            contentContainerStyle={items.length === 0 ? styles.emptyContent : styles.listContent}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => load({ background: true })} />}
            ListEmptyComponent={
              <Text style={styles.emptyText}>{error ?? 'No birthdays this month.'}</Text>
            }
          />
        </>
      )}
    </View>
  );
}

function BirthdayRow({ item, onPress }: { item: BirthdayItem; onPress: () => void }) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.rowHeader}>
        <Text style={styles.name}>{item.person_name}</Text>
        <Text style={styles.date}>{`${item.birth_month}/${item.birth_day}`}</Text>
      </View>
      <Text style={styles.friend}>{item.friend_display_name}</Text>
      <Text style={styles.meta}>{describeTiming(item)}</Text>
    </Pressable>
  );
}

function describeTiming(item: BirthdayItem): string {
  const age = item.turning_age !== null ? `Turning ${item.turning_age}` : null;
  const timing = describeDaysUntil(item.days_until);
  return age ? `${age} · ${timing}` : timing;
}

function describeDaysUntil(daysUntil: number): string {
  if (daysUntil === 0) return 'Today!';
  if (daysUntil > 0) return daysUntil === 1 ? 'In 1 day' : `In ${daysUntil} days`;
  const daysAgo = Math.abs(daysUntil);
  return daysAgo === 1 ? '1 day ago' : `${daysAgo} days ago`;
}

function describeError(error: ApiError): string {
  if (error.status === 401) return 'Your session expired. Please log in again.';
  return typeof error.detail === 'string' ? error.detail : 'Something went wrong. Try again.';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 20,
  },
  monthArrow: { paddingHorizontal: 12, paddingVertical: 4 },
  monthArrowText: { fontSize: 22, color: '#2f6fed', fontWeight: '700' },
  monthLabel: { fontSize: 18, fontWeight: '700', minWidth: 110, textAlign: 'center' },
  listContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24 },
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
  date: { fontSize: 14, color: '#888', fontWeight: '600' },
  friend: { fontSize: 13, color: '#888', marginTop: 4 },
  meta: { fontSize: 14, color: '#2f6fed', marginTop: 4, fontWeight: '600' },
});
