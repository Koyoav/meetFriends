from datetime import date

from app.models import Person


def compute_birthday_items(people: list[Person], today: date | None = None) -> list[dict]:
    today = today or date.today()
    items = []
    for person in people:
        try:
            occurrence = date(today.year, person.birth_month, person.birth_day)
        except ValueError:
            # Feb 29 in a non-leap year.
            occurrence = date(today.year, person.birth_month, 28)
        turning_age = (
            today.year - person.birth_year if person.birth_year is not None else None
        )
        items.append(
            {
                "friend_id": person.friend_id,
                "friend_display_name": person.friend.display_name,
                "person_id": person.id,
                "person_name": person.name,
                "role": person.role,
                "birth_month": person.birth_month,
                "birth_day": person.birth_day,
                "birth_year": person.birth_year,
                "turning_age": turning_age,
                "days_until": (occurrence - today).days,
            }
        )

    items.sort(key=lambda item: item["birth_day"])
    return items
