class TestGatheringsRouter:
    def _create_friend_with_gathering_type(self, client, headers):
        friend = client.post(
            "/friends",
            json={"display_name": "The Cohens", "adult_fit_score": 8, "importance_score": 9},
            headers=headers,
        ).json()
        gathering_type = client.post(
            f"/friends/{friend['id']}/gathering-types",
            json={"type": "FAMILY", "reminder_threshold_days": 60},
            headers=headers,
        ).json()
        return friend, gathering_type

    def test_list_gatherings__no_gatherings_logged__returns_empty_list(
        self, client, auth_headers
    ):
        # Arrange
        headers = auth_headers()
        friend, _ = self._create_friend_with_gathering_type(client, headers)

        # Act
        response = client.get(f"/friends/{friend['id']}/gatherings", headers=headers)

        # Assert
        assert response.status_code == 200
        assert response.json() == []

    def test_list_gatherings__friend_does_not_exist__returns_404(self, client, auth_headers):
        # Arrange
        headers = auth_headers()

        # Act
        response = client.get("/friends/999/gatherings", headers=headers)

        # Assert
        assert response.status_code == 404

    def test_log_gathering__valid_gathering_type__returns_201(self, client, auth_headers):
        # Arrange
        headers = auth_headers()
        friend, gathering_type = self._create_friend_with_gathering_type(client, headers)

        # Act
        response = client.post(
            f"/friends/{friend['id']}/gatherings",
            json={
                "gathering_type_id": gathering_type["id"],
                "date": "2026-10-02",
                "location": "OUR_PLACE",
            },
            headers=headers,
        )

        # Assert
        assert response.status_code == 201
        assert response.json()["gathering_type_id"] == gathering_type["id"]

    def test_log_gathering__gathering_type_belongs_to_another_friend__returns_400(
        self, client, auth_headers
    ):
        # Arrange
        headers = auth_headers()
        friend_a, _ = self._create_friend_with_gathering_type(client, headers)
        _, gathering_type_b = self._create_friend_with_gathering_type(client, headers)

        # Act
        response = client.post(
            f"/friends/{friend_a['id']}/gatherings",
            json={
                "gathering_type_id": gathering_type_b["id"],
                "date": "2026-10-02",
                "location": "OUR_PLACE",
            },
            headers=headers,
        )

        # Assert
        assert response.status_code == 400

    def test_log_gathering__friend_does_not_exist__returns_404(self, client, auth_headers):
        # Arrange
        headers = auth_headers()

        # Act
        response = client.post(
            "/friends/999/gatherings",
            json={"gathering_type_id": 1, "date": "2026-10-02", "location": "OUR_PLACE"},
            headers=headers,
        )

        # Assert
        assert response.status_code == 404
