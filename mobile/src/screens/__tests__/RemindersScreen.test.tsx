import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';

import RemindersScreen from '../RemindersScreen';
import { getReminders } from '../../api/reminders';
import { ApiError } from '../../api/client';
import type { ReminderItem } from '../../api/reminders';

jest.mock('../../api/reminders', () => ({ getReminders: jest.fn() }));
// RemindersScreen's focus-refetch isn't under test here (it needs a real
// NavigationContainer); treat it as an ordinary mount effect instead.
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: (effect: () => void) => require('react').useEffect(effect, [effect]),
}));

const mockedGetReminders = getReminders as jest.MockedFunction<typeof getReminders>;

function item(overrides: Partial<ReminderItem> = {}): ReminderItem {
  return {
    friend_id: 1,
    friend_display_name: 'Dan',
    gathering_type_id: 10,
    gathering_type_label: 'Family',
    last_gathering_date: '2026-01-01',
    days_since_last: 40,
    reminder_threshold_days: 30,
    days_overdue: 10,
    ...overrides,
  };
}

async function renderScreen() {
  const navigation = { navigate: jest.fn() } as any;
  await render(<RemindersScreen navigation={navigation} route={{} as any} />);
  return { navigation };
}

describe('RemindersScreen', () => {
  beforeEach(() => {
    mockedGetReminders.mockReset();
  });

  test('render__overdue_reminders_returned__shows_each_friend_type_and_overdue_days', async () => {
    // Arrange
    mockedGetReminders.mockResolvedValueOnce([
      item({ friend_id: 1, friend_display_name: 'Dan', gathering_type_label: 'Family', days_overdue: 10 }),
      item({ friend_id: 2, friend_display_name: 'Ann', gathering_type_label: 'Kids only', days_overdue: 1 }),
    ]);

    // Act
    await renderScreen();

    // Assert
    expect(await screen.findByText('Dan')).toBeTruthy();
    expect(screen.getByText('Family')).toBeTruthy();
    expect(screen.getByText('10 days overdue')).toBeTruthy();
    expect(screen.getByText('Ann')).toBeTruthy();
    expect(screen.getByText('1 day overdue')).toBeTruthy();
  });

  test('render__reminder_with_no_past_gathering__shows_never_met_up', async () => {
    // Arrange
    mockedGetReminders.mockResolvedValueOnce([
      item({ last_gathering_date: null, days_since_last: null, days_overdue: null }),
    ]);

    // Act
    await renderScreen();

    // Assert
    expect(await screen.findByText('Never met up')).toBeTruthy();
  });

  test('render__no_overdue_reminders__shows_the_all_caught_up_empty_state', async () => {
    // Arrange
    mockedGetReminders.mockResolvedValueOnce([]);

    // Act
    await renderScreen();

    // Assert
    expect(await screen.findByText(/all caught up/)).toBeTruthy();
  });

  test('load__fails_with_401__shows_session_expired_as_the_empty_state', async () => {
    // Arrange
    mockedGetReminders.mockRejectedValueOnce(new ApiError(401, 'expired'));

    // Act
    await renderScreen();

    // Assert
    expect(await screen.findByText('Your session expired. Please log in again.')).toBeTruthy();
  });

  test('load__fails_with_other_api_error_detail__shows_that_detail', async () => {
    // Arrange
    mockedGetReminders.mockRejectedValueOnce(new ApiError(500, 'server exploded'));

    // Act
    await renderScreen();

    // Assert
    expect(await screen.findByText('server exploded')).toBeTruthy();
  });

  test('load__fails_with_api_error_without_string_detail__shows_generic_something_went_wrong', async () => {
    // Arrange
    mockedGetReminders.mockRejectedValueOnce(new ApiError(500, { message: 'oops' }));

    // Act
    await renderScreen();

    // Assert
    expect(await screen.findByText('Something went wrong. Try again.')).toBeTruthy();
  });

  test('load__fails_with_non_api_error__shows_generic_retry_message', async () => {
    // Arrange
    mockedGetReminders.mockRejectedValueOnce(new Error('network down'));

    // Act
    await renderScreen();

    // Assert
    expect(await screen.findByText('Could not load reminders. Pull down to retry.')).toBeTruthy();
  });

  test('refresh_fails_with_existing_items__shows_banner_above_the_still_visible_list', async () => {
    // Arrange
    mockedGetReminders.mockResolvedValueOnce([item({ friend_id: 1, friend_display_name: 'Dan' })]);
    await renderScreen();
    await screen.findByText('Dan');
    mockedGetReminders.mockRejectedValueOnce(new ApiError(500, 'refresh failed'));

    // Act
    const list = screen.getByTestId('reminders-list');
    await act(() => list.props.refreshControl.props.onRefresh());

    // Assert
    expect(await screen.findByText('refresh failed')).toBeTruthy();
    expect(screen.getByText('Dan')).toBeTruthy();
  });

  test('press_a_reminder_row__called__navigates_to_FriendForm_with_that_friends_id', async () => {
    // Arrange
    mockedGetReminders.mockResolvedValueOnce([item({ friend_id: 7, friend_display_name: 'Dan' })]);
    const { navigation } = await renderScreen();
    await screen.findByText('Dan');

    // Act
    await fireEvent.press(screen.getByText('Dan'));

    // Assert
    expect(navigation.navigate).toHaveBeenCalledWith('FriendForm', { friendId: 7 });
  });

  test('press_log_gathering_on_a_reminder_row__called__navigates_to_LogGathering_with_friend_and_type', async () => {
    // Arrange
    mockedGetReminders.mockResolvedValueOnce([
      item({ friend_id: 7, friend_display_name: 'Dan', gathering_type_id: 42 }),
    ]);
    const { navigation } = await renderScreen();
    await screen.findByText('Dan');

    // Act
    await fireEvent.press(screen.getByText('Log gathering'));

    // Assert
    expect(navigation.navigate).toHaveBeenCalledWith('LogGathering', { friendId: 7, gatheringTypeId: 42 });
  });

  test('pull_to_refresh__called__reloads_reminders', async () => {
    // Arrange
    mockedGetReminders.mockResolvedValueOnce([]);
    await renderScreen();
    await waitFor(() => expect(mockedGetReminders).toHaveBeenCalledTimes(1));
    mockedGetReminders.mockResolvedValueOnce([item({ friend_id: 9, friend_display_name: 'Eve' })]);

    // Act
    const list = screen.getByTestId('reminders-list');
    await act(() => list.props.refreshControl.props.onRefresh());

    // Assert
    expect(await screen.findByText('Eve')).toBeTruthy();
  });
});
