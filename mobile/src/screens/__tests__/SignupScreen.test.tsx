import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import SignupScreen from '../SignupScreen';
import { useAuth } from '../../auth/AuthContext';
import { ApiError } from '../../api/client';

jest.mock('../../auth/AuthContext', () => ({ useAuth: jest.fn() }));

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

async function renderScreen(signup: jest.Mock) {
  mockedUseAuth.mockReturnValue({
    isLoading: false,
    isSignedIn: false,
    login: jest.fn(),
    signup,
    logout: jest.fn(),
  });
  const navigation = { navigate: jest.fn() } as any;
  await render(<SignupScreen navigation={navigation} route={{} as any} />);
  return { navigation };
}

async function fillValidForm() {
  await fireEvent.changeText(screen.getByPlaceholderText('Household name (e.g. The Cohens)'), 'The Dans');
  await fireEvent.changeText(screen.getByPlaceholderText('Your name'), 'Dan');
  await fireEvent.changeText(screen.getByPlaceholderText('Email'), 'dan@example.com');
  await fireEvent.changeText(screen.getByPlaceholderText('Password'), 'secret');
}

describe('SignupScreen', () => {
  test('render__initial__sign_up_button_is_disabled', async () => {
    // Act
    await renderScreen(jest.fn());

    // Assert
    expect(screen.getByTestId('signup-submit')).toHaveProp('accessibilityState', { disabled: true });
  });

  test('fill_in_all_fields__called__enables_the_sign_up_button', async () => {
    // Arrange
    await renderScreen(jest.fn());

    // Act
    await fillValidForm();

    // Assert
    await waitFor(() =>
      expect(screen.getByTestId('signup-submit')).toHaveProp('accessibilityState', { disabled: false }),
    );
  });

  test('missing_one_field__called__sign_up_button_stays_disabled', async () => {
    // Arrange
    await renderScreen(jest.fn());

    // Act: every field but household name.
    await fireEvent.changeText(screen.getByPlaceholderText('Your name'), 'Dan');
    await fireEvent.changeText(screen.getByPlaceholderText('Email'), 'dan@example.com');
    await fireEvent.changeText(screen.getByPlaceholderText('Password'), 'secret');

    // Assert
    expect(screen.getByTestId('signup-submit')).toHaveProp('accessibilityState', { disabled: true });
  });

  test('submit__called__trims_fields_and_calls_signup', async () => {
    // Arrange
    const signup = jest.fn().mockResolvedValueOnce(undefined);
    await renderScreen(signup);
    await fireEvent.changeText(screen.getByPlaceholderText('Household name (e.g. The Cohens)'), '  The Dans  ');
    await fireEvent.changeText(screen.getByPlaceholderText('Your name'), '  Dan  ');
    await fireEvent.changeText(screen.getByPlaceholderText('Email'), '  dan@example.com  ');
    await fireEvent.changeText(screen.getByPlaceholderText('Password'), 'secret');

    // Act
    await fireEvent.press(screen.getByText('Sign up'));

    // Assert
    await waitFor(() =>
      expect(signup).toHaveBeenCalledWith('The Dans', 'Dan', 'dan@example.com', 'secret'),
    );
  });

  test('submit__while_signup_is_pending__shows_a_spinner_instead_of_the_label', async () => {
    // Arrange
    let resolveSignup: () => void;
    const signup = jest.fn().mockReturnValueOnce(new Promise<void>((resolve) => (resolveSignup = resolve)));
    await renderScreen(signup);
    await fillValidForm();

    // Act: don't await — the press handler stays pending until resolveSignup() runs below.
    fireEvent.press(screen.getByText('Sign up'));

    // Assert
    await waitFor(() => expect(screen.queryByText('Sign up')).toBeNull());
    resolveSignup!();
    await waitFor(() => expect(screen.getByText('Sign up')).toBeTruthy());
  });

  test('submit__signup_rejects_with_duplicate_email_detail__shows_that_detail', async () => {
    // Arrange
    const signup = jest.fn().mockRejectedValueOnce(new ApiError(400, 'Email already registered'));
    await renderScreen(signup);
    await fillValidForm();

    // Act
    await fireEvent.press(screen.getByText('Sign up'));

    // Assert
    expect(await screen.findByText('Email already registered')).toBeTruthy();
  });

  test('submit__signup_rejects_with_api_error_without_string_detail__shows_generic_signup_failed', async () => {
    // Arrange
    const signup = jest.fn().mockRejectedValueOnce(new ApiError(500, { message: 'oops' }));
    await renderScreen(signup);
    await fillValidForm();

    // Act
    await fireEvent.press(screen.getByText('Sign up'));

    // Assert
    expect(await screen.findByText('Signup failed. Try again.')).toBeTruthy();
  });

  test('submit__signup_rejects_with_non_api_error__shows_generic_message', async () => {
    // Arrange
    const signup = jest.fn().mockRejectedValueOnce(new Error('network down'));
    await renderScreen(signup);
    await fillValidForm();

    // Act
    await fireEvent.press(screen.getByText('Sign up'));

    // Assert
    expect(await screen.findByText('Something went wrong. Try again.')).toBeTruthy();
  });

  test('press_log_in_link__called__navigates_to_login', async () => {
    // Arrange
    const { navigation } = await renderScreen(jest.fn());

    // Act
    await fireEvent.press(screen.getByText('Already have an account? Log in'));

    // Assert
    expect(navigation.navigate).toHaveBeenCalledWith('Login');
  });
});
