
/*
 * KundeRadar – data.js
 *
 * Henter offentlige udbud fra data/opportunities.json.
 * Bevarer 12 tydeligt fiktive demo-opgaver.
 * Kontrollerer datoer, kilder og grundlæggende oplysninger.
 *
 * VIGTIGT:
 * city og region skal beskrive opgavens geografiske område,
 * når det er kendt – ikke automatisk ordregiverens adresse.
 */

export const DEMO_OPPORTUNITIES = [
  {
    id: 'demo-001',
    title: 'Daglig rengøring af kontorbygninger',
    description: 'Illustrativ opgave om løbende rengøring af kontorlokaler, møderum og fællesarealer.',
    category: 'Rengøring',
    region: 'Midtjylland',
    city: 'Aarhus',
    issuer: 'Fiktiv Ejendomsdrift A/S',
    publishedAt: '2026-11-12',
    deadline: '2026-12-18'
  },
  {
    id: 'demo-002',
    title: 'Vinduespolering af erhvervsejendomme',
    description: 'Illustrativ rammeaftale om indvendig og udvendig vinduespolering.',
    category: 'Ejendomsservice',
    region: 'Midtjylland',
    city: 'Herning',
    issuer: 'Eksempel Ejendomme',
    publishedAt: '2026-11-10',
    deadline: '2026-12-10'
  },
  {
    id: 'demo-003',
    title: 'Rengøring af undervisningslokaler',
    description: 'Illustrativ opgave om periodisk rengøring og hovedrengøring af lokaler.',
    category: 'Rengøring',
    region: 'Nordjylland',
    city: 'Aalborg',
    issuer: 'Eksempel Institution',
    publishedAt: '2026-11-09',
    deadline: '2026-12-09'
  },
  {
    id: 'demo-004',
    title: 'Udendørs vedligehold og grønne arealer',
    description: 'Illustrativ opgave om græsslåning, hækklipning og vedligehold.',
    category: 'Ejendomsservice',
    region: 'Syddanmark',
    city: 'Odense',
    issuer: 'Fiktiv Boligforening',
    publishedAt: '2026-11-07',
    deadline: '2026-12-20'
  },
  {
    id: 'demo-005',
    title: 'Hovedrengøring af fællesfaciliteter',
    description: 'Illustrativ opgave om grundig rengøring af trappeopgange og fællesrum.',
    category: 'Rengøring',
    region: 'Hovedstaden',
    city: 'København',
    issuer: 'Eksempel Administration',
    publishedAt: '2026-11-05',
    deadline: '2026-11-30'
  },
  {
    id: 'demo-006',
    title: 'Vinterservice og glatførebekæmpelse',
    description: 'Illustrativ sæsonopgave med snerydning og saltning.',
    category: 'Ejendomsservice',
    region: 'Sjælland',
    city: 'Roskilde',
    issuer: 'Fiktiv Driftspartner',
    publishedAt: '2026-11-04',
    deadline: '2026-12-03'
  },
  {
    id: 'demo-007',
    title: 'IT-support til mindre kontorer',
    description: 'Illustrativ aftale om helpdesk og drift af arbejdsstationer.',
    category: 'IT',
    region: 'Midtjylland',
    city: 'Viborg',
    issuer: 'Eksempel Kontorhus',
    publishedAt: '2026-11-02',
    deadline: '2026-12-15'
  },
  {
    id: 'demo-008',
    title: 'Malerarbejde i boligafdeling',
    description: 'Illustrativ opgave om indvendig maling ved fraflytning.',
    category: 'Håndværk',
    region: 'Syddanmark',
    city: 'Esbjerg',
    issuer: 'Fiktiv Boligdrift',
    publishedAt: '2026-10-30',
    deadline: '2026-12-12'
  },
  {
    id: 'demo-009',
    title: 'Gulvpleje i erhvervslokaler',
    description: 'Illustrativ opgave om periodisk gulvbehandling og polering.',
    category: 'Rengøring',
    region: 'Midtjylland',
    city: 'Holstebro',
    issuer: 'Eksempel Erhvervspark',
    publishedAt: '2026-10-28',
    deadline: '2026-12-21'
  },
  {
    id: 'demo-010',
    title: 'Teknisk tilsyn af ejendomme',
    description: 'Illustrativ serviceaftale om tilsyn og mindre vedligeholdelsesopgaver.',
    category: 'Ejendomsservice',
    region: 'Hovedstaden',
    city: 'Hillerød',
    issuer: 'Fiktiv Ejendomsfond',
    publishedAt: '2026-10-25',
    deadline: '2026-12-07'
  },
  {
    id: 'demo-011',
    title: 'Facaderengøring og algebehandling',
    description: 'Illustrativ opgave om rensning af facader og udendørs overflader.',
    category: 'Rengøring',
    region: 'Nordjylland',
    city: 'Hjørring',
    issuer: 'Eksempel Erhvervscenter',
    publishedAt: '2026-10-22',
    deadline: '2026-12-05'
  },
  {
    id: 'demo-012',
    title: 'Vedligehold af udearealer ved kontorer',
    description: 'Illustrativ opgave om løbende udendørs service og affaldshåndtering.',
    category: 'Ejendomsservice',
    region: 'Sjælland',
    city: 'Næstved',
    issuer: 'Fiktiv Servicegruppe',
    publishedAt: '2026-10-20',
    deadline: '2026-12-28'
  }
].map(item => ({
  ...item,
  sourceName: 'Demo – ingen originalkilde',
  sourceUrl: null,
  isDemo: true
}));

// Dagens dato efter dansk tid.
export function todayInDenmark() {
  return new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Europe/Copenhagen'
  }).format(new Date());
}

// Kontrollerer at en dato både har korrekt format
// og faktisk eksisterer i kalenderen.
function validDate(value) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const parsed = new Date(value + 'T12:00:00Z');

  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  return parsed.toISOString().slice(0, 10) === value;
}

// Kontrollerer at et udbud har de oplysninger,
// som hjemmesiden skal bruge.
export function validateOpportunity(item) {
  if (
    !item ||
    typeof item !== 'object' ||
    Array.isArray(item) ||
    item.isDemo !== false
  ) {
    return false;
  }

  const requiredFields = [
    'id',
    'title',
    'description',
    'category',
    'issuer',
    'publishedAt',
    'deadline',
    'sourceName',
    'sourceUrl'
  ];

  if (!requiredFields.every(key =>
    typeof item[key] === 'string' &&
    item[key].trim().length > 0
  )) {
    return false;
  }

  if (
    !validDate(item.publishedAt) ||
    !validDate(item.deadline)
  ) {
    return false;
  }

  if (item.deadline < item.publishedAt) {
    return false;
  }

  try {
    const url = new URL(item.sourceUrl);

    if (
      url.protocol !== 'https:' &&
      url.protocol !== 'http:'
    ) {
      return false;
    }
  } catch {
    return false;
  }

  return true;
}

// Gør ukendte geografiske oplysninger tydelige.
// Vi gætter aldrig på, hvor opgaven skal udføres.
function normalizeLocation(item) {
  const city =
    typeof item.city === 'string'
      ? item.city.trim()
      : '';

  const region =
    typeof item.region === 'string'
      ? item.region.trim()
      : '';

  return {
    ...item,
    city: city || 'Opgavested ikke oplyst',
    region: region || 'Ukendt region'
  };
}

// Henter aktuelle udbud og bevarer demo-data.
export async function loadOpportunities() {
  let verified = [];

  try {
    const response = await fetch(
      './data/opportunities.json',
      {cache: 'no-store'}
    );

    if (!response.ok) {
      throw new Error(
        `Kunne ikke hente data (HTTP ${response.status})`
      );
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error(
        'Datafilen skal indeholde en liste af udbud'
      );
    }

    const today = todayInDenmark();

    verified = data
      .filter(item =>
        validateOpportunity(item) &&
        item.deadline >= today
      )
      .map(normalizeLocation);

  } catch (error) {
    console.warn(
      'Kunne ikke indlæse offentlige udbud:',
      error
    );
  }

  // Fjern dubletter med samme ID.
  const seen = new Set();

  verified = verified.filter(item => {
    if (seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });

  return {
    verified,
    demo: DEMO_OPPORTUNITIES
  };
}
