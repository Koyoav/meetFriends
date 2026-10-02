from app.dal import users as users_dal
from tests.factories import make_household, make_user


class TestUsersDal:
    def test_get_user_by_email__user_exists__returns_user(self, db_session):
        # Arrange
        household = make_household(db_session)
        user = make_user(db_session, household, email="yoav@example.com")

        # Act
        found = users_dal.get_user_by_email(db_session, "yoav@example.com")

        # Assert
        assert found is not None
        assert found.id == user.id

    def test_get_user_by_email__user_does_not_exist__returns_none(self, db_session):
        # Arrange
        # (no user created)

        # Act
        found = users_dal.get_user_by_email(db_session, "nobody@example.com")

        # Assert
        assert found is None

    def test_get_user_by_id__user_exists__returns_user(self, db_session):
        # Arrange
        household = make_household(db_session)
        user = make_user(db_session, household)

        # Act
        found = users_dal.get_user_by_id(db_session, user.id)

        # Assert
        assert found is not None
        assert found.email == user.email

    def test_get_user_by_id__user_does_not_exist__returns_none(self, db_session):
        # Arrange
        # (no user created)

        # Act
        found = users_dal.get_user_by_id(db_session, 999)

        # Assert
        assert found is None

    def test_create_user__given_valid_data__persists_user_in_household(self, db_session):
        # Arrange
        household = make_household(db_session)

        # Act
        user = users_dal.create_user(
            db_session,
            household.id,
            "yoav@example.com",
            "hashed-password",
            "Yoav",
        )

        # Assert
        assert user.id is not None
        assert user.household_id == household.id
        assert user.email == "yoav@example.com"
        assert user.password_hash == "hashed-password"
        assert user.name == "Yoav"
