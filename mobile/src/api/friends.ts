import { request } from './client';

// Mirrors backend/app/models/person.py's PersonRole and
// backend/app/models/gathering_type.py's GatheringTypeLabel.
export type PersonRole = 'adult' | 'kid';
export type GatheringTypeLabel = 'FAMILY' | 'MEN_1_1' | 'WOMEN_1_1' | 'KIDS_ONLY' | 'CUSTOM';

export type Person = {
  id: number;
  name: string;
  role: PersonRole;
  birth_year: number | null;
  birth_month: number | null;
  birth_day: number | null;
};

export type GatheringType = {
  id: number;
  friend_id: number;
  type: GatheringTypeLabel;
  custom_label: string | null;
  reminder_threshold_days: number;
  created_at: string;
};

export type Friend = {
  id: number;
  household_id: number;
  display_name: string;
  notes: string | null;
  kids_fit_score: number | null;
  adult_fit_score: number;
  importance_score: number;
  created_at: string;
  updated_at: string;
  people: Person[];
  gathering_types: GatheringType[];
};

export type PersonInput = {
  name: string;
  role: PersonRole;
  birth_year: number | null;
  birth_month: number | null;
  birth_day: number | null;
};

export type FriendScalarInput = {
  display_name: string;
  notes: string | null;
  kids_fit_score: number | null;
  adult_fit_score: number;
  importance_score: number;
};

export function getFriend(friendId: number): Promise<Friend> {
  return request<Friend>(`/friends/${friendId}`, { auth: true });
}

export function createFriend(
  payload: FriendScalarInput & { people: PersonInput[]; gatheringTypes: GatheringTypeLabel[] },
): Promise<Friend> {
  return request<Friend>('/friends', {
    method: 'POST',
    auth: true,
    body: {
      display_name: payload.display_name,
      notes: payload.notes,
      kids_fit_score: payload.kids_fit_score,
      adult_fit_score: payload.adult_fit_score,
      importance_score: payload.importance_score,
      people: payload.people,
      gathering_types: payload.gatheringTypes.map((type) => ({ type })),
    },
  });
}

export function updateFriendScalars(friendId: number, payload: FriendScalarInput): Promise<Friend> {
  return request<Friend>(`/friends/${friendId}`, { method: 'PATCH', auth: true, body: payload });
}

export function deleteFriend(friendId: number): Promise<void> {
  return request<void>(`/friends/${friendId}`, { method: 'DELETE', auth: true });
}

export function addPerson(friendId: number, payload: PersonInput): Promise<Person> {
  return request<Person>(`/friends/${friendId}/people`, { method: 'POST', auth: true, body: payload });
}

export function updatePerson(friendId: number, personId: number, payload: PersonInput): Promise<Person> {
  return request<Person>(`/friends/${friendId}/people/${personId}`, {
    method: 'PATCH',
    auth: true,
    body: payload,
  });
}

export function deletePerson(friendId: number, personId: number): Promise<void> {
  return request<void>(`/friends/${friendId}/people/${personId}`, { method: 'DELETE', auth: true });
}

export function addGatheringType(friendId: number, type: GatheringTypeLabel): Promise<GatheringType> {
  return request<GatheringType>(`/friends/${friendId}/gathering-types`, {
    method: 'POST',
    auth: true,
    body: { type },
  });
}

export function deleteGatheringType(friendId: number, gatheringTypeId: number): Promise<void> {
  return request<void>(`/friends/${friendId}/gathering-types/${gatheringTypeId}`, {
    method: 'DELETE',
    auth: true,
  });
}
