
import json
from datetime import date
from pathlib import Path

# KundeRadar V3 - omdan TED-data til KundeRadars format

source = Path("data/ted-raw.json")
destination = Path("data/opportunities.json")

notices = json.loads(source.read_text(encoding="utf-8"))
today = date.today().isoformat()


def danish_text(value):
    if isinstance(value, str):
        return value.strip()

    if isinstance(value, dict):
        for language in ("dan", "eng"):
            text = value.get(language)
            if isinstance(text, list) and text:
                return str(text[0]).strip()
            if isinstance(text, str) and text.strip():
                return text.strip()

    return ""


def get_deadline(notice):
    deadlines = notice.get("deadline-receipt-tender-date-lot", [])

    if isinstance(deadlines, str):
        deadlines = [deadlines]

    if not isinstance(deadlines, list):
        return ""

    future_dates = sorted(
        value[:10]
        for value in deadlines
        if isinstance(value, str)
        and len(value) >= 10
        and value[:10] >= today
    )

    return future_dates[0] if future_dates else ""


def get_source_url(notice):
    links = notice.get("links", {})
    if not isinstance(links, dict):
        return ""

    html = links.get("html", {})
    if isinstance(html, dict):
        return html.get("DAN") or html.get("ENG") or ""

    return ""


opportunities = []

for notice in notices:
    if not isinstance(notice, dict):
        continue

    # Kun almindelige udbudsbekendtgørelser
    if notice.get("notice-type") != "cn-standard":
        continue

    number = notice.get("publication-number", "")
    title = danish_text(notice.get("notice-title"))
    issuer = danish_text(notice.get("buyer-name"))
    published = str(notice.get("publication-date", ""))[:10]
    deadline = get_deadline(notice)
    source_url = get_source_url(notice)

    # Spring ufuldstændige bekendtgørelser over
    if not all([number, title, issuer, published, deadline, source_url]):
        continue

    opportunities.append({
        "id": f"ted-{number}",
        "title": title,
        "description": title,
        "category": "Offentligt udbud",
        "region": "Hele Danmark",
        "city": "Ikke oplyst",
        "issuer": issuer,
        "publishedAt": published,
        "deadline": deadline,
        "sourceName": "TED",
        "sourceUrl": source_url,
        "isDemo": False
    })

destination.parent.mkdir(parents=True, exist_ok=True)
destination.write_text(
    json.dumps(opportunities, ensure_ascii=False, indent=2),
    encoding="utf-8"
)

print(f"TED-bekendtgørelser undersøgt: {len(notices)}")
print(f"Udbud klar til KundeRadar: {len(opportunities)}")
print(f"Data gemt i {destination}")
