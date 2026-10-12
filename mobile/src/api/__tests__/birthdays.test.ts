import { request } from '../client';
import { getBirthdays } from '../birthdays';

jest.mock('../client', () => ({ request: jest.fn() }));

const mockedRequest = request as jest.MockedFunction<typeof request>;

describe('birthdays api', () => {
  beforeEach(() => {
    mockedRequest.mockReset();
  });

  test('getBirthdays__called_with_no_month__requests_birthdays_with_auth_and_no_query', async () => {
    // Arrange
    mockedRequest.mockResolvedValueOnce([]);

    // Act
    await getBirthdays();

    // Assert
    expect(mockedRequest).toHaveBeenCalledWith('/birthdays', { auth: true });
  });

  test('getBirthdays__called_with_a_month__requests_birthdays_filtered_by_that_month', async () => {
    // Arrange
    mockedRequest.mockResolvedValueOnce([]);

    // Act
    await getBirthdays(5);

    // Assert
    expect(mockedRequest).toHaveBeenCalledWith('/birthdays?month=5', { auth: true });
  });
});
