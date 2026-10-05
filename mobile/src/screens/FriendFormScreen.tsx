import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ApiError } from '../api/client';
import {
  addGatheringType,
  addPerson,
  createFriend,
  deleteFriend as deleteFriendRequest,
  deleteGatheringType,
  deletePerson,
  getFriend,
  updateFriendScalars,
  updatePerson,
  EDITABLE_GATHERING_TYPES,
  type Friend,
  type FriendScalarInput,
  type GatheringTypeLabel,
  type PersonInput,
  type PersonRole,
} from '../api/friends';
import { ChipRow, MultiChipRow } from '../components/Chips';
import type { AppStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'FriendForm'>;

const GATHERING_TYPE_OPTIONS = EDITABLE_GATHERING_TYPES;

const ROLE_OPTIONS: { value: PersonRole; label: string }[] = [
  { value: 'adult', label: 'Adult' },
  { value: 'kid', label: 'Kid' },
];

// A person row before it's saved has no server id yet, so the list needs its own
// stable key to render correctly while the user is still editing.
type LocalPerson = {
  key: string;
  id?: number;
  name: string;
  role: PersonRole;
  birthYear: string;
  birthMonth: string;
  birthDay: string;
};

// A LocalPerson's text fields, parsed and range-checked once in buildPayload. Both
// the create and edit save paths work from this rather than re-parsing the raw
// strings, so there's exactly one place that can get the parsing wrong.
type ValidatedPerson = {
  key: string;
  id?: number;
  name: string;
  role: PersonRole;
  birth_year: number | null;
  birth_month: number | null;
  birth_day: number | null;
};

function personToLocal(person: Friend['people'][number]): LocalPerson {
  return {
    key: `existing-${person.id}`,
    id: person.id,
    name: person.name,
    role: person.role,
    birthYear: person.birth_year !== null ? String(person.birth_year) : '',
    birthMonth: person.birth_month !== null ? String(person.birth_month) : '',
    birthDay: person.birth_day !== null ? String(person.birth_day) : '',
  };
}

export default function FriendFormScreen({ navigation, route }: Props) {
  const friendId = route.params.friendId;
  const isEditing = friendId !== undefined;

  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState('');
  const [notes, setNotes] = useState('');
  const [adultFitScore, setAdultFitScore] = useState('');
  const [kidsFitScore, setKidsFitScore] = useState('');
  const [importanceScore, setImportanceScore] = useState('');
  const [people, setPeople] = useState<LocalPerson[]>([]);
  const [gatheringTypes, setGatheringTypes] = useState<Set<GatheringTypeLabel>>(new Set());

  // What the friend looked like on the server when the form opened, so saving only
  // has to add/update/remove the difference rather than resend everything blindly.
  const originalPersonIds = useRef<Set<number>>(new Set());
  const originalGatheringTypeIds = useRef<Map<GatheringTypeLabel, number>>(new Map());
  const nextLocalKey = useRef(0);

  // A 401 during any save/delete call can trigger client.ts's onSessionExpired
  // handler, which unmounts this screen before the rejected promise is caught —
  // guard the catch/finally setState calls below against running after that.
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    navigation.setOptions({ title: isEditing ? 'Edit friend' : 'Add friend' });
  }, [navigation, isEditing]);

  useEffect(() => {
    if (!isEditing) return;
    let cancelled = false;
    (async () => {
      try {
        const friend = await getFriend(friendId);
        if (cancelled) return;
        setDisplayName(friend.display_name);
        setNotes(friend.notes ?? '');
        setAdultFitScore(String(friend.adult_fit_score));
        setKidsFitScore(friend.kids_fit_score !== null ? String(friend.kids_fit_score) : '');
        setImportanceScore(String(friend.importance_score));
        setPeople(friend.people.map(personToLocal));
        originalPersonIds.current = new Set(friend.people.map((p) => p.id));

        const selected = new Set<GatheringTypeLabel>();
        const idsByType = new Map<GatheringTypeLabel, number>();
        for (const gt of friend.gathering_types) {
          if (gt.type === 'CUSTOM') continue; // not editable from this screen
          selected.add(gt.type);
          idsByType.set(gt.type, gt.id);
        }
        setGatheringTypes(selected);
        originalGatheringTypeIds.current = idsByType;
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
  }, [isEditing, friendId]);

  function addPersonRow() {
    const key = `new-${nextLocalKey.current++}`;
    setPeople((current) => [...current, { key, name: '', role: 'adult', birthYear: '', birthMonth: '', birthDay: '' }]);
  }

  function updatePersonRow(key: string, patch: Partial<LocalPerson>) {
    setPeople((current) => current.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  }

  function removePersonRow(key: string) {
    setPeople((current) => current.filter((p) => p.key !== key));
  }

  function toggleGatheringType(type: GatheringTypeLabel) {
    setGatheringTypes((current) => {
      const next = new Set(current);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  function buildPayload():
    | { ok: true; scalars: FriendScalarInput; peopleValidated: ValidatedPerson[] }
    | { ok: false; error: string } {
    const trimmedName = displayName.trim();
    if (!trimmedName) return { ok: false, error: 'Give this friend a name.' };

    const adultScore = parseScoreInRange(adultFitScore);
    if (adultScore === null) return { ok: false, error: 'Adult fit score must be a number from 1 to 10.' };

    const importanceScoreValue = parseScoreInRange(importanceScore);
    if (importanceScoreValue === null) return { ok: false, error: 'Importance score must be a number from 1 to 10.' };

    let kidsScoreValue: number | null = null;
    if (kidsFitScore.trim() !== '') {
      kidsScoreValue = parseScoreInRange(kidsFitScore);
      if (kidsScoreValue === null) return { ok: false, error: 'Kids fit score must be a number from 1 to 10, or left blank.' };
    }

    const peopleValidated: ValidatedPerson[] = [];
    for (const person of people) {
      const name = person.name.trim();
      if (!name) return { ok: false, error: 'Every person needs a name (or remove the blank row).' };

      const birthYear = parseOptionalDigits(person.birthYear);
      if (birthYear === 'invalid') return { ok: false, error: `${name}'s birth year must be a number.` };

      const birthMonth = parseOptionalDigits(person.birthMonth);
      if (birthMonth === 'invalid') return { ok: false, error: `${name}'s birth month must be a number.` };
      if (birthMonth !== null && (birthMonth < 1 || birthMonth > 12)) {
        return { ok: false, error: `${name}'s birth month must be from 1 to 12.` };
      }

      const birthDay = parseOptionalDigits(person.birthDay);
      if (birthDay === 'invalid') return { ok: false, error: `${name}'s birth day must be a number.` };
      if (birthDay !== null && (birthDay < 1 || birthDay > 31)) {
        return { ok: false, error: `${name}'s birth day must be from 1 to 31.` };
      }

      if ((birthMonth === null) !== (birthDay === null)) {
        return { ok: false, error: `${name}'s birth month and day must be filled in together.` };
      }

      peopleValidated.push({
        key: person.key,
        id: person.id,
        name,
        role: person.role,
        birth_year: birthYear,
        birth_month: birthMonth,
        birth_day: birthDay,
      });
    }

    return {
      ok: true,
      scalars: {
        display_name: trimmedName,
        notes: notes.trim() === '' ? null : notes.trim(),
        adult_fit_score: adultScore,
        kids_fit_score: kidsScoreValue,
        importance_score: importanceScoreValue,
      },
      peopleValidated,
    };
  }

  async function handleSave() {
    const result = buildPayload();
    if (!result.ok) {
      setSubmitError(result.error);
      return;
    }
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      if (isEditing) {
        await updateFriendScalars(friendId, result.scalars);
        await syncGatheringTypes(friendId, originalGatheringTypeIds.current, gatheringTypes);
        await syncPeople(friendId, originalPersonIds.current, result.peopleValidated, (updater) => {
          if (isMounted.current) setPeople(updater);
        });
      } else {
        await createFriend({
          ...result.scalars,
          people: result.peopleValidated.map(toPersonInput),
          gatheringTypes: Array.from(gatheringTypes),
        });
      }
      if (isMounted.current) navigation.goBack();
    } catch (e) {
      if (isMounted.current) setSubmitError(e instanceof ApiError ? describeError(e) : 'Could not save. Try again.');
    } finally {
      if (isMounted.current) setIsSubmitting(false);
    }
  }

  function handleDelete() {
    if (!isEditing) return;
    Alert.alert('Delete friend?', `This removes ${displayName || 'this friend'} and their history. This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setIsDeleting(true);
          try {
            await deleteFriendRequest(friendId);
            if (isMounted.current) navigation.goBack();
          } catch (e) {
            if (!isMounted.current) return;
            setSubmitError(e instanceof ApiError ? describeError(e) : 'Could not delete. Try again.');
            setIsDeleting(false);
          }
        },
      },
    ]);
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

  const isBusy = isSubmitting || isDeleting;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionLabel}>Name</Text>
        <TextInput style={styles.input} placeholder="Friend's name" value={displayName} onChangeText={setDisplayName} />

        <Text style={styles.sectionLabel}>Notes</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="Anything worth remembering"
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        <Text style={styles.sectionTitle}>Scores (1–10)</Text>
        <View style={styles.scoreRow}>
          <ScoreField label="Adult fit" value={adultFitScore} onChangeText={setAdultFitScore} />
          <ScoreField label="Kids fit" value={kidsFitScore} onChangeText={setKidsFitScore} placeholder="N/A" />
          <ScoreField label="Importance" value={importanceScore} onChangeText={setImportanceScore} />
        </View>

        <MultiChipRow
          options={GATHERING_TYPE_OPTIONS}
          selectedValues={gatheringTypes}
          onToggle={toggleGatheringType}
          label="Gathering types"
        />

        <View style={styles.peopleHeader}>
          <Text style={styles.sectionTitle}>People</Text>
          <Pressable onPress={addPersonRow} hitSlop={8}>
            <Text style={styles.link}>+ Add person</Text>
          </Pressable>
        </View>
        {people.map((person) => (
          <PersonEditor
            key={person.key}
            person={person}
            onChange={(patch) => updatePersonRow(person.key, patch)}
            onRemove={() => removePersonRow(person.key)}
          />
        ))}

        {submitError ? <Text style={styles.error}>{submitError}</Text> : null}

        <Pressable style={[styles.button, isBusy && styles.buttonDisabled]} onPress={handleSave} disabled={isBusy}>
          {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save</Text>}
        </Pressable>

        {isEditing ? (
          <Pressable style={[styles.deleteButton, isBusy && styles.buttonDisabled]} onPress={handleDelete} disabled={isBusy}>
            {isDeleting ? <ActivityIndicator color="#d33" /> : <Text style={styles.deleteButtonText}>Delete friend</Text>}
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ScoreField({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={styles.scoreField}>
      <Text style={styles.scoreLabel}>{label}</Text>
      <TextInput
        style={styles.scoreInput}
        value={value}
        onChangeText={onChangeText}
        keyboardType="number-pad"
        placeholder={placeholder}
        maxLength={2}
      />
    </View>
  );
}

function PersonEditor({
  person,
  onChange,
  onRemove,
}: {
  person: LocalPerson;
  onChange: (patch: Partial<LocalPerson>) => void;
  onRemove: () => void;
}) {
  return (
    <View style={styles.personCard}>
      <View style={styles.personHeaderRow}>
        <TextInput
          style={[styles.input, styles.personNameInput]}
          placeholder="Name"
          value={person.name}
          onChangeText={(name) => onChange({ name })}
        />
        <Pressable onPress={onRemove} hitSlop={8}>
          <Text style={styles.remove}>Remove</Text>
        </Pressable>
      </View>
      <ChipRow options={ROLE_OPTIONS} selected={person.role} onSelect={(role) => onChange({ role })} label="Role" />
      <Text style={styles.sectionLabel}>Birthday (optional)</Text>
      <View style={styles.birthdayRow}>
        <TextInput
          style={[styles.input, styles.birthdayInput]}
          placeholder="Year"
          value={person.birthYear}
          onChangeText={(birthYear) => onChange({ birthYear })}
          keyboardType="number-pad"
          maxLength={4}
        />
        <TextInput
          style={[styles.input, styles.birthdayInput]}
          placeholder="Month"
          value={person.birthMonth}
          onChangeText={(birthMonth) => onChange({ birthMonth })}
          keyboardType="number-pad"
          maxLength={2}
        />
        <TextInput
          style={[styles.input, styles.birthdayInput]}
          placeholder="Day"
          value={person.birthDay}
          onChangeText={(birthDay) => onChange({ birthDay })}
          keyboardType="number-pad"
          maxLength={2}
        />
      </View>
    </View>
  );
}

function parseScoreInRange(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  if (n < 1 || n > 10) return null;
  return n;
}

// null means the field was left blank; 'invalid' means it had non-digit content,
// which the caller must reject rather than silently treating as blank.
function parseOptionalDigits(text: string): number | null | 'invalid' {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  return /^\d+$/.test(trimmed) ? Number(trimmed) : 'invalid';
}

function toPersonInput(person: ValidatedPerson): PersonInput {
  return {
    name: person.name,
    role: person.role,
    birth_year: person.birth_year,
    birth_month: person.birth_month,
    birth_day: person.birth_day,
  };
}

// originalByLabel is mutated as each call succeeds, so that if a later call in this
// same sync fails, the caller's next retry sees the already-applied changes as the
// new baseline and doesn't redo them (which would add duplicate rows or 404 on an
// id that's already gone).
async function syncGatheringTypes(
  friendId: number,
  originalByLabel: Map<GatheringTypeLabel, number>,
  selected: Set<GatheringTypeLabel>,
): Promise<void> {
  for (const option of GATHERING_TYPE_OPTIONS) {
    const existingId = originalByLabel.get(option.value);
    const isSelected = selected.has(option.value);
    if (isSelected && existingId === undefined) {
      const created = await addGatheringType(friendId, option.value);
      originalByLabel.set(option.value, created.id);
    } else if (!isSelected && existingId !== undefined) {
      await deleteGatheringType(friendId, existingId);
      originalByLabel.delete(option.value);
    }
  }
}

// originalIds and the person rows themselves (via setPeople, attaching the new id
// once a person is created) are updated as each call succeeds, for the same
// retry-safety reason as syncGatheringTypes above.
async function syncPeople(
  friendId: number,
  originalIds: Set<number>,
  people: ValidatedPerson[],
  setPeople: (updater: (current: LocalPerson[]) => LocalPerson[]) => void,
): Promise<void> {
  const keptIds = new Set<number>();
  for (const person of people) {
    const payload = toPersonInput(person);
    if (person.id !== undefined) {
      keptIds.add(person.id);
      await updatePerson(friendId, person.id, payload);
    } else {
      const created = await addPerson(friendId, payload);
      keptIds.add(created.id);
      originalIds.add(created.id);
      setPeople((current) => current.map((p) => (p.key === person.key ? { ...p, id: created.id } : p)));
    }
  }
  for (const id of originalIds) {
    if (!keptIds.has(id)) {
      await deletePerson(friendId, id);
      originalIds.delete(id);
    }
  }
}

function describeError(error: ApiError): string {
  if (error.status === 401) return 'Your session expired. Please log in again.';
  return typeof error.detail === 'string' ? error.detail : 'Something went wrong. Try again.';
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  content: { padding: 16, backgroundColor: '#fff' },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: '#888', textTransform: 'uppercase', marginBottom: 6, marginTop: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 20, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
  },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
  scoreRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  scoreField: { flex: 1 },
  scoreLabel: { fontSize: 12, color: '#888', marginBottom: 4, textAlign: 'center' },
  scoreInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingVertical: 10,
    fontSize: 16,
    textAlign: 'center',
  },
  peopleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
  link: { color: '#2f6fed', fontSize: 15, fontWeight: '600' },
  personCard: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  personHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  personNameInput: { flex: 1 },
  remove: { color: '#d33', fontSize: 14, fontWeight: '600' },
  birthdayRow: { flexDirection: 'row', gap: 8 },
  birthdayInput: { flex: 1 },
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
  deleteButton: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 24,
  },
  deleteButtonText: { color: '#d33', fontSize: 15, fontWeight: '600' },
});
