from datetime import date

from app.services.birthdays import compute_birthday_items
from tests.factories import make_friend, make_household, make_person


class TestBirthdaysService:
    def test_compute_birthday_items__birth_year_known__computes_turning_age(self, db_session):
        # Arrange
        household = make_household(db_session)
        friend = make_friend(db_session, household)
        person = make_person(
            db_session, friend, name="Noa", birth_year=2019, birth_month=5, birth_day=14
        )

        # Act
        items = compute_birthday_items([person], today=date(2026, 5, 1))

        # Assert
        assert items[0]["turning_age"] == 7
        assert items[0]["friend_display_name"] == friend.display_name

    def test_compute_birthday_items__birth_year_unknown__turning_age_is_none(self, db_session):
        # Arrange
        household = make_household(db_session)
        friend = make_friend(db_session, household)
        person = make_person(db_session, friend, name="Dan", birth_month=5, birth_day=14)

        # Act
        items = compute_birthday_items([person], today=date(2026, 5, 1))

        # Assert
        assert items[0]["turning_age"] is None

    def test_compute_birthday_items__birthday_already_passed_this_month__days_until_is_negative(
        self, db_session
    ):
        # Arrange
        household = make_household(db_session)
        friend = make_friend(db_session, household)
        person = make_person(db_session, friend, name="Dan", birth_month=5, birth_day=1)

        # Act
        items = compute_birthday_items([person], today=date(2026, 5, 14))

        # Assert
        assert items[0]["days_until"] == -13

    def test_compute_birthday_items__born_on_feb_29__falls_back_to_feb_28_in_non_leap_year(
        self, db_session
    ):
        # Arrange
        household = make_household(db_session)
        friend = make_friend(db_session, household)
        person = make_person(db_session, friend, name="Leap Baby", birth_month=2, birth_day=29)

        # Act
        items = compute_birthday_items([person], today=date(2026, 2, 1))

        # Assert
        assert items[0]["days_until"] == 27

    def test_compute_birthday_items__multiple_people__sorted_by_day_ascending(self, db_session):
        # Arrange
        household = make_household(db_session)
        friend = make_friend(db_session, household)
        later = make_person(db_session, friend, name="Later", birth_month=5, birth_day=20)
        earlier = make_person(db_session, friend, name="Earlier", birth_month=5, birth_day=5)

        # Act
        items = compute_birthday_items([later, earlier], today=date(2026, 5, 1))

        # Assert
        assert [item["person_name"] for item in items] == ["Earlier", "Later"]
