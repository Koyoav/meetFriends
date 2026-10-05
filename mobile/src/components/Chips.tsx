import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Chip } from './Chip';

export type ChipOption<T extends string> = { value: T; label: string };

/** Single-select row of chips, e.g. choosing one sort order. */
export function ChipRow<T extends string>({
  options,
  selected,
  onSelect,
  label,
}: {
  options: ChipOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
  label: string;
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {options.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={option.value === selected}
            onPress={() => onSelect(option.value)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

/** Multi-select row of chips, e.g. toggling which gathering types apply. */
export function MultiChipRow<T extends string>({
  options,
  selectedValues,
  onToggle,
  label,
}: {
  options: ChipOption<T>[];
  selectedValues: ReadonlySet<T>;
  onToggle: (value: T) => void;
  label: string;
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {options.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={selectedValues.has(option.value)}
            onPress={() => onToggle(option.value)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 12 },
  label: { fontSize: 12, fontWeight: '600', color: '#888', textTransform: 'uppercase', marginLeft: 16, marginBottom: 6 },
  row: { paddingHorizontal: 16, gap: 8 },
});
