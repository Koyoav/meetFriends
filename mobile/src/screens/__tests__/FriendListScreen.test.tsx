import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';

import FriendListScreen from '../FriendListScreen';
import { useAuth } from '../../auth/AuthContext';
import { getInvitePlanning } from '../../api/invitePlanning';
import { ApiError } from '../../api/client';
import type { InvitePlanningItem } from '../../api/invitePlanning';

jest.mock('../../auth/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../api/invitePlanning', () => ({
  ...jest.requireActual('../../api/invitePlanning'),
  getInvitePlanning: jest.fn(),
}));
// FriendListScreen's focus-refetch isn't under test here (it needs a real
// NavigationContainer); treat it as an ordinary mount effect instead.
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: (effect: () => void) => require('react').useEffect(effect, [effect]),
}));

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockedGetInvitePlanning = getInvitePlanning as jest.MockedFunction<typeof getInvitePlanning>;

function item(overrides: Partial<InvitePlanningItem> = {}): InvitePlanningItem {
  return {
    friend_id: 1,
    display_name: 'Dan',
    kids_fit_score: null,
    adult_fit_score: 5,
    importance_score: 5,
    combined_score: 5,
    last_gathering_date: null,
    days_since_last: null,
    ...overrides,
  };
}

async function renderScreen(logout: jest.Mock = jest.fn()) {
  mockedUseAuth.mockReturnValue({ isLoading: false, isSignedIn: true, login: jest.fn(), signup: jest.fn(), logout });
  const navigation = { navigate: jest.fn(), setOptions: jest.fn() } as any;
  await render(<FriendListScreen navigation={navigation} route={{} as any} />);
  return { navigation };
}

describe('FriendListScreen', () => {
  beforeEach(() => {
    mockedGetInvitePlanning.mockReset();
  });

  test('render__friends_returned__shows_each_friends_name_and_staleness', async () => {
    // Arrange
    mockedGetInvitePlanning.mockResolvedValueOnce([
      item({ friend_id: 1, display_name: 'Dan', days_since_last: 10 }),
      item({ friend_id: 2, display_name: 'Ann', days_since_last: null }),
    ]);

    // Act
    await renderScreen();

    // Assert
    expect(await screen.findByText('Dan')).toBeTruthy();
    expect(screen.getByText('Met up 10 days ago')).toBeTruthy();
    expect(screen.getByText('Ann')).toBeTruthy();
    expect(screen.getByText('Never met up')).toBeTruthy();
  });

  test('render__friend_met_today_or_yesterday_with_kids_fit_score__shows_those_specific_labels', async () => {
    // Arrange
    mockedGetInvitePlanning.mockResolvedValueOnce([
      item({ friend_id: 1, display_name: 'Dan', days_since_last: 0, kids_fit_score: 3 }),
      item({ friend_id: 2, display_name: 'Ann', days_since_last: 1 }),
    ]);

    // Act
    await renderScreen();

    // Assert
    expect(await screen.findByText('Met up today')).toBeTruthy();
    expect(screen.getByText(/Kids 3/)).toBeTruthy();
    expect(screen.getByText('Met up 1 day ago')).toBeTruthy();
  });

  test('load__fails_with_api_error_without_string_detail__shows_generic_something_went_wrong', async () => {
    // Arrange
    mockedGetInvitePlanning.mockRejectedValueOnce(new ApiError(500, { message: 'oops' }));

    // Act
    await renderScreen();

    // Assert
    expect(await screen.findByText('Something went wrong. Try again.')).toBeTruthy();
  });

  test('switch_filters_quickly__older_request_resolving_later__does_not_clobber_the_newer_result', async () => {
    // Arrange: the first request (staleness/ALL) resolves after the second (combined/ALL)
    // has already landed, and must not overwrite it.
    let resolveFirst: (items: InvitePlanningItem[]) => void;
    mockedGetInvitePlanning.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFirst = resolve;
      }),
    );
    await renderScreen();
    mockedGetInvitePlanning.mockResolvedValueOnce([item({ friend_id: 2, display_name: 'Ann' })]);

    // Act
    await fireEvent.press(screen.getByText('Combined score'));
    await screen.findByText('Ann');
    await act(async () => {
      resolveFirst!([item({ friend_id: 1, display_name: 'Dan' })]);
    });

    // Assert: the stale first response never overwrote the second, newer one.
    expect(screen.getByText('Ann')).toBeTruthy();
    expect(screen.queryByText('Dan')).toBeNull();
  });

  test('render__no_friends__shows_the_empty_state_message', async () => {
    // Arrange
    mockedGetInvitePlanning.mockResolvedValueOnce([]);

    // Act
    await renderScreen();

    // Assert
    expect(await screen.findByText(/No friends yet/)).toBeTruthy();
  });

  test('load__fails_with_401__shows_session_expired_as_the_empty_state', async () => {
    // Arrange
    mockedGetInvitePlanning.mockRejectedValueOnce(new ApiError(401, 'expired'));

    // Act
    await renderScreen();

    // Assert
    expect(await screen.findByText('Your session expired. Please log in again.')).toBeTruthy();
  });

  test('load__fails_with_other_api_error_detail__shows_that_detail', async () => {
    // Arrange
    mockedGetInvitePlanning.mockRejectedValueOnce(new ApiError(500, 'server exploded'));

    // Act
    await renderScreen();

    // Assert
    expect(await screen.findByText('server exploded')).toBeTruthy();
  });

  test('load__fails_with_non_api_error__shows_generic_retry_message', async () => {
    // Arrange
    mockedGetInvitePlanning.mockRejectedValueOnce(new Error('network down'));

    // Act
    await renderScreen();

    // Assert
    expect(await screen.findByText('Could not load your friends. Pull down to retry.')).toBeTruthy();
  });

  test('refresh_fails_with_existing_items__shows_banner_above_the_still_visible_list', async () => {
    // Arrange
    mockedGetInvitePlanning.mockResolvedValueOnce([item({ friend_id: 1, display_name: 'Dan' })]);
    await renderScreen();
    await screen.findByText('Dan');
    mockedGetInvitePlanning.mockRejectedValueOnce(new ApiError(500, 'refresh failed'));

    // Act
    const list = screen.getByTestId('friend-list');
    await act(() => list.props.refreshControl.props.onRefresh());

    // Assert
    expect(await screen.findByText('refresh failed')).toBeTruthy();
    expect(screen.getByText('Dan')).toBeTruthy();
  });

  test('press_a_friend_row__called__navigates_to_FriendForm_with_that_friends_id', async () => {
    // Arrange
    mockedGetInvitePlanning.mockResolvedValueOnce([item({ friend_id: 7, display_name: 'Dan' })]);
    const { navigation } = await renderScreen();
    await screen.findByText('Dan');

    // Act
    await fireEvent.press(screen.getByText('Dan'));

    // Assert
    expect(navigation.navigate).toHaveBeenCalledWith('FriendForm', { friendId: 7 });
  });

  test('press_log_gathering_on_a_friend_row__called__navigates_to_LogGathering_with_that_friends_id', async () => {
    // Arrange
    mockedGetInvitePlanning.mockResolvedValueOnce([item({ friend_id: 7, display_name: 'Dan' })]);
    const { navigation } = await renderScreen();
    await screen.findByText('Dan');

    // Act
    await fireEvent.press(screen.getByText('Log gathering'));

    // Assert
    expect(navigation.navigate).toHaveBeenCalledWith('LogGathering', { friendId: 7 });
  });

  test('press_the_header_log_out_button__called__calls_logout', async () => {
    // Arrange
    mockedGetInvitePlanning.mockResolvedValueOnce([]);
    const logout = jest.fn();
    const { navigation } = await renderScreen(logout);
    const { headerLeft } = navigation.setOptions.mock.calls[0][0];
    await render(headerLeft());

    // Act
    await fireEvent.press(screen.getByText('Log out'));

    // Assert
    expect(logout).toHaveBeenCalledTimes(1);
  });

  test('press_the_header_add_button__called__navigates_to_FriendForm_with_no_friend_id', async () => {
    // Arrange
    mockedGetInvitePlanning.mockResolvedValueOnce([]);
    const { navigation } = await renderScreen();
    const { headerRight } = navigation.setOptions.mock.calls[0][0];
    await render(headerRight());

    // Act
    await fireEvent.press(screen.getByText('+ Add'));

    // Assert
    expect(navigation.navigate).toHaveBeenCalledWith('FriendForm', {});
  });

  test('press_the_header_reminders_button__called__navigates_to_Reminders', async () => {
    // Arrange
    mockedGetInvitePlanning.mockResolvedValueOnce([]);
    const { navigation } = await renderScreen();
    const { headerRight } = navigation.setOptions.mock.calls[0][0];
    await render(headerRight());

    // Act
    await fireEvent.press(screen.getByText('Reminders'));

    // Assert
    expect(navigation.navigate).toHaveBeenCalledWith('Reminders');
  });

  test('select_a_different_sort_option__called__reloads_with_the_new_sort', async () => {
    // Arrange
    mockedGetInvitePlanning.mockResolvedValueOnce([]);
    await renderScreen();
    await waitFor(() => expect(mockedGetInvitePlanning).toHaveBeenCalledTimes(1));
    mockedGetInvitePlanning.mockResolvedValueOnce([]);

    // Act
    await fireEvent.press(screen.getByText('Combined score'));

    // Assert
    await waitFor(() =>
      expect(mockedGetInvitePlanning).toHaveBeenLastCalledWith({ sortBy: 'combined', gatheringType: 'ALL' }),
    );
  });
});
