from datetime import date


def days_since(last_date: date | None, today: date | None = None) -> int | None:
    if last_date is None:
        return None
    today = today or date.today()
    return (today - last_date).days
