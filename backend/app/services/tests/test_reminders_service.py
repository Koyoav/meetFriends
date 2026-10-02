from datetime import date

from app.services.reminders import days_since


class TestRemindersService:
    def test_days_since__last_date_is_none__returns_none(self):
        # Arrange
        # (no setup needed)

        # Act
        result = days_since(None, today=date(2026, 10, 2))

        # Assert
        assert result is None

    def test_days_since__last_date_given_with_explicit_today__returns_difference_in_days(self):
        # Arrange
        last_date = date(2026, 9, 1)
        today = date(2026, 10, 2)

        # Act
        result = days_since(last_date, today=today)

        # Assert
        assert result == 31

    def test_days_since__today_not_given__defaults_to_actual_today(self):
        # Arrange
        last_date = date.today()

        # Act
        result = days_since(last_date)

        # Assert
        assert result == 0
