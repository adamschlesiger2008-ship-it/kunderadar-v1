
import json
import re
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo
from urllib.parse import urlparse

# KundeRadar - TED import med lokationer

source = Path("data/ted-raw.json")
destination = Path("data/opportunities.json")

notices = json.loads(source.read_text(encoding="utf-8"))

today = datetime.now(
    ZoneInfo("Europe/Copenhagen")
).date().isoformat()


def danish_text(value):
    if isinstance(value, str):
        return value.strip()

    if isinstance(value, list):
        for item in value:
            result = danish_text(item)
            if result:
                return result

    if isinstance(value, dict):
        for language in ("dan", "DAN", "da", "eng", "ENG", "en"):
            if language in value:
                result = danish_text(value[language])
                if result:
                    return result

    return ""


def first_value(notice, keys):
    for key in keys:
        result = danish_text(notice.get(key))
        if result:
            return result

    return ""


def valid_date(value):
    if not isinstance(value, str):
        return False

    try:
        datetime.strptime(value, "%Y-%m-%d")
        return True
    except ValueError:
        return False


def get_deadline(notice):
    deadlines = notice.get(
        "deadline-receipt-tender-date-lot", []
    )

    if isinstance(deadlines, str):
        deadlines = [deadlines]

    if not isinstance(deadlines, list):
        return ""

    future_dates = []

    for value in deadlines:
        if not isinstance(value, str):
            continue

        day = value[:10]

        if valid_date(day) and day >= today:
            future_dates.append(day)

    return min(future_dates) if future_dates else ""


def get_source_url(notice):
    links = notice.get("links", {})

    if not isinstance(links, dict):
        return ""

    html = links.get("html", {})

    if isinstance(html, str):
        url = html.strip()

    elif isinstance(html, dict):
        url = (
            html.get("DAN")
            or html.get("ENG")
            or html.get("dan")
            or html.get("eng")
            or ""
        )

        if isinstance(url, list):
            url = url[0] if url else ""

    else:
        return ""

    if not isinstance(url, str):
        return ""

    url = url.strip()

    parsed = urlparse(url)

    if parsed.scheme not in ("http", "https"):
        return ""

    if not parsed.netloc:
        return ""

    return url


def get_location(notice):
    """
    Læs kun felter, der beskriver arbejdsstedet.

    Bemærk:
    TED kan have andre feltnavne end dem nedenfor.
    Manglende oplysninger må ikke erstattes
    med ordregiverens adresse.
    """

    city = first_value(notice, [
        "place-performance-city-lot",
        "place-performance-city",
    ])

    postcode = first_value(notice, [
        "place-performance-postcode-lot",
        "place-performance-postcode",
    ])

    region = first_value(notice, [
        "place-performance-subdivision-lot",
        "place-performance-subdivision",
    ])

    # Postnummer vises kun som ekstra information.
    # Vi udleder ikke automatisk en by fra det.
    if city and postcode:
        if postcode not in city:
            city = f"{city} ({postcode})"

    if not city:
        city = "Opgavested ikke oplyst"

    if not region:
        region = "Ukendt region"

    return city, region


def get_category(notice):
    """
    En forsigtig kategorisering.
    CPV-koder kan forbedre dette senere.
    """

    cpv = first_value(notice, [
        "classification-cpv",
        "classification-cpv-lot",
    ])

    code = re.sub(r"\D", "", cpv)[:2]

    categories = {
        "45": "Byggeri og håndværk",
        "50": "Reparation og vedligehold",
        "72": "IT",
        "79": "Erhvervsservice",
        "90": "Rengøring og miljø",
    }

    return categories.get(
        code,
        "Offentligt udbud"
    )


opportunities = []

for notice in notices:
    if not isinstance(notice, dict):
        continue

    # Kun almindelige udbudsbekendtgørelser.
    if notice.get("notice-type") != "cn-standard":
        continue

    number = danish_text(
        notice.get("publication-number")
    )

    title = danish_text(
        notice.get("notice-title")
    )

    issuer = danish_text(
        notice.get("buyer-name")
    )

    published = str(
        notice.get("publication-date", "")
    )[:10]

    deadline = get_deadline(notice)
    source_url = get_source_url(notice)

    if not all([
        number,
        title,
        issuer,
        published,
        deadline,
        source_url
    ]):
        continue

    if not valid_date(published):
        continue

    if deadline < published:
        continue

    city, region = get_location(notice)

    description = first_value(notice, [
        "description-lot",
        "description-proc",
    ])

    if not description:
        description = title

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


# Fjern dubletter.
seen = set()
unique_opportunities = []

for item in opportunities:
    if item["id"] in seen:
        continue

    seen.add(item["id"])
    unique_opportunities.append(item)


destination.parent.mkdir(
    parents=True,
    exist_ok=True
)

destination.write_text(
    json.dumps(
        unique_opportunities,
        ensure_ascii=False,
        indent=2
    ),
    encoding="utf-8"
)

known_cities = sum(
    1
    for item in unique_opportunities
    if item["city"] != "Opgavested ikke oplyst"
)

print(
    f"TED-bekendtgørelser undersøgt: {len(notices)}"
)

print(
    f"Udbud klar til KundeRadar: {len(unique_opportunities)}"
)

print(
    f"Udbud med oplyst by: {known_cities}"
)

print(
    f"Udbud uden oplyst by: "
    f"{len(unique_opportunities) - known_cities}"
)

print(f"Data gemt i {destination}")
