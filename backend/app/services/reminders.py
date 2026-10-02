from collections.abc import Iterable
from datetime import date

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.gathering import Gathering


def last_gathering_dates(
    db: Session, gathering_type_ids: Iterable[int]
) -> dict[int, date]:
    gathering_type_ids = list(gathering_type_ids)
    if not gathering_type_ids:
        return {}
    rows = (
        db.query(Gathering.gathering_type_id, func.max(Gathering.date))
        .filter(Gathering.gathering_type_id.in_(gathering_type_ids))
        .group_by(Gathering.gathering_type_id)
        .all()
    )
    return dict(rows)


def days_since(last_date: date | None, today: date | None = None) -> int | None:
    if last_date is None:
        return None
    today = today or date.today()
    return (today - last_date).days
