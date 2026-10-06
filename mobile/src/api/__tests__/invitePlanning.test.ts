import { request } from '../client';
import { getInvitePlanning } from '../invitePlanning';

jest.mock('../client', () => ({ request: jest.fn() }));

const mockedRequest = request as jest.MockedFunction<typeof request>;

describe('api/invitePlanning', () => {
  beforeEach(() => {
    mockedRequest.mockReset();
  });

  test('getInvitePlanning__called__requests_with_sort_and_gathering_type_query_params', async () => {
    // Arrange
    mockedRequest.mockResolvedValueOnce([]);

    // Act
    await getInvitePlanning({ sortBy: 'combined', gatheringType: 'FAMILY' });

    // Assert
    expect(mockedRequest).toHaveBeenCalledWith('/invite-planning?sort_by=combined&gathering_type=FAMILY', {
      auth: true,
    });
  });

  test('getInvitePlanning__called__returns_the_requested_items', async () => {
    // Arrange
    const items = [
      {
        friend_id: 1,
        display_name: 'Dan',
        kids_fit_score: null,
        adult_fit_score: 5,
        importance_score: 5,
        combined_score: 5,
        last_gathering_date: null,
        days_since_last: null,
      },
    ];
    mockedRequest.mockResolvedValueOnce(items);

    // Act
    const result = await getInvitePlanning({ sortBy: 'staleness', gatheringType: 'ALL' });

    // Assert
    expect(result).toBe(items);
  });
});
