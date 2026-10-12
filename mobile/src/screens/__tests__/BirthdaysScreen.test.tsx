import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';

import BirthdaysScreen from '../BirthdaysScreen';
import { getBirthdays } from '../../api/birthdays';
import { ApiError } from '../../api/client';
import type { BirthdayItem } from '../../api/birthdays';

jest.mock('../../api/birthdays', () => ({ getBirthdays: jest.fn() }));
// BirthdaysScreen's focus-refetch isn't under test here (it needs a real
// NavigationContainer); treat it as an ordinary mount effect instead.
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: (effect: () => void) => require('react').useEffect(effect, [effect]),
}));

const mockedGetBirthdays = getBirthdays as jest.MockedFunction<typeof getBirthdays>;

function item(overrides: Partial<BirthdayItem> = {}): BirthdayItem {
  return {
    friend_id: 1,
    friend_display_name: 'Dan',
    person_id: 1,
    person_name: 'Noa',
    role: 'kid',
    birth_month: 5,
    birth_day: 14,
    birth_year: 2019,
    turning_age: 7,
    days_until: 5,
    ...overrides,
  };
}

async function renderScreen() {
  const navigation = { navigate: jest.fn() } as any;
  await render(<BirthdaysScreen navigation={navigation} route={{} as any} />);
  return { navigation };
}

describe('BirthdaysScreen', () => {
  beforeEach(() => {
    mockedGetBirthdays.mockReset();
  });

  test('render__birthdays_returned__shows_person_friend_and_turning_age', async () => {
    // Arrange
    mockedGetBirthdays.mockResolvedValueOnce([
      item({ person_id: 1, person_name: 'Noa', friend_display_name: 'Dan', turning_age: 7, days_until: 5 }),
    ]);

    // Act
    await renderScreen();

    // Assert
    expect(await screen.findByText('Noa')).toBeTruthy();
    expect(screen.getByText('Dan')).toBeTruthy();
    expect(screen.getByText('Turning 7 · In 5 days')).toBeTruthy();
  });

  test('render__birth_year_unknown__omits_turning_age', async () => {
    // Arrange
    mockedGetBirthdays.mockResolvedValueOnce([item({ turning_age: null, days_until: 0 })]);

    // Act
    await renderScreen();

    // Assert
    expect(await screen.findByText('Today!')).toBeTruthy();
  });

  test('render__birthday_already_passed_this_month__shows_days_ago', async () => {
    // Arrange
    mockedGetBirthdays.mockResolvedValueOnce([item({ turning_age: null, days_until: -3 })]);

    // Act
    await renderScreen();

    // Assert
    expect(await screen.findByText('3 days ago')).toBeTruthy();
  });

  test('render__one_day_until__uses_singular_day', async () => {
    // Arrange
    mockedGetBirthdays.mockResolvedValueOnce([item({ turning_age: null, days_until: 1 })]);

    // Act
    await renderScreen();

    // Assert
    expect(await screen.findByText('In 1 day')).toBeTruthy();
  });

  test('render__no_birthdays__shows_the_empty_state', async () => {
    // Arrange
    mockedGetBirthdays.mockResolvedValueOnce([]);

    // Act
    await renderScreen();

    // Assert
    expect(await screen.findByText('No birthdays this month.')).toBeTruthy();
  });

  test('load__fails_with_401__shows_session_expired_as_the_empty_state', async () => {
    // Arrange
    mockedGetBirthdays.mockRejectedValueOnce(new ApiError(401, 'expired'));

    // Act
    await renderScreen();

    // Assert
    expect(await screen.findByText('Your session expired. Please log in again.')).toBeTruthy();
  });

  test('load__fails_with_other_api_error_detail__shows_that_detail', async () => {
    // Arrange
    mockedGetBirthdays.mockRejectedValueOnce(new ApiError(500, 'server exploded'));

    // Act
    await renderScreen();

    // Assert
    expect(await screen.findByText('server exploded')).toBeTruthy();
  });

  test('load__fails_with_api_error_without_string_detail__shows_generic_something_went_wrong', async () => {
    // Arrange
    mockedGetBirthdays.mockRejectedValueOnce(new ApiError(500, { message: 'oops' }));

    // Act
    await renderScreen();

    // Assert
    expect(await screen.findByText('Something went wrong. Try again.')).toBeTruthy();
  });

  test('load__fails_with_non_api_error__shows_generic_retry_message', async () => {
    // Arrange
    mockedGetBirthdays.mockRejectedValueOnce(new Error('network down'));

    // Act
    await renderScreen();

    // Assert
    expect(await screen.findByText('Could not load birthdays. Pull down to retry.')).toBeTruthy();
  });

  test('refresh_fails_with_existing_items__shows_banner_above_the_still_visible_list', async () => {
    // Arrange
    mockedGetBirthdays.mockResolvedValueOnce([item({ person_id: 1, person_name: 'Noa' })]);
    await renderScreen();
    await screen.findByText('Noa');
    mockedGetBirthdays.mockRejectedValueOnce(new ApiError(500, 'refresh failed'));

    // Act
    const list = screen.getByTestId('birthdays-list');
    await act(() => list.props.refreshControl.props.onRefresh());

    // Assert
    expect(await screen.findByText('refresh failed')).toBeTruthy();
    expect(screen.getByText('Noa')).toBeTruthy();
  });

  test('press_a_birthday_row__called__navigates_to_FriendForm_with_that_friends_id', async () => {
    // Arrange
    mockedGetBirthdays.mockResolvedValueOnce([item({ person_id: 1, person_name: 'Noa', friend_id: 9 })]);
    const { navigation } = await renderScreen();
    await screen.findByText('Noa');

    // Act
    await fireEvent.press(screen.getByText('Noa'));

    // Assert
    expect(navigation.navigate).toHaveBeenCalledWith('FriendForm', { friendId: 9 });
  });

  test('pull_to_refresh__called__reloads_birthdays', async () => {
    // Arrange
    mockedGetBirthdays.mockResolvedValueOnce([]);
    await renderScreen();
    await waitFor(() => expect(mockedGetBirthdays).toHaveBeenCalledTimes(1));
    mockedGetBirthdays.mockResolvedValueOnce([item({ person_id: 2, person_name: 'Eve' })]);

    // Act
    const list = screen.getByTestId('birthdays-list');
    await act(() => list.props.refreshControl.props.onRefresh());

    // Assert
    expect(await screen.findByText('Eve')).toBeTruthy();
  });

  test('press_next_month_arrow__called__reloads_birthdays_for_the_following_month', async () => {
    // Arrange
    const thisMonth = new Date().getMonth() + 1;
    const nextMonth = thisMonth === 12 ? 1 : thisMonth + 1;
    mockedGetBirthdays.mockResolvedValueOnce([]);
    await renderScreen();
    await waitFor(() => expect(mockedGetBirthdays).toHaveBeenLastCalledWith(thisMonth));
    mockedGetBirthdays.mockResolvedValueOnce([]);

    // Act
    await fireEvent.press(screen.getByText('›'));

    // Assert
    await waitFor(() => expect(mockedGetBirthdays).toHaveBeenLastCalledWith(nextMonth));
  });

  test('press_previous_month_arrow__called__reloads_birthdays_for_the_prior_month', async () => {
    // Arrange
    const thisMonth = new Date().getMonth() + 1;
    const previousMonth = thisMonth === 1 ? 12 : thisMonth - 1;
    mockedGetBirthdays.mockResolvedValueOnce([]);
    await renderScreen();
    await waitFor(() => expect(mockedGetBirthdays).toHaveBeenLastCalledWith(thisMonth));
    mockedGetBirthdays.mockResolvedValueOnce([]);

    // Act
    await fireEvent.press(screen.getByText('‹'));

    // Assert
    await waitFor(() => expect(mockedGetBirthdays).toHaveBeenLastCalledWith(previousMonth));
  });
});
