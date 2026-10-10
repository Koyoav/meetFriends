import { request } from '../client';
import {
  addGatheringType,
  addPerson,
  createFriend,
  deleteFriend,
  deleteGatheringType,
  deletePerson,
  gatheringTypeLabel,
  prettifyGatheringTypeLabel,
  getFriend,
  updateFriendScalars,
  updatePerson,
  EDITABLE_GATHERING_TYPES,
} from '../friends';

jest.mock('../client', () => ({ request: jest.fn() }));

const mockedRequest = request as jest.MockedFunction<typeof request>;

describe('friends api', () => {
  beforeEach(() => {
    mockedRequest.mockReset();
  });

  test('getFriend__called__requests_friend_by_id', async () => {
    // Arrange
    mockedRequest.mockResolvedValueOnce({ id: 1 });

    // Act
    await getFriend(1);

    // Assert
    expect(mockedRequest).toHaveBeenCalledWith('/friends/1', { auth: true });
  });

  test('createFriend__called__posts_scalars_people_and_mapped_gathering_types', async () => {
    // Arrange
    mockedRequest.mockResolvedValueOnce({ id: 1 });

    // Act
    await createFriend({
      display_name: 'Dan',
      notes: null,
      kids_fit_score: null,
      adult_fit_score: 5,
      importance_score: 5,
      people: [],
      gatheringTypes: ['FAMILY'],
    });

    // Assert
    expect(mockedRequest).toHaveBeenCalledWith('/friends', {
      method: 'POST',
      auth: true,
      body: {
        display_name: 'Dan',
        notes: null,
        kids_fit_score: null,
        adult_fit_score: 5,
        importance_score: 5,
        people: [],
        gathering_types: [{ type: 'FAMILY' }],
      },
    });
  });

  test('updateFriendScalars__called__patches_friend_by_id', async () => {
    // Arrange
    mockedRequest.mockResolvedValueOnce({ id: 1 });
    const payload = {
      display_name: 'Dan',
      notes: null,
      kids_fit_score: null,
      adult_fit_score: 5,
      importance_score: 5,
    };

    // Act
    await updateFriendScalars(1, payload);

    // Assert
    expect(mockedRequest).toHaveBeenCalledWith('/friends/1', { method: 'PATCH', auth: true, body: payload });
  });

  test('deleteFriend__called__deletes_friend_by_id', async () => {
    // Arrange
    mockedRequest.mockResolvedValueOnce(undefined);

    // Act
    await deleteFriend(1);

    // Assert
    expect(mockedRequest).toHaveBeenCalledWith('/friends/1', { method: 'DELETE', auth: true });
  });

  test('addPerson__called__posts_person_under_friend', async () => {
    // Arrange
    mockedRequest.mockResolvedValueOnce({ id: 2 });
    const payload = { name: 'Dan', role: 'adult' as const, birth_year: null, birth_month: null, birth_day: null };

    // Act
    await addPerson(1, payload);

    // Assert
    expect(mockedRequest).toHaveBeenCalledWith('/friends/1/people', { method: 'POST', auth: true, body: payload });
  });

  test('updatePerson__called__patches_person_by_id', async () => {
    // Arrange
    mockedRequest.mockResolvedValueOnce({ id: 2 });
    const payload = { name: 'Dan', role: 'adult' as const, birth_year: null, birth_month: null, birth_day: null };

    // Act
    await updatePerson(1, 2, payload);

    // Assert
    expect(mockedRequest).toHaveBeenCalledWith('/friends/1/people/2', { method: 'PATCH', auth: true, body: payload });
  });

  test('deletePerson__called__deletes_person_by_id', async () => {
    // Arrange
    mockedRequest.mockResolvedValueOnce(undefined);

    // Act
    await deletePerson(1, 2);

    // Assert
    expect(mockedRequest).toHaveBeenCalledWith('/friends/1/people/2', { method: 'DELETE', auth: true });
  });

  test('addGatheringType__called__posts_type_under_friend', async () => {
    // Arrange
    mockedRequest.mockResolvedValueOnce({ id: 3 });

    // Act
    await addGatheringType(1, 'FAMILY');

    // Assert
    expect(mockedRequest).toHaveBeenCalledWith('/friends/1/gathering-types', {
      method: 'POST',
      auth: true,
      body: { type: 'FAMILY' },
    });
  });

  test('deleteGatheringType__called__deletes_type_by_id', async () => {
    // Arrange
    mockedRequest.mockResolvedValueOnce(undefined);

    // Act
    await deleteGatheringType(1, 3);

    // Assert
    expect(mockedRequest).toHaveBeenCalledWith('/friends/1/gathering-types/3', { method: 'DELETE', auth: true });
  });

  test.each([
    ['FAMILY', 'Family'],
    ['MEN_1_1', 'Men 1:1'],
    ['WOMEN_1_1', 'Women 1:1'],
    ['KIDS_ONLY', 'Kids only'],
  ] as const)('gatheringTypeLabel__built_in_type_%s__returns_%s', (type, label) => {
    // Act
    const result = gatheringTypeLabel({ type, custom_label: null });

    // Assert
    expect(result).toBe(label);
  });

  test('gatheringTypeLabel__custom_type_with_label__returns_custom_label', () => {
    // Act
    const result = gatheringTypeLabel({ type: 'CUSTOM', custom_label: 'Book club' });

    // Assert
    expect(result).toBe('Book club');
  });

  test('gatheringTypeLabel__custom_type_without_label__returns_fallback', () => {
    // Act
    const result = gatheringTypeLabel({ type: 'CUSTOM', custom_label: null });

    // Assert
    expect(result).toBe('Custom');
  });

  test('EDITABLE_GATHERING_TYPES__defined__excludes_custom', () => {
    // Act
    const values = EDITABLE_GATHERING_TYPES.map((option) => option.value);

    // Assert
    expect(values).toEqual(['FAMILY', 'MEN_1_1', 'WOMEN_1_1', 'KIDS_ONLY']);
  });

  test.each([
    ['FAMILY', 'Family'],
    ['MEN_1_1', 'Men 1:1'],
    ['Book club', 'Book club'],
    ['constructor', 'constructor'],
  ])('prettifyGatheringTypeLabel__%s__returns_%s', (raw, expected) => {
    // Act
    const result = prettifyGatheringTypeLabel(raw);

    // Assert
    expect(result).toBe(expected);
  });
});
