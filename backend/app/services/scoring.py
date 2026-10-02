from app.models.friend import Friend


def compute_combined_score(friend: Friend) -> float:
    scores = [friend.adult_fit_score, friend.importance_score]
    if friend.kids_fit_score is not None:
        scores.append(friend.kids_fit_score)
    return sum(scores) / len(scores)
