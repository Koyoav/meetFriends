import pytest
from fastapi import HTTPException

from app.dal import people as people_dal
from app.models import PersonRole
from app.schemas.person import PersonCreate, PersonUpdate
from tests.factories import make_friend, make_household, make_person


class TestPeopleDal:
    def test_get_person_or_404__person_exists_on_friend__returns_person(self, db_session):
        # Arrange
        household = make_household(db_session)
        friend = make_friend(db_session, household)
        person = make_person(db_session, friend, name="Dan")

        # Act
        found = people_dal.get_person_or_404(db_session, friend.id, person.id)

        # Assert
        assert found.id == person.id

    def test_get_person_or_404__person_does_not_exist__raises_404(self, db_session):
        # Arrange
        household = make_household(db_session)
        friend = make_friend(db_session, household)

        # Act / Assert
        with pytest.raises(HTTPException) as exc_info:
            people_dal.get_person_or_404(db_session, friend.id, 999)
        assert exc_info.value.status_code == 404

    def test_get_person_or_404__person_belongs_to_other_friend__raises_404(self, db_session):
        # Arrange
        household = make_household(db_session)
        friend = make_friend(db_session, household, display_name="The Cohens")
        other_friend = make_friend(db_session, household, display_name="The Levis")
        person = make_person(db_session, other_friend, name="Dan")

        # Act / Assert
        with pytest.raises(HTTPException) as exc_info:
            people_dal.get_person_or_404(db_session, friend.id, person.id)
        assert exc_info.value.status_code == 404

    def test_add_person__valid_payload__persists_person_under_friend(self, db_session):
        # Arrange
        household = make_household(db_session)
        friend = make_friend(db_session, household)
        payload = PersonCreate(name="Noa", role=PersonRole.KID, birth_year=2019)

        # Act
        person = people_dal.add_person(db_session, friend.id, payload)

        # Assert
        assert person.id is not None
        assert person.friend_id == friend.id
        assert person.name == "Noa"
        assert person.birth_year == 2019

    def test_update_person__partial_payload__only_changes_given_fields(self, db_session):
        # Arrange
        household = make_household(db_session)
        friend = make_friend(db_session, household)
        person = make_person(db_session, friend, name="Noa", role=PersonRole.KID)
        payload = PersonUpdate(birth_year=2019, birth_month=5, birth_day=14)

        # Act
        updated = people_dal.update_person(db_session, person, payload)

        # Assert
        assert updated.name == "Noa"
        assert (updated.birth_year, updated.birth_month, updated.birth_day) == (2019, 5, 14)

    def test_delete_person__existing_person__removes_it_from_the_database(self, db_session):
        # Arrange
        household = make_household(db_session)
        friend = make_friend(db_session, household)
        person = make_person(db_session, friend)
        person_id = person.id

        # Act
        people_dal.delete_person(db_session, person)

        # Assert
        with pytest.raises(HTTPException):
            people_dal.get_person_or_404(db_session, friend.id, person_id)

    def test_list_with_birth_month__people_born_in_that_month__returns_them(self, db_session):
        # Arrange
        household = make_household(db_session)
        friend = make_friend(db_session, household)
        person = make_person(db_session, friend, name="Noa", birth_month=5, birth_day=14)

        # Act
        results = people_dal.list_with_birth_month(db_session, household.id, 5)

        # Assert
        assert [p.id for p in results] == [person.id]

    def test_list_with_birth_month__person_born_in_different_month__excludes_them(
        self, db_session
    ):
        # Arrange
        household = make_household(db_session)
        friend = make_friend(db_session, household)
        make_person(db_session, friend, name="Noa", birth_month=5, birth_day=14)

        # Act
        results = people_dal.list_with_birth_month(db_session, household.id, 6)

        # Assert
        assert results == []

    def test_list_with_birth_month__person_has_no_birthday_set__excludes_them(self, db_session):
        # Arrange
        household = make_household(db_session)
        friend = make_friend(db_session, household)
        make_person(db_session, friend, name="Noa")

        # Act
        results = people_dal.list_with_birth_month(db_session, household.id, 5)

        # Assert
        assert results == []

    def test_list_with_birth_month__person_in_other_household__excludes_them(self, db_session):
        # Arrange
        household = make_household(db_session, name="Household A")
        other_household = make_household(db_session, name="Household B")
        other_friend = make_friend(db_session, other_household)
        make_person(db_session, other_friend, name="Noa", birth_month=5, birth_day=14)

        # Act
        results = people_dal.list_with_birth_month(db_session, household.id, 5)

        # Assert
        assert results == []
