import { request } from './client';

// Mirrors backend/app/schemas/reminder.py
export type ReminderItem = {
  friend_id: number;
  friend_display_name: string;
  gathering_type_id: number;
  gathering_type_label: string;
  last_gathering_date: string | null;
  days_since_last: number | null;
  reminder_threshold_days: number;
  days_overdue: number | null;
};

export function getReminders(): Promise<ReminderItem[]> {
  return request<ReminderItem[]>('/reminders', { auth: true });
}
