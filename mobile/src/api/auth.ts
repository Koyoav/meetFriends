import { request } from './client';

export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

export function login(email: string, password: string) {
  return request<TokenResponse>('/auth/login', { method: 'POST', body: { email, password } });
}

export function signup(householdName: string, name: string, email: string, password: string) {
  return request<TokenResponse>('/auth/signup', {
    method: 'POST',
    body: { household_name: householdName, name, email, password },
  });
}
