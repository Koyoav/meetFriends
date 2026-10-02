from datetime import date


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


def _create_friend(client, headers, display_name="The Cohens"):
    return client.post(
        "/friends",
        json={"display_name": display_name, "adult_fit_score": 9, "importance_score": 10},
        headers=headers,
    ).json()


def test_can_add_and_update_birthday_on_a_person(client):
    headers = _auth_headers(_signup(client))
    friend = _create_friend(client, headers)

    person = client.post(
        f"/friends/{friend['id']}/people",
        json={"name": "Noa", "role": "kid"},
        headers=headers,
    ).json()
    assert person["birth_month"] is None

    r = client.patch(
        f"/friends/{friend['id']}/people/{person['id']}",
        json={"birth_year": 2019, "birth_month": 5, "birth_day": 14},
        headers=headers,
    )
    assert r.status_code == 200, r.text
    updated = r.json()
    assert (updated["birth_month"], updated["birth_day"], updated["birth_year"]) == (5, 14, 2019)


def test_birth_month_and_day_must_be_provided_together(client):
    headers = _auth_headers(_signup(client))
    friend = _create_friend(client, headers)

    r = client.post(
        f"/friends/{friend['id']}/people",
        json={"name": "Noa", "role": "kid", "birth_month": 5},
        headers=headers,
    )
    assert r.status_code == 422


def test_birthdays_endpoint_filters_by_month_and_computes_age(client):
    headers = _auth_headers(_signup(client))
    friend = _create_friend(client, headers)

    today = date.today()
    this_month_day = 1 if today.day != 1 else 2
    other_month = 1 if today.month != 1 else 2

    client.post(
        f"/friends/{friend['id']}/people",
        json={
            "name": "Noa",
            "role": "kid",
            "birth_year": today.year - 7,
            "birth_month": today.month,
            "birth_day": this_month_day,
        },
        headers=headers,
    )
    client.post(
        f"/friends/{friend['id']}/people",
        json={"name": "Dan", "role": "adult", "birth_month": other_month, "birth_day": 10},
        headers=headers,
    )

    r = client.get("/birthdays", headers=headers)
    assert r.status_code == 200, r.text
    results = r.json()
    assert len(results) == 1
    assert results[0]["person_name"] == "Noa"
    assert results[0]["turning_age"] == 7

    r = client.get("/birthdays", params={"month": other_month}, headers=headers)
    assert r.status_code == 200, r.text
    results = r.json()
    assert len(results) == 1
    assert results[0]["person_name"] == "Dan"
    assert results[0]["turning_age"] is None


def test_birthdays_are_isolated_per_household(client):
    first_headers = _auth_headers(_signup(client, email="yoav@example.com"))
    friend = _create_friend(client, first_headers)
    today = date.today()
    client.post(
        f"/friends/{friend['id']}/people",
        json={"name": "Noa", "role": "kid", "birth_month": today.month, "birth_day": 1},
        headers=first_headers,
    )

    other_headers = _auth_headers(
        _signup(client, email="stranger@example.com", household_name="Other Household")
    )
    r = client.get("/birthdays", headers=other_headers)
    assert r.status_code == 200
    assert r.json() == []
