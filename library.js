// Headline library: loads every deck batch listed in decks/manifest.json and turns the
// research desks' card format (docs/internal/RESEARCH.md) into game cards.
// Exposes window.WP_LIBRARY: Promise<{ decks, cards }>. Never rejects: a missing or broken
// batch is skipped so the rest of the game still deals.
(() => {
  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const getJSON = url => fetch(url, { cache: 'no-cache' })
    .then(response => (response.ok ? response.json() : null))
    .catch(() => null);

  // ISO 3166-1 alpha-2 -> continent, for World Tour.
  const CONTINENT = {};
  const add = (code, list) => list.split(' ').forEach(c => { CONTINENT[c] = code; });
  add('na', 'US CA MX GT BZ HN SV NI CR PA CU JM HT DO BS BB TT PR GL BM AG DM GD KN LC VC');
  add('sa', 'BR AR PY UY CL BO PE EC CO VE GY SR FK');
  add('eu', 'GB IE FR DE NL BE LU CH AT IT ES PT DK NO SE FI IS PL CZ SK HU SI HR BA RS ME MK AL GR BG RO MD UA BY LT LV EE RU MT CY AD MC SM VA LI XK GE AM AZ');
  add('as', 'CN TW HK MO JP KR KP MN IN PK BD LK NP BT MV AF IR IQ SY LB JO IL PS SA YE OM AE QA BH KW TR KZ UZ TM KG TJ TH VN LA KH MM MY SG ID PH BN TL');
  add('af', 'EG LY TN DZ MA SD SS ET ER DJ SO KE UG TZ RW BI CD CG GA CM CF TD NE NG BJ TG GH CI LR SL GN GW SN GM ML BF MR CV ST GQ AO ZM ZW MW MZ NA BW ZA LS SZ MG MU SC KM');
  add('oc', 'AU NZ PG FJ SB VU WS TO KI TV NR PW FM MH');

  function dateParts(raw) {
    const [y, m, d] = String(raw).split('-');
    const year = Number(y);
    const month = m ? Number(m) : 0;
    const day = d ? Number(d) : 0;
    const text = month ? `${day ? day + ' ' : ''}${MONTHS[month - 1]} ${year}` : String(year);
    return { year, month, text, ym: `${y}-${m || '06'}` };
  }

  function toCard(raw, deck) {
    if (!raw || !deck || !raw.id || !raw.headline || !raw.reveal) return null;
    if (raw.verdict !== 'real' && raw.verdict !== 'made-up') return null;
    const sources = (Array.isArray(raw.sources) ? raw.sources : [])
      .filter(s => s && /^https:\/\//.test(s.url || ''))
      .slice(0, 4);
    if (raw.verdict === 'real' && !sources.length) return null; // the house rule: no source, no card
    const when = dateParts(raw.date || '');
    if (!when.year) return null;
    return {
      id: raw.id,
      deck: deck.id,
      deckName: deck.name,
      style: deck.style,
      verdict: raw.verdict,
      text: raw.headline,
      note: raw.reveal,
      date: when.ym, // YYYY-MM, what the rest of the game expects
      year: when.year,
      dateText: when.text,
      decade: Math.floor(when.year / 10) * 10,
      country: raw.country || '',
      continent: CONTINENT[raw.country] || '',
      region: raw.region || '',
      place: raw.verdict === 'real' ? raw.place || '' : '',
      topics: Array.isArray(raw.topics) ? raw.topics : [],
      spicy: raw.spicy === true,
      hoax: raw.hoax === true && raw.verdict === 'real',
      original: raw.verdict === 'real' && when.year < 1929 ? raw.headline_original || '' : '',
      difficulty: raw.difficulty || 'medium',
      sources,
      slug: raw.id,
      week: typeof raw.week === 'string' && /^\d{4}-W\d{2}$/.test(raw.week) ? raw.week : '',
      library: true,
    };
  }

  window.WP_LIBRARY = (async () => {
    const registry = await getJSON('decks/decks.json');
    const manifest = await getJSON('decks/manifest.json');
    if (!registry || !manifest) return { decks: [], cards: [] };
    const decks = new Map(registry.decks.map(d => [d.id, d]));
    const lists = await Promise.all((manifest.lists || []).map(getJSON));
    const files = [...new Set(lists.flatMap(list => (list && Array.isArray(list.files) ? list.files : [])))];
    const batches = await Promise.all(files.map(getJSON));
    const seen = new Set();
    const cards = [];
    for (const batch of batches) {
      if (!Array.isArray(batch)) continue;
      for (const raw of batch) {
        const card = toCard(raw, decks.get(raw && raw.deck));
        if (!card || seen.has(card.id)) continue;
        seen.add(card.id);
        cards.push(card);
      }
    }
    // This Week shows only the newest week. Older weeks retire into the general pile
    // (still in Shuffle Everything and World Tour, just not in the This Week deck).
    const weeks = cards.filter(c => c.deck === 'this-week' && c.week).map(c => c.week).sort();
    const latest = weeks[weeks.length - 1] || '';
    for (const card of cards) {
      if (card.deck === 'this-week' && card.week !== latest) {
        card.deck = 'archive';
        card.deckName = 'From the archive';
      }
    }
    // Stable order (by id) so nothing depends on the order desks merged their batches in.
    cards.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    return { decks: registry.decks, cards };
  })().catch(() => ({ decks: [], cards: [] }));
})();
