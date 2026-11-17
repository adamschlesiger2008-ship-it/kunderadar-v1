
import json
import urllib.request
from pathlib import Path

# KundeRadar V3 - hent data fra EU's TED API
# Første version: gem rå TED-data til kontrol

URL = "https://api.ted.europa.eu/v3/notices/search"

payload = {
    "query": "publication-date >= 20261101 AND buyer-country = DNK",
    "fields": [
        "publication-number",
        "notice-title",
        "publication-date",
        "buyer-name",
        "deadline-receipt-tender-date-lot"
    ],
    "limit": 5
}

request = urllib.request.Request(
    URL,
    data=json.dumps(payload).encode("utf-8"),
    headers={
        "Content-Type": "application/json",
        "Accept": "application/json"
    },
    method="POST"
)

with urllib.request.urlopen(request, timeout=30) as response:
    data = json.load(response)

notices = data.get("notices", [])

if not isinstance(notices, list):
    raise ValueError("TED returnerede ikke en liste af udbud")

output = Path("data/ted-raw.json")
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(
    json.dumps(notices, ensure_ascii=False, indent=2),
    encoding="utf-8"
)

print(f"TED-data hentet: {len(notices)} bekendtgørelser")
print(f"Rå data gemt i {output}")
if notices:
    print("TED-felter i første bekendtgørelse:", json.dumps(notices[0], ensure_ascii=False, indent=2))
