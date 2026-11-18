import json
import re
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

SOURCE = Path('data/ted-raw.json')
DESTINATION = Path('data/opportunities.json')
TODAY = datetime.now(ZoneInfo('Europe/Copenhagen')).date().isoformat()

AREAS = {
    'DK011': 'Byen København', 'DK012': 'Københavns omegn',
    'DK013': 'Nordsjælland', 'DK014': 'Bornholm',
    'DK021': 'Østsjælland', 'DK022': 'Vest- og Sydsjælland',
    'DK031': 'Fyn', 'DK032': 'Sydjylland',
    'DK041': 'Vestjylland', 'DK042': 'Østjylland',
    'DK050': 'Nordjylland',
}

# Præcise CPV-præfikser kontrolleres før de brede.
CPV_RULES = [
    ('909113', 'Vinduespolering'),
    ('909112', 'Rengøring'), ('909111', 'Rengøring'),
    ('9091', 'Rengøring'),
    ('9062', 'Snerydning og vinterservice'),
    ('9063', 'Snerydning og vinterservice'),
    ('7731', 'Anlægsgartner og grøn pleje'),
    ('7734', 'Anlægsgartner og grøn pleje'),
    ('773', 'Anlægsgartner og grøn pleje'),
    ('454421', 'Malerarbejde'), ('45442', 'Malerarbejde'),
    ('45422', 'Tømrer og snedker'),
    ('4531', 'Elinstallation'),
    ('4533', 'VVS og ventilation'),
    ('45331', 'VVS og ventilation'),
    ('452625', 'Murer og beton'),
    ('452623', 'Murer og beton'),
    ('45233', 'Anlæg og vejarbejde'),
    ('45232', 'Anlæg og vejarbejde'),
    ('452', 'Byggeri og renovering'),
    ('454', 'Byggeri og renovering'),
    ('450', 'Byggeri og renovering'),
    ('7971', 'Overvågning og sikring'),
    ('72212', 'Software og webudvikling'),
    ('7221', 'Software og webudvikling'),
    ('7222', 'Software og webudvikling'),
    ('7241', 'Software og webudvikling'),
    ('7225', 'IT-support og drift'),
    ('7226', 'IT-support og drift'),
    ('726', 'IT-support og drift'),
    ('725', 'IT-support og drift'),
    ('72315', 'IT-sikkerhed'),
    ('4873', 'IT-sikkerhed'),
    ('4876', 'IT-sikkerhed'),
    ('905', 'Affald og genbrug'),
    ('034', 'Varer og materialer'),
    ('555', 'Mad og catering'),
    ('553', 'Mad og catering'),
    ('798', 'Tryk og grafisk design'),
    ('7934', 'Marketing og kommunikation'),
    ('79416', 'Marketing og kommunikation'),
    ('794', 'Rådgivning og administration'),
    ('792', 'Rådgivning og administration'),
    ('791', 'Rådgivning og administration'),
    ('850', 'Sundhed og medicin'),
    ('851', 'Sundhed og medicin'),
    ('33', 'Sundhed og medicin'),
    ('60', 'Transport og logistik'),
    ('63', 'Transport og logistik'),
    ('50', 'Reparation og vedligehold'),
    ('7033', 'Ejendomsservice'),
    ('79993', 'Ejendomsservice'),
    ('44', 'Varer og materialer'),
    ('39', 'Varer og materialer'),
    ('30', 'Varer og materialer'),
]

KEYWORDS = [
    ('vinduespolering', 'Vinduespolering'),
    ('vinduespudsning', 'Vinduespolering'),
    ('rengøring', 'Rengøring'),
    ('snerydning', 'Snerydning og vinterservice'),
    ('glatførebekæmpelse', 'Snerydning og vinterservice'),
    ('græsslåning', 'Anlægsgartner og grøn pleje'),
    ('hækklipning', 'Anlægsgartner og grøn pleje'),
    ('malerarbejde', 'Malerarbejde'),
    ('tømrerarbejde', 'Tømrer og snedker'),
    ('elinstallation', 'Elinstallation'),
    ('ventilationsanlæg', 'VVS og ventilation'),
    ('vvs-arbejde', 'VVS og ventilation'),
    ('affaldsindsamling', 'Affald og genbrug'),
    ('it-support', 'IT-support og drift'),
    ('cybersikkerhed', 'IT-sikkerhed'),
    ('catering', 'Mad og catering'),
]


def as_list(value):
    if value is None:
        return []
    return value if isinstance(value, list) else [value]


def first_text(value):
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, list):
        for entry in value:
            result = first_text(entry)
            if result:
                return result
    if isinstance(value, dict):
        for language in ('dan', 'DAN', 'eng', 'ENG'):
            result = first_text(value.get(language))
            if result:
                return result
    return ''


def all_texts(value):
    return [first_text(v) for v in as_list(value) if first_text(v)]


def unique(values):
    result, seen = [], set()
    for value in values:
        value = str(value).strip()
        key = value.casefold()
        if value and key not in seen:
            result.append(value)
            seen.add(key)
    return result


def valid_day(value):
    if not isinstance(value, str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}', value):
        return False
    try:
        return datetime.strptime(value, '%Y-%m-%d').strftime('%Y-%m-%d') == value
    except ValueError:
        return False


def deadline_for(notice):
    values = all_texts(notice.get('deadline-receipt-tender-date-lot'))
    dates = [v[:10] for v in values if valid_day(v[:10]) and v[:10] >= TODAY]
    # Seneste frist bruges ved flere delkontrakter, så et udbud
    # ikke forsvinder, mens en delkontrakt stadig er åben.
    return max(dates) if dates else ''


def source_url_for(notice):
    links = notice.get('links') or {}
    if not isinstance(links, dict):
        return ''
    html = links.get('html') or {}
    if not isinstance(html, dict):
        return ''
    url = first_text(html.get('DAN')) or first_text(html.get('ENG'))
    parsed = urlparse(url)
    return url if parsed.scheme in ('http', 'https') and parsed.netloc else ''


def location_for(notice):
    cities = all_texts(notice.get('place-of-performance-city-lot'))
    postcodes = all_texts(notice.get('place-of-performance-post-code-lot'))
    codes = all_texts(notice.get('place-of-performance-subdiv-lot'))
    if not cities:
        cities = all_texts(notice.get('place-of-performance-city-proc'))
        postcodes = all_texts(notice.get('place-of-performance-post-code-proc'))
    if not codes:
        codes = all_texts(notice.get('place-of-performance-subdiv-proc'))

    places = []
    for i, city in enumerate(cities):
        postcode = postcodes[i] if i < len(postcodes) else ''
        if re.fullmatch(r'\d{4}', postcode) and postcode not in city:
            places.append(f'{city} ({postcode})')
        else:
            places.append(city)
    places = unique(places)
    areas = unique(AREAS.get(code, code) for code in codes)
    return (
        ', '.join(places) if places else 'Opgavested ikke oplyst',
        ', '.join(areas) if areas else 'Ukendt område'
    )


def category_for(notice, title):
    cpvs = all_texts(notice.get('classification-cpv'))
    cpvs += all_texts(notice.get('classification-cpv-lot'))
    codes = [re.sub(r'\D', '', cpv) for cpv in cpvs]
    for prefix, category in CPV_RULES:
        if any(code.startswith(prefix) for code in codes):
            return category
    if codes:
        return 'Øvrige offentlige udbud'
    lower = title.casefold()
    for word, category in KEYWORDS:
        if word in lower:
            return category
    return 'Øvrige offentlige udbud'


notices = json.loads(SOURCE.read_text(encoding='utf-8'))
if not isinstance(notices, list):
    raise ValueError('TED-data skal være en liste')

opportunities = []
seen = set()
for notice in notices:
    if not isinstance(notice, dict) or notice.get('notice-type') != 'cn-standard':
        continue
    number = first_text(notice.get('publication-number'))
    title = first_text(notice.get('notice-title'))
    issuer = first_text(notice.get('buyer-name'))
    published = first_text(notice.get('publication-date'))[:10]
    deadline = deadline_for(notice)
    url = source_url_for(notice)
    if not (number and title and issuer and valid_day(published) and deadline and url):
        continue
    if published > deadline or number in seen:
        continue
    seen.add(number)
    city, region = location_for(notice)
    description = (
        first_text(notice.get('description-lot'))
        or first_text(notice.get('description-proc'))
        or title
    )
    if len(description) > 650:
        description = description[:647].rstrip() + '...'
    opportunities.append({
        'id': f'ted-{number}',
        'title': title,
        'description': description,
        'category': category_for(notice, title),
        'region': region,
        'city': city,
        'issuer': issuer,
        'publishedAt': published,
        'deadline': deadline,
        'sourceName': 'TED',
        'sourceUrl': url,
        'isDemo': False,
    })

if not opportunities:
    raise RuntimeError('Ingen aktuelle udbud: eksisterende datafil bevares')

DESTINATION.parent.mkdir(parents=True, exist_ok=True)
DESTINATION.write_text(json.dumps(opportunities, ensure_ascii=False, indent=2), encoding='utf-8')
with_city = sum(item['city'] != 'Opgavested ikke oplyst' for item in opportunities)
print(f'Bekendtgørelser undersøgt: {len(notices)}')
print(f'Aktuelle udbud: {len(opportunities)}')
print(f'Med by: {with_city}; uden by: {len(opportunities) - with_city}')
print(f'Brancher i brug: {len(set(item["category"] for item in opportunities))}')
print(f'Testdata gemt: {DESTINATION}')
