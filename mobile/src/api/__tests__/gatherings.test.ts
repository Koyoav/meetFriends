import { request } from '../client';
import { listGatherings, logGathering } from '../gatherings';

jest.mock('../client', () => ({ request: jest.fn() }));

const mockedRequest = request as jest.MockedFunction<typeof request>;

describe('api/gatherings', () => {
  beforeEach(() => {
    mockedRequest.mockReset();
  });

  test('listGatherings__called__requests_gatherings_for_that_friend', async () => {
    // Arrange
    mockedRequest.mockResolvedValueOnce([]);

    // Act
    await listGatherings(1);

    // Assert
    expect(mockedRequest).toHaveBeenCalledWith('/friends/1/gatherings', { auth: true });
  });

  test('logGathering__called__posts_the_payload_under_that_friend', async () => {
    // Arrange
    const payload = {
      gathering_type_id: 3,
      date: '2026-10-05',
      location: 'OUR_PLACE' as const,
      notes: null,
    };
    mockedRequest.mockResolvedValueOnce({
      id: 1,
      friend_id: 1,
      gathering_type_id: 3,
      date: '2026-10-05',
      location: 'OUR_PLACE',
      notes: null,
      created_by: 1,
      created_at: '2026-10-05T00:00:00Z',
    });

    // Act
    await logGathering(1, payload);

    // Assert
    expect(mockedRequest).toHaveBeenCalledWith('/friends/1/gatherings', {
      method: 'POST',
      auth: true,
      body: payload,
    });
  });
});
