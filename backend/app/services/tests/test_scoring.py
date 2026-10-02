from app.services.scoring import compute_combined_score
from tests.factories import make_friend, make_household


class TestScoringService:
    def test_compute_combined_score__friend_has_kids_fit_score__averages_all_three_scores(
        self, db_session
    ):
        # Arrange
        household = make_household(db_session)
        friend = make_friend(
            db_session,
            household,
            adult_fit_score=9,
            kids_fit_score=6,
            importance_score=9,
        )

        # Act
        score = compute_combined_score(friend)

        # Assert
        assert score == (9 + 6 + 9) / 3

    def test_compute_combined_score__friend_has_no_kids_fit_score__averages_just_two_scores(
        self, db_session
    ):
        # Arrange
        household = make_household(db_session)
        friend = make_friend(
            db_session,
            household,
            adult_fit_score=8,
            kids_fit_score=None,
            importance_score=10,
        )

        # Act
        score = compute_combined_score(friend)

        # Assert
        assert score == (8 + 10) / 2
