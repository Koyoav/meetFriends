from app.dal import households as households_dal
from app.models import Household


class TestHouseholdsDal:
    def test_create_household__given_a_name__persists_and_returns_household(self, db_session):
        # Arrange
        name = "The Korens"

        # Act
        household = households_dal.create_household(db_session, name)

        # Assert
        assert household.id is not None
        assert household.name == name

    def test_create_household__given_a_name__is_queryable_after_commit(self, db_session):
        # Arrange
        name = "The Korens"
        household = households_dal.create_household(db_session, name)
        db_session.commit()

        # Act
        fetched = db_session.get(Household, household.id)

        # Assert
        assert fetched is not None
        assert fetched.name == name
