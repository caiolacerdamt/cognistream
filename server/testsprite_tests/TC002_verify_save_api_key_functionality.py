import requests

def verify_save_api_key_functionality():
    base_url = "http://localhost:3000"
    endpoint = "/api/settings/keys"
    url = base_url + endpoint
    headers = {
        "Authorization": "Bearer test-token",
        "Content-Type": "application/json"
    }
    payload = {
        "provider": "openai",
        "key": "TEST_API_KEY"
    }
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        response.raise_for_status()
        assert response.status_code == 200, f"Expected status code 200 but got {response.status_code}"
    except requests.exceptions.RequestException as e:
        assert False, f"Request failed: {e}"

verify_save_api_key_functionality()