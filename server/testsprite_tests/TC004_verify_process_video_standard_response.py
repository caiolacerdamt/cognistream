import requests

def verify_process_video_standard_response():
    base_url = "http://localhost:3000"
    endpoint = "/api/process-video"
    url = base_url + endpoint
    headers = {
        "Authorization": "Bearer test-token",
        "Content-Type": "application/json"
    }
    payload = {
        "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "provider": "OpenAI",
        "apiKey": "TEST_API_KEY",
        "userId": "test-user"
    }
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=30)
        assert response.status_code == 200, f"Expected status code 200 but got {response.status_code}"
        response_json = response.json()
        # Check expected keys in the response JSON: transcription and summary
        assert isinstance(response_json, dict), "Response is not a JSON object"
        assert "transcription" in response_json, "'transcription' key not in response"
        assert "summary" in response_json, "'summary' key not in response"
        # Transcription and summary should be non-empty strings
        transcription = response_json.get("transcription")
        summary = response_json.get("summary")
        assert isinstance(transcription, str) and transcription.strip(), "Transcription is empty or not a string"
        assert isinstance(summary, str) and summary.strip(), "Summary is empty or not a string"
    except requests.exceptions.RequestException as e:
        assert False, f"Request failed: {e}"

verify_process_video_standard_response()