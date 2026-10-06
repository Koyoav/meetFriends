import React from 'react';
import { render, screen } from '@testing-library/react-native';

import RootNavigator from '../RootNavigator';
import { useAuth } from '../../auth/AuthContext';

jest.mock('../../auth/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../screens/LoginScreen', () => () => require('react').createElement(require('react-native').Text, null, 'LoginScreen'));
jest.mock('../../screens/SignupScreen', () => () => require('react').createElement(require('react-native').Text, null, 'SignupScreen'));
jest.mock('../../screens/FriendListScreen', () => () => require('react').createElement(require('react-native').Text, null, 'FriendListScreen'));
jest.mock('../../screens/FriendFormScreen', () => () => require('react').createElement(require('react-native').Text, null, 'FriendFormScreen'));

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('RootNavigator', () => {
  test('render__auth_is_loading__shows_a_spinner_and_no_navigator', async () => {
    // Arrange
    mockedUseAuth.mockReturnValue({
      isLoading: true,
      isSignedIn: false,
      login: jest.fn(),
      signup: jest.fn(),
      logout: jest.fn(),
    });

    // Act
    await render(<RootNavigator />);

    // Assert
    expect(screen.queryByText('LoginScreen')).toBeNull();
    expect(screen.queryByText('FriendListScreen')).toBeNull();
  });

  test('render__signed_out__shows_the_auth_stack', async () => {
    // Arrange
    mockedUseAuth.mockReturnValue({
      isLoading: false,
      isSignedIn: false,
      login: jest.fn(),
      signup: jest.fn(),
      logout: jest.fn(),
    });

    // Act
    await render(<RootNavigator />);

    // Assert
    expect(await screen.findByText('LoginScreen')).toBeTruthy();
    expect(screen.queryByText('FriendListScreen')).toBeNull();
  });

  test('render__signed_in__shows_the_app_stack', async () => {
    // Arrange
    mockedUseAuth.mockReturnValue({
      isLoading: false,
      isSignedIn: true,
      login: jest.fn(),
      signup: jest.fn(),
      logout: jest.fn(),
    });

    // Act
    await render(<RootNavigator />);

    // Assert
    expect(await screen.findByText('FriendListScreen')).toBeTruthy();
    expect(screen.queryByText('LoginScreen')).toBeNull();
  });
});
