import pytest
from fastapi import HTTPException

from app.dal import gathering_types as gathering_types_dal
from app.models import GatheringTypeLabel
from app.schemas.gathering_type import GatheringTypeCreate, GatheringTypeUpdate
from tests.factories import make_friend, make_gathering_type, make_household


class TestGatheringTypesDal:
    def test_find_gathering_type__type_exists_on_friend__returns_it(self, db_session):
        # Arrange
        household = make_household(db_session)
        friend = make_friend(db_session, household)
        gathering_type = make_gathering_type(db_session, friend)

        # Act
        found = gathering_types_dal.find_gathering_type(
            db_session, friend.id, gathering_type.id
        )

        # Assert
        assert found is not None
        assert found.id == gathering_type.id

    def test_find_gathering_type__type_does_not_exist__returns_none(self, db_session):
        # Arrange
        household = make_household(db_session)
        friend = make_friend(db_session, household)

        # Act
        found = gathering_types_dal.find_gathering_type(db_session, friend.id, 999)

        # Assert
        assert found is None

    def test_get_gathering_type_or_404__type_exists__returns_it(self, db_session):
        # Arrange
        household = make_household(db_session)
        friend = make_friend(db_session, household)
        gathering_type = make_gathering_type(db_session, friend)

        # Act
        found = gathering_types_dal.get_gathering_type_or_404(
            db_session, friend.id, gathering_type.id
        )

        # Assert
        assert found.id == gathering_type.id

    def test_get_gathering_type_or_404__type_does_not_exist__raises_404(self, db_session):
        # Arrange
        household = make_household(db_session)
        friend = make_friend(db_session, household)

        # Act / Assert
        with pytest.raises(HTTPException) as exc_info:
            gathering_types_dal.get_gathering_type_or_404(db_session, friend.id, 999)
        assert exc_info.value.status_code == 404

    def test_add_gathering_type__valid_payload__persists_under_friend(self, db_session):
        # Arrange
        household = make_household(db_session)
        friend = make_friend(db_session, household)
        payload = GatheringTypeCreate(
            type=GatheringTypeLabel.MEN_1_1, reminder_threshold_days=30
        )

        # Act
        gathering_type = gathering_types_dal.add_gathering_type(db_session, friend.id, payload)

        # Assert
        assert gathering_type.id is not None
        assert gathering_type.friend_id == friend.id
        assert gathering_type.type == GatheringTypeLabel.MEN_1_1
        assert gathering_type.reminder_threshold_days == 30

    def test_update_gathering_type__partial_payload__only_changes_given_fields(
        self, db_session
    ):
        # Arrange
        household = make_household(db_session)
        friend = make_friend(db_session, household)
        gathering_type = make_gathering_type(
            db_session, friend, type=GatheringTypeLabel.FAMILY, reminder_threshold_days=60
        )
        payload = GatheringTypeUpdate(reminder_threshold_days=90)

        # Act
        updated = gathering_types_dal.update_gathering_type(db_session, gathering_type, payload)

        # Assert
        assert updated.reminder_threshold_days == 90
        assert updated.type == GatheringTypeLabel.FAMILY

    def test_delete_gathering_type__existing_type__removes_it_from_the_database(
        self, db_session
    ):
        # Arrange
        household = make_household(db_session)
        friend = make_friend(db_session, household)
        gathering_type = make_gathering_type(db_session, friend)
        gathering_type_id = gathering_type.id

        # Act
        gathering_types_dal.delete_gathering_type(db_session, gathering_type)

        # Assert
        found = gathering_types_dal.find_gathering_type(
            db_session, friend.id, gathering_type_id
        )
        assert found is None
