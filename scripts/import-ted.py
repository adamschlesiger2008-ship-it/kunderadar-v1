
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
        "deadline-receipt-tender-date-lot",
        "notice-type"
    ],
    "limit": 50
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
med_frist = [
    notice for notice in notices
    if notice.get("deadline-receipt-tender-date-lot")
]

print(f"Bekendtgørelser med tilbudsfrist: {len(med_frist)} ud af {len(notices)}")
print(f"TED-data hentet: {len(notices)} bekendtgørelser")
print(f"Rå data gemt i {output}")
if notices:
    print("TED-felter i første bekendtgørelse:", json.dumps(notices[0], ensure_ascii=False, indent=2))
from datetime import date

aktive_frister = 0

for notice in med_frist:
    frister = notice.get("deadline-receipt-tender-date-lot", [])
    if not isinstance(frister, list):
        frister = [frister]

    for frist in frister:
        if isinstance(frist, str) and frist[:10] > date.today().isoformat():
            aktive_frister += 1
            break

print(f"Bekendtgørelser med fremtidig tilbudsfrist: {aktive_frister}")
