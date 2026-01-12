import requests

def test_verify_process_file_upload_and_processing():
    base_url = "http://localhost:3000"
    endpoint = "/api/process-file"
    url = base_url + endpoint
    headers = {
        "Authorization": "Bearer test-token"
    }

    # Use a small dummy audio content for testing (WAV header with no audio)
    dummy_audio_content = (
        b"RIFF$\x00\x00\x00WAVEfmt "  # RIFF header & WAVE fmt chunk header start
        b"\x10\x00\x00\x00\x01\x00\x01\x00"  # fmt chunk size, audio format (1=PCM), channels (1)
        b"\x40\x1f\x00\x00\x80>\x00\x00"  # sample rate 8000Hz, byte rate, block align
        b"\x02\x00\x10\x00data\x00\x00\x00\x00"  # bits/sample 16, data chunk header with no data
    )

    files = {
        "audio": ("dummy.wav", dummy_audio_content, "audio/wav"),
    }
    data = {
        "apiKey": "TEST_API_KEY"
    }

    try:
        response = requests.post(url, headers=headers, files=files, data=data, timeout=30)
        assert response.status_code == 200, f"Expected status code 200 but got {response.status_code}"
        json_response = response.json()
        assert isinstance(json_response, dict), "Response is not a JSON object"
        assert "transcription" in json_response, "'transcription' field missing in response"
        assert isinstance(json_response["transcription"], str) and len(json_response["transcription"]) > 0, \
            "'transcription' field is empty or not a string"
        assert "summary" in json_response, "'summary' field missing in response"
        assert isinstance(json_response["summary"], str) and len(json_response["summary"]) > 0, \
            "'summary' field is empty or not a string"
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_verify_process_file_upload_and_processing()