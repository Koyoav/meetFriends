import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '../../auth/tokenStorage';
import * as client from '../client';

jest.mock('../../auth/tokenStorage', () => ({
  getAccessToken: jest.fn(),
  getRefreshToken: jest.fn(),
  setTokens: jest.fn(),
  clearTokens: jest.fn(),
}));

const mockedGetAccessToken = getAccessToken as jest.MockedFunction<typeof getAccessToken>;
const mockedGetRefreshToken = getRefreshToken as jest.MockedFunction<typeof getRefreshToken>;
const mockedSetTokens = setTokens as jest.MockedFunction<typeof setTokens>;
const mockedClearTokens = clearTokens as jest.MockedFunction<typeof clearTokens>;

function jsonResponse(status: number, body: unknown) {
  return {
    status,
    ok: status >= 200 && status < 300,
    text: async () => JSON.stringify(body),
  } as Response;
}

describe('api/client', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    mockedGetAccessToken.mockReset();
    mockedGetRefreshToken.mockReset();
    mockedSetTokens.mockReset();
    mockedClearTokens.mockReset();
    client.setSessionExpiredHandler(null);
    fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
  });

  test('request__auth_call_without_401__returns_parsed_body', async () => {
    // Arrange
    mockedGetAccessToken.mockResolvedValue('access-1');
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { id: 1 }));

    // Act
    const result = await client.request('/friends/1', { auth: true });

    // Assert
    expect(result).toEqual({ id: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer access-1');
  });

  test('request__auth_call_with_no_stored_access_token__omits_authorization_header', async () => {
    // Arrange
    mockedGetAccessToken.mockResolvedValue(null);
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { id: 1 }));

    // Act
    await client.request('/friends/1', { auth: true });

    // Assert
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBeUndefined();
  });

  test('request__non_ok_response_without_detail_field__throws_ApiError_with_full_body_as_detail', async () => {
    // Arrange
    mockedGetAccessToken.mockResolvedValue('access-1');
    fetchMock.mockResolvedValueOnce(jsonResponse(500, { message: 'boom' }));

    // Act
    const act = client.request('/friends', { auth: true });

    // Assert
    await expect(act).rejects.toMatchObject({ status: 500, detail: { message: 'boom' } });
  });

  test('request__non_ok_response__throws_ApiError_with_detail', async () => {
    // Arrange
    mockedGetAccessToken.mockResolvedValue('access-1');
    fetchMock.mockResolvedValueOnce(jsonResponse(422, { detail: 'bad input' }));

    // Act
    const act = client.request('/friends', { auth: true, method: 'POST' });

    // Assert
    await expect(act).rejects.toMatchObject({ status: 422, detail: 'bad input' });
  });

  test('request__401_then_refresh_succeeds__retries_with_new_token_and_returns_result', async () => {
    // Arrange
    mockedGetAccessToken.mockResolvedValue('expired-access');
    mockedGetRefreshToken.mockResolvedValue('refresh-1');
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { detail: 'expired' }))
      .mockResolvedValueOnce(jsonResponse(200, { access_token: 'access-2', refresh_token: 'refresh-2' }))
      .mockResolvedValueOnce(jsonResponse(200, { id: 1 }));

    // Act
    const result = await client.request('/friends/1', { auth: true });

    // Assert
    expect(result).toEqual({ id: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(mockedSetTokens).toHaveBeenCalledWith('access-2', 'refresh-2');
    const retryInit = fetchMock.mock.calls[2][1];
    expect(retryInit.headers.Authorization).toBe('Bearer access-2');
  });

  test('request__401_and_refresh_has_no_refresh_token__rejects_with_original_401_and_does_not_retry', async () => {
    // Arrange
    mockedGetAccessToken.mockResolvedValue('expired-access');
    mockedGetRefreshToken.mockResolvedValue(null);
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { detail: 'expired' }));

    // Act
    const act = client.request('/friends/1', { auth: true });

    // Assert
    await expect(act).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('request__refresh_token_itself_rejected_with_401__clears_tokens_and_calls_session_expired_handler', async () => {
    // Arrange
    mockedGetAccessToken.mockResolvedValue('expired-access');
    mockedGetRefreshToken.mockResolvedValue('dead-refresh');
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { detail: 'expired' }))
      .mockResolvedValueOnce(jsonResponse(401, { detail: 'invalid refresh token' }));
    const onSessionExpired = jest.fn();
    client.setSessionExpiredHandler(onSessionExpired);

    // Act
    const act = client.request('/friends/1', { auth: true });

    // Assert
    await expect(act).rejects.toMatchObject({ status: 401 });
    expect(mockedClearTokens).toHaveBeenCalledTimes(1);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('request__refresh_returns_5xx__leaves_stored_tokens_alone_and_rejects_with_original_401', async () => {
    // Arrange
    mockedGetAccessToken.mockResolvedValue('expired-access');
    mockedGetRefreshToken.mockResolvedValue('refresh-1');
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { detail: 'expired' }))
      .mockResolvedValueOnce(jsonResponse(503, { detail: 'down' }));

    // Act
    const act = client.request('/friends/1', { auth: true });

    // Assert
    await expect(act).rejects.toMatchObject({ status: 401 });
    expect(mockedClearTokens).not.toHaveBeenCalled();
    expect(mockedSetTokens).not.toHaveBeenCalled();
  });

  test('request__refresh_response_missing_tokens__treated_as_unusable_and_rejects_with_original_401', async () => {
    // Arrange
    mockedGetAccessToken.mockResolvedValue('expired-access');
    mockedGetRefreshToken.mockResolvedValue('refresh-1');
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { detail: 'expired' }))
      .mockResolvedValueOnce(jsonResponse(200, { access_token: 'access-2' }));

    // Act
    const act = client.request('/friends/1', { auth: true });

    // Assert
    await expect(act).rejects.toMatchObject({ status: 401 });
    expect(mockedSetTokens).not.toHaveBeenCalled();
  });

  test('request__two_concurrent_401s__share_a_single_refresh_call', async () => {
    // Arrange
    mockedGetAccessToken.mockResolvedValue('expired-access');
    mockedGetRefreshToken.mockResolvedValue('refresh-1');
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { detail: 'expired' }))
      .mockResolvedValueOnce(jsonResponse(401, { detail: 'expired' }))
      .mockResolvedValueOnce(jsonResponse(200, { access_token: 'access-2', refresh_token: 'refresh-2' }))
      .mockResolvedValueOnce(jsonResponse(200, { id: 1 }))
      .mockResolvedValueOnce(jsonResponse(200, { id: 2 }));

    // Act
    const [first, second] = await Promise.all([
      client.request('/friends/1', { auth: true }),
      client.request('/friends/2', { auth: true }),
    ]);

    // Assert
    expect(first).toEqual({ id: 1 });
    expect(second).toEqual({ id: 2 });
    // 2 initial 401s + 1 shared refresh + 2 retries = 5, never a second refresh call.
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(mockedSetTokens).toHaveBeenCalledTimes(1);
  });

  test('request__logout_invalidates_generation_while_refresh_in_flight__stale_refresh_result_is_not_stored', async () => {
    // Arrange: the generation bumps (simulating a logout) partway through doRefreshAccessToken,
    // right after it reads the refresh token but before its response comes back.
    mockedGetAccessToken.mockResolvedValue('expired-access');
    mockedGetRefreshToken.mockImplementation(async () => {
      client.invalidateAuthGeneration();
      return 'refresh-1';
    });
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { detail: 'expired' }))
      .mockResolvedValueOnce(jsonResponse(200, { access_token: 'access-2', refresh_token: 'refresh-2' }));

    // Act
    const act = client.request('/friends/1', { auth: true });

    // Assert
    await expect(act).rejects.toMatchObject({ status: 401 });
    expect(mockedSetTokens).not.toHaveBeenCalled();
    expect(mockedClearTokens).not.toHaveBeenCalled();
  });

  test('request__non_auth_call__never_sends_authorization_header_or_reads_token', async () => {
    // Arrange
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    // Act
    await client.request('/public');

    // Assert
    expect(mockedGetAccessToken).not.toHaveBeenCalled();
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBeUndefined();
  });

  test('request__non_json_response_body__returns_raw_text', async () => {
    // Arrange
    fetchMock.mockResolvedValueOnce({ status: 200, ok: true, text: async () => 'plain text' } as Response);

    // Act
    const result = await client.request('/public');

    // Assert
    expect(result).toBe('plain text');
  });

  test('request__empty_response_body__returns_null', async () => {
    // Arrange
    mockedGetAccessToken.mockResolvedValue('access-1');
    fetchMock.mockResolvedValueOnce({ status: 204, ok: true, text: async () => '' } as Response);

    // Act
    const result = await client.request('/friends/1', { auth: true, method: 'DELETE' });

    // Assert
    expect(result).toBeNull();
  });
});
