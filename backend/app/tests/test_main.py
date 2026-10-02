class TestHealthEndpoint:
    def test_health__called__returns_ok_status(self, client):
        # Arrange
        # (no setup needed)

        # Act
        response = client.get("/health")

        # Assert
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}
