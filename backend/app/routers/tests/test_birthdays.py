from datetime import date


class TestBirthdaysRouter:
    def _create_friend(self, client, headers):
        return client.post(
            "/friends",
            json={"display_name": "The Cohens", "adult_fit_score": 9, "importance_score": 10},
            headers=headers,
        ).json()

    def test_list_birthdays__default_month__returns_people_born_this_month(
        self, client, auth_headers
    ):
        # Arrange
        headers = auth_headers()
        friend = self._create_friend(client, headers)
        today = date.today()
        this_month_day = 1 if today.day != 1 else 2
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

        # Act
        response = client.get("/birthdays", headers=headers)

        # Assert
        assert response.status_code == 200
        results = response.json()
        assert len(results) == 1
        assert results[0]["person_name"] == "Noa"
        assert results[0]["turning_age"] == 7

    def test_list_birthdays__explicit_month_param__filters_to_that_month(
        self, client, auth_headers
    ):
        # Arrange
        headers = auth_headers()
        friend = self._create_friend(client, headers)
        today = date.today()
        other_month = 1 if today.month != 1 else 2
        client.post(
            f"/friends/{friend['id']}/people",
            json={"name": "Dan", "role": "adult", "birth_month": other_month, "birth_day": 10},
            headers=headers,
        )

        # Act
        response = client.get("/birthdays", params={"month": other_month}, headers=headers)

        # Assert
        assert response.status_code == 200
        results = response.json()
        assert len(results) == 1
        assert results[0]["person_name"] == "Dan"
        assert results[0]["turning_age"] is None

    def test_list_birthdays__no_birthdays_set__returns_empty_list(self, client, auth_headers):
        # Arrange
        headers = auth_headers()
        friend = self._create_friend(client, headers)
        client.post(
            f"/friends/{friend['id']}/people",
            json={"name": "Dan", "role": "adult"},
            headers=headers,
        )

        # Act
        response = client.get("/birthdays", headers=headers)

        # Assert
        assert response.status_code == 200
        assert response.json() == []

    def test_list_birthdays__other_households_people__are_excluded(self, client, auth_headers):
        # Arrange
        first_headers = auth_headers(email="yoav@example.com")
        friend = self._create_friend(client, first_headers)
        today = date.today()
        client.post(
            f"/friends/{friend['id']}/people",
            json={"name": "Noa", "role": "kid", "birth_month": today.month, "birth_day": 1},
            headers=first_headers,
        )
        other_headers = auth_headers(
            email="stranger@example.com", household_name="Other Household"
        )

        # Act
        response = client.get("/birthdays", headers=other_headers)

        # Assert
        assert response.status_code == 200
        assert response.json() == []
