
import json
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

# KundeRadar - TED import med lokationer
# Hent de seneste 90 dages danske bekendtgørelser.

URL = "https://api.ted.europa.eu/v3/notices/search"

today = datetime.now(ZoneInfo("Europe/Copenhagen")).date()
start_date = today - timedelta(days=90)

query = (
    f"publication-date >= {start_date:%Y%m%d} "
    f"AND buyer-country = DNK "
    f"AND notice-type = cn-standard"
)

fields = [
    "publication-number",
    "notice-title",
    "publication-date",
    "buyer-name",
    "deadline-receipt-tender-date-lot",
    "notice-type",
    "place-of-performance-city-lot",
    "place-of-performance-city-proc",
    "place-of-performance-post-code-lot",
    "place-of-performance-post-code-proc",
    "place-of-performance-subdiv-lot",
    "place-of-performance-subdiv-proc",
    "classification-cpv",
    "description-lot",
    "description-proc"
]

all_notices = []
seen = set()

PAGE_SIZE = 250
MAX_PAGES = 20

for page in range(1, MAX_PAGES + 1):
    payload = {
        "query": query,
        "fields": fields,
        "page": page,
        "limit": PAGE_SIZE,
        "paginationMode": "PAGE_NUMBER"
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

    with urllib.request.urlopen(
        request,
        timeout=60
    ) as response:
        data = json.load(response)

    notices = data.get("notices", [])

    if not isinstance(notices, list):
        raise ValueError(
            "TED returnerede ikke en liste af udbud"
        )

    print(
        f"Side {page}: {len(notices)} bekendtgørelser"
    )

    for notice in notices:
        if not isinstance(notice, dict):
            continue

        number = notice.get("publication-number")

        if isinstance(number, list):
            number = number[0] if number else ""

        if not number:
            continue

        number = str(number)

        if number in seen:
            continue

        seen.add(number)
        all_notices.append(notice)

    if len(notices) < PAGE_SIZE:
        break
else:
    raise RuntimeError(
        "TED-søgningen nåede sidegrænsen. "
        "Udvid MAX_PAGES for at undgå ufuldstændige data."
    )

# Gem først efter en gennemført import.
output = Path("data/ted-raw.json")

output.parent.mkdir(
    parents=True,
    exist_ok=True
)

output.write_text(
    json.dumps(
        all_notices,
        ensure_ascii=False,
        indent=2
    ),
    encoding="utf-8"
)

with_deadline = sum(
    1
    for notice in all_notices
    if notice.get("deadline-receipt-tender-date-lot")
)

with_city = sum(
    1
    for notice in all_notices
    if (
        notice.get("place-of-performance-city-lot")
        or notice.get("place-of-performance-city-proc")
    )
)

print(f"TED-data hentet: {len(all_notices)}")
print(f"Bekendtgørelser med frist: {with_deadline}")
print(f"Bekendtgørelser med byfelt: {with_city}")
print(f"Rå data gemt i {output}")
