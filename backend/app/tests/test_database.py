import pytest

from app.database import get_db


class TestGetDb:
    def test_get_db__used_as_a_generator__yields_a_session_then_closes_it_on_exit(self):
        # Arrange
        generator = get_db()

        # Act
        db = next(generator)

        # Assert
        assert db is not None
        with pytest.raises(StopIteration):
            next(generator)
