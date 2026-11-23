
import { loadOpportunities } from './data.js';

const $ = id => document.getElementById(id);

const STORAGE_SAVED = 'kunderadar.saved.v1';
const STORAGE_PREF = 'kunderadar.preferences.v1';

const read = (key, fallback) => {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
};

const storedSaved = read(STORAGE_SAVED, []);
const saved = new Set(Array.isArray(storedSaved) ? storedSaved : []);
const storedPrefs = read(STORAGE_PREF, {});
const prefs = storedPrefs && typeof storedPrefs === 'object' && !Array.isArray(storedPrefs) ? storedPrefs : {};

let opportunities = [];
let datasets = { verified: [], demo: [] };
let mode = 'verified';
let syncClient = null;
let syncUserId = null;
let syncVersion = 0;
let syncQueue = Promise.resolve();
let appReady = false;
let pendingAuthEvent = null;

const date = iso => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) return 'Ikke oplyst';
  const parsed = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return 'Ikke oplyst';
  return new Intl.DateTimeFormat('da-DK', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'
  }).format(parsed);
};

const todayInDenmark = () => new Intl.DateTimeFormat('sv-SE', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'Europe/Copenhagen'
}).format(new Date());

function deadlineLabel(item) {
  if (!item.isDemo && item.deadline === todayInDenmark()) {
    return 'Udløber i dag – kontrollér fristen hos TED';
  }

  return date(item.deadline);
}

const text = (tag, content, cls) => {
  const el = document.createElement(tag);
  el.textContent = content;
  if (cls) el.className = cls;
  return el;
};

const unique = field =>
  [...new Set(opportunities.map(o => o[field]))]
    .filter(value => typeof value === 'string' && value.trim())
    .sort((a, b) => a.localeCompare(b, 'da'));

function options(select, values) {
  values.forEach(value => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.append(option);
  });
}

function syncSaved() {
  queueCloudSave();
  try {
    localStorage.setItem(STORAGE_SAVED, JSON.stringify([...saved]));
  } catch (error) {
    console.warn('Kunne ikke gemme favoritter på denne enhed.', error);
  }

  $('savedCount').textContent = saved.size;
  $('statSaved').textContent = saved.size;
  render();
}


function cloudStatus(value) {
  const el = $('cloudSyncStatus');
  if (el) el.textContent = value;
}
function applyCloudPreferences() {
  for (const [id, value] of [
    ['categoryFilter', prefs.category], ['regionFilter', prefs.region],
    ['prefCategory', prefs.category], ['prefRegion', prefs.region]
  ]) {
    if ([...$(id).options].some(option => option.value === value)) $(id).value = value || '';
  }
  render();
}
function queueCloudSave() {
  if (!syncClient || !syncUserId) return;
  const userId = syncUserId;
  const client = syncClient;
  const version = syncVersion;
  const snapshot = {
    user_id: userId,
    saved_ids: [...saved].filter(id => typeof id === 'string').slice(0, 1000),
    preferences: { category: prefs.category || '', region: prefs.region || '' },
    updated_at: new Date().toISOString()
  };
  cloudStatus('Synkroniserer…');
  syncQueue = syncQueue.catch(() => {}).then(async () => {
    if (version !== syncVersion || userId !== syncUserId) return;
    const { error } = await client.from('kr_user_settings').upsert(snapshot, { onConflict: 'user_id' });
    if (version !== syncVersion) return;
    if (error) {
      cloudStatus('Kunne ikke synkronisere. Dine ændringer er stadig gemt på denne enhed.');
      console.warn('Synkronisering fejlede:', error.message);
    } else cloudStatus('Gemte udbud og præferencer er synkroniseret med din konto.');
  });
}
async function connectCloud(event) {
  if (!appReady) { pendingAuthEvent = event; return; }
  const { client, user } = event.detail || {};
  const version = ++syncVersion;
  syncClient = user ? client : null;
  syncUserId = user?.id || null;
  if (!syncUserId) {
    cloudStatus('Log ind for at synkronisere mellem enheder.');
    return;
  }
  cloudStatus('Henter dine gemte udbud og præferencer…');
  const { data, error } = await client.from('kr_user_settings')
    .select('saved_ids,preferences').eq('user_id', syncUserId).maybeSingle();
  if (version !== syncVersion) return;
  if (error) {
    cloudStatus('Kunne ikke hente dine kontoindstillinger. Lokale favoritter er bevaret.');
    return;
  }
  if (data) {
    const remoteIds = Array.isArray(data.saved_ids) ? data.saved_ids : [];
    for (const id of remoteIds) if (typeof id === 'string') saved.add(id);
    const remotePrefs = data.preferences && typeof data.preferences === 'object' ? data.preferences : {};
    if (typeof remotePrefs.category === 'string' && remotePrefs.category) prefs.category = remotePrefs.category;
    if (typeof remotePrefs.region === 'string' && remotePrefs.region) prefs.region = remotePrefs.region;
    try {
      localStorage.setItem(STORAGE_SAVED, JSON.stringify([...saved]));
      localStorage.setItem(STORAGE_PREF, JSON.stringify(prefs));
    } catch (error) { console.warn('Kunne ikke opdatere lokal lagring.', error); }
  }
  $('savedCount').textContent = saved.size;
  $('statSaved').textContent = saved.size;
  applyCloudPreferences();
  queueCloudSave();
}
window.addEventListener('kunderadar:auth', connectCloud);

function makeCard(item) {
  const card = document.createElement('article');
  card.className = 'opportunity';

  const head = text('div', '', 'card-head');

  head.append(
    text('span', item.category, 'tag'),
    text(
      'span',
      item.isDemo ? 'FIKTIVT EKSEMPEL' : 'OFFENTLIG KILDE',
      'kind'
    )
  );

  card.append(
    head,
    text('h3', item.title),
    text('p', item.description)
  );

  const meta = text('div', '', 'meta');

  meta.append(
    text('span', `⌖ ${item.city}, ${item.region}`),
    text('span', `▤ ${item.issuer}`)
  );

  card.append(meta);

  const bottom = text('div', '', 'card-bottom');
  const left = text('div', '', 'deadline');

  if (!item.isDemo) {
    left.append(
      text('span', `Kilde: ${item.sourceName}`),
      document.createElement('br')
    );
  }

  left.append(
    text('span', `Frist: ${deadlineLabel(item)}`),
    document.createElement('br'),
    text('span', `Oprettet: ${date(item.publishedAt)}`)
  );

  const actions = text('div', '', 'card-head');

  const button = text(
    'button',
    saved.has(item.id) ? '★ Gemt' : '☆ Gem',
    'save'
  );

  button.type = 'button';

  button.setAttribute(
    'aria-pressed',
    String(saved.has(item.id))
  );

  button.setAttribute(
    'aria-label',
    `${saved.has(item.id) ? 'Fjern' : 'Gem'} ${item.title}`
  );

  button.addEventListener('click', () => {
    if (saved.has(item.id)) {
      saved.delete(item.id);
    } else {
      saved.add(item.id);
    }

    syncSaved();
  });

  actions.append(button);

  if (item.sourceUrl && !item.isDemo) {
    const link = text(
      'a',
      'Original kilde ↗',
      'source-link'
    );

    link.href = item.sourceUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';

    actions.append(link);
  }

  bottom.append(left, actions);
  card.append(bottom);

  return card;
}

function render() {
  const q = $('searchInput')
    .value
    .trim()
    .toLocaleLowerCase('da');

  const category = $('categoryFilter').value;
  const region = $('regionFilter').value;
  const only = $('savedOnly').checked;

  const matches = opportunities.filter(o =>
    (!category || o.category === category) &&
    (!region || o.region === region) &&
    (!only || saved.has(o.id)) &&
    (
      !q ||
      [
        o.title,
        o.description,
        o.category,
        o.city,
        o.region,
        o.issuer
      ]
        .join(' ')
        .toLocaleLowerCase('da')
        .includes(q)
    )
  );

  const sort = $('sortFilter').value;

  matches.sort((a, b) => {
    if (sort === 'title') {
      return a.title.localeCompare(b.title, 'da');
    }

    if (sort === 'deadline') {
      return a.deadline.localeCompare(b.deadline);
    }

    return b.publishedAt.localeCompare(a.publishedAt);
  });

  $('matchCount').textContent = matches.length;

  $('resultLabel').textContent =
    `Viser ${matches.length} af ${opportunities.length} muligheder`;

  $('cards').replaceChildren(...matches.map(makeCard));

  $('empty').hidden = matches.length > 0;

  const allItems = [...datasets.verified, ...datasets.demo];
  const savedItems = allItems.filter(o => saved.has(o.id));
  const missingCount = [...saved].filter(id => !allItems.some(o => o.id === id)).length;

  $('savedCards').replaceChildren(
    ...savedItems.map(o => {
      const row = text('div', '', 'saved-item');

      row.append(
        text('span', `${o.title} · ${o.city}`)
      );

      const btn = text('button', 'Fjern ×');
      btn.type = 'button';

      btn.addEventListener('click', () => {
        saved.delete(o.id);
        syncSaved();
      });

      row.append(btn);
      return row;
    })
  );

  if (missingCount) {
    $('savedCards').append(text('p', `${missingCount} gemte mulighed(er) findes ikke længere i den aktuelle udbudsliste. De er stadig bevaret på din konto.`, 'auth-help'));
  }
  if (!savedItems.length && !missingCount) {
    $('savedCards').append(text('p', 'Du har ikke gemt nogen muligheder endnu. Klik på “☆ Gem” på et kort.'));
  }
}

async function init() {
  datasets = await loadOpportunities();

  mode = 'verified';
  opportunities = datasets.verified;

  $('datasetMode').value = mode;

  updateMode();

  $('datasetMode').addEventListener('change', () => {
    mode = $('datasetMode').value;
    opportunities = datasets[mode];

    updateMode();
    refreshFilters();
    render();
  });

  $('totalCount').textContent = opportunities.length;

  refreshFilters();

  for (const [id, value] of [
    ['categoryFilter', prefs.category], ['regionFilter', prefs.region],
    ['prefCategory', prefs.category], ['prefRegion', prefs.region]
  ]) {
    if ([...$(id).options].some(option => option.value === value)) $(id).value = value;
  }

  for (const id of [
    'searchInput',
    'categoryFilter',
    'regionFilter',
    'sortFilter',
    'savedOnly'
  ]) {
    $(id).addEventListener('input', render);
  }

  $('resetBtn').addEventListener('click', () => {
    $('searchInput').value = '';
    $('categoryFilter').value = '';
    $('regionFilter').value = '';
    $('sortFilter').value = 'date';
    $('savedOnly').checked = false;

    render();
  });

  $('savePrefs').addEventListener('click', () => {
    const value = {
      category: $('prefCategory').value,
      region: $('prefRegion').value
    };

    prefs.category = value.category;
    prefs.region = value.region;
    queueCloudSave();
    try {
      localStorage.setItem(STORAGE_PREF, JSON.stringify(value));
    } catch (error) {
      $('prefMessage').textContent = 'Kunne ikke gemme præferencer på denne enhed.';
      return;
    }

    $('categoryFilter').value = value.category;
    $('regionFilter').value = value.region;

    $('prefMessage').textContent = syncUserId
      ? 'Præferencer gemt. Synkroniserer med din konto…'
      : 'Præferencer gemt på denne enhed.';

    render();
  });

  // Blide scroll-animationer. Indholdet er altid synligt uden JS.
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const targets = document.querySelectorAll('.landing-v3 .stat, .landing-v3 .panel, .landing-v3 .kr-section-kicker');
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('kr-in-view');
          observer.unobserve(entry.target);
        }
      }
    }, { threshold: 0.08, rootMargin: '0px 0px -25px 0px' });
    targets.forEach(el => observer.observe(el));
  }

  $('year').textContent = new Date().getFullYear();

  $('savedCount').textContent = saved.size;
  $('statSaved').textContent = saved.size;

  render();
  appReady = true;
  if (pendingAuthEvent) {
    const event = pendingAuthEvent;
    pendingAuthEvent = null;
    void connectCloud(event);
  }
}

function refreshFilters() {
  const filters = [
    ['categoryFilter', 'category', 'Alle brancher'],
    ['prefCategory', 'category', 'Alle brancher'],
    ['regionFilter', 'region', 'Hele Danmark'],
    ['prefRegion', 'region', 'Hele Danmark']
  ];

  for (const [id, field, placeholder] of filters) {
    const el = $(id);
    const previous = el.value;

    el.replaceChildren(new Option(placeholder, ''));

    // Vis altid alle danske regioner, også når datasættet er tomt.
    const regionChoices = ['Hovedstaden', 'Midtjylland', 'Nordjylland', 'Sjælland', 'Syddanmark'];
    options(el, field === 'region'
      ? [...new Set([...regionChoices, ...unique(field)])].sort((a, b) => a.localeCompare(b, 'da'))
      : unique(field));

    el.value = [...el.options].some(
      o => o.value === previous
    ) ? previous : '';
  }
}

function updateMode() {
  $('totalCount').textContent = opportunities.length;

  if (mode === 'verified') {
    $('datasetNotice').textContent = opportunities.length
      ? `${opportunities.length} muligheder fra offentlige kilder. Kontrollér altid originalkilden og fristen.`
      : 'Der er endnu ingen aktuelle muligheder fra offentlige kilder. Vælg demo-visning for at se eksempler.';
  } else {
    $('datasetNotice').textContent =
      'Du ser fiktive eksempelopgaver. De er ikke rigtige udbud.';
  }

  $('datasetBadge').textContent = mode === 'verified'
    ? 'OFFENTLIGE KILDER'
    : 'DEMO · FIKTIVE DATA';

  $('datasetStatLabel').textContent = mode === 'verified'
    ? 'Offentlige kilder'
    : 'Fiktive eksempler';
}

init().catch(error => {
  $('resultLabel').textContent =
    'Kunne ikke indlæse data.';

  console.error(error);
});
