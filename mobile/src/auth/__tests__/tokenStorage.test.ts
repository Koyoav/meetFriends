jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const ACCESS_TOKEN_KEY = 'meetfriends.access_token';
const REFRESH_TOKEN_KEY = 'meetfriends.refresh_token';

describe('auth/tokenStorage on native (SecureStore)', () => {
  let SecureStore: typeof import('expo-secure-store');
  let AsyncStorage: typeof import('@react-native-async-storage/async-storage').default;
  let tokenStorage: typeof import('../tokenStorage');

  beforeEach(() => {
    jest.resetModules();
    jest.doMock('react-native', () => ({ Platform: { OS: 'ios' } }));
    SecureStore = require('expo-secure-store');
    AsyncStorage = require('@react-native-async-storage/async-storage');
    tokenStorage = require('../tokenStorage');
  });

  test('getAccessToken__called__reads_access_token_key_from_secure_store', async () => {
    // Arrange
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('access-1');

    // Act
    const result = await tokenStorage.getAccessToken();

    // Assert
    expect(result).toBe('access-1');
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith(ACCESS_TOKEN_KEY);
    expect(AsyncStorage.getItem).not.toHaveBeenCalled();
  });

  test('getRefreshToken__called__reads_refresh_token_key_from_secure_store', async () => {
    // Arrange
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('refresh-1');

    // Act
    const result = await tokenStorage.getRefreshToken();

    // Assert
    expect(result).toBe('refresh-1');
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith(REFRESH_TOKEN_KEY);
  });

  test('setTokens__called__writes_both_tokens_to_secure_store', async () => {
    // Act
    await tokenStorage.setTokens('access-1', 'refresh-1');

    // Assert
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(ACCESS_TOKEN_KEY, 'access-1');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(REFRESH_TOKEN_KEY, 'refresh-1');
  });

  test('clearTokens__called__deletes_both_tokens_from_secure_store', async () => {
    // Act
    await tokenStorage.clearTokens();

    // Assert
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(ACCESS_TOKEN_KEY);
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(REFRESH_TOKEN_KEY);
  });
});

describe('auth/tokenStorage on web (AsyncStorage)', () => {
  let SecureStore: typeof import('expo-secure-store');
  let AsyncStorage: typeof import('@react-native-async-storage/async-storage').default;
  let tokenStorage: typeof import('../tokenStorage');

  beforeEach(() => {
    jest.resetModules();
    jest.doMock('react-native', () => ({ Platform: { OS: 'web' } }));
    SecureStore = require('expo-secure-store');
    AsyncStorage = require('@react-native-async-storage/async-storage');
    tokenStorage = require('../tokenStorage');
  });

  test('getAccessToken__called__reads_access_token_key_from_async_storage', async () => {
    // Arrange
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('access-1');

    // Act
    const result = await tokenStorage.getAccessToken();

    // Assert
    expect(result).toBe('access-1');
    expect(AsyncStorage.getItem).toHaveBeenCalledWith(ACCESS_TOKEN_KEY);
    expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
  });

  test('setTokens__called__writes_both_tokens_to_async_storage', async () => {
    // Act
    await tokenStorage.setTokens('access-1', 'refresh-1');

    // Assert
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(ACCESS_TOKEN_KEY, 'access-1');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(REFRESH_TOKEN_KEY, 'refresh-1');
  });

  test('clearTokens__called__removes_both_tokens_from_async_storage', async () => {
    // Act
    await tokenStorage.clearTokens();

    // Assert
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(ACCESS_TOKEN_KEY);
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(REFRESH_TOKEN_KEY);
  });
});
