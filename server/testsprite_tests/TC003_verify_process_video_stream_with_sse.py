import requests

def test_verify_process_video_stream_with_sse():
    base_url = "http://localhost:3000"
    url = f"{base_url}/api/process-video/stream"
    headers = {
        "Authorization": "Bearer test-token",
        "Accept": "text/event-stream",
        "Content-Type": "application/json"
    }
    payload = {
        "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "provider": "OpenAI",
        "apiKey": "TEST_API_KEY",
        "userId": "test-user-123"
    }

    try:
        with requests.post(url, json=payload, headers=headers, stream=True, timeout=30) as response:
            assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"
            event_data_lines = []
            transcription_complete = False
            summary_complete = False
            # Parse SSE stream line by line
            for line_bytes in response.iter_lines(decode_unicode=True):
                if line_bytes is None or line_bytes.strip() == "":
                    # End of one SSE event block
                    if event_data_lines:
                        # Join all data lines removing 'data: ' prefix
                        event_data = "".join(l[6:] if l.startswith("data: ") else l for l in event_data_lines)
                        event_data_lines = []
                        # Basic check for progress stages and final data
                        # Since mock is used, let's check event_data contains expected keywords
                        # Like "Downloading", "Transcribing", "Saving", "transcription", "summary"
                        lowered = event_data.lower()
                        if "downloading" in lowered or "transcribing" in lowered or "saving" in lowered:
                            # Intermediate progress events
                            pass
                        else:
                            # Final event with transcription and summary expected
                            if "transcription" in lowered:
                                transcription_complete = True
                            if "summary" in lowered:
                                summary_complete = True
                    continue
                if line_bytes.startswith("data: "):
                    event_data_lines.append(line_bytes)
            assert transcription_complete, "Transcription data not found in SSE stream"
            assert summary_complete, "Summary data not found in SSE stream"
    except requests.exceptions.RequestException as e:
        assert False, f"HTTP request failed: {e}"

test_verify_process_video_stream_with_sse()