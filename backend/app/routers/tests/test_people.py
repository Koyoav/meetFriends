class TestPeopleRouter:
    def _create_friend(self, client, headers, display_name="The Cohens"):
        return client.post(
            "/friends",
            json={"display_name": display_name, "adult_fit_score": 8, "importance_score": 9},
            headers=headers,
        ).json()

    def test_add_person__friend_exists__returns_201_with_person(self, client, auth_headers):
        # Arrange
        headers = auth_headers()
        friend = self._create_friend(client, headers)

        # Act
        response = client.post(
            f"/friends/{friend['id']}/people",
            json={"name": "Dan", "role": "adult"},
            headers=headers,
        )

        # Assert
        assert response.status_code == 201
        assert response.json()["name"] == "Dan"

    def test_add_person__friend_does_not_exist__returns_404(self, client, auth_headers):
        # Arrange
        headers = auth_headers()

        # Act
        response = client.post(
            "/friends/999/people", json={"name": "Dan", "role": "adult"}, headers=headers
        )

        # Assert
        assert response.status_code == 404

    def test_add_person__birth_month_without_birth_day__returns_422(self, client, auth_headers):
        # Arrange
        headers = auth_headers()
        friend = self._create_friend(client, headers)

        # Act
        response = client.post(
            f"/friends/{friend['id']}/people",
            json={"name": "Noa", "role": "kid", "birth_month": 5},
            headers=headers,
        )

        # Assert
        assert response.status_code == 422

    def test_add_person__birth_day_without_birth_month__returns_422(self, client, auth_headers):
        # Arrange
        headers = auth_headers()
        friend = self._create_friend(client, headers)

        # Act
        response = client.post(
            f"/friends/{friend['id']}/people",
            json={"name": "Noa", "role": "kid", "birth_day": 14},
            headers=headers,
        )

        # Assert
        assert response.status_code == 422

    def test_update_person__valid_birthday_payload__updates_person(self, client, auth_headers):
        # Arrange
        headers = auth_headers()
        friend = self._create_friend(client, headers)
        person = client.post(
            f"/friends/{friend['id']}/people",
            json={"name": "Noa", "role": "kid"},
            headers=headers,
        ).json()

        # Act
        response = client.patch(
            f"/friends/{friend['id']}/people/{person['id']}",
            json={"birth_year": 2019, "birth_month": 5, "birth_day": 14},
            headers=headers,
        )

        # Assert
        assert response.status_code == 200
        body = response.json()
        assert (body["birth_month"], body["birth_day"], body["birth_year"]) == (5, 14, 2019)

    def test_update_person__birth_month_without_birth_day__returns_422(
        self, client, auth_headers
    ):
        # Arrange
        headers = auth_headers()
        friend = self._create_friend(client, headers)
        person = client.post(
            f"/friends/{friend['id']}/people",
            json={"name": "Noa", "role": "kid"},
            headers=headers,
        ).json()

        # Act
        response = client.patch(
            f"/friends/{friend['id']}/people/{person['id']}",
            json={"birth_month": 5},
            headers=headers,
        )

        # Assert
        assert response.status_code == 422

    def test_update_person__person_does_not_exist__returns_404(self, client, auth_headers):
        # Arrange
        headers = auth_headers()
        friend = self._create_friend(client, headers)

        # Act
        response = client.patch(
            f"/friends/{friend['id']}/people/999",
            json={"name": "Someone Else"},
            headers=headers,
        )

        # Assert
        assert response.status_code == 404

    def test_delete_person__existing_person__removes_it(self, client, auth_headers):
        # Arrange
        headers = auth_headers()
        friend = self._create_friend(client, headers)
        person = client.post(
            f"/friends/{friend['id']}/people",
            json={"name": "Dan", "role": "adult"},
            headers=headers,
        ).json()

        # Act
        response = client.delete(
            f"/friends/{friend['id']}/people/{person['id']}", headers=headers
        )

        # Assert
        assert response.status_code == 204

    def test_delete_person__person_does_not_exist__returns_404(self, client, auth_headers):
        # Arrange
        headers = auth_headers()
        friend = self._create_friend(client, headers)

        # Act
        response = client.delete(f"/friends/{friend['id']}/people/999", headers=headers)

        # Assert
        assert response.status_code == 404
