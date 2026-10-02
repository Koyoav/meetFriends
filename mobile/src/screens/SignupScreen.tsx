import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import type { AuthStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Signup'>;

export default function SignupScreen({ navigation }: Props) {
  const { signup } = useAuth();
  const [householdName, setHouseholdName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit =
    householdName.trim().length > 0 &&
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length > 0 &&
    !isSubmitting;

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);
    try {
      await signup(householdName.trim(), name.trim(), email.trim(), password);
    } catch (e) {
      setError(e instanceof ApiError ? describeSignupError(e) : 'Something went wrong. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Create a household</Text>
      <Text style={styles.subtitle}>You can invite your partner afterwards</Text>

      <TextInput
        style={styles.input}
        placeholder="Household name (e.g. The Cohens)"
        value={householdName}
        onChangeText={setHouseholdName}
      />
      <TextInput style={styles.input} placeholder="Your name" value={name} onChangeText={setName} />
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.button, !canSubmit && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={!canSubmit}
      >
        {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign up</Text>}
      </Pressable>

      <Pressable onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>Already have an account? Log in</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

function describeSignupError(error: ApiError): string {
  if (error.status === 409) return 'An account with that email already exists.';
  return typeof error.detail === 'string' ? error.detail : 'Signup failed. Try again.';
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 26, fontWeight: '700', textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#666', textAlign: 'center', marginTop: 4, marginBottom: 32 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#2f6fed',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  error: { color: '#d33', marginBottom: 12, textAlign: 'center' },
  link: { color: '#2f6fed', textAlign: 'center', marginTop: 20, fontSize: 15 },
});
