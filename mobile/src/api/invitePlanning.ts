import { request } from './client';

// Mirrors backend/app/schemas/invite_planning.py
export type GatheringTypeFilter = 'ALL' | 'FAMILY' | 'MEN_1_1' | 'WOMEN_1_1' | 'KIDS_ONLY';
export type InvitePlanningSort = 'staleness' | 'kids_fit' | 'adult_fit' | 'combined';

export type InvitePlanningItem = {
  friend_id: number;
  display_name: string;
  kids_fit_score: number | null;
  adult_fit_score: number;
  importance_score: number;
  combined_score: number;
  last_gathering_date: string | null;
  days_since_last: number | null;
};

export function getInvitePlanning(params: {
  sortBy: InvitePlanningSort;
  gatheringType: GatheringTypeFilter;
}): Promise<InvitePlanningItem[]> {
  const query = new URLSearchParams({ sort_by: params.sortBy, gathering_type: params.gatheringType });
  return request<InvitePlanningItem[]>(`/invite-planning?${query.toString()}`, { auth: true });
}
