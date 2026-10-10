import { request } from '../client';
import { getReminders } from '../reminders';

jest.mock('../client', () => ({ request: jest.fn() }));

const mockedRequest = request as jest.MockedFunction<typeof request>;

describe('reminders api', () => {
  beforeEach(() => {
    mockedRequest.mockReset();
  });

  test('getReminders__called__requests_reminders_with_auth', async () => {
    // Arrange
    mockedRequest.mockResolvedValueOnce([]);

    // Act
    await getReminders();

    // Assert
    expect(mockedRequest).toHaveBeenCalledWith('/reminders', { auth: true });
  });
});
