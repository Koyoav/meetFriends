class TestFriendsRouter:
    def test_list_friends__no_friends_yet__returns_empty_list(self, client, auth_headers):
        # Arrange
        headers = auth_headers()

        # Act
        response = client.get("/friends", headers=headers)

        # Assert
        assert response.status_code == 200
        assert response.json() == []

    def test_create_friend__minimal_payload__returns_201_with_friend(self, client, auth_headers):
        # Arrange
        headers = auth_headers()
        payload = {"display_name": "The Cohens", "adult_fit_score": 8, "importance_score": 9}

        # Act
        response = client.post("/friends", json=payload, headers=headers)

        # Assert
        assert response.status_code == 201
        body = response.json()
        assert body["display_name"] == "The Cohens"
        assert body["people"] == []
        assert body["gathering_types"] == []

    def test_create_friend__with_nested_people_and_gathering_types__persists_all(
        self, client, auth_headers
    ):
        # Arrange
        headers = auth_headers()
        payload = {
            "display_name": "The Cohens",
            "adult_fit_score": 9,
            "kids_fit_score": 8,
            "importance_score": 10,
            "people": [
                {"name": "Dan", "role": "adult"},
                {"name": "Noa", "role": "kid", "birth_year": 2019},
            ],
            "gathering_types": [
                {"type": "FAMILY", "reminder_threshold_days": 60},
                {"type": "MEN_1_1", "reminder_threshold_days": 30},
            ],
        }

        # Act
        response = client.post("/friends", json=payload, headers=headers)

        # Assert
        assert response.status_code == 201
        body = response.json()
        assert {p["name"] for p in body["people"]} == {"Dan", "Noa"}
        assert {gt["type"] for gt in body["gathering_types"]} == {"FAMILY", "MEN_1_1"}

    def test_get_friend__friend_exists__returns_it(self, client, auth_headers):
        # Arrange
        headers = auth_headers()
        created = client.post(
            "/friends",
            json={"display_name": "The Cohens", "adult_fit_score": 8, "importance_score": 9},
            headers=headers,
        ).json()

        # Act
        response = client.get(f"/friends/{created['id']}", headers=headers)

        # Assert
        assert response.status_code == 200
        assert response.json()["id"] == created["id"]

    def test_get_friend__friend_does_not_exist__returns_404(self, client, auth_headers):
        # Arrange
        headers = auth_headers()

        # Act
        response = client.get("/friends/999", headers=headers)

        # Assert
        assert response.status_code == 404

    def test_update_friend__partial_payload__only_changes_given_fields(
        self, client, auth_headers
    ):
        # Arrange
        headers = auth_headers()
        created = client.post(
            "/friends",
            json={"display_name": "The Cohens", "adult_fit_score": 5, "importance_score": 5},
            headers=headers,
        ).json()

        # Act
        response = client.patch(
            f"/friends/{created['id']}", json={"adult_fit_score": 9}, headers=headers
        )

        # Assert
        assert response.status_code == 200
        body = response.json()
        assert body["adult_fit_score"] == 9
        assert body["display_name"] == "The Cohens"

    def test_delete_friend__existing_friend__removes_it(self, client, auth_headers):
        # Arrange
        headers = auth_headers()
        created = client.post(
            "/friends",
            json={"display_name": "The Cohens", "adult_fit_score": 8, "importance_score": 9},
            headers=headers,
        ).json()

        # Act
        delete_response = client.delete(f"/friends/{created['id']}", headers=headers)

        # Assert
        assert delete_response.status_code == 204
        get_response = client.get(f"/friends/{created['id']}", headers=headers)
        assert get_response.status_code == 404

    def test_get_friend__belongs_to_another_household__returns_404(
        self, client, auth_headers
    ):
        # Arrange
        first_headers = auth_headers(email="yoav@example.com")
        friend = client.post(
            "/friends",
            json={"display_name": "The Cohens", "adult_fit_score": 8, "importance_score": 9},
            headers=first_headers,
        ).json()
        other_headers = auth_headers(
            email="stranger@example.com", household_name="Other Household"
        )

        # Act
        response = client.get(f"/friends/{friend['id']}", headers=other_headers)

        # Assert
        assert response.status_code == 404
