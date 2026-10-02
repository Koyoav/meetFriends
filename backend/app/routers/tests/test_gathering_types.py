class TestGatheringTypesRouter:
    def _create_friend(self, client, headers, display_name="The Cohens"):
        return client.post(
            "/friends",
            json={"display_name": display_name, "adult_fit_score": 8, "importance_score": 9},
            headers=headers,
        ).json()

    def test_add_gathering_type__friend_exists__returns_201(self, client, auth_headers):
        # Arrange
        headers = auth_headers()
        friend = self._create_friend(client, headers)

        # Act
        response = client.post(
            f"/friends/{friend['id']}/gathering-types",
            json={"type": "FAMILY", "reminder_threshold_days": 60},
            headers=headers,
        )

        # Assert
        assert response.status_code == 201
        assert response.json()["type"] == "FAMILY"

    def test_add_gathering_type__friend_does_not_exist__returns_404(self, client, auth_headers):
        # Arrange
        headers = auth_headers()

        # Act
        response = client.post(
            "/friends/999/gathering-types", json={"type": "FAMILY"}, headers=headers
        )

        # Assert
        assert response.status_code == 404

    def test_add_gathering_type__custom_type_with_label__persists_label(
        self, client, auth_headers
    ):
        # Arrange
        headers = auth_headers()
        friend = self._create_friend(client, headers)

        # Act
        response = client.post(
            f"/friends/{friend['id']}/gathering-types",
            json={"type": "CUSTOM", "custom_label": "Golf"},
            headers=headers,
        )

        # Assert
        assert response.status_code == 201
        assert response.json()["custom_label"] == "Golf"

    def test_update_gathering_type__partial_payload__only_changes_given_fields(
        self, client, auth_headers
    ):
        # Arrange
        headers = auth_headers()
        friend = self._create_friend(client, headers)
        gathering_type = client.post(
            f"/friends/{friend['id']}/gathering-types",
            json={"type": "FAMILY", "reminder_threshold_days": 60},
            headers=headers,
        ).json()

        # Act
        response = client.patch(
            f"/friends/{friend['id']}/gathering-types/{gathering_type['id']}",
            json={"reminder_threshold_days": 90},
            headers=headers,
        )

        # Assert
        assert response.status_code == 200
        assert response.json()["reminder_threshold_days"] == 90

    def test_update_gathering_type__does_not_exist__returns_404(self, client, auth_headers):
        # Arrange
        headers = auth_headers()
        friend = self._create_friend(client, headers)

        # Act
        response = client.patch(
            f"/friends/{friend['id']}/gathering-types/999",
            json={"reminder_threshold_days": 90},
            headers=headers,
        )

        # Assert
        assert response.status_code == 404

    def test_delete_gathering_type__existing_type__removes_it(self, client, auth_headers):
        # Arrange
        headers = auth_headers()
        friend = self._create_friend(client, headers)
        gathering_type = client.post(
            f"/friends/{friend['id']}/gathering-types",
            json={"type": "FAMILY"},
            headers=headers,
        ).json()

        # Act
        response = client.delete(
            f"/friends/{friend['id']}/gathering-types/{gathering_type['id']}", headers=headers
        )

        # Assert
        assert response.status_code == 204

    def test_delete_gathering_type__does_not_exist__returns_404(self, client, auth_headers):
        # Arrange
        headers = auth_headers()
        friend = self._create_friend(client, headers)

        # Act
        response = client.delete(
            f"/friends/{friend['id']}/gathering-types/999", headers=headers
        )

        # Assert
        assert response.status_code == 404
