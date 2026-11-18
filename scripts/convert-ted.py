
import json
import re
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

# KundeRadar - TED til hjemmesidens dataformat

source = Path("data/ted-raw.json")
destination = Path("data/opportunities.json")

notices = json.loads(source.read_text(encoding="utf-8"))

if not isinstance(notices, list):
    raise ValueError("TED-data skal være en liste")

today = datetime.now(
    ZoneInfo("Europe/Copenhagen")
).date().isoformat()


def plain(value):
    if isinstance(value, str):
        return value.strip()

    if isinstance(value, (int, float)):
        return str(value)

    if isinstance(value, list):
        for entry in value:
            result = plain(entry)
            if result:
                return result

    if isinstance(value, dict):
        for language in (
            "dan", "DAN", "da",
            "eng", "ENG", "en"
        ):
            if language in value:
                result = plain(value[language])
                if result:
                    return result

    return ""


def field(notice, *keys):
    for key in keys:
        result = plain(notice.get(key))
        if result:
            return result

    return ""


def valid_day(value):
    if not isinstance(value, str):
        return False

    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        return False

    try:
        parsed = datetime.strptime(value, "%Y-%m-%d")
        return parsed.strftime("%Y-%m-%d") == value
    except ValueError:
        return False


def get_deadline(notice):
    raw = notice.get(
        "deadline-receipt-tender-date-lot", []
    )

    if isinstance(raw, str):
        raw = [raw]

    if not isinstance(raw, list):
        return ""

    dates = [
        value[:10]
        for value in raw
        if isinstance(value, str)
        and valid_day(value[:10])
        and value[:10] >= today
    ]

    return min(dates) if dates else ""


def get_source_url(notice):
    links = notice.get("links", {})

    if not isinstance(links, dict):
        return ""

    html = links.get("html", {})
    url = ""

    if isinstance(html, str):
        url = plain(html)

    elif isinstance(html, dict):
        url = (
            plain(html.get("DAN"))
            or plain(html.get("ENG"))
            or plain(html.get("dan"))
            or plain(html.get("eng"))
        )

    parsed = urlparse(url)

    if parsed.scheme not in ("http", "https"):
        return ""

    if not parsed.netloc:
        return ""

    return url


def get_location(notice):
    # Arbejdssted fra TED - ikke køberens adresse.
    city = field(
        notice,
        "place-of-performance-city-lot",
        "place-of-performance-city-proc"
    )

    postcode = field(
        notice,
        "place-of-performance-post-code-lot",
        "place-of-performance-post-code-proc"
    )

    subdivision = field(
        notice,
        "place-of-performance-subdiv-lot",
        "place-of-performance-subdiv-proc"
    )

    if city and postcode and postcode not in city:
        city = f"{city} ({postcode})"

    if not city:
        city = "Opgavested ikke oplyst"

    if not subdivision:
        subdivision = "Ukendt region"

    return city, subdivision


def get_category(notice):
    cpv = field(
        notice,
        "classification-cpv",
        "classification-cpv-lot"
    )

    prefix = re.sub(r"\D", "", cpv)[:2]

    categories = {
        "45": "Byggeri og håndværk",
        "50": "Reparation og vedligehold",
        "72": "IT",
        "79": "Erhvervsservice",
        "90": "Rengøring og miljø"
    }

    return categories.get(
        prefix,
        "Offentligt udbud"
    )


opportunities = []
seen = set()

for notice in notices:
    if not isinstance(notice, dict):
        continue

    if notice.get("notice-type") != "cn-standard":
        continue

    number = field(notice, "publication-number")
    title = field(notice, "notice-title")
    issuer = field(notice, "buyer-name")

    published = field(
        notice, "publication-date"
    )[:10]

    deadline = get_deadline(notice)
    source_url = get_source_url(notice)

    if not all([
        number,
        title,
        issuer,
        valid_day(published),
        deadline,
        source_url
    ]):
        continue

    if deadline < published:
        continue

    if number in seen:
        continue

    seen.add(number)

    city, region = get_location(notice)

    description = field(
        notice,
        "description-lot",
        "description-proc"
    ) or title

    opportunities.append({
        "id": f"ted-{number}",
        "title": title,
        "description": description,
        "category": get_category(notice),
        "region": region,
        "city": city,
        "issuer": issuer,
        "publishedAt": published,
        "deadline": deadline,
        "sourceName": "TED",
        "sourceUrl": source_url,
        "isDemo": False
    })


# Beskyt eksisterende data mod tom import.
if not opportunities:
    raise RuntimeError(
        "Ingen aktuelle udbud fundet. "
        "Den eksisterende datafil bevares."
    )

destination.parent.mkdir(
    parents=True,
    exist_ok=True
)

destination.write_text(
    json.dumps(
        opportunities,
        ensure_ascii=False,
        indent=2
    ),
    encoding="utf-8"
)

known_cities = sum(
    item["city"] != "Opgavested ikke oplyst"
    for item in opportunities
)

print(f"TED-bekendtgørelser undersøgt: {len(notices)}")
print(f"Udbud klar til KundeRadar: {len(opportunities)}")
print(f"Udbud med oplyst by: {known_cities}")
print(
    f"Udbud uden oplyst by: "
    f"{len(opportunities) - known_cities}"
)
print(f"Data gemt i {destination}")
