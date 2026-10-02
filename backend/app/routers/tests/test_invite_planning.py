class TestInvitePlanningRouter:
    def _create_two_friends(self, client, headers):
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

    def test_invite_planning__sort_by_combined__orders_by_combined_score_desc(
        self, client, auth_headers
    ):
        # Arrange
        headers = auth_headers()
        self._create_two_friends(client, headers)

        # Act
        response = client.get(
            "/invite-planning", params={"sort_by": "combined"}, headers=headers
        )

        # Assert
        assert response.status_code == 200
        names = [item["display_name"] for item in response.json()]
        assert names == ["The Cohens", "The Levis"]

    def test_invite_planning__sort_by_kids_fit__orders_by_kids_fit_desc(
        self, client, auth_headers
    ):
        # Arrange
        headers = auth_headers()
        self._create_two_friends(client, headers)

        # Act
        response = client.get(
            "/invite-planning", params={"sort_by": "kids_fit"}, headers=headers
        )

        # Assert
        assert response.status_code == 200
        names = [item["display_name"] for item in response.json()]
        assert names == ["The Cohens", "The Levis"]

    def test_invite_planning__sort_by_adult_fit__orders_by_adult_fit_desc(
        self, client, auth_headers
    ):
        # Arrange
        headers = auth_headers()
        self._create_two_friends(client, headers)

        # Act
        response = client.get(
            "/invite-planning", params={"sort_by": "adult_fit"}, headers=headers
        )

        # Assert
        assert response.status_code == 200
        names = [item["display_name"] for item in response.json()]
        assert names == ["The Cohens", "The Levis"]

    def test_invite_planning__default_sort_is_staleness__friend_never_met_sorts_first(
        self, client, auth_headers
    ):
        # Arrange
        headers = auth_headers()
        self._create_two_friends(client, headers)

        # Act
        response = client.get("/invite-planning", headers=headers)

        # Assert
        assert response.status_code == 200
        results = response.json()
        assert all(item["days_since_last"] is None for item in results)

    def test_invite_planning__filter_by_specific_gathering_type__ignores_other_types(
        self, client, auth_headers
    ):
        # Arrange
        headers = auth_headers()
        friend = client.post(
            "/friends",
            json={"display_name": "The Cohens", "adult_fit_score": 9, "importance_score": 10},
            headers=headers,
        ).json()
        family_type = client.post(
            f"/friends/{friend['id']}/gathering-types",
            json={"type": "FAMILY"},
            headers=headers,
        ).json()
        client.post(
            f"/friends/{friend['id']}/gatherings",
            json={
                "gathering_type_id": family_type["id"],
                "date": "2026-10-02",
                "location": "OUR_PLACE",
            },
            headers=headers,
        )

        # Act
        response = client.get(
            "/invite-planning", params={"gathering_type": "MEN_1_1"}, headers=headers
        )

        # Assert
        assert response.status_code == 200
        assert response.json()[0]["last_gathering_date"] is None

    def test_invite_planning__no_friends__returns_empty_list(self, client, auth_headers):
        # Arrange
        headers = auth_headers()

        # Act
        response = client.get("/invite-planning", headers=headers)

        # Assert
        assert response.status_code == 200
        assert response.json() == []
