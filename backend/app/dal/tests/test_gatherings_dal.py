from datetime import date

import pytest
from fastapi import HTTPException

from app.dal import gatherings as gatherings_dal
from app.models import GatheringLocation, GatheringTypeLabel
from app.schemas.gathering import GatheringCreate
from app.schemas.invite_planning import GatheringTypeFilter
from tests.factories import (
    make_friend,
    make_gathering,
    make_gathering_type,
    make_household,
    make_user,
)


class TestGatheringsDal:
    def test_list_gatherings__friend_has_no_gatherings__returns_empty_list(self, db_session):
        # Arrange
        household = make_household(db_session)
        friend = make_friend(db_session, household)

        # Act
        results = gatherings_dal.list_gatherings(db_session, friend.id)

        # Assert
        assert results == []

    def test_list_gatherings__friend_has_gatherings__returns_them_newest_first(
        self, db_session
    ):
        # Arrange
        household = make_household(db_session)
        user = make_user(db_session, household)
        friend = make_friend(db_session, household)
        gathering_type = make_gathering_type(db_session, friend)
        older = make_gathering(
            db_session, friend, gathering_type, user, gathering_date=date(2026, 1, 1)
        )
        newer = make_gathering(
            db_session, friend, gathering_type, user, gathering_date=date(2026, 6, 1)
        )

        # Act
        results = gatherings_dal.list_gatherings(db_session, friend.id)

        # Assert
        assert [g.id for g in results] == [newer.id, older.id]

    def test_log_gathering__gathering_type_belongs_to_friend__persists_gathering(
        self, db_session
    ):
        # Arrange
        household = make_household(db_session)
        user = make_user(db_session, household)
        friend = make_friend(db_session, household)
        gathering_type = make_gathering_type(db_session, friend)
        payload = GatheringCreate(
            gathering_type_id=gathering_type.id,
            date=date(2026, 6, 1),
            location=GatheringLocation.OUR_PLACE,
        )

        # Act
        gathering = gatherings_dal.log_gathering(db_session, friend.id, user.id, payload)

        # Assert
        assert gathering.id is not None
        assert gathering.friend_id == friend.id
        assert gathering.created_by == user.id

    def test_log_gathering__gathering_type_belongs_to_another_friend__raises_400(
        self, db_session
    ):
        # Arrange
        household = make_household(db_session)
        user = make_user(db_session, household)
        friend = make_friend(db_session, household, display_name="The Cohens")
        other_friend = make_friend(db_session, household, display_name="The Levis")
        other_gathering_type = make_gathering_type(db_session, other_friend)
        payload = GatheringCreate(
            gathering_type_id=other_gathering_type.id,
            date=date(2026, 6, 1),
            location=GatheringLocation.OUR_PLACE,
        )

        # Act / Assert
        with pytest.raises(HTTPException) as exc_info:
            gatherings_dal.log_gathering(db_session, friend.id, user.id, payload)
        assert exc_info.value.status_code == 400

    def test_get_last_gathering_dates_by_type__no_ids_given__returns_empty_dict(
        self, db_session
    ):
        # Arrange
        # (no setup needed)

        # Act
        result = gatherings_dal.get_last_gathering_dates_by_type(db_session, [])

        # Assert
        assert result == {}

    def test_get_last_gathering_dates_by_type__multiple_gatherings_same_type__returns_max_date(
        self, db_session
    ):
        # Arrange
        household = make_household(db_session)
        user = make_user(db_session, household)
        friend = make_friend(db_session, household)
        gathering_type = make_gathering_type(db_session, friend)
        make_gathering(db_session, friend, gathering_type, user, gathering_date=date(2026, 1, 1))
        make_gathering(db_session, friend, gathering_type, user, gathering_date=date(2026, 6, 1))

        # Act
        result = gatherings_dal.get_last_gathering_dates_by_type(
            db_session, [gathering_type.id]
        )

        # Assert
        assert result == {gathering_type.id: date(2026, 6, 1)}

    def test_get_last_gathering_date_for_friend__filter_all__returns_latest_of_any_type(
        self, db_session
    ):
        # Arrange
        household = make_household(db_session)
        user = make_user(db_session, household)
        friend = make_friend(db_session, household)
        family_type = make_gathering_type(db_session, friend, type=GatheringTypeLabel.FAMILY)
        men_type = make_gathering_type(db_session, friend, type=GatheringTypeLabel.MEN_1_1)
        make_gathering(db_session, friend, family_type, user, gathering_date=date(2026, 1, 1))
        make_gathering(db_session, friend, men_type, user, gathering_date=date(2026, 6, 1))

        # Act
        result = gatherings_dal.get_last_gathering_date_for_friend(
            db_session, friend.id, GatheringTypeFilter.ALL
        )

        # Assert
        assert result == date(2026, 6, 1)

    def test_get_last_gathering_date_for_friend__filter_specific_type__ignores_other_types(
        self, db_session
    ):
        # Arrange
        household = make_household(db_session)
        user = make_user(db_session, household)
        friend = make_friend(db_session, household)
        family_type = make_gathering_type(db_session, friend, type=GatheringTypeLabel.FAMILY)
        men_type = make_gathering_type(db_session, friend, type=GatheringTypeLabel.MEN_1_1)
        make_gathering(db_session, friend, family_type, user, gathering_date=date(2026, 1, 1))
        make_gathering(db_session, friend, men_type, user, gathering_date=date(2026, 6, 1))

        # Act
        result = gatherings_dal.get_last_gathering_date_for_friend(
            db_session, friend.id, GatheringTypeFilter.FAMILY
        )

        # Assert
        assert result == date(2026, 1, 1)

    def test_get_last_gathering_date_for_friend__no_gatherings_logged__returns_none(
        self, db_session
    ):
        # Arrange
        household = make_household(db_session)
        friend = make_friend(db_session, household)

        # Act
        result = gatherings_dal.get_last_gathering_date_for_friend(
            db_session, friend.id, GatheringTypeFilter.ALL
        )

        # Assert
        assert result is None
