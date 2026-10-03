import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../auth/AuthContext';

// Placeholder landing screen. Friend list / reminders / birthdays screens are next.
export default function HomeScreen() {
  const { logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>You're in 🎉</Text>
      <Text style={styles.subtitle}>The friend list, reminders, and birthdays screens are next.</Text>
      <Pressable style={styles.button} onPress={logout}>
        <Text style={styles.buttonText}>Log out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { fontSize: 15, color: '#666', textAlign: 'center', marginTop: 8, marginBottom: 32 },
  button: { backgroundColor: '#2f6fed', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 24 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
