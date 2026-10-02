import pytest
from fastapi import HTTPException

from app.dal import friends as friends_dal
from app.models import GatheringTypeLabel, PersonRole
from app.schemas.friend import FriendCreate, FriendUpdate
from app.schemas.gathering_type import GatheringTypeCreate
from app.schemas.person import PersonCreate
from tests.factories import make_friend, make_household


class TestFriendsDal:
    def test_get_friend_or_404__friend_exists_in_household__returns_friend(self, db_session):
        # Arrange
        household = make_household(db_session)
        friend = make_friend(db_session, household)

        # Act
        found = friends_dal.get_friend_or_404(db_session, friend.id, household.id)

        # Assert
        assert found.id == friend.id

    def test_get_friend_or_404__friend_does_not_exist__raises_404(self, db_session):
        # Arrange
        household = make_household(db_session)

        # Act / Assert
        with pytest.raises(HTTPException) as exc_info:
            friends_dal.get_friend_or_404(db_session, 999, household.id)
        assert exc_info.value.status_code == 404

    def test_get_friend_or_404__friend_belongs_to_other_household__raises_404(self, db_session):
        # Arrange
        household = make_household(db_session, name="Household A")
        other_household = make_household(db_session, name="Household B")
        friend = make_friend(db_session, other_household)

        # Act / Assert
        with pytest.raises(HTTPException) as exc_info:
            friends_dal.get_friend_or_404(db_session, friend.id, household.id)
        assert exc_info.value.status_code == 404

    def test_list_friends__household_has_no_friends__returns_empty_list(self, db_session):
        # Arrange
        household = make_household(db_session)

        # Act
        friends = friends_dal.list_friends(db_session, household.id)

        # Assert
        assert friends == []

    def test_list_friends__household_has_friends__returns_only_that_households_friends(
        self, db_session
    ):
        # Arrange
        household = make_household(db_session, name="Household A")
        other_household = make_household(db_session, name="Household B")
        friend = make_friend(db_session, household, display_name="The Cohens")
        make_friend(db_session, other_household, display_name="The Levis")

        # Act
        friends = friends_dal.list_friends(db_session, household.id)

        # Assert
        assert [f.id for f in friends] == [friend.id]

    def test_create_friend__minimal_payload__persists_friend_with_no_people_or_types(
        self, db_session
    ):
        # Arrange
        household = make_household(db_session)
        payload = FriendCreate(display_name="The Cohens", adult_fit_score=8, importance_score=9)

        # Act
        friend = friends_dal.create_friend(db_session, household.id, payload)

        # Assert
        assert friend.display_name == "The Cohens"
        assert friend.people == []
        assert friend.gathering_types == []

    def test_create_friend__with_nested_people_and_gathering_types__persists_all_of_them(
        self, db_session
    ):
        # Arrange
        household = make_household(db_session)
        payload = FriendCreate(
            display_name="The Cohens",
            adult_fit_score=8,
            importance_score=9,
            people=[PersonCreate(name="Dan", role=PersonRole.ADULT)],
            gathering_types=[GatheringTypeCreate(type=GatheringTypeLabel.FAMILY)],
        )

        # Act
        friend = friends_dal.create_friend(db_session, household.id, payload)

        # Assert
        assert [p.name for p in friend.people] == ["Dan"]
        assert [gt.type for gt in friend.gathering_types] == [GatheringTypeLabel.FAMILY]

    def test_update_friend__partial_payload__only_changes_given_fields(self, db_session):
        # Arrange
        household = make_household(db_session)
        friend = make_friend(
            db_session, household, display_name="The Cohens", adult_fit_score=5
        )
        payload = FriendUpdate(adult_fit_score=9)

        # Act
        updated = friends_dal.update_friend(db_session, friend, payload)

        # Assert
        assert updated.adult_fit_score == 9
        assert updated.display_name == "The Cohens"

    def test_delete_friend__existing_friend__removes_it_from_the_database(self, db_session):
        # Arrange
        household = make_household(db_session)
        friend = make_friend(db_session, household)
        friend_id = friend.id

        # Act
        friends_dal.delete_friend(db_session, friend)

        # Assert
        with pytest.raises(HTTPException):
            friends_dal.get_friend_or_404(db_session, friend_id, household.id)
