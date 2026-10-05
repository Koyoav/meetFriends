import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ApiError } from '../api/client';
import { getFriend, type GatheringType } from '../api/friends';
import { listGatherings, logGathering, type Gathering, type GatheringInput, type GatheringLocation } from '../api/gatherings';
import { ChipRow } from '../components/Chips';
import type { AppStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'LogGathering'>;

const LOCATION_OPTIONS: { value: GatheringLocation; label: string }[] = [
  { value: 'OUR_PLACE', label: 'Our place' },
  { value: 'THEIR_PLACE', label: 'Their place' },
  { value: 'OUTSIDE', label: 'Outside' },
];

function todayParts(): { year: string; month: string; day: string } {
  const now = new Date();
  return {
    year: String(now.getFullYear()),
    month: String(now.getMonth() + 1),
    day: String(now.getDate()),
  };
}

export default function LogGatheringScreen({ navigation, route }: Props) {
  const { friendId } = route.params;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [friendName, setFriendName] = useState('');
  const [gatheringTypes, setGatheringTypes] = useState<GatheringType[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [pastGatherings, setPastGatherings] = useState<Gathering[]>([]);

  const today = todayParts();
  const [year, setYear] = useState(today.year);
  const [month, setMonth] = useState(today.month);
  const [day, setDay] = useState(today.day);
  const [location, setLocation] = useState<GatheringLocation>('OUR_PLACE');
  const [notes, setNotes] = useState('');

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    navigation.setOptions({ title: 'Log a gathering' });
  }, [navigation]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [friend, gatherings] = await Promise.all([getFriend(friendId), listGatherings(friendId)]);
        if (cancelled) return;
        setFriendName(friend.display_name);
        const types = friend.gathering_types.filter((gt) => gt.type !== 'CUSTOM');
        setGatheringTypes(types);
        setSelectedTypeId(types.length > 0 ? types[0].id : null);
        setPastGatherings(gatherings);
      } catch (e) {
        if (cancelled) return;
        setLoadError(e instanceof ApiError ? describeError(e) : 'Could not load this friend.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [friendId]);

  function buildPayload(): { ok: true; value: GatheringInput } | { ok: false; error: string } {
    if (selectedTypeId === null) return { ok: false, error: 'Pick a gathering type.' };

    const y = parseDatePart(year, 1900, 2100);
    if (y === null) return { ok: false, error: 'Year looks wrong.' };
    const m = parseDatePart(month, 1, 12);
    if (m === null) return { ok: false, error: 'Month must be from 1 to 12.' };
    const d = parseDatePart(day, 1, 31);
    if (d === null) return { ok: false, error: 'Day must be from 1 to 31.' };

    const mm = String(m).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return {
      ok: true,
      value: {
        gathering_type_id: selectedTypeId,
        date: `${y}-${mm}-${dd}`,
        location,
        notes: notes.trim() === '' ? null : notes.trim(),
      },
    };
  }

  async function handleSubmit() {
    const result = buildPayload();
    if (!result.ok) {
      setSubmitError(result.error);
      return;
    }
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await logGathering(friendId, result.value);
      if (isMounted.current) navigation.goBack();
    } catch (e) {
      if (!isMounted.current) return;
      setSubmitError(e instanceof ApiError ? describeError(e) : 'Could not save. Try again.');
    } finally {
      if (isMounted.current) setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{loadError}</Text>
      </View>
    );
  }

  if (gatheringTypes.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>
          {friendName} doesn't have any gathering types yet. Add one by editing this friend first.
        </Text>
      </View>
    );
  }

  const typeOptions = gatheringTypes.map((gt) => ({ value: String(gt.id), label: gatheringTypeLabel(gt) }));

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.heading}>{friendName}</Text>

      <ChipRow
        options={typeOptions}
        selected={String(selectedTypeId)}
        onSelect={(value) => setSelectedTypeId(Number(value))}
        label="Gathering type"
      />
      <ChipRow options={LOCATION_OPTIONS} selected={location} onSelect={setLocation} label="Location" />

      <Text style={styles.sectionLabel}>Date</Text>
      <View style={styles.dateRow}>
        <TextInput style={[styles.input, styles.dateInput]} placeholder="Year" value={year} onChangeText={setYear} keyboardType="number-pad" maxLength={4} />
        <TextInput style={[styles.input, styles.dateInput]} placeholder="Month" value={month} onChangeText={setMonth} keyboardType="number-pad" maxLength={2} />
        <TextInput style={[styles.input, styles.dateInput]} placeholder="Day" value={day} onChangeText={setDay} keyboardType="number-pad" maxLength={2} />
      </View>

      <Text style={styles.sectionLabel}>Notes</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="Anything worth remembering about this one"
        value={notes}
        onChangeText={setNotes}
        multiline
      />

      {submitError ? <Text style={styles.error}>{submitError}</Text> : null}

      <Pressable style={[styles.button, isSubmitting && styles.buttonDisabled]} onPress={handleSubmit} disabled={isSubmitting}>
        {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save</Text>}
      </Pressable>

      {pastGatherings.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Past gatherings</Text>
          {pastGatherings.map((g) => (
            <View key={g.id} style={styles.pastRow}>
              <Text style={styles.pastDate}>{g.date}</Text>
              <Text style={styles.pastMeta}>
                {gatheringTypeLabelById(gatheringTypes, g.gathering_type_id)} · {locationLabel(g.location)}
              </Text>
              {g.notes ? <Text style={styles.pastNotes}>{g.notes}</Text> : null}
            </View>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

function parseDatePart(text: string, min: number, max: number): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  if (n < min || n > max) return null;
  return n;
}

function gatheringTypeLabel(gt: GatheringType): string {
  switch (gt.type) {
    case 'FAMILY':
      return 'Family';
    case 'MEN_1_1':
      return 'Men 1:1';
    case 'WOMEN_1_1':
      return 'Women 1:1';
    case 'KIDS_ONLY':
      return 'Kids only';
    default:
      return gt.custom_label ?? gt.type;
  }
}

function gatheringTypeLabelById(types: GatheringType[], id: number): string {
  const match = types.find((t) => t.id === id);
  return match ? gatheringTypeLabel(match) : 'Unknown type';
}

function locationLabel(location: GatheringLocation): string {
  return LOCATION_OPTIONS.find((o) => o.value === location)?.label ?? location;
}

function describeError(error: ApiError): string {
  if (error.status === 401) return 'Your session expired. Please log in again.';
  return typeof error.detail === 'string' ? error.detail : 'Something went wrong. Try again.';
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 24 },
  content: { padding: 16, backgroundColor: '#fff' },
  heading: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: '#888', textTransform: 'uppercase', marginBottom: 6, marginTop: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 28, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
  },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
  dateRow: { flexDirection: 'row', gap: 8 },
  dateInput: { flex: 1 },
  error: { color: '#d33', marginTop: 12, textAlign: 'center' },
  button: {
    backgroundColor: '#2f6fed',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  pastRow: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  pastDate: { fontSize: 15, fontWeight: '700' },
  pastMeta: { fontSize: 13, color: '#2f6fed', marginTop: 2, fontWeight: '600' },
  pastNotes: { fontSize: 13, color: '#666', marginTop: 4 },
});
