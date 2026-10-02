from datetime import date, timedelta


class TestRemindersRouter:
    def test_list_reminders__overdue_gathering_type_was_logged_before__has_days_since_last_set(
        self, client, auth_headers
    ):
        # Arrange
        headers = auth_headers()
        friend = client.post(
            "/friends",
            json={"display_name": "The Cohens", "adult_fit_score": 8, "importance_score": 9},
            headers=headers,
        ).json()
        gathering_type = client.post(
            f"/friends/{friend['id']}/gathering-types",
            json={"type": "FAMILY", "reminder_threshold_days": 0},
            headers=headers,
        ).json()
        yesterday = (date.today() - timedelta(days=1)).isoformat()
        client.post(
            f"/friends/{friend['id']}/gatherings",
            json={
                "gathering_type_id": gathering_type["id"],
                "date": yesterday,
                "location": "OUR_PLACE",
            },
            headers=headers,
        )

        # Act
        response = client.get("/reminders", headers=headers)

        # Assert
        assert response.status_code == 200
        results = response.json()
        assert len(results) == 1
        assert results[0]["days_since_last"] == 1

    def test_list_reminders__gathering_type_never_met__is_included_as_overdue(
        self, client, auth_headers
    ):
        # Arrange
        headers = auth_headers()
        friend = client.post(
            "/friends",
            json={"display_name": "The Cohens", "adult_fit_score": 8, "importance_score": 9},
            headers=headers,
        ).json()
        client.post(
            f"/friends/{friend['id']}/gathering-types",
            json={"type": "MEN_1_1", "reminder_threshold_days": 30},
            headers=headers,
        )

        # Act
        response = client.get("/reminders", headers=headers)

        # Assert
        assert response.status_code == 200
        labels = {item["gathering_type_label"] for item in response.json()}
        assert "MEN_1_1" in labels

    def test_list_reminders__gathering_type_logged_recently__is_excluded(
        self, client, auth_headers
    ):
        # Arrange
        headers = auth_headers()
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
        client.post(
            f"/friends/{friend['id']}/gatherings",
            json={
                "gathering_type_id": gathering_type["id"],
                "date": "2026-10-02",
                "location": "OUR_PLACE",
            },
            headers=headers,
        )

        # Act
        response = client.get("/reminders", headers=headers)

        # Assert
        assert response.status_code == 200
        labels = {item["gathering_type_label"] for item in response.json()}
        assert "FAMILY" not in labels

    def test_list_reminders__no_friends__returns_empty_list(self, client, auth_headers):
        # Arrange
        headers = auth_headers()

        # Act
        response = client.get("/reminders", headers=headers)

        # Assert
        assert response.status_code == 200
        assert response.json() == []
