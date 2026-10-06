import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import LoginScreen from '../LoginScreen';
import { useAuth } from '../../auth/AuthContext';
import { ApiError } from '../../api/client';

jest.mock('../../auth/AuthContext', () => ({ useAuth: jest.fn() }));

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

async function renderScreen(login: jest.Mock) {
  mockedUseAuth.mockReturnValue({
    isLoading: false,
    isSignedIn: false,
    login,
    signup: jest.fn(),
    logout: jest.fn(),
  });
  const navigation = { navigate: jest.fn() } as any;
  await render(<LoginScreen navigation={navigation} route={{} as any} />);
  return { navigation };
}

describe('LoginScreen', () => {
  test('render__initial__log_in_button_is_disabled', async () => {
    // Act
    await renderScreen(jest.fn());

    // Assert
    expect(screen.getByTestId('login-submit')).toHaveProp('accessibilityState', { disabled: true });
  });

  test('fill_in_email_and_password__called__enables_the_log_in_button', async () => {
    // Arrange
    await renderScreen(jest.fn());

    // Act
    await fireEvent.changeText(screen.getByPlaceholderText('Email'), 'dan@example.com');
    await fireEvent.changeText(screen.getByPlaceholderText('Password'), 'secret');

    // Assert
    await waitFor(() => expect(screen.getByTestId('login-submit')).toHaveProp('accessibilityState', { disabled: false }));
  });

  test('whitespace_only_email__called__log_in_button_stays_disabled', async () => {
    // Arrange
    await renderScreen(jest.fn());

    // Act
    await fireEvent.changeText(screen.getByPlaceholderText('Email'), '   ');
    await fireEvent.changeText(screen.getByPlaceholderText('Password'), 'secret');

    // Assert
    expect(screen.getByTestId('login-submit')).toHaveProp('accessibilityState', { disabled: true });
  });

  test('submit__called__trims_email_and_calls_login', async () => {
    // Arrange
    const login = jest.fn().mockResolvedValueOnce(undefined);
    await renderScreen(login);
    await fireEvent.changeText(screen.getByPlaceholderText('Email'), '  dan@example.com  ');
    await fireEvent.changeText(screen.getByPlaceholderText('Password'), 'secret');

    // Act
    await fireEvent.press(screen.getByText('Log in'));

    // Assert
    await waitFor(() => expect(login).toHaveBeenCalledWith('dan@example.com', 'secret'));
  });

  test('submit__while_login_is_pending__shows_a_spinner_instead_of_the_label', async () => {
    // Arrange
    let resolveLogin: () => void;
    const login = jest.fn().mockReturnValueOnce(new Promise<void>((resolve) => (resolveLogin = resolve)));
    await renderScreen(login);
    await fireEvent.changeText(screen.getByPlaceholderText('Email'), 'dan@example.com');
    await fireEvent.changeText(screen.getByPlaceholderText('Password'), 'secret');

    // Act: don't await — the press handler stays pending until resolveLogin() runs below.
    fireEvent.press(screen.getByText('Log in'));

    // Assert
    await waitFor(() => expect(screen.queryByText('Log in')).toBeNull());
    resolveLogin!();
    await waitFor(() => expect(screen.getByText('Log in')).toBeTruthy());
  });

  test('submit__login_rejects_with_401__shows_incorrect_credentials_message', async () => {
    // Arrange
    const login = jest.fn().mockRejectedValueOnce(new ApiError(401, 'invalid credentials'));
    await renderScreen(login);
    await fireEvent.changeText(screen.getByPlaceholderText('Email'), 'dan@example.com');
    await fireEvent.changeText(screen.getByPlaceholderText('Password'), 'wrong');

    // Act
    await fireEvent.press(screen.getByText('Log in'));

    // Assert
    expect(await screen.findByText('Incorrect email or password.')).toBeTruthy();
  });

  test('submit__login_rejects_with_other_api_error_detail__shows_that_detail', async () => {
    // Arrange
    const login = jest.fn().mockRejectedValueOnce(new ApiError(500, 'server exploded'));
    await renderScreen(login);
    await fireEvent.changeText(screen.getByPlaceholderText('Email'), 'dan@example.com');
    await fireEvent.changeText(screen.getByPlaceholderText('Password'), 'secret');

    // Act
    await fireEvent.press(screen.getByText('Log in'));

    // Assert
    expect(await screen.findByText('server exploded')).toBeTruthy();
  });

  test('submit__login_rejects_with_api_error_without_string_detail__shows_generic_login_failed', async () => {
    // Arrange
    const login = jest.fn().mockRejectedValueOnce(new ApiError(500, { message: 'oops' }));
    await renderScreen(login);
    await fireEvent.changeText(screen.getByPlaceholderText('Email'), 'dan@example.com');
    await fireEvent.changeText(screen.getByPlaceholderText('Password'), 'secret');

    // Act
    await fireEvent.press(screen.getByText('Log in'));

    // Assert
    expect(await screen.findByText('Login failed. Try again.')).toBeTruthy();
  });

  test('submit__login_rejects_with_non_api_error__shows_generic_message', async () => {
    // Arrange
    const login = jest.fn().mockRejectedValueOnce(new Error('network down'));
    await renderScreen(login);
    await fireEvent.changeText(screen.getByPlaceholderText('Email'), 'dan@example.com');
    await fireEvent.changeText(screen.getByPlaceholderText('Password'), 'secret');

    // Act
    await fireEvent.press(screen.getByText('Log in'));

    // Assert
    expect(await screen.findByText('Something went wrong. Try again.')).toBeTruthy();
  });

  test('press_sign_up_link__called__navigates_to_signup', async () => {
    // Arrange
    const { navigation } = await renderScreen(jest.fn());

    // Act
    await fireEvent.press(screen.getByText('New household? Sign up'));

    // Assert
    expect(navigation.navigate).toHaveBeenCalledWith('Signup');
  });
});
