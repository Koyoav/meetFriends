import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import FriendFormScreen from '../FriendFormScreen';
import * as friendsApi from '../../api/friends';
import { ApiError } from '../../api/client';
import type { Friend } from '../../api/friends';

jest.mock('../../api/friends');

const mockedGetFriend = friendsApi.getFriend as jest.MockedFunction<typeof friendsApi.getFriend>;
const mockedCreateFriend = friendsApi.createFriend as jest.MockedFunction<typeof friendsApi.createFriend>;
const mockedUpdateFriendScalars = friendsApi.updateFriendScalars as jest.MockedFunction<
  typeof friendsApi.updateFriendScalars
>;
const mockedDeleteFriend = friendsApi.deleteFriend as jest.MockedFunction<typeof friendsApi.deleteFriend>;
const mockedAddPerson = friendsApi.addPerson as jest.MockedFunction<typeof friendsApi.addPerson>;
const mockedUpdatePerson = friendsApi.updatePerson as jest.MockedFunction<typeof friendsApi.updatePerson>;
const mockedDeletePerson = friendsApi.deletePerson as jest.MockedFunction<typeof friendsApi.deletePerson>;
const mockedAddGatheringType = friendsApi.addGatheringType as jest.MockedFunction<typeof friendsApi.addGatheringType>;
const mockedDeleteGatheringType = friendsApi.deleteGatheringType as jest.MockedFunction<
  typeof friendsApi.deleteGatheringType
>;

function friend(overrides: Partial<Friend> = {}): Friend {
  return {
    id: 1,
    household_id: 1,
    display_name: 'Dan',
    notes: null,
    kids_fit_score: null,
    adult_fit_score: 5,
    importance_score: 5,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    people: [],
    gathering_types: [],
    ...overrides,
  };
}

async function renderScreen(friendId?: number) {
  const navigation = { navigate: jest.fn(), goBack: jest.fn(), setOptions: jest.fn() } as any;
  const route = { params: { friendId } } as any;
  await render(<FriendFormScreen navigation={navigation} route={route} />);
  return { navigation };
}

describe('FriendFormScreen (add)', () => {
  beforeEach(() => {
    mockedCreateFriend.mockReset();
    mockedAddGatheringType.mockReset();
  });

  test('render__add_mode__shows_no_delete_button', async () => {
    // Act
    await renderScreen();

    // Assert
    expect(screen.queryByTestId('delete-friend')).toBeNull();
  });

  test('submit__blank_name__shows_validation_error_and_does_not_call_createFriend', async () => {
    // Arrange
    await renderScreen();

    // Act
    await fireEvent.press(screen.getByTestId('save-friend'));

    // Assert
    expect(await screen.findByText('Give this friend a name.')).toBeTruthy();
    expect(mockedCreateFriend).not.toHaveBeenCalled();
  });

  test('submit__adult_fit_score_out_of_range__shows_validation_error', async () => {
    // Arrange
    await renderScreen();
    await fireEvent.changeText(screen.getByPlaceholderText("Friend's name"), 'Dan');
    await fireEvent.changeText(screen.getByTestId('adult-fit-score'), '11');

    // Act
    await fireEvent.press(screen.getByTestId('save-friend'));

    // Assert
    expect(await screen.findByText('Adult fit score must be a number from 1 to 10.')).toBeTruthy();
  });

  test('submit__valid_minimal_form__creates_friend_and_goes_back', async () => {
    // Arrange
    mockedCreateFriend.mockResolvedValueOnce(friend());
    const { navigation } = await renderScreen();
    await fireEvent.changeText(screen.getByPlaceholderText("Friend's name"), 'Dan');
    await fireEvent.changeText(screen.getByTestId('adult-fit-score'), '5');
    await fireEvent.changeText(screen.getByTestId('importance-score'), '5');

    // Act
    await fireEvent.press(screen.getByTestId('save-friend'));

    // Assert
    await waitFor(() =>
      expect(mockedCreateFriend).toHaveBeenCalledWith({
        display_name: 'Dan',
        notes: null,
        adult_fit_score: 5,
        kids_fit_score: null,
        importance_score: 5,
        people: [],
        gatheringTypes: [],
      }),
    );
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });

  test('submit__with_gathering_types_selected__includes_them_in_the_create_payload', async () => {
    // Arrange
    mockedCreateFriend.mockResolvedValueOnce(friend());
    await renderScreen();
    await fireEvent.changeText(screen.getByPlaceholderText("Friend's name"), 'Dan');
    await fireEvent.changeText(screen.getByTestId('adult-fit-score'), '5');
    await fireEvent.changeText(screen.getByTestId('importance-score'), '5');
    await fireEvent.press(screen.getByText('Family'));
    await fireEvent.press(screen.getByText('Kids only'));

    // Act
    await fireEvent.press(screen.getByTestId('save-friend'));

    // Assert
    await waitFor(() =>
      expect(mockedCreateFriend).toHaveBeenCalledWith(
        expect.objectContaining({ gatheringTypes: ['FAMILY', 'KIDS_ONLY'] }),
      ),
    );
  });

  test('submit__kids_fit_score_out_of_range__shows_validation_error', async () => {
    // Arrange
    await renderScreen();
    await fireEvent.changeText(screen.getByPlaceholderText("Friend's name"), 'Dan');
    await fireEvent.changeText(screen.getByTestId('adult-fit-score'), '5');
    await fireEvent.changeText(screen.getByTestId('importance-score'), '5');
    await fireEvent.changeText(screen.getByTestId('kids-fit-score'), '0');

    // Act
    await fireEvent.press(screen.getByTestId('save-friend'));

    // Assert
    expect(await screen.findByText('Kids fit score must be a number from 1 to 10, or left blank.')).toBeTruthy();
  });

  test('person_with_birth_month_out_of_range__submitted__shows_validation_error', async () => {
    // Arrange
    await renderScreen();
    await fireEvent.changeText(screen.getByPlaceholderText("Friend's name"), 'Dan');
    await fireEvent.changeText(screen.getByTestId('adult-fit-score'), '5');
    await fireEvent.changeText(screen.getByTestId('importance-score'), '5');
    await fireEvent.press(screen.getByText('+ Add person'));
    await fireEvent.changeText(screen.getByPlaceholderText('Name'), 'Kid');
    await fireEvent.changeText(screen.getByPlaceholderText('Month'), '13');
    await fireEvent.changeText(screen.getByPlaceholderText('Day'), '1');

    // Act
    await fireEvent.press(screen.getByTestId('save-friend'));

    // Assert
    expect(await screen.findByText("Kid's birth month must be from 1 to 12.")).toBeTruthy();
  });

  test('person_with_birth_day_out_of_range__submitted__shows_validation_error', async () => {
    // Arrange
    await renderScreen();
    await fireEvent.changeText(screen.getByPlaceholderText("Friend's name"), 'Dan');
    await fireEvent.changeText(screen.getByTestId('adult-fit-score'), '5');
    await fireEvent.changeText(screen.getByTestId('importance-score'), '5');
    await fireEvent.press(screen.getByText('+ Add person'));
    await fireEvent.changeText(screen.getByPlaceholderText('Name'), 'Kid');
    await fireEvent.changeText(screen.getByPlaceholderText('Month'), '6');
    await fireEvent.changeText(screen.getByPlaceholderText('Day'), '32');

    // Act
    await fireEvent.press(screen.getByTestId('save-friend'));

    // Assert
    expect(await screen.findByText("Kid's birth day must be from 1 to 31.")).toBeTruthy();
  });

  test('add_a_person_row_with_blank_name__submitted__shows_validation_error', async () => {
    // Arrange
    await renderScreen();
    await fireEvent.changeText(screen.getByPlaceholderText("Friend's name"), 'Dan');
    await fireEvent.changeText(screen.getByTestId('adult-fit-score'), '5');
    await fireEvent.changeText(screen.getByTestId('importance-score'), '5');
    await fireEvent.press(screen.getByText('+ Add person'));

    // Act
    await fireEvent.press(screen.getByTestId('save-friend'));

    // Assert
    expect(await screen.findByText('Every person needs a name (or remove the blank row).')).toBeTruthy();
  });

  test('add_a_person_then_remove_it__submitted__does_not_validate_the_removed_row', async () => {
    // Arrange
    mockedCreateFriend.mockResolvedValueOnce(friend());
    await renderScreen();
    await fireEvent.changeText(screen.getByPlaceholderText("Friend's name"), 'Dan');
    await fireEvent.changeText(screen.getByTestId('adult-fit-score'), '5');
    await fireEvent.changeText(screen.getByTestId('importance-score'), '5');
    await fireEvent.press(screen.getByText('+ Add person'));
    await fireEvent.press(screen.getByText('Remove'));

    // Act
    await fireEvent.press(screen.getByTestId('save-friend'));

    // Assert
    await waitFor(() => expect(mockedCreateFriend).toHaveBeenCalledWith(expect.objectContaining({ people: [] })));
  });

  test('person_with_birth_month_but_no_birth_day__submitted__shows_validation_error', async () => {
    // Arrange
    await renderScreen();
    await fireEvent.changeText(screen.getByPlaceholderText("Friend's name"), 'Dan');
    await fireEvent.changeText(screen.getByTestId('adult-fit-score'), '5');
    await fireEvent.changeText(screen.getByTestId('importance-score'), '5');
    await fireEvent.press(screen.getByText('+ Add person'));
    await fireEvent.changeText(screen.getByPlaceholderText('Name'), 'Kid');
    await fireEvent.changeText(screen.getByPlaceholderText('Month'), '6');

    // Act
    await fireEvent.press(screen.getByTestId('save-friend'));

    // Assert
    expect(await screen.findByText("Kid's birth month and day must be filled in together.")).toBeTruthy();
  });

  test('submit__createFriend_rejects_with_api_error__shows_its_detail', async () => {
    // Arrange
    mockedCreateFriend.mockRejectedValueOnce(new ApiError(500, 'server exploded'));
    await renderScreen();
    await fireEvent.changeText(screen.getByPlaceholderText("Friend's name"), 'Dan');
    await fireEvent.changeText(screen.getByTestId('adult-fit-score'), '5');
    await fireEvent.changeText(screen.getByTestId('importance-score'), '5');

    // Act
    await fireEvent.press(screen.getByTestId('save-friend'));

    // Assert
    expect(await screen.findByText('server exploded')).toBeTruthy();
  });

  test('submit__createFriend_rejects_with_non_api_error__shows_generic_message', async () => {
    // Arrange
    mockedCreateFriend.mockRejectedValueOnce(new Error('network down'));
    await renderScreen();
    await fireEvent.changeText(screen.getByPlaceholderText("Friend's name"), 'Dan');
    await fireEvent.changeText(screen.getByTestId('adult-fit-score'), '5');
    await fireEvent.changeText(screen.getByTestId('importance-score'), '5');

    // Act
    await fireEvent.press(screen.getByTestId('save-friend'));

    // Assert
    expect(await screen.findByText('Could not save. Try again.')).toBeTruthy();
  });
});

describe('FriendFormScreen (edit)', () => {
  beforeEach(() => {
    mockedGetFriend.mockReset();
    mockedUpdateFriendScalars.mockReset();
    mockedDeleteFriend.mockReset();
    mockedAddPerson.mockReset();
    mockedUpdatePerson.mockReset();
    mockedDeletePerson.mockReset();
    mockedAddGatheringType.mockReset();
    mockedDeleteGatheringType.mockReset();
  });

  test('load__fails_with_401__shows_session_expired_and_no_form', async () => {
    // Arrange
    mockedGetFriend.mockRejectedValueOnce(new ApiError(401, 'expired'));

    // Act
    await renderScreen(1);

    // Assert
    expect(await screen.findByText('Your session expired. Please log in again.')).toBeTruthy();
    expect(screen.queryByTestId('save-friend')).toBeNull();
  });

  test('load__fails_with_non_api_error__shows_generic_load_error', async () => {
    // Arrange
    mockedGetFriend.mockRejectedValueOnce(new Error('network down'));

    // Act
    await renderScreen(1);

    // Assert
    expect(await screen.findByText('Could not load this friend.')).toBeTruthy();
  });

  test('render__friend_loaded__prefills_fields_and_shows_delete_button', async () => {
    // Arrange
    mockedGetFriend.mockResolvedValueOnce(
      friend({
        display_name: 'Dan',
        kids_fit_score: 7,
        gathering_types: [
          { id: 10, friend_id: 1, type: 'FAMILY', custom_label: null, reminder_threshold_days: 30, created_at: '' },
        ],
      }),
    );

    // Act
    await renderScreen(1);

    // Assert
    expect(await screen.findByDisplayValue('Dan')).toBeTruthy();
    expect(screen.getByDisplayValue('7')).toBeTruthy();
    expect(screen.getByTestId('delete-friend')).toBeTruthy();
  });

  test('save_without_changing_gathering_types_or_people__does_not_call_their_sync_endpoints', async () => {
    // Arrange
    mockedGetFriend.mockResolvedValueOnce(friend());
    mockedUpdateFriendScalars.mockResolvedValueOnce(friend());
    const { navigation } = await renderScreen(1);
    await screen.findByDisplayValue('Dan');

    // Act
    await fireEvent.press(screen.getByTestId('save-friend'));

    // Assert
    await waitFor(() => expect(navigation.goBack).toHaveBeenCalledTimes(1));
    expect(mockedAddGatheringType).not.toHaveBeenCalled();
    expect(mockedDeleteGatheringType).not.toHaveBeenCalled();
    expect(mockedAddPerson).not.toHaveBeenCalled();
    expect(mockedUpdatePerson).not.toHaveBeenCalled();
    expect(mockedDeletePerson).not.toHaveBeenCalled();
  });

  test('save__toggle_a_gathering_type_on_and_remove_one__syncs_only_the_difference', async () => {
    // Arrange
    mockedGetFriend.mockResolvedValueOnce(
      friend({
        gathering_types: [
          { id: 10, friend_id: 1, type: 'FAMILY', custom_label: null, reminder_threshold_days: 30, created_at: '' },
        ],
      }),
    );
    mockedUpdateFriendScalars.mockResolvedValueOnce(friend());
    mockedAddGatheringType.mockResolvedValueOnce({
      id: 20,
      friend_id: 1,
      type: 'KIDS_ONLY',
      custom_label: null,
      reminder_threshold_days: 30,
      created_at: '',
    });
    mockedDeleteGatheringType.mockResolvedValueOnce(undefined);
    const { navigation } = await renderScreen(1);
    await screen.findByDisplayValue('Dan');
    await fireEvent.press(screen.getByText('Kids only'));
    await fireEvent.press(screen.getByText('Family'));

    // Act
    await fireEvent.press(screen.getByTestId('save-friend'));

    // Assert
    await waitFor(() => expect(navigation.goBack).toHaveBeenCalledTimes(1));
    expect(mockedAddGatheringType).toHaveBeenCalledWith(1, 'KIDS_ONLY');
    expect(mockedDeleteGatheringType).toHaveBeenCalledWith(1, 10);
  });

  test('save__add_a_new_person_and_edit_an_existing_one__calls_add_and_update', async () => {
    // Arrange
    mockedGetFriend.mockResolvedValueOnce(
      friend({
        people: [{ id: 5, name: 'Ann', role: 'adult', birth_year: null, birth_month: null, birth_day: null }],
      }),
    );
    mockedUpdateFriendScalars.mockResolvedValueOnce(friend());
    mockedUpdatePerson.mockResolvedValueOnce({
      id: 5,
      name: 'Ann Updated',
      role: 'adult',
      birth_year: null,
      birth_month: null,
      birth_day: null,
    });
    mockedAddPerson.mockResolvedValueOnce({
      id: 6,
      name: 'Kid',
      role: 'kid',
      birth_year: null,
      birth_month: null,
      birth_day: null,
    });
    const { navigation } = await renderScreen(1);
    await screen.findByDisplayValue('Ann');
    await fireEvent.changeText(screen.getByDisplayValue('Ann'), 'Ann Updated');
    await fireEvent.press(screen.getByText('+ Add person'));
    const nameInputs = screen.getAllByPlaceholderText('Name');
    await fireEvent.changeText(nameInputs[nameInputs.length - 1], 'Kid');

    // Act
    await fireEvent.press(screen.getByTestId('save-friend'));

    // Assert
    await waitFor(() => expect(navigation.goBack).toHaveBeenCalledTimes(1));
    expect(mockedUpdatePerson).toHaveBeenCalledWith(
      1,
      5,
      expect.objectContaining({ name: 'Ann Updated' }),
    );
    expect(mockedAddPerson).toHaveBeenCalledWith(1, expect.objectContaining({ name: 'Kid' }));
  });

  test('save__remove_an_existing_person__calls_deletePerson', async () => {
    // Arrange
    mockedGetFriend.mockResolvedValueOnce(
      friend({
        people: [{ id: 5, name: 'Ann', role: 'adult', birth_year: null, birth_month: null, birth_day: null }],
      }),
    );
    mockedUpdateFriendScalars.mockResolvedValueOnce(friend());
    mockedDeletePerson.mockResolvedValueOnce(undefined);
    const { navigation } = await renderScreen(1);
    await screen.findByDisplayValue('Ann');
    await fireEvent.press(screen.getByText('Remove'));

    // Act
    await fireEvent.press(screen.getByTestId('save-friend'));

    // Assert
    await waitFor(() => expect(navigation.goBack).toHaveBeenCalledTimes(1));
    expect(mockedDeletePerson).toHaveBeenCalledWith(1, 5);
  });

  test('save__scalars_call_rejects__does_not_navigate_back_and_shows_error', async () => {
    // Arrange
    mockedGetFriend.mockResolvedValueOnce(friend());
    mockedUpdateFriendScalars.mockRejectedValueOnce(new ApiError(401, 'expired'));
    const { navigation } = await renderScreen(1);
    await screen.findByDisplayValue('Dan');

    // Act
    await fireEvent.press(screen.getByTestId('save-friend'));

    // Assert
    expect(await screen.findByText('Your session expired. Please log in again.')).toBeTruthy();
    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  test('delete__confirmed__calls_deleteFriend_and_goes_back', async () => {
    // Arrange
    mockedGetFriend.mockResolvedValueOnce(friend());
    mockedDeleteFriend.mockResolvedValueOnce(undefined);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      buttons?.find((b) => b.text === 'Delete')?.onPress?.();
    });
    const { navigation } = await renderScreen(1);
    await screen.findByDisplayValue('Dan');

    // Act
    await fireEvent.press(screen.getByTestId('delete-friend'));

    // Assert
    await waitFor(() => expect(mockedDeleteFriend).toHaveBeenCalledWith(1));
    await waitFor(() => expect(navigation.goBack).toHaveBeenCalledTimes(1));
    alertSpy.mockRestore();
  });

  test('delete__fails__shows_error_and_stops_the_deleting_spinner', async () => {
    // Arrange
    mockedGetFriend.mockResolvedValueOnce(friend());
    mockedDeleteFriend.mockRejectedValueOnce(new ApiError(500, 'cannot delete'));
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      buttons?.find((b) => b.text === 'Delete')?.onPress?.();
    });
    await renderScreen(1);
    await screen.findByDisplayValue('Dan');

    // Act
    await fireEvent.press(screen.getByTestId('delete-friend'));

    // Assert
    expect(await screen.findByText('cannot delete')).toBeTruthy();
    expect(screen.getByTestId('delete-friend')).toHaveProp('accessibilityState', { disabled: false });
    alertSpy.mockRestore();
  });

  test('delete__called__does_not_itself_call_the_alert_cancel_button', async () => {
    // Arrange: covers the Cancel button existing without needing special handling.
    mockedGetFriend.mockResolvedValueOnce(friend());
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      buttons?.find((b) => b.text === 'Cancel')?.onPress?.();
    });
    await renderScreen(1);
    await screen.findByDisplayValue('Dan');

    // Act
    await fireEvent.press(screen.getByTestId('delete-friend'));

    // Assert
    expect(mockedDeleteFriend).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
