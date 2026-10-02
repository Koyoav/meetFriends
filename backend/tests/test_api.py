def _signup(client, email="yoav@example.com", household_name="Our Household"):
    r = client.post(
        "/auth/signup",
        json={
            "household_name": household_name,
            "name": "Yoav",
            "email": email,
            "password": "secret123",
        },
    )
    assert r.status_code == 201, r.text
    return r.json()


def _auth_headers(tokens):
    return {"Authorization": f"Bearer {tokens['access_token']}"}


def test_signup_invite_and_login(client):
    tokens = _signup(client)
    headers = _auth_headers(tokens)

    r = client.post(
        "/auth/invite",
        json={"name": "Wife", "email": "wife@example.com", "password": "secret456"},
        headers=headers,
    )
    assert r.status_code == 201, r.text

    r = client.post("/auth/login", json={"email": "wife@example.com", "password": "secret456"})
    assert r.status_code == 200, r.text


def test_create_friend_with_people_and_gathering_types(client):
    headers = _auth_headers(_signup(client))

    r = client.post(
        "/friends",
        json={
            "display_name": "The Cohens",
            "adult_fit_score": 9,
            "kids_fit_score": 8,
            "importance_score": 10,
            "people": [
                {"name": "Dan", "role": "adult"},
                {"name": "Michal", "role": "adult"},
                {"name": "Noa", "role": "kid", "birth_year": 2018},
            ],
            "gathering_types": [
                {"type": "FAMILY", "reminder_threshold_days": 60},
                {"type": "MEN_1_1", "reminder_threshold_days": 30},
            ],
        },
        headers=headers,
    )
    assert r.status_code == 201, r.text
    friend = r.json()
    assert {p["name"] for p in friend["people"]} == {"Dan", "Michal", "Noa"}
    assert {gt["type"] for gt in friend["gathering_types"]} == {"FAMILY", "MEN_1_1"}


def test_reminders_only_flag_gathering_types_past_their_threshold(client):
    headers = _auth_headers(_signup(client))

    friend = client.post(
        "/friends",
        json={
            "display_name": "The Cohens",
            "adult_fit_score": 9,
            "importance_score": 10,
            "gathering_types": [
                {"type": "FAMILY", "reminder_threshold_days": 60},
                {"type": "MEN_1_1", "reminder_threshold_days": 30},
            ],
        },
        headers=headers,
    ).json()
    family_id = next(gt["id"] for gt in friend["gathering_types"] if gt["type"] == "FAMILY")

    r = client.post(
        f"/friends/{friend['id']}/gatherings",
        json={"gathering_type_id": family_id, "date": "2026-10-02", "location": "OUR_PLACE"},
        headers=headers,
    )
    assert r.status_code == 201, r.text

    r = client.get("/reminders", headers=headers)
    assert r.status_code == 200, r.text
    labels = {item["gathering_type_label"] for item in r.json()}
    assert labels == {"MEN_1_1"}


def test_invite_planning_sorts_by_combined_score(client):
    headers = _auth_headers(_signup(client))

    client.post(
        "/friends",
        json={
            "display_name": "The Cohens",
            "adult_fit_score": 9,
            "kids_fit_score": 8,
            "importance_score": 10,
        },
        headers=headers,
    )
    client.post(
        "/friends",
        json={
            "display_name": "The Levis",
            "adult_fit_score": 4,
            "kids_fit_score": 3,
            "importance_score": 5,
        },
        headers=headers,
    )

    r = client.get("/invite-planning", params={"sort_by": "combined"}, headers=headers)
    assert r.status_code == 200, r.text
    results = r.json()
    assert [item["display_name"] for item in results] == ["The Cohens", "The Levis"]
    assert results[0]["combined_score"] == 9.0


def test_friends_are_isolated_per_household(client):
    first_headers = _auth_headers(_signup(client, email="yoav@example.com"))
    friend = client.post(
        "/friends",
        json={"display_name": "The Cohens", "adult_fit_score": 9, "importance_score": 10},
        headers=first_headers,
    ).json()

    other_headers = _auth_headers(
        _signup(client, email="stranger@example.com", household_name="Other Household")
    )
    r = client.get(f"/friends/{friend['id']}", headers=other_headers)
    assert r.status_code == 404
