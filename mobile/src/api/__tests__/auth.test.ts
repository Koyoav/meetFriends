import { request } from '../client';
import { login, signup } from '../auth';

jest.mock('../client', () => ({ request: jest.fn() }));

const mockedRequest = request as jest.MockedFunction<typeof request>;

describe('api/auth', () => {
  beforeEach(() => {
    mockedRequest.mockReset();
  });

  test('login__called__posts_email_and_password_unauthenticated', async () => {
    // Arrange
    const tokens = { access_token: 'a', refresh_token: 'r', token_type: 'bearer' };
    mockedRequest.mockResolvedValueOnce(tokens);

    // Act
    const result = await login('dan@example.com', 'secret');

    // Assert
    expect(result).toBe(tokens);
    expect(mockedRequest).toHaveBeenCalledWith('/auth/login', {
      method: 'POST',
      body: { email: 'dan@example.com', password: 'secret' },
    });
  });

  test('signup__called__posts_household_name_name_email_and_password_unauthenticated', async () => {
    // Arrange
    const tokens = { access_token: 'a', refresh_token: 'r', token_type: 'bearer' };
    mockedRequest.mockResolvedValueOnce(tokens);

    // Act
    const result = await signup('The Dans', 'Dan', 'dan@example.com', 'secret');

    // Assert
    expect(result).toBe(tokens);
    expect(mockedRequest).toHaveBeenCalledWith('/auth/signup', {
      method: 'POST',
      body: { household_name: 'The Dans', name: 'Dan', email: 'dan@example.com', password: 'secret' },
    });
  });
});
