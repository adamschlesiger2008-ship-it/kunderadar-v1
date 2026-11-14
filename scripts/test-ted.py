
import json
import urllib.request

# Test af EU's offentlige TED API
# Kun offentlige data - ingen login eller API-nøgle

url = "https://api.ted.europa.eu/v3/notices/search"

payload = {
    "query": "publication-date >= 20261101",
    "fields": ["publication-number", "notice-title"],
    "limit": 5
}

request = urllib.request.Request(
    url,
    data=json.dumps(payload).encode("utf-8"),
    headers={
        "Content-Type": "application/json",
        "Accept": "application/json"
    },
    method="POST"
)

try:
    with urllib.request.urlopen(request, timeout=20) as response:
        data = json.load(response)

    print("Forbindelse til TED virker!")
    print(json.dumps(data, indent=2, ensure_ascii=False))

except Exception as error:
    print("TED-test fejlede:", error)
    raise
