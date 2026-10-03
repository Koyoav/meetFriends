import { StyleSheet } from 'react-native';

// Shared look for the login/signup forms, which differ only in field count and copy.
// title is unified at 28 (Signup previously used 26) so both screens share one heading size.
export const authStyles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center' },
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
