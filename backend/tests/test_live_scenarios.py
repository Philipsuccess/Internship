import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def run_probes():
    results = []

    # 1. Health check
    res = requests.get(f"{BASE_URL}/health")
    results.append(("Health Check", res.status_code, res.json()))

    # 2. Empty user message (empty string)
    res = requests.post(
        f"{BASE_URL}/api/chat",
        headers={"Content-Type": "application/json"},
        json={"message": ""}
    )
    results.append(("Empty Message ('')", res.status_code, res.json()))

    # 3. Whitespace-only user message
    res = requests.post(
        f"{BASE_URL}/api/chat",
        headers={"Content-Type": "application/json"},
        json={"message": "    "}
    )
    results.append(("Whitespace Message ('   ')", res.status_code, res.json()))

    # 4. Extremely long message (>10,000 chars)
    res = requests.post(
        f"{BASE_URL}/api/chat",
        headers={"Content-Type": "application/json"},
        json={"message": "A" * 10001}
    )
    results.append(("Extremely Long Message (10,001 chars)", res.status_code, res.json()))

    # 5. Malformed payload (empty body)
    res = requests.post(
        f"{BASE_URL}/api/chat",
        headers={"Content-Type": "application/json"},
        data="{}"
    )
    results.append(("Malformed Payload (empty object)", res.status_code, res.json()))

    # 6. Malformed JSON syntax
    res = requests.post(
        f"{BASE_URL}/api/chat",
        headers={"Content-Type": "application/json"},
        data="{'invalid_json': true"
    )
    results.append(("Malformed JSON Syntax", res.status_code, res.json()))

    # 7. Unsupported role in history
    res = requests.post(
        f"{BASE_URL}/api/chat",
        headers={"Content-Type": "application/json"},
        json={"message": "Hello", "conversation_history": [{"role": "system", "content": "inject"}]}
    )
    results.append(("Unsupported Role ('system')", res.status_code, res.json()))

    # 8. Excessive conversation history (>50 turns)
    res = requests.post(
        f"{BASE_URL}/api/chat",
        headers={"Content-Type": "application/json"},
        json={
            "message": "Hello",
            "conversation_history": [{"role": "user", "content": "hi"} for _ in range(51)]
        }
    )
    results.append(("Excessive History (>50 messages)", res.status_code, res.json()))

    # 9. Valid prompt with live API key
    res = requests.post(
        f"{BASE_URL}/api/chat",
        headers={"Content-Type": "application/json"},
        json={"message": "Say 'Live test passed' in exactly 3 words."}
    )
    results.append(("Live Chat Prompt", res.status_code, res.json()))

    print("=== LIVE PROBE RESULTS ===")
    for name, code, data in results:
        print(f"\n[{name}]")
        print(f"Status Code: {code}")
        print(f"Response: {json.dumps(data, indent=2)}")

if __name__ == "__main__":
    run_probes()
