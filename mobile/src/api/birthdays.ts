import { request } from './client';

// Mirrors backend/app/schemas/birthday.py
export type PersonRole = 'adult' | 'kid';

export type BirthdayItem = {
  friend_id: number;
  friend_display_name: string;
  person_id: number;
  person_name: string;
  role: PersonRole;
  birth_month: number;
  birth_day: number;
  birth_year: number | null;
  turning_age: number | null;
  days_until: number;
};

export function getBirthdays(month?: number): Promise<BirthdayItem[]> {
  const query = month !== undefined ? `?month=${month}` : '';
  return request<BirthdayItem[]>(`/birthdays${query}`, { auth: true });
}
