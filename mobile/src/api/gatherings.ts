import { request } from './client';

// Mirrors backend/app/models/gathering.py's GatheringLocation.
export type GatheringLocation = 'OUR_PLACE' | 'THEIR_PLACE' | 'OUTSIDE';

export type Gathering = {
  id: number;
  friend_id: number;
  gathering_type_id: number;
  date: string; // ISO date, e.g. "2026-10-05"
  location: GatheringLocation;
  notes: string | null;
  created_by: number;
  created_at: string;
};

export type GatheringInput = {
  gathering_type_id: number;
  date: string;
  location: GatheringLocation;
  notes: string | null;
};

export function listGatherings(friendId: number): Promise<Gathering[]> {
  return request<Gathering[]>(`/friends/${friendId}/gatherings`, { auth: true });
}

export function logGathering(friendId: number, payload: GatheringInput): Promise<Gathering> {
  return request<Gathering>(`/friends/${friendId}/gatherings`, {
    method: 'POST',
    auth: true,
    body: payload,
  });
}
