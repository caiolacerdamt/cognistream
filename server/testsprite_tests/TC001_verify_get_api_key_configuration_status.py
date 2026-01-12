import requests

def test_verify_get_api_key_configuration_status():
    base_url = "http://localhost:3000"
    provider = "OpenAI"  # Example provider; can be changed to any valid provider string
    url = f"{base_url}/api/settings/keys/{provider}"

    headers = {
        "Authorization": "Bearer test-token"
    }

    try:
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 200, f"Expected status code 200 but got {response.status_code}"
    try:
        data = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    assert isinstance(data, dict), "Response JSON is not an object"
    assert "configured" in data, "'configured' field not found in response"
    assert isinstance(data["configured"], bool), "'configured' field is not a boolean"

test_verify_get_api_key_configuration_status()