import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import { ChipRow } from '../components/Chips';
import {
  getInvitePlanning,
  type GatheringTypeFilter,
  type InvitePlanningItem,
  type InvitePlanningSort,
} from '../api/invitePlanning';
import type { AppStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'FriendList'>;

const SORT_OPTIONS: { value: InvitePlanningSort; label: string }[] = [
  { value: 'staleness', label: 'Longest since' },
  { value: 'combined', label: 'Combined score' },
  { value: 'kids_fit', label: 'Kids fit' },
  { value: 'adult_fit', label: 'Adult fit' },
];

const GATHERING_TYPE_OPTIONS: { value: GatheringTypeFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'FAMILY', label: 'Family' },
  { value: 'MEN_1_1', label: 'Men 1:1' },
  { value: 'WOMEN_1_1', label: 'Women 1:1' },
  { value: 'KIDS_ONLY', label: 'Kids only' },
];

export default function FriendListScreen({ navigation }: Props) {
  const { logout } = useAuth();
  const [items, setItems] = useState<InvitePlanningItem[]>([]);
  const [sortBy, setSortBy] = useState<InvitePlanningSort>('staleness');
  const [gatheringType, setGatheringType] = useState<GatheringTypeFilter>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guards against two races: (1) switching chips quickly fires overlapping requests,
  // and an older one resolving after a newer one must not clobber its result; (2) a
  // dead refresh token flips the app to signed-out mid-request (see client.ts's
  // onSessionExpired), unmounting this screen — that in-flight request's own result
  // must then be dropped rather than set state on the way out.
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
      // Only the latest request should ever drive the loading/refreshing flags: setting
      // both here (not just the one this call cares about) means a newer request always
      // supersedes an older one's spinner, however each was started, so an older request
      // finishing later can't leave a flag (e.g. the pull-to-refresh spinner) stuck on.
      if (opts.background) {
        setIsRefreshing(true);
        setIsLoading(false);
      } else {
        setIsLoading(true);
        setIsRefreshing(false);
      }
      setError(null);
      try {
        const data = await getInvitePlanning({ sortBy, gatheringType });
        if (!isMounted.current || requestId !== latestRequestId.current) return;
        setItems(data);
      } catch (e) {
        if (!isMounted.current || requestId !== latestRequestId.current) return;
        setError(e instanceof ApiError ? describeError(e) : 'Could not load your friends. Pull down to retry.');
      } finally {
        if (isMounted.current && requestId === latestRequestId.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [sortBy, gatheringType],
  );

  // Refetches whenever this screen regains focus (e.g. coming back from adding or
  // editing a friend), not just on mount, so a save elsewhere shows up without the
  // user having to pull-to-refresh manually.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable onPress={logout} hitSlop={8}>
          <Text style={styles.logout}>Log out</Text>
        </Pressable>
      ),
      headerRight: () => (
        <Pressable onPress={() => navigation.navigate('FriendForm', {})} hitSlop={8}>
          <Text style={styles.addButton}>+ Add</Text>
        </Pressable>
      ),
    });
  }, [navigation, logout]);

  return (
    <View style={styles.container}>
      <ChipRow options={SORT_OPTIONS} selected={sortBy} onSelect={setSortBy} label="Sort by" />
      <ChipRow options={GATHERING_TYPE_OPTIONS} selected={gatheringType} onSelect={setGatheringType} label="Gathering type" />

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator />
        </View>
      ) : (
        <>
          {/* A banner, not just ListEmptyComponent, so a failed refresh/filter-switch is still
              visible when the list already has friends in it from a previous successful load. */}
          {error && items.length > 0 ? <Text style={styles.errorBanner}>{error}</Text> : null}
          <FlatList
            testID="friend-list"
            data={items}
            keyExtractor={(item) => String(item.friend_id)}
            renderItem={({ item }) => (
              <FriendRow item={item} onPress={() => navigation.navigate('FriendForm', { friendId: item.friend_id })} />
            )}
            contentContainerStyle={items.length === 0 ? styles.emptyContent : styles.listContent}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => load({ background: true })} />}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                {error ?? "No friends yet. Once you add some, they'll show up here, ranked by who's overdue for a hangout."}
              </Text>
            }
          />
        </>
      )}
    </View>
  );
}

function FriendRow({ item, onPress }: { item: InvitePlanningItem; onPress: () => void }) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <Text style={styles.name}>{item.display_name}</Text>
      <Text style={styles.meta}>{describeStaleness(item.days_since_last)}</Text>
      <Text style={styles.scores}>
        Combined {item.combined_score.toFixed(1)} · Adult {item.adult_fit_score}
        {item.kids_fit_score !== null ? ` · Kids ${item.kids_fit_score}` : ''} · Importance {item.importance_score}
      </Text>
    </Pressable>
  );
}

function describeStaleness(days: number | null): string {
  if (days === null) return 'Never met up';
  if (days === 0) return 'Met up today';
  if (days === 1) return 'Met up 1 day ago';
  return `Met up ${days} days ago`;
}

function describeError(error: ApiError): string {
  if (error.status === 401) return 'Your session expired. Please log in again.';
  return typeof error.detail === 'string' ? error.detail : 'Something went wrong. Try again.';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logout: { color: '#2f6fed', fontSize: 15, fontWeight: '600' },
  addButton: { color: '#2f6fed', fontSize: 15, fontWeight: '600' },
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
  name: { fontSize: 17, fontWeight: '700' },
  meta: { fontSize: 14, color: '#2f6fed', marginTop: 4, fontWeight: '600' },
  scores: { fontSize: 13, color: '#888', marginTop: 6 },
});
