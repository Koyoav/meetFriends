import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';

import { AuthProvider, useAuth } from '../AuthContext';
import * as authApi from '../../api/auth';
import { setSessionExpiredHandler, invalidateAuthGeneration } from '../../api/client';
import { clearTokens, getAccessToken, setTokens } from '../tokenStorage';

jest.mock('../../api/auth');
jest.mock('../../api/client', () => ({
  setSessionExpiredHandler: jest.fn(),
  invalidateAuthGeneration: jest.fn(),
}));
jest.mock('../tokenStorage', () => ({
  getAccessToken: jest.fn(),
  setTokens: jest.fn(),
  clearTokens: jest.fn(),
}));

const mockedLogin = authApi.login as jest.MockedFunction<typeof authApi.login>;
const mockedSignup = authApi.signup as jest.MockedFunction<typeof authApi.signup>;
const mockedGetAccessToken = getAccessToken as jest.MockedFunction<typeof getAccessToken>;
const mockedSetTokens = setTokens as jest.MockedFunction<typeof setTokens>;
const mockedClearTokens = clearTokens as jest.MockedFunction<typeof clearTokens>;
const mockedSetSessionExpiredHandler = setSessionExpiredHandler as jest.MockedFunction<
  typeof setSessionExpiredHandler
>;
const mockedInvalidateAuthGeneration = invalidateAuthGeneration as jest.MockedFunction<
  typeof invalidateAuthGeneration
>;

function renderAuth() {
  return renderHook(() => useAuth(), { wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider> });
}

describe('AuthContext', () => {
  beforeEach(() => {
    mockedLogin.mockReset();
    mockedSignup.mockReset();
    mockedGetAccessToken.mockReset();
    mockedSetTokens.mockReset();
    mockedClearTokens.mockReset();
    mockedSetSessionExpiredHandler.mockReset();
    mockedInvalidateAuthGeneration.mockReset();
  });

  test('useAuth__called_outside_provider__throws', async () => {
    // Act
    const act = renderHook(() => useAuth());

    // Assert
    await expect(act).rejects.toThrow('useAuth must be used within an AuthProvider');
  });

  test('mount__no_stored_access_token__ends_loading_signed_out', async () => {
    // Arrange
    mockedGetAccessToken.mockResolvedValueOnce(null);

    // Act
    const { result } = await renderAuth();

    // Assert
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isSignedIn).toBe(false);
  });

  test('mount__stored_access_token_present__ends_loading_signed_in', async () => {
    // Arrange
    mockedGetAccessToken.mockResolvedValueOnce('access-1');

    // Act
    const { result } = await renderAuth();

    // Assert
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isSignedIn).toBe(true);
  });

  test('unmount__called__clears_the_session_expired_handler', async () => {
    // Arrange
    mockedGetAccessToken.mockResolvedValueOnce(null);
    const { result, unmount } = await renderAuth();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Act
    await unmount();

    // Assert
    expect(mockedSetSessionExpiredHandler).toHaveBeenLastCalledWith(null);
  });

  test('sessionExpiredHandler__invoked__signs_the_user_out', async () => {
    // Arrange
    mockedGetAccessToken.mockResolvedValueOnce('access-1');
    const { result } = await renderAuth();
    await waitFor(() => expect(result.current.isSignedIn).toBe(true));
    const registeredHandler = mockedSetSessionExpiredHandler.mock.calls[0][0]!;

    // Act
    await act(() => registeredHandler());

    // Assert
    expect(result.current.isSignedIn).toBe(false);
  });

  test('login__called__stores_tokens_and_signs_in', async () => {
    // Arrange
    mockedGetAccessToken.mockResolvedValueOnce(null);
    const tokens = { access_token: 'access-1', refresh_token: 'refresh-1', token_type: 'bearer' };
    mockedLogin.mockResolvedValueOnce(tokens);
    const { result } = await renderAuth();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Act
    await act(() => result.current.login('dan@example.com', 'secret'));

    // Assert
    expect(mockedLogin).toHaveBeenCalledWith('dan@example.com', 'secret');
    expect(mockedSetTokens).toHaveBeenCalledWith('access-1', 'refresh-1');
    expect(result.current.isSignedIn).toBe(true);
  });

  test('signup__called__stores_tokens_and_signs_in', async () => {
    // Arrange
    mockedGetAccessToken.mockResolvedValueOnce(null);
    const tokens = { access_token: 'access-1', refresh_token: 'refresh-1', token_type: 'bearer' };
    mockedSignup.mockResolvedValueOnce(tokens);
    const { result } = await renderAuth();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Act
    await act(() => result.current.signup('The Dans', 'Dan', 'dan@example.com', 'secret'));

    // Assert
    expect(mockedSignup).toHaveBeenCalledWith('The Dans', 'Dan', 'dan@example.com', 'secret');
    expect(mockedSetTokens).toHaveBeenCalledWith('access-1', 'refresh-1');
    expect(result.current.isSignedIn).toBe(true);
  });

  test('logout__called__invalidates_generation_clears_tokens_and_signs_out', async () => {
    // Arrange
    mockedGetAccessToken.mockResolvedValueOnce('access-1');
    const { result } = await renderAuth();
    await waitFor(() => expect(result.current.isSignedIn).toBe(true));

    // Act
    await act(() => result.current.logout());

    // Assert
    expect(mockedInvalidateAuthGeneration).toHaveBeenCalledTimes(1);
    expect(mockedClearTokens).toHaveBeenCalledTimes(1);
    expect(result.current.isSignedIn).toBe(false);
  });
});
