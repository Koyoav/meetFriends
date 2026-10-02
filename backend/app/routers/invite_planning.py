from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.dal import friends as friends_dal
from app.dal import gatherings as gatherings_dal
from app.database import get_db
from app.models import User
from app.schemas.invite_planning import (
    GatheringTypeFilter,
    InvitePlanningItem,
    InvitePlanningSort,
)
from app.services.reminders import days_since
from app.services.scoring import compute_combined_score

router = APIRouter(prefix="/invite-planning", tags=["invite-planning"])


_SORT_KEYS = {
    InvitePlanningSort.STALENESS: lambda item: (
        item.days_since_last is not None,
        -(item.days_since_last or 0),
    ),
    InvitePlanningSort.KIDS_FIT: lambda item: (
        item.kids_fit_score is None,
        -(item.kids_fit_score or 0),
    ),
    InvitePlanningSort.ADULT_FIT: lambda item: -item.adult_fit_score,
    InvitePlanningSort.COMBINED: lambda item: -item.combined_score,
}


@router.get("", response_model=list[InvitePlanningItem])
def invite_planning(
    gathering_type: GatheringTypeFilter = Query(default=GatheringTypeFilter.ALL),
    sort_by: InvitePlanningSort = Query(default=InvitePlanningSort.STALENESS),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[InvitePlanningItem]:
    friends = friends_dal.list_friends(db, current_user.household_id)

    today = date.today()
    items = []
    for friend in friends:
        last_date = gatherings_dal.get_last_gathering_date_for_friend(
            db, friend.id, gathering_type
        )
        items.append(
            InvitePlanningItem(
                friend_id=friend.id,
                display_name=friend.display_name,
                kids_fit_score=friend.kids_fit_score,
                adult_fit_score=friend.adult_fit_score,
                importance_score=friend.importance_score,
                combined_score=compute_combined_score(friend),
                last_gathering_date=last_date,
                days_since_last=days_since(last_date, today),
            )
        )

    items.sort(key=_SORT_KEYS[sort_by])
    return items
