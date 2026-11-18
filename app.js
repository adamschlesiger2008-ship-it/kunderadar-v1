
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

const saved = new Set(read(STORAGE_SAVED, []));
const prefs = read(STORAGE_PREF, {});

let opportunities = [];
let datasets = { verified: [], demo: [] };
let mode = 'verified';

const date = iso => new Intl.DateTimeFormat('da-DK', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC'
}).format(new Date(`${iso}T12:00:00Z`));

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
  localStorage.setItem(
    STORAGE_SAVED,
    JSON.stringify([...saved])
  );

  $('savedCount').textContent = saved.size;
  $('statSaved').textContent = saved.size;
  render();
}

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

  const savedItems = opportunities.filter(o =>
    saved.has(o.id)
  );

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

  if (!savedItems.length) {
    $('savedCards').append(
      text(
        'p',
        'Du har ikke gemt nogen muligheder endnu. Klik på “☆ Gem” på et kort.'
      )
    );
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

  $('categoryFilter').value = prefs.category || '';
  $('regionFilter').value = prefs.region || '';

  $('prefCategory').value = prefs.category || '';
  $('prefRegion').value = prefs.region || '';

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

    localStorage.setItem(
      STORAGE_PREF,
      JSON.stringify(value)
    );

    $('categoryFilter').value = value.category;
    $('regionFilter').value = value.region;

    $('prefMessage').textContent =
      'Præferencer gemt på denne enhed.';

    render();
  });

  $('year').textContent = new Date().getFullYear();

  $('savedCount').textContent = saved.size;
  $('statSaved').textContent = saved.size;

  render();
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

    options(el, unique(field));

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
