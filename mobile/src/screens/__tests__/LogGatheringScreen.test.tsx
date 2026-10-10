import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import LogGatheringScreen from '../LogGatheringScreen';
import { getFriend } from '../../api/friends';
import { listGatherings, logGathering } from '../../api/gatherings';
import { ApiError } from '../../api/client';
import type { Friend, GatheringType } from '../../api/friends';
import type { Gathering } from '../../api/gatherings';

jest.mock('../../api/friends', () => ({
  ...jest.requireActual('../../api/friends'),
  getFriend: jest.fn(),
}));
jest.mock('../../api/gatherings', () => ({
  ...jest.requireActual('../../api/gatherings'),
  listGatherings: jest.fn(),
  logGathering: jest.fn(),
}));

const mockedGetFriend = getFriend as jest.MockedFunction<typeof getFriend>;
const mockedListGatherings = listGatherings as jest.MockedFunction<typeof listGatherings>;
const mockedLogGathering = logGathering as jest.MockedFunction<typeof logGathering>;

function gatheringType(overrides: Partial<GatheringType> = {}): GatheringType {
  return {
    id: 1,
    friend_id: 1,
    type: 'FAMILY',
    custom_label: null,
    reminder_threshold_days: 30,
    created_at: '',
    ...overrides,
  };
}

function friend(overrides: Partial<Friend> = {}): Friend {
  return {
    id: 1,
    household_id: 1,
    display_name: 'Dan',
    notes: null,
    kids_fit_score: null,
    adult_fit_score: 5,
    importance_score: 5,
    created_at: '',
    updated_at: '',
    people: [],
    gathering_types: [gatheringType()],
    ...overrides,
  };
}

function gathering(overrides: Partial<Gathering> = {}): Gathering {
  return {
    id: 1,
    friend_id: 1,
    gathering_type_id: 1,
    date: '2026-09-01',
    location: 'OUR_PLACE',
    notes: null,
    created_by: 1,
    created_at: '',
    ...overrides,
  };
}

async function renderScreen(friendId = 1, gatheringTypeId?: number) {
  const navigation = { navigate: jest.fn(), goBack: jest.fn(), setOptions: jest.fn() } as any;
  const route = { params: { friendId, gatheringTypeId } } as any;
  await render(<LogGatheringScreen navigation={navigation} route={route} />);
  return { navigation };
}

describe('LogGatheringScreen', () => {
  beforeEach(() => {
    mockedGetFriend.mockReset();
    mockedListGatherings.mockReset();
    mockedLogGathering.mockReset();
  });

  test('load__fails_with_401__shows_session_expired', async () => {
    // Arrange
    mockedGetFriend.mockRejectedValueOnce(new ApiError(401, 'expired'));
    mockedListGatherings.mockResolvedValueOnce([]);

    // Act
    await renderScreen();

    // Assert
    expect(await screen.findByText('Your session expired. Please log in again.')).toBeTruthy();
  });

  test('load__fails_with_non_api_error__shows_generic_load_error', async () => {
    // Arrange
    mockedGetFriend.mockRejectedValueOnce(new Error('network down'));
    mockedListGatherings.mockResolvedValueOnce([]);

    // Act
    await renderScreen();

    // Assert
    expect(await screen.findByText('Could not load this friend.')).toBeTruthy();
  });

  test('render__friend_has_no_gathering_types__shows_the_add_one_first_message', async () => {
    // Arrange
    mockedGetFriend.mockResolvedValueOnce(friend({ gathering_types: [] }));
    mockedListGatherings.mockResolvedValueOnce([]);

    // Act
    await renderScreen();

    // Assert
    expect(
      await screen.findByText("Dan doesn't have any gathering types yet. Add one by editing this friend first."),
    ).toBeTruthy();
  });

  test('render__friend_has_a_custom_gathering_type__shows_its_custom_label_as_a_pickable_option', async () => {
    // Arrange
    mockedGetFriend.mockResolvedValueOnce(
      friend({ gathering_types: [gatheringType({ id: 9, type: 'CUSTOM', custom_label: 'Book club' })] }),
    );
    mockedListGatherings.mockResolvedValueOnce([]);

    // Act
    await renderScreen();

    // Assert
    expect(await screen.findByText('Book club')).toBeTruthy();
  });

  test('render__past_gatherings_exist__lists_each_with_its_custom_type_label_and_location', async () => {
    // Arrange
    mockedGetFriend.mockResolvedValueOnce(
      friend({ gathering_types: [gatheringType({ id: 9, type: 'CUSTOM', custom_label: 'Book club' })] }),
    );
    mockedListGatherings.mockResolvedValueOnce([
      gathering({ id: 5, gathering_type_id: 9, date: '2026-08-01', location: 'OUTSIDE', notes: 'Fun night' }),
    ]);

    // Act
    await renderScreen();

    // Assert
    expect(await screen.findByText('2026-08-01')).toBeTruthy();
    expect(screen.getByText('Book club · Outside')).toBeTruthy();
    expect(screen.getByText('Fun night')).toBeTruthy();
  });

  test('render__past_gathering_references_a_deleted_gathering_type__shows_unknown_type', async () => {
    // Arrange
    mockedGetFriend.mockResolvedValueOnce(friend());
    mockedListGatherings.mockResolvedValueOnce([gathering({ gathering_type_id: 999 })]);

    // Act
    await renderScreen();

    // Assert
    expect(await screen.findByText(/Unknown type/)).toBeTruthy();
  });

  test('submit__valid_defaults__logs_the_gathering_and_goes_back', async () => {
    // Arrange
    mockedGetFriend.mockResolvedValueOnce(friend());
    mockedListGatherings.mockResolvedValueOnce([]);
    mockedLogGathering.mockResolvedValueOnce(gathering());
    const { navigation } = await renderScreen();
    await screen.findByText('Dan');

    // Act
    await fireEvent.press(screen.getByTestId('log-gathering-submit'));

    // Assert
    await waitFor(() => expect(mockedLogGathering).toHaveBeenCalledTimes(1));
    expect(mockedLogGathering).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ gathering_type_id: 1, location: 'OUR_PLACE', notes: null }),
    );
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });

  test('route_has_a_valid_preselected_gathering_type_id__submit_uses_that_type_not_the_first_one', async () => {
    // Arrange
    mockedGetFriend.mockResolvedValueOnce(
      friend({ gathering_types: [gatheringType({ id: 1 }), gatheringType({ id: 2, type: 'KIDS_ONLY' })] }),
    );
    mockedListGatherings.mockResolvedValueOnce([]);
    mockedLogGathering.mockResolvedValueOnce(gathering());
    await renderScreen(1, 2);
    await screen.findByText('Dan');

    // Act
    await fireEvent.press(screen.getByTestId('log-gathering-submit'));

    // Assert
    await waitFor(() => expect(mockedLogGathering).toHaveBeenCalledTimes(1));
    expect(mockedLogGathering).toHaveBeenCalledWith(1, expect.objectContaining({ gathering_type_id: 2 }));
  });

  test('route_has_a_preselected_gathering_type_id_the_friend_no_longer_has__falls_back_to_the_first_type', async () => {
    // Arrange
    mockedGetFriend.mockResolvedValueOnce(
      friend({ gathering_types: [gatheringType({ id: 1 }), gatheringType({ id: 2, type: 'KIDS_ONLY' })] }),
    );
    mockedListGatherings.mockResolvedValueOnce([]);
    mockedLogGathering.mockResolvedValueOnce(gathering());
    await renderScreen(1, 999);
    await screen.findByText('Dan');

    // Act
    await fireEvent.press(screen.getByTestId('log-gathering-submit'));

    // Assert
    await waitFor(() => expect(mockedLogGathering).toHaveBeenCalledTimes(1));
    expect(mockedLogGathering).toHaveBeenCalledWith(1, expect.objectContaining({ gathering_type_id: 1 }));
  });

  test('submit__invalid_calendar_date__shows_validation_error_and_does_not_call_logGathering', async () => {
    // Arrange
    mockedGetFriend.mockResolvedValueOnce(friend());
    mockedListGatherings.mockResolvedValueOnce([]);
    await renderScreen();
    await screen.findByText('Dan');
    await fireEvent.changeText(screen.getByPlaceholderText('Month'), '2');
    await fireEvent.changeText(screen.getByPlaceholderText('Day'), '30');

    // Act
    await fireEvent.press(screen.getByTestId('log-gathering-submit'));

    // Assert
    expect(await screen.findByText("That date doesn't exist — check the day for that month.")).toBeTruthy();
    expect(mockedLogGathering).not.toHaveBeenCalled();
  });

  test('submit__month_out_of_range__shows_validation_error', async () => {
    // Arrange
    mockedGetFriend.mockResolvedValueOnce(friend());
    mockedListGatherings.mockResolvedValueOnce([]);
    await renderScreen();
    await screen.findByText('Dan');
    await fireEvent.changeText(screen.getByPlaceholderText('Month'), '13');

    // Act
    await fireEvent.press(screen.getByTestId('log-gathering-submit'));

    // Assert
    expect(await screen.findByText('Month must be from 1 to 12.')).toBeTruthy();
  });

  test('submit__day_out_of_range__shows_validation_error', async () => {
    // Arrange
    mockedGetFriend.mockResolvedValueOnce(friend());
    mockedListGatherings.mockResolvedValueOnce([]);
    await renderScreen();
    await screen.findByText('Dan');
    await fireEvent.changeText(screen.getByPlaceholderText('Day'), '32');

    // Act
    await fireEvent.press(screen.getByTestId('log-gathering-submit'));

    // Assert
    expect(await screen.findByText('Day must be from 1 to 31.')).toBeTruthy();
  });

  test('submit__year_out_of_range__shows_validation_error', async () => {
    // Arrange
    mockedGetFriend.mockResolvedValueOnce(friend());
    mockedListGatherings.mockResolvedValueOnce([]);
    await renderScreen();
    await screen.findByText('Dan');
    await fireEvent.changeText(screen.getByPlaceholderText('Year'), '1800');

    // Act
    await fireEvent.press(screen.getByTestId('log-gathering-submit'));

    // Assert
    expect(await screen.findByText('Year looks wrong.')).toBeTruthy();
  });

  test('submit__logGathering_rejects_with_api_error__shows_its_detail', async () => {
    // Arrange
    mockedGetFriend.mockResolvedValueOnce(friend());
    mockedListGatherings.mockResolvedValueOnce([]);
    mockedLogGathering.mockRejectedValueOnce(new ApiError(500, 'server exploded'));
    await renderScreen();
    await screen.findByText('Dan');

    // Act
    await fireEvent.press(screen.getByTestId('log-gathering-submit'));

    // Assert
    expect(await screen.findByText('server exploded')).toBeTruthy();
  });

  test('submit__logGathering_rejects_with_api_error_without_string_detail__shows_generic_something_went_wrong', async () => {
    // Arrange
    mockedGetFriend.mockResolvedValueOnce(friend());
    mockedListGatherings.mockResolvedValueOnce([]);
    mockedLogGathering.mockRejectedValueOnce(new ApiError(500, { message: 'oops' }));
    await renderScreen();
    await screen.findByText('Dan');

    // Act
    await fireEvent.press(screen.getByTestId('log-gathering-submit'));

    // Assert
    expect(await screen.findByText('Something went wrong. Try again.')).toBeTruthy();
  });

  test('submit__logGathering_rejects_with_non_api_error__shows_generic_message', async () => {
    // Arrange
    mockedGetFriend.mockResolvedValueOnce(friend());
    mockedListGatherings.mockResolvedValueOnce([]);
    mockedLogGathering.mockRejectedValueOnce(new Error('network down'));
    await renderScreen();
    await screen.findByText('Dan');

    // Act
    await fireEvent.press(screen.getByTestId('log-gathering-submit'));

    // Assert
    expect(await screen.findByText('Could not save. Try again.')).toBeTruthy();
  });

  test('select_a_different_gathering_type__submitted__sends_the_new_types_id', async () => {
    // Arrange
    mockedGetFriend.mockResolvedValueOnce(
      friend({
        gathering_types: [gatheringType({ id: 1, type: 'FAMILY' }), gatheringType({ id: 2, type: 'KIDS_ONLY' })],
      }),
    );
    mockedListGatherings.mockResolvedValueOnce([]);
    mockedLogGathering.mockResolvedValueOnce(gathering());
    await renderScreen();
    await screen.findByText('Dan');

    // Act
    await fireEvent.press(screen.getByText('Kids only'));
    await fireEvent.press(screen.getByTestId('log-gathering-submit'));

    // Assert
    await waitFor(() =>
      expect(mockedLogGathering).toHaveBeenCalledWith(1, expect.objectContaining({ gathering_type_id: 2 })),
    );
  });

  test('select_a_different_location__submitted__sends_the_new_location', async () => {
    // Arrange
    mockedGetFriend.mockResolvedValueOnce(friend());
    mockedListGatherings.mockResolvedValueOnce([]);
    mockedLogGathering.mockResolvedValueOnce(gathering());
    await renderScreen();
    await screen.findByText('Dan');

    // Act
    await fireEvent.press(screen.getByText('Outside'));
    await fireEvent.press(screen.getByTestId('log-gathering-submit'));

    // Assert
    await waitFor(() =>
      expect(mockedLogGathering).toHaveBeenCalledWith(1, expect.objectContaining({ location: 'OUTSIDE' })),
    );
  });

  test('fill_in_notes__submitted__trims_and_sends_them', async () => {
    // Arrange
    mockedGetFriend.mockResolvedValueOnce(friend());
    mockedListGatherings.mockResolvedValueOnce([]);
    mockedLogGathering.mockResolvedValueOnce(gathering());
    await renderScreen();
    await screen.findByText('Dan');
    await fireEvent.changeText(screen.getByPlaceholderText('Anything worth remembering about this one'), '  Fun!  ');

    // Act
    await fireEvent.press(screen.getByTestId('log-gathering-submit'));

    // Assert
    await waitFor(() =>
      expect(mockedLogGathering).toHaveBeenCalledWith(1, expect.objectContaining({ notes: 'Fun!' })),
    );
  });
});
