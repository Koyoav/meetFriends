import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, Text, TextInput } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import type { AuthStackParamList } from '../navigation/types';
import { authStyles as styles } from './authStyles';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !isSubmitting;

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (e) {
      setError(e instanceof ApiError ? describeAuthError(e) : 'Something went wrong. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>MeetFriends</Text>
      <Text style={styles.subtitle}>Log in to your household</Text>

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
        {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Log in</Text>}
      </Pressable>

      <Pressable onPress={() => navigation.navigate('Signup')}>
        <Text style={styles.link}>New household? Sign up</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

function describeAuthError(error: ApiError): string {
  if (error.status === 401) return 'Incorrect email or password.';
  return typeof error.detail === 'string' ? error.detail : 'Login failed. Try again.';
}
