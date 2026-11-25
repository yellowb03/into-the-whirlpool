(() => {
  const wp = window.WP;
  const { verdictText } = WP_SHARE;
  const root = document.querySelector('#wp-game');
  const screen = document.querySelector('#game-screen');
  const cover = document.querySelector('#cover');
  const leave = document.querySelector('#game-leave');
  const hudCount = document.querySelector('#hud-count');
  const hudPips = document.querySelector('#hud-pips');
  const hudScore = document.querySelector('#hud-score');
  const hudScoreLabel = document.querySelector('#hud-score-label');
  const hudMult = document.querySelector('#hud-mult');
  const fxCanvas = document.querySelector('#game-fx');
  const hofModal = document.querySelector('#hof-modal');
  const cvCareerPill = document.querySelector('#cv-career-pill');
  const cvChallengeBanner = document.querySelector('#cv-challenge-banner');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const archive = new Map(wp.items.map(item => [item.slug, item]));
  const monthFormat = new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric', timeZone: 'UTC' });

  const STORAGE_KEY = 'wp-game-v2';
  const LEGACY_STORAGE_KEY = 'wp-game-v1';

  const SCORE_CFG = {
    BASE_PTS: 100,
    SPEED_FAST_SEC: 4.0,
    SPEED_FAST_PTS: 50,
    SPEED_QUICK_SEC: 7.0,
    SPEED_QUICK_PTS: 25,
    STREAK_MULTS: [1.0, 1.0, 1.5, 2.0, 3.0, 4.0, 5.0],
    JACKPOT_MULT: 2,
    ALLIN_MULT: 2,
    ALLIN_BUST_PENALTY: 150,
  };

  const TOPIC_LABELS = {
    absurd: 'ABSURD',
    viral: 'VIRAL',
    dread: 'DREAD',
    voices: 'VOICES',
    claims: 'CLAIM',
  };

  // Query parameters & challenge parsing
  const params = new URLSearchParams(location.search);
  const validSeed = /^(?:(?:d2-)?\d{8}|p[12]-[0-9a-f]{8}|r[34]-[0-9a-f]{8})$/;
  const rawDeck = params.get('deck') || '';
  const challengeSeed = validSeed.test(rawDeck) ? rawDeck : null;
  const rawPts = params.get('pts');
  const targetPoints = /^\d{1,5}$/.test(rawPts || '') ? Math.min(99999, Number(rawPts)) : null;
  const rawAcc = params.get('acc') ?? params.get('vs');
  const targetAcc = /^(?:[0-9]|10)$/.test(rawAcc || '') ? Number(rawAcc) : null;
  const rawBy = (params.get('by') || '').toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 12);
  const challengeBy = rawBy || null;

  const dateNumber = date => Number(date.slice(0, 4)) + (Number(date.slice(5, 7)) - 0.5) / 12;
  const formatPts = n => Math.max(0, Math.round(Number(n) || 0)).toLocaleString('en-US');
  const cleanHandle = raw => String(raw || '').toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 12) || 'PLAYER';

  function track(event, detail) {
    window.va?.('event', { name: event, data: detail });
  }

  if (document.querySelector('meta[name="wp-web-analytics"][content="enabled"]')) {
    window.va ||= function () { (window.vaq ||= []).push(arguments); };
    const analytics = document.createElement('script');
    analytics.defer = true;
    analytics.src = '/_vercel/insights/script.js';
    document.head.append(analytics);
  }

  // Load cards & UI manifest
  const ready = wp.sources.then(sources => {
    const sourced = cards => (cards || []).flatMap(card => {
      if (card.verdict === 'made-up') return [card];
      const refs = (sources[card.slug] || card.sources || []).filter(source => /^https:\/\//.test(source.url || ''));
      return archive.has(card.slug) && refs.length > 0 ? [{ ...card, sources: refs }] : [];
    });
    return { original: sourced(window.WP_CARDS), feed: sourced(window.WP_FEED_CARDS) };
  });

  const art = fetch('assets/manifest.json?v=4').then(response => response.ok ? response.json() : {})
    .then(manifest => {
      const assets = manifest.ui || {};
      for (const [name, key] of [['paper', 'card-front'], ['poster', 'card-back']]) {
        if (assets[key]) document.documentElement.style.setProperty('--game-' + name, 'url("assets/ui/' + assets[key] + '")');
      }
      return assets;
    }).catch(() => ({}));

  // Persistence & v1 -> v2 migration
  function defaultStats() {
    return {
      handle: 'PLAYER',
      career: {
        runs: 0,
        cardsPlayed: 0,
        cardsCorrect: 0,
        bestPoints: 0,
        bestAccuracy: 0,
        longestStreak: 0,
        allInWins: 0,
        allInBusts: 0,
        jackpotsHit: 0,
      },
      hallOfFame: [],
      cards: {},
      recentCards: [],
    };
  }

  // Every storage touch is guarded: the getter itself can throw (sandboxed iframes, blocked
  // site data), values can be corrupt or hand-edited, and writes can hit the quota.
  function storageGet(key) {
    try { return window.localStorage.getItem(key); } catch { return null; }
  }

  function storageSet(key, value) {
    try { window.localStorage.setItem(key, value); return true; } catch { return false; }
  }

  function parseJSON(raw) {
    if (typeof raw !== 'string' || !raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  const isObject = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  const count = (value, max = 1e9) => {
    const n = Math.floor(Number(value));
    return Number.isFinite(n) && n > 0 ? Math.min(max, n) : 0;
  };
  const cleanId = value => (typeof value === 'string' && /^[a-z0-9-]{1,80}$/.test(value) ? value : null);
  const cleanText = (value, max) => (typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, max) : '');

  function cleanCareer(raw) {
    const base = defaultStats().career;
    if (!isObject(raw)) return base;
    for (const key of Object.keys(base)) base[key] = count(raw[key]);
    base.bestPoints = Math.min(999999, base.bestPoints);
    base.bestAccuracy = Math.min(10, base.bestAccuracy);
    base.longestStreak = Math.min(10, base.longestStreak);
    base.cardsCorrect = Math.min(base.cardsCorrect, base.cardsPlayed);
    return base;
  }

  function cleanCardTallies(raw) {
    const out = {};
    if (!isObject(raw)) return out;
    for (const [id, tally] of Object.entries(raw).slice(0, 2000)) {
      if (!cleanId(id) || !isObject(tally)) continue;
      const shown = count(tally.shown);
      if (!shown) continue;
      out[id] = { shown, misses: Math.min(shown, count(tally.misses)) };
    }
    return out;
  }

  function cleanRecent(raw) {
    return Array.isArray(raw) ? [...new Set(raw.map(cleanId).filter(Boolean))].slice(0, 180) : [];
  }

  function cleanHofEntry(raw) {
    if (!isObject(raw)) return null;
    const seed = typeof raw.seed === 'string' && validSeed.test(raw.seed) ? raw.seed : null;
    if (!seed) return null;
    return {
      id: cleanText(raw.id, 40) || 'run-' + seed,
      handle: cleanHandle(raw.handle),
      points: count(raw.points, 999999),
      accuracy: Math.min(10, count(raw.accuracy)),
      maxStreak: Math.min(10, count(raw.maxStreak)),
      rank: cleanText(raw.rank, 48),
      date: /^\d{4}-\d{2}-\d{2}$/.test(raw.date || '') ? raw.date : '',
      seed,
      allInWins: Math.min(10, count(raw.allInWins)),
    };
  }

  function readStats() {
    const savedV2 = parseJSON(storageGet(STORAGE_KEY));
    if (isObject(savedV2)) {
      return {
        handle: cleanHandle(savedV2.handle),
        career: cleanCareer(savedV2.career),
        hallOfFame: (Array.isArray(savedV2.hallOfFame) ? savedV2.hallOfFame : [])
          .map(cleanHofEntry).filter(Boolean)
          .sort((a, b) => (b.points - a.points) || (b.accuracy - a.accuracy) || (b.maxStreak - a.maxStreak))
          .slice(0, 10),
        cards: cleanCardTallies(savedV2.cards),
        recentCards: cleanRecent(savedV2.recentCards),
      };
    }
    const legacy = parseJSON(storageGet(LEGACY_STORAGE_KEY));
    if (isObject(legacy)) {
      const base = defaultStats();
      base.career.runs = count(legacy.runs, 1e6);
      base.career.cardsPlayed = base.career.runs * 10;
      base.career.cardsCorrect = Math.min(base.career.cardsPlayed, count(legacy.correct));
      base.career.longestStreak = Math.min(10, count(legacy.best));
      base.cards = cleanCardTallies(legacy.cards);
      base.recentCards = cleanRecent(legacy.recentCards);
      return base;
    }
    return defaultStats();
  }

  function writeStats(nextStats) {
    stats = nextStats;
    if (!storageSet(STORAGE_KEY, JSON.stringify(stats))) {
      // Quota: drop the least useful data (per-card tallies) and try once more.
      storageSet(STORAGE_KEY, JSON.stringify({ ...stats, cards: {} }));
    }
    refreshCoverCareer();
  }

  // One-time flags (first-run coach) live under their own key so the stats schema stays stable.
  const FLAGS_KEY = 'wp-game-flags-v1';
  function readFlag(name) {
    const flags = parseJSON(storageGet(FLAGS_KEY));
    return isObject(flags) && flags[name] === true;
  }
  function writeFlag(name) {
    const flags = parseJSON(storageGet(FLAGS_KEY));
    storageSet(FLAGS_KEY, JSON.stringify({ ...(isObject(flags) ? flags : {}), [name]: true }));
  }

  let stats = readStats();

  function markCardSeen(cardId) {
    const id = cleanId(cardId);
    if (!id) return;
    const prev = readStats();
    const tally = prev.cards[id] ||= { shown: 0, misses: 0 };
    tally.shown += 1;
    prev.recentCards = [id, ...prev.recentCards.filter(item => item !== id)].slice(0, 180);
    writeStats(prev);
  }

  function markCardMiss(cardId) {
    const id = cleanId(cardId);
    if (!id) return;
    const prev = readStats();
    const tally = prev.cards[id] ||= { shown: 1, misses: 0 };
    tally.misses = Math.min(tally.shown, tally.misses + 1);
    writeStats(prev);
  }

  // Session ring buffers so back-to-back runs never repeat the same end-of-deck title or roast.
  const recentRankTitles = [];
  const recentRankSubs = [];
  function pickFreshLine(pool, recentBuf, rng = Math.random) {
    const fresh = pool.filter(line => !recentBuf.includes(line));
    const source = fresh.length ? fresh : pool;
    const chosen = source[Math.floor(rng() * source.length)];
    recentBuf.push(chosen);
    if (recentBuf.length > 10) recentBuf.shift();
    return chosen;
  }

  const RANK_POOLS = {
    zero: {
      tier: 'red',
      titles: [
        'STATISTICALLY IMPRESSIVE',
        'ACTUALLY CRAZY',
        'REVERSE ORACLE',
        '0-BIT QUANTIZED',
        'ATE THE ENTIRE ROCK',
        'NEGATIVE CONTEXT WINDOW',
      ],
      subs: [
        '0 out of 10. A literal coin flip beats you 99.9% of the time. Unplug your router.',
        '0/10. You dodged the truth like Neo in The Matrix.',
        'Every single guess was wrong. Honestly, scientists should study your instincts.',
        '0/10. You didn’t just drink the bleach recipe—you went back for a refill.',
        'Zero for ten. Even a damp sponge tapping the screen randomly hits three.',
        '0/10. Your BS detector is wired completely backward.',
        'Not a single one. If an email says a prince needs $500, step away from the laptop.',
        '0/10. Got cooked so thoroughly the kitchen smoke alarm went off.',
      ],
    },
    foil: {
      tier: 'foil',
      titles: [
        'FEEL THE AGI',
        'COUNTRY OF GENIUSES',
        'THE ALGORITHM FEARS YOU',
        'BENCHMAXXED FRONTAL LOBE',
        'ZERO HALLUCINATIONS',
        'ALIGNMENT FINAL BOSS',
        'ASI ON TWO LEGS',
      ],
      subs: [
        'Clinical performance. AI labs are trying to distill your brain weights right now.',
        'You sniffed out every ounce of slop without breaking a sweat. Genuinely terrifying.',
        'Are YOU the frontier model? Step outside and touch a tree immediately.',
        'Absolute surgical precision. Not a single hallucination made it past your firewall.',
        'You read headlines like you moderate three AI subreddits and haven’t slept since 2023.',
        'Unhinged score. A venture capitalist in San Francisco just tried to fund your cortex.',
        'You didn’t just pass the Turing vibe check—you graded the machine.',
        'World-class radar. Even The Onion’s writers couldn’t sneak one past you today.',
        'Pure signal, zero noise. Disgustingly locked in.',
      ],
    },
    gold: {
      tier: 'gold',
      titles: [
        'GOD-TIER SLOP HUNTER',
        'SENIOR REALITY ENGINEER',
        'SNOPES ON STEROIDS',
        'FRONTIER BS DETECTOR',
        'OVERCLOCKED CORTEX',
        'BUILT FOR THIS TIMELINE',
        'UNFATHOMABLY LOCKED IN',
      ],
      subs: [
        'Snopes wants your phone number. That was a clinical dismantling of the timeline.',
        'Disgustingly sharp instincts. You can smell a hallucinated headline from orbit.',
        'Elite bullcrap radar. Phone scammers hang up the second they hear your voice.',
        'Your pattern recognition is running on liquid-cooled H100s right now.',
        'Ice-cold reads across ten rounds of pure timeline madness. Respect.',
        'High-precision human intelligence. Zero synthetic training data required.',
        'Cooked that entire deck from start to finish without blinking.',
        'You know way too much about how weird tech news has gotten. Impressive.',
        'Navigated a minefield of cursed headlines like a seasoned bomb tech.',
      ],
    },
    lime: {
      tier: 'lime',
      titles: [
        'SLOP IMMUNE',
        'PASSED THE VIBE CHECK',
        'SHARP AS HELL',
        'CALIBRATED HUMAN',
        'DEEPFAKE PROOF',
        'SANE IN A CURSED ERA',
        'EYES WIDE OPEN',
      ],
      subs: [
        'Deepfakes and rage-bait bounce clean off your frontal lobe.',
        'Rock-solid run. You definitely don’t comment “Amen” under Shrimp Jesus.',
        'Clean reads, smart bets, intact sanity. A rare sight on today’s internet.',
        'Nobody is selling you a $1 Chevy Tahoe or an AI Willy Wonka ticket.',
        'Sharp instincts. Definitely smarter than a billion-dollar chatbot playing Atari chess.',
        'Your internal spam filter is freshly updated and pulling its weight.',
        'You kept your head while the timeline threw absolute nonsense at you.',
        'Healthy skepticism, crisp execution. Surviving the slop era comfortably.',
        'You can spot a fake press release from three blocks away.',
      ],
    },
    yellow: {
      tier: 'yellow',
      titles: [
        'TERMINALLY ONLINE',
        'CHRONICALLY PLUGGED IN',
        'REDDIT FIELD RESEARCHER',
        'SURVIVING THE TIMELINE',
        'MOSTLY LUCID',
        'BATTLE-TESTED BROWSER',
        'KNOWS BALL',
      ],
      subs: [
        'Way too many hours on r/singularity and r/nottheonion—and honestly, it paid off.',
        'Respectable score. A couple headlines clipped you, which is fair because reality is broken.',
        'You’ve clearly seen enough cursed product launches to know anything can happen.',
        'Good instincts, minor battle scars. Solid passing grade for this timeline.',
        'You dodged the obvious traps and only nibbled on a pebble instead of eating the rock.',
        'Held your own. Real life writes weirder satire than comedy writers now anyway.',
        'Decent radar, though your weekly screen-time report is probably horrifying.',
        'Not bad at all. Reality is actively gaslighting everyone and you stayed upright.',
        'Caught the fake stuff mostly clean—just tripped where reality went full cartoon.',
      ],
    },
    cyan: {
      tier: 'cyan',
      titles: [
        'BARELY SANE',
        'CAUTIOUSLY SANE',
        'LUKEWARM RADAR',
        'COIN-FLIP MERCHANT',
        'MILDLY HALLUCINATING',
        'HANGING BY A THREAD',
        'NEEDS COFFEE',
      ],
      subs: [
        'Halfway immune to AI slop. Do NOT sign any smart contracts after midnight.',
        'You survived, barely—like passing a driving test after clipping one plastic cone.',
        'Half sharp skeptic, half guy who forwards fake snow-day alerts to the group chat.',
        'Your BS detector works, it just makes a loud rattling noise above 40 mph.',
        'Lukewarm run. Not completely cooked, definitely not raw either.',
        'Second-guessed yourself right into a ditch on a couple of those.',
        'Could be worse—at least you didn’t wire $25 million to a deepfake Zoom call.',
        'Context window got noticeably blurry around the middle of the deck, huh?',
        'Kept your head above water mostly through frantic doggy-paddling.',
      ],
    },
    low: {
      tier: 'pink',
      titles: [
        'BOUGHT THE POPE COAT',
        'MILDLY LOBOTOMIZED',
        'GLUED CHEESE TO PIZZA',
        'RUNNING ON 2-BIT QUANT',
        'TYPED AMEN ON SHRIMP JESUS',
        'TRUSTED CHATGPT FOR TIDES',
        'GOT COOKED',
        'ATE ONE SMALL ROCK',
      ],
      subs: [
        'Wait—you’re telling me the Pope DOESN’T wear a giant designer puffer coat?',
        'Rough scenes out there. You bit on bait that still had the price tag dangling off it.',
        'Your brain weights feel like they got compressed onto a 2014 smartwatch.',
        'Reality is unhinged, sure, but that deck just walked off with your wallet.',
        'You trusted your gut, and your gut enthusiastically recommended pizza glue.',
        'Situational awareness of an office security robot rolling toward a fountain.',
        'If a chatbot offers you legal cases or wild mushroom recipes, walk away slowly.',
        'Got rattled early and started panic-swiping like a pigeon on a smart doorbell.',
        'That deck folded you like a debut robot walking out to the Rocky theme song.',
        'Please check the URL twice before typing your password anywhere today.',
      ],
    },
    bottom: {
      tier: 'pink',
      titles: [
        'CERTIFIED BOT FOOD',
        'DAMP SPONGE COGNITION',
        'TOASTER FIRMWARE',
        'HALLUCINATION VICTIM',
        '1979 ATARI VICTIM',
        'COMPLETELY COOKED',
        'ZERO GUARDRAILS',
        'FACEBOOK SPAM TARGET',
      ],
      subs: [
        'You fell for traps that would make a golden retriever squint suspiciously.',
        'Absolute disasterclass. Scammers are framing your profile in their breakroom.',
        'Your internal monologue is running on a broken 2016 customer-service bot.',
        'Brutal. You walked into an empty Glasgow warehouse expecting Willy Wonka.',
        'Not gonna sugarcoat it—that 10-card deck just stuffed you in a locker.',
        'If an AI priest offers to baptize you in blue Gatorade, do NOT get in the tub.',
        'Zero survival instincts. One orange cone on your hood and you’re stuck til Tuesday.',
        'Respectfully, hand your phone to a trusted adult for the next twenty minutes.',
        'You got juked out of your shoes by ten headlines in a row.',
        'Even a swearing parcel-delivery chatbot couldn’t write a poem sad enough for this run.',
      ],
    },
  };

  // Rank titles & deadpan end-of-deck prompts (8 tiers + run-aware contextual roasts/praises)
  function getRank(points, accuracy, context = {}) {
    let key = 'bottom';
    if (accuracy === 0) key = 'zero';
    else if (points >= 8000 || (accuracy === 10 && points >= 4500)) key = 'foil';
    else if (points >= 5000) key = 'gold';
    else if (points >= 3200) key = 'lime';
    else if (points >= 2000) key = 'yellow';
    else if (points >= 1200) key = 'cyan';
    else if (points >= 600) key = 'low';

    const bucket = RANK_POOLS[key];
    const title = pickFreshLine(bucket.titles, recentRankTitles);

    let customSubs = null;
    if (accuracy === 10 && Math.random() < 0.55) {
      customSubs = [
        '10 out of 10. Flawless sweep. Reality threw ten curveballs and you parked every single one.',
        'Perfect 10/10. Zero misses, zero hallucinations. Genuinely clinical.',
        '10/10 spotted. Neither Silicon Valley hype nor made-up bait laid a glove on you.',
      ];
    } else if ((context.allInBusts || 0) >= 2 && points < 2000 && Math.random() < 0.5) {
      customSubs = [
        'Smashing 2X ALL-IN like a degenerate at 3 a.m. burned your whole stack to ash.',
        'Live by the 2X ALL-IN button, die in a smoking crater by the 2X ALL-IN button.',
        'World-class casino gremlin energy on those 2X busts. Respect the courage, hate the math.',
      ];
    } else if ((context.allInWins || 0) >= 3 && (context.allInBusts || 0) === 0 && points >= 3200 && Math.random() < 0.5) {
      customSubs = [
        'Armed 2X ALL-IN repeatedly without flinching. Ice water in the veins.',
        'Called your 2X ALL-IN shots like you wrote the news cycle yourself.',
      ];
    }

    const sub = pickFreshLine(customSubs || bucket.subs, recentRankSubs);
    return { title, sub, tier: bucket.tier };
  }

  // PRNG & Deck Generator
  function randomSeed() {
    return 'r4-' + crypto.getRandomValues(new Uint32Array(1))[0].toString(16).padStart(8, '0');
  }

  function seededRandom(text) {
    let seed = 2166136261;
    for (const char of text) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
    return () => {
      seed = (seed + 0x6D2B79F5) | 0;
      let value = Math.imul(seed ^ seed >>> 15, seed | 1);
      value ^= value + Math.imul(value ^ value >>> 7, value | 61);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
  }

  function shuffle(cards, random) {
    const copy = cards.slice();
    for (let index = copy.length - 1; index > 0; index--) {
      const other = Math.floor(random() * (index + 1));
      [copy[index], copy[other]] = [copy[other], copy[index]];
    }
    return copy;
  }

  const topics = ['absurd', 'viral', 'dread', 'voices'];

  function attachJackpots(deck, rng) {
    const jp1 = 2 + Math.floor(rng() * 4); // indices 2..5 (Cards #3-#6)
    const jp2 = 6 + Math.floor(rng() * 4); // indices 6..9 (Cards #7-#10)
    return deck.map((card, index) => ({
      ...card,
      isJackpot: index === jp1 || index === jp2,
    }));
  }

  function drawDeck(pools, seed) {
    const random = seededRandom(seed);
    const chronological = (a, b) => a.date.localeCompare(b.date, 'en');

    // v4 random deck: full expanded global bank + balanced claims cap (no repeat bottleneck)
    if (seed.startsWith('r4-')) {
      const real = pools.feed.filter(card => card.verdict === 'real');
      const fake = pools.feed.filter(card => card.verdict === 'made-up');
      const claims = pools.feed.filter(card => card.verdict === 'real-unproven');
      if (real.length < 6 || fake.length < 6) return [];

      const used = new Set();
      const pickUnused = list => {
        const avail = list.filter(card => !used.has(card.id));
        if (!avail.length) return null;
        const chosen = avail[Math.floor(random() * avail.length)];
        used.add(chosen.id);
        return chosen;
      };

      const mixRoll = random();
      const realTarget = mixRoll < 0.38 ? 6 : mixRoll < 0.78 ? 5 : 4;
      const fakeTarget = 10 - realTarget;

      const selected = [];
      for (const topic of topics) {
        const r = pickUnused(real.filter(c => c.topic === topic)) || pickUnused(real);
        if (r) selected.push(r);
      }
      for (const topic of topics) {
        const f = pickUnused(fake.filter(c => c.topic === topic)) || pickUnused(fake);
        if (f) selected.push(f);
      }

      let claimsPicked = 0;
      for (let i = 4; i < realTarget; i++) {
        const tryClaim = claimsPicked === 0 && claims.length && random() < 0.1;
        const claimCard = tryClaim ? pickUnused(claims) : null;
        if (claimCard) claimsPicked++;
        const bonus = claimCard || pickUnused(real);
        if (bonus) selected.push(bonus);
      }
      for (let i = 4; i < fakeTarget; i++) {
        const bonus = pickUnused(fake);
        if (bonus) selected.push(bonus);
      }

      if (selected.length !== 10) return [];
      const shuffled = shuffle(selected, random);
      return attachJackpots(shuffled, random);
    }

    // Legacy r3-/d2-/p2- links draw against the pre-v4 244-card bank so shared URLs stay deterministic
    const legacyFeed = pools.feed.filter(card => !card.v4);

    // Backwards-compatible r3- random shuffled deck
    if (seed.startsWith('r3-')) {
      const real = legacyFeed.filter(card => card.verdict === 'real');
      const fake = legacyFeed.filter(card => card.verdict === 'made-up');
      const claims = legacyFeed.filter(card => card.verdict === 'real-unproven');
      if (real.length < 6 || fake.length < 6) return [];

      const used = new Set();
      const pickUnused = list => {
        const avail = list.filter(card => !used.has(card.id));
        if (!avail.length) return null;
        const chosen = avail[Math.floor(random() * avail.length)];
        used.add(chosen.id);
        return chosen;
      };

      const mixRoll = random();
      const realTarget = mixRoll < 0.4 ? 6 : mixRoll < 0.8 ? 5 : 4;
      const fakeTarget = 10 - realTarget;

      const selected = [];
      for (const topic of topics) {
        const r = pickUnused(real.filter(c => c.topic === topic)) || pickUnused(real);
        if (r) selected.push(r);
      }
      for (const topic of topics) {
        const f = pickUnused(fake.filter(c => c.topic === topic)) || pickUnused(fake);
        if (f) selected.push(f);
      }

      for (let i = 4; i < realTarget; i++) {
        const bonus = (random() < 0.3 && claims.length ? pickUnused(claims) : null) || pickUnused(real);
        if (bonus) selected.push(bonus);
      }
      for (let i = 4; i < fakeTarget; i++) {
        const bonus = pickUnused(fake);
        if (bonus) selected.push(bonus);
      }

      if (selected.length !== 10) return [];
      const shuffled = shuffle(selected, random);
      return attachJackpots(shuffled, random);
    }

    // Backwards-compatible legacy v1 seeds
    if (!seed.startsWith('d2-') && !seed.startsWith('p2-')) {
      const counts = { real: 4, 'made-up': 4, 'real-unproven': 2 };
      const legacyV1 = Object.entries(counts).flatMap(([verdict, count]) =>
        shuffle(pools.original.filter(card => card.verdict === verdict), random).slice(0, count)
      ).sort(chronological);
      return legacyV1.length === 10 ? attachJackpots(legacyV1, seededRandom('jp-' + seed)) : [];
    }

    // Backwards-compatible legacy d2- / p2- seeds
    const real = legacyFeed.filter(card => card.verdict === 'real');
    const fake = legacyFeed.filter(card => card.verdict === 'made-up');
    const claims = legacyFeed.filter(card => card.verdict === 'real-unproven');
    const pick = cards => cards[Math.floor(random() * cards.length)];
    const core = [real, fake].flatMap(cards => topics.map(topic => pick(cards.filter(card => card.topic === topic))));
    if (core.some(card => !card)) return [];
    const unused = cards => cards.filter(card => !core.includes(card));
    core.push(random() < 0.45 && claims.length ? pick(claims) : pick(unused(real)));
    const tenth = pick(unused(random() < 0.5 ? real : fake));
    const legacyV2 = [...core, tenth].filter(Boolean).sort(chronological);
    return legacyV2.length === 10 ? attachJackpots(legacyV2, seededRandom('jp-' + seed)) : [];
  }

  function safeDraw(pools, seed) {
    try {
      const deck = drawDeck(pools, seed);
      return Array.isArray(deck) && deck.length === 10 && new Set(deck.map(card => card.id)).size === 10 ? deck : [];
    } catch {
      return [];
    }
  }

  function freshRandomSeed(pools) {
    const saved = readStats();
    const recentOrder = [...new Set([...(run?.deck.map(card => card.id) || []), ...saved.recentCards])];
    const recentIdx = new Map(recentOrder.map((id, idx) => [id, idx]));
    const tallies = saved.cards || {};

    let bestSeed = randomSeed();
    let bestCost = Infinity;

    for (let attempt = 0; attempt < 320; attempt++) {
      const candidate = randomSeed();
      const deck = safeDraw(pools, candidate);
      if (deck.length !== 10) continue;

      let cost = 0;
      for (const card of deck) {
        if (recentIdx.has(card.id)) {
          // Heavily penalize anything in the recent 180-card window (strongest on most recent runs)
          cost += (220 - Math.min(180, recentIdx.get(card.id))) * 1000;
        }
        const shown = tallies[card.id]?.shown || 0;
        cost += shown * 30;
        if (card.verdict === 'real-unproven' && shown > 0) cost += shown * 50;
      }

      if (cost === 0) return candidate;
      if (cost < bestCost) {
        bestCost = cost;
        bestSeed = candidate;
      }
    }
    return bestSeed;
  }

  // Exact Casino Scoring Math
  function getFeverTier(streak) {
    if (streak >= 7) return 3;
    if (streak >= 5) return 2;
    if (streak >= 3) return 1;
    return 0;
  }

  function evaluateAnswer({ correct, elapsedSec, prevStreak, isJackpot, isAllIn, prevPoints }) {
    if (correct) {
      const streak = prevStreak + 1;
      const mult = SCORE_CFG.STREAK_MULTS[Math.min(streak, SCORE_CFG.STREAK_MULTS.length - 1)];
      const speedBonus = elapsedSec <= SCORE_CFG.SPEED_FAST_SEC
        ? SCORE_CFG.SPEED_FAST_PTS
        : elapsedSec <= SCORE_CFG.SPEED_QUICK_SEC
          ? SCORE_CFG.SPEED_QUICK_PTS
          : 0;
      const speedTag = speedBonus === SCORE_CFG.SPEED_FAST_PTS
        ? 'LIGHTNING'
        : speedBonus === SCORE_CFG.SPEED_QUICK_PTS
          ? 'QUICK'
          : null;
      const jackpotMult = isJackpot ? SCORE_CFG.JACKPOT_MULT : 1;
      const allInMult = isAllIn ? SCORE_CFG.ALLIN_MULT : 1;
      const delta = Math.round((SCORE_CFG.BASE_PTS + speedBonus) * mult * jackpotMult * allInMult);
      return {
        correct: true,
        streak,
        mult,
        speedBonus,
        speedTag,
        jackpotMult,
        allInMult,
        delta,
        newPoints: prevPoints + delta,
        streakBroken: false,
        busted: false,
      };
    }

    const penalty = isAllIn ? Math.min(prevPoints, SCORE_CFG.ALLIN_BUST_PENALTY) : 0;
    return {
      correct: false,
      streak: 0,
      mult: 1.0,
      speedBonus: 0,
      speedTag: null,
      jackpotMult: 1,
      allInMult: 1,
      delta: -penalty,
      newPoints: prevPoints - penalty,
      streakBroken: prevStreak >= 3,
      busted: isAllIn,
    };
  }

  // Canvas FX Particle Engine (#game-fx)
  const fx = (() => {
    const ctx = fxCanvas?.getContext('2d');
    const particles = [];
    let raf = 0;
    let lastTs = 0;
    let fever = 0;
    let emberAccum = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;

    function resize() {
      if (!fxCanvas || !ctx) return;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      width = window.innerWidth;
      height = window.innerHeight;
      fxCanvas.width = Math.round(width * dpr);
      fxCanvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    addEventListener('resize', resize);

    function startLoop() {
      if (raf || !ctx || reduced.matches) return;
      lastTs = performance.now();
      raf = requestAnimationFrame(tick);
    }

    function spawnEmber() {
      const leftSide = Math.random() < 0.5;
      const x = leftSide ? 6 + Math.random() * 20 : width - 6 - Math.random() * 20;
      const colors = fever >= 3 ? ['#ffe800', '#ff2a9d', '#00e5ff', '#b8ff00'] : ['#ff6b00', '#ff2a9d', '#ffe800'];
      particles.push({
        type: 'ember',
        x,
        y: height + 8,
        vx: (leftSide ? 1 : -1) * (8 + Math.random() * 18) + (Math.random() - 0.5) * 20,
        vy: -(90 + Math.random() * 130),
        size: 3 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 0,
        maxLife: 1.4 + Math.random() * 0.9,
      });
    }

    function tick(now) {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;
      ctx.clearRect(0, 0, width, height);

      if (fever >= 2 && state === 'play' && !reduced.matches) {
        emberAccum += dt * (fever >= 3 ? 20 : 11);
        while (emberAccum >= 1) {
          emberAccum -= 1;
          spawnEmber();
        }
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += dt;
        if (p.life >= p.maxLife) {
          particles.splice(i, 1);
          continue;
        }
        const t = p.life / p.maxLife;
        const alpha = t > 0.72 ? Math.max(0, 1 - (t - 0.72) / 0.28) : 1;

        if (p.type === 'confetti') {
          p.vy += 680 * dt;
          p.vx *= Math.pow(0.25, dt);
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.rot += p.vrot * dt;
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        } else if (p.type === 'coin') {
          p.vy += 860 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.spin += p.vspin * dt;
          const sx = Math.max(0.18, Math.abs(Math.cos(p.spin)));
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.translate(p.x, p.y);
          ctx.scale(sx, 1);
          ctx.beginPath();
          ctx.arc(0, 0, p.r, 0, Math.PI * 2);
          ctx.fillStyle = '#ffcc00';
          ctx.fill();
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = '#0a080f';
          ctx.stroke();
          ctx.fillStyle = '#fff6b8';
          ctx.font = `900 ${Math.round(p.r * 1.15)}px "Big Shoulders Display", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('$', 0, 1);
          ctx.restore();
        } else if (p.type === 'shard') {
          p.vy += 520 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.rot += p.vrot * dt;
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.moveTo(0, -p.size);
          ctx.lineTo(p.size * 0.72, p.size * 0.8);
          ctx.lineTo(-p.size * 0.72, p.size * 0.45);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        } else if (p.type === 'ember') {
          p.x += p.vx * dt + Math.sin(p.life * 6) * 14 * dt;
          p.y += p.vy * dt;
          ctx.save();
          ctx.globalAlpha = alpha * 0.85;
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
          ctx.restore();
        }
      }

      if (particles.length > 0 || (fever >= 2 && state === 'play' && !reduced.matches)) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = 0;
        ctx.clearRect(0, 0, width, height);
      }
    }

    return {
      burstConfetti(x, y, count = 28) {
        if (reduced.matches || !ctx) return;
        const colors = ['#ffe800', '#ff2a9d', '#00e5ff', '#b8ff00'];
        for (let i = 0; i < count; i++) {
          const angle = -Math.PI * 0.92 + Math.random() * Math.PI * 0.84;
          const speed = 220 + Math.random() * 440;
          particles.push({
            type: 'confetti',
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 90,
            w: 7 + Math.random() * 6,
            h: 10 + Math.random() * 8,
            rot: Math.random() * Math.PI * 2,
            vrot: (Math.random() - 0.5) * 14,
            color: colors[i % colors.length],
            life: 0,
            maxLife: 0.85 + Math.random() * 0.55,
          });
        }
        startLoop();
      },
      burstCoins(x, y, count = 18) {
        if (reduced.matches || !ctx) return;
        for (let i = 0; i < count; i++) {
          const angle = -Math.PI * 0.85 + Math.random() * Math.PI * 0.7;
          const speed = 280 + Math.random() * 380;
          particles.push({
            type: 'coin',
            x: x + (Math.random() - 0.5) * 40,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 120,
            r: 10 + Math.random() * 5,
            spin: Math.random() * Math.PI,
            vspin: 10 + Math.random() * 10,
            life: 0,
            maxLife: 0.95 + Math.random() * 0.45,
          });
        }
        startLoop();
      },
      burstShards(x, y, count = 18) {
        if (reduced.matches || !ctx) return;
        const colors = ['#ff2e4c', '#ff2a9d', '#0a080f'];
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 160 + Math.random() * 320;
          particles.push({
            type: 'shard',
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 60,
            size: 7 + Math.random() * 8,
            rot: Math.random() * Math.PI * 2,
            vrot: (Math.random() - 0.5) * 16,
            color: colors[i % colors.length],
            life: 0,
            maxLife: 0.65 + Math.random() * 0.35,
          });
        }
        startLoop();
      },
      setFever(tier) {
        fever = tier;
        if (tier >= 2 && state === 'play' && !reduced.matches) startLoop();
      },
      clear() {
        fever = 0;
        particles.length = 0;
        if (raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
        if (ctx) ctx.clearRect(0, 0, width, height);
      },
    };
  })();

  // DOM helpers + crisp riso-print inline SVG icon primitives (zero OS emoji clash in UI chrome)
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const ICON_PATHS = {
    play: '<path fill="currentColor" stroke="none" d="M4 2.5L13.5 8 4 13.5V2.5z"/>',
    trophy: '<path d="M4.5 2.5h7v4a3.5 3.5 0 0 1-7 0v-4z"/><path d="M4.5 4H2.5v1.5a2 2 0 0 0 2 2M11.5 4h2v1.5a2 2 0 0 1-2 2M8 10v3.5M5.5 13.5h5"/>',
    bolt: '<path d="M9 1.5L3.5 9H8l-1 5.5L12.5 7H8l1-5.5z"/>',
    dice: '<rect x="2.2" y="2.2" width="11.6" height="11.6"/><circle cx="5.6" cy="5.6" r=".95" fill="currentColor" stroke="none"/><circle cx="10.4" cy="10.4" r=".95" fill="currentColor" stroke="none"/><circle cx="8" cy="8" r=".95" fill="currentColor" stroke="none"/>',
    copy: '<rect x="5" y="5" width="8.5" height="8.5"/><path d="M3 11V3h8"/>',
    share: '<path d="M8 10.5V2.5M4.5 5.5L8 2l3.5 3.5M3 10.5v3h10v-3"/>',
    replay: '<path d="M3 8a5 5 0 1 0 1.4-3.5L3 6M3 2.5V6h3.5"/>',
    star: '<path fill="currentColor" stroke="none" d="M8 1.5l1.95 4.1 4.55.6-3.3 3.15.8 4.5L8 11.7l-4 2.15.8-4.5-3.3-3.15 4.55-.6L8 1.5z"/>',
    crown: '<path d="M2 12.5h12v-7l-3 2.5-3-4-3 4-3-2.5v7z"/>',
    swords: '<path d="M3 13L13 3M9.5 3H13v3.5M3 3l10 10M6.5 3H3v3.5"/>',
    arrowL: '<path d="M13 8H3M7 4L3 8l4 4"/>',
    arrowR: '<path d="M3 8h10M9 4l4 4-4 4"/>',
    bust: '<path d="M3.5 3.5l9 9M12.5 3.5l-9 9"/>',
  };

  function ico(name, extraClass = '') {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 16 16');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.9');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('class', ('ui-ico ' + extraClass).trim());
    svg.innerHTML = ICON_PATHS[name] || '';
    return svg;
  }

  const node = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };

  function button(label, action, className) {
    const element = node('button', className, label);
    element.type = 'button';
    element.dataset.gameAction = action;
    return element;
  }

  function animate(element, frames, duration = 240, easing = 'cubic-bezier(0.23, 1, 0.32, 1)') {
    const effect = reduced.matches ? [{ opacity: 0.6 }, { opacity: 1 }] : frames;
    return element.animate(effect, { duration: reduced.matches ? 150 : duration, easing });
  }

  function spring(draw, { stiffness = 420, damping = 30 } = {}) {
    let position = 1;
    let velocity = 0;
    let frame = 0;
    let previous = performance.now();
    const advance = now => {
      const dt = Math.min(0.02, Math.max(0, (now - previous) / 1000));
      previous = now;
      velocity += (-stiffness * position - damping * velocity) * dt;
      position += velocity * dt;
      if (Math.abs(position) < 0.002 && Math.abs(velocity) < 0.015) {
        draw(0);
        return;
      }
      draw(position);
      frame = requestAnimationFrame(advance);
    };
    frame = requestAnimationFrame(advance);
    return () => cancelAnimationFrame(frame);
  }

  function focus(target) {
    if (!target || !document.contains(target)) return;
    if (!target.matches('button, a, input')) target.tabIndex = -1;
    try { target.focus({ preventScroll: true }); } catch {}
  }

  // Short, guarded haptics. Silent when reduced motion is requested or the API is missing.
  // Only after a real touch: Chrome logs a console error for vibrate() before the first tap,
  // and desktop/keyboard players have nothing to vibrate anyway.
  let touchSeen = false;
  addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch' || event.pointerType === 'pen') touchSeen = true;
  }, { capture: true, passive: true });
  function buzz(pattern) {
    if (!touchSeen || reduced.matches || typeof navigator.vibrate !== 'function') return;
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
    try { navigator.vibrate(pattern); } catch {}
  }

  // One persistent, visually hidden live region: inserting fresh role=status nodes is not
  // reliably announced, updating an existing region is.
  const liveRegion = document.createElement('div');
  liveRegion.className = 'game-sr-only';
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('aria-atomic', 'true');
  liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0';
  document.body.append(liveRegion);
  // The HUD score rolls frame by frame; a live region there would spam screen readers.
  // Score changes are announced once per answer through liveRegion instead.
  hudScore?.closest('[aria-live]')?.setAttribute('aria-live', 'off');
  let announceTimer = 0;
  function announce(text) {
    clearTimeout(announceTimer);
    liveRegion.textContent = '';
    announceTimer = setTimeout(() => { liveRegion.textContent = text; }, 60);
  }

  // Answer clock that can be paused (hidden tab, Hall of Fame open, first-run coach).
  function makeClock() {
    let start = performance.now();
    let pausedAt = null;
    const reasons = new Set();
    return {
      elapsed() {
        return Math.max(0, ((pausedAt ?? performance.now()) - start) / 1000);
      },
      pause(reason) {
        reasons.add(reason);
        if (pausedAt === null) pausedAt = performance.now();
      },
      resume(reason) {
        reasons.delete(reason);
        if (!reasons.size && pausedAt !== null) {
          start += performance.now() - pausedAt;
          pausedAt = null;
        }
      },
      restart() {
        start = performance.now();
        if (pausedAt !== null) pausedAt = start;
      },
      get paused() { return pausedAt !== null; },
    };
  }

  // Odometer score roller
  let odometerRaf = 0;
  function rollScore(el, from, to, durationMs = 420, emitTicks = true) {
    if (!el) return;
    if (odometerRaf && el === hudScore) {
      cancelAnimationFrame(odometerRaf);
      odometerRaf = 0;
    }
    if (reduced.matches || from === to) {
      el.textContent = formatPts(to);
      return;
    }
    const start = performance.now();
    const direction = to >= from ? 1 : -1;
    let lastTick = 0;
    const step = now => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const val = Math.round(from + (to - from) * eased);
      el.textContent = formatPts(val);
      if (emitTicks && now - lastTick >= 45) {
        lastTick = now;
        wp.emit('score-tick', { progress: t, direction });
      }
      if (t < 1) {
        const id = requestAnimationFrame(step);
        if (el === hudScore) odometerRaf = id;
      } else {
        el.textContent = formatPts(to);
        if (el === hudScore) odometerRaf = 0;
      }
    };
    const id = requestAnimationFrame(step);
    if (el === hudScore) odometerRaf = id;
    if (!reduced.matches) {
      animate(el, [
        { transform: 'scale(1)' },
        { transform: 'scale(1.22)', offset: 0.35 },
        { transform: 'scale(1)' },
      ], 260);
    }
  }

  function spawnFloat(text, x, y, extraClass = '') {
    const el = node('div', ('fx-float ' + extraClass).trim(), text);
    el.style.left = Math.round(x) + 'px';
    el.style.top = Math.round(y) + 'px';
    document.body.append(el);
    setTimeout(() => el.remove(), 950);
  }

  let shakeTimer = 0;
  function triggerShake(level) {
    if (reduced.matches) return;
    root.classList.remove('shake-micro', 'shake-med', 'shake-heavy');
    void root.offsetWidth;
    const cls = level === 'heavy' ? 'shake-heavy' : level === 'med' ? 'shake-med' : 'shake-micro';
    root.classList.add(cls);
    clearTimeout(shakeTimer);
    shakeTimer = setTimeout(() => root.classList.remove(cls), 320);
  }

  // Cover helpers
  function refreshCoverCareer() {
    if (!cvCareerPill) return;
    if (stats.career.runs > 0) {
      cvCareerPill.textContent = `BEST: ${formatPts(stats.career.bestPoints)} PTS · ${stats.career.runs} RUN${stats.career.runs === 1 ? '' : 'S'}`;
    } else {
      cvCareerPill.textContent = 'RANDOM 10-CARD DECKS';
    }
  }

  function setupCoverChallenge() {
    if (!challengeSeed || !cvChallengeBanner) return;
    const parts = [];
    if (challengeBy) parts.push(`CHALLENGE FROM ${challengeBy}`);
    else parts.push('CHALLENGE DECK');
    if (targetPoints !== null) {
      parts.push(`BEAT ${formatPts(targetPoints)} PTS` + (targetAcc !== null ? ` (${targetAcc}/10)` : ''));
    } else if (targetAcc !== null) {
      parts.push(`BEAT ${targetAcc}/10`);
    } else {
      parts.push(`#${challengeSeed.toUpperCase()}`);
    }
    cvChallengeBanner.replaceChildren(ico('swords'), document.createTextNode(parts.join(' · ')));
    cvChallengeBanner.hidden = false;
  }

  // Fever & HUD management
  function applyFever(streak) {
    const tier = getFeverTier(streak);
    const mult = SCORE_CFG.STREAK_MULTS[Math.min(streak, SCORE_CFG.STREAK_MULTS.length - 1)];
    document.body.dataset.fever = String(tier);
    fx.setFever(tier);
    if (hudMult) {
      const prevTier = hudMult.dataset.tier;
      hudMult.dataset.tier = String(tier);
      const multStr = mult.toFixed(1) + 'x';
      hudMult.replaceChildren(
        ...(tier >= 1 ? [ico('bolt', 'ui-ico-xs')] : []),
        document.createTextNode(multStr),
      );
      if (!reduced.matches && String(tier) !== prevTier && tier >= 1) {
        animate(hudMult, [
          { transform: 'scale(1)' },
          { transform: 'scale(1.18)', offset: 0.4 },
          { transform: 'scale(1)' },
        ], 220);
      }
    }
    if (hudScoreLabel) {
      hudScoreLabel.textContent = tier === 3
        ? 'FEEL THE AGI'
        : tier === 2
          ? 'COOKING'
          : tier === 1
            ? 'HEATING UP'
            : 'SCORE';
    }
    const intensity = tier === 3 ? 1.0 : tier === 2 ? 0.84 : tier === 1 ? 0.58 : 0.18 + streak * 0.08;
    wp.api?.setIntensity(intensity);
    return tier;
  }

  function resetFever() {
    document.body.dataset.fever = '0';
    fx.setFever(0);
    if (hudMult) {
      hudMult.dataset.tier = '0';
      hudMult.textContent = '1.0x';
    }
    if (hudScoreLabel) hudScoreLabel.textContent = 'SCORE';
    wp.api?.setIntensity(null);
  }

  function renderHudPips() {
    if (!hudPips || !run) return;
    hudPips.replaceChildren();
    const activeIndex = run.answers.length;
    for (let i = 0; i < run.deck.length; i++) {
      const pip = node('i', 'hud-pip');
      const ans = run.answers[i];
      if (ans) {
        if (ans.correct) {
          pip.dataset.state = ans.isJackpot ? 'jackpot-hit' : ans.isAllIn ? 'allin-hit' : 'hit';
        } else {
          pip.dataset.state = ans.busted ? 'bust' : 'miss';
        }
        if (ans.isJackpot) pip.dataset.jackpot = 'true';
      } else if (i === activeIndex && state === 'play') {
        pip.dataset.state = 'current';
        if (run.deck[i]?.isJackpot) pip.dataset.jackpot = 'true';
      } else {
        pip.dataset.state = 'pending';
      }
      hudPips.append(pip);
    }
    if (hudCount) {
      const num = Math.min(run.deck.length, run.answers.length + (current?.answered || state === 'result' ? 0 : 1));
      hudCount.textContent = String(num).padStart(2, '0') + '/' + run.deck.length;
    }
  }

  // Wake / Game Mode transitions
  function wake() {
    if (wp.api) {
      wp.api.start();
      return;
    }
    cover.classList.add('gone');
    cover.inert = true;
    cover.setAttribute('aria-hidden', 'true');
    wp.state.cover = false;
    if (!wp.state.started) {
      wp.state.started = true;
      wp.emit('start');
    }
  }

  function enterGame() {
    pushGameHistory();
    wake();
    wp.api?.setMode('game');
    wp.state.mode = 'game';
    document.body.classList.add('wp-game-active', 'wp-game-open');
    root.hidden = false;
    reopen.hidden = true;
    leave.hidden = false;
  }

  function explore() {
    if (!wp.api) return;
    change('explore');
  }

  // Exit: no confirm dialog. Abandons the deck in progress (nothing is recorded) and puts the
  // cover back exactly as it was on load. Also what the browser Back button does in-game.
  function exitToCover({ fromHistory = false } = {}) {
    ++prep; // cancel a startRun that is still waiting on the deck
    closeHof({ restoreFocus: false });
    if (wp.state.open) wp.api?.closePanel();
    if (state !== 'cover') change('cover'); // runs the old state's cleanup first
    run = null;
    current = null;
    result = null;
    if (!fromHistory && history.state?.wpGame) {
      skipNextPop = true;
      try { history.back(); } catch { skipNextPop = false; }
    }
  }

  // History: one entry for "in the game" so Back returns to the cover instead of leaving the site.
  let skipNextPop = false;
  function pushGameHistory() {
    if (history.state?.wpGame) return;
    try { history.pushState({ wpGame: true }, '', location.href); } catch {}
  }

  function section(className) {
    const pane = node('section', 'game-page ' + className);
    screen.replaceChildren(pane);
    screen.scrollTop = 0;
    return pane;
  }

  // State machine: cover -> play -> result (+ explore)
  let state = 'cover';
  let run = null;
  let current = null;
  let resumeTarget = null;
  let prep = 0;
  let shareFile = null;
  let sharePosterUrl = null;
  let result = null;
  let hofReturnFocus = null;
  let pendingHitstop = 0;
  let coachSeen = readFlag('coach');

  const noop = () => {};

  function cleanupCardView() {
    clearTimeout(pendingHitstop);
    current?.stopEntry?.();
    current?.stopDrag?.();
    current?.stopFuse?.();
    if (odometerRaf) {
      cancelAnimationFrame(odometerRaf);
      odometerRaf = 0;
      // Never leave the HUD frozen on a mid-roll number (fast Next after a big hit).
      if (run && hudScore) hudScore.textContent = formatPts(run.points);
    }
  }

  function clearPosterPreview() {
    shareFile = null;
    if (sharePosterUrl) {
      URL.revokeObjectURL(sharePosterUrl);
      sharePosterUrl = null;
    }
  }

  const states = {
    cover: {
      enter() {
        resetFever();
        fx.clear();
        if (wp.api) wp.api.setMode('explore');
        wp.state.mode = 'explore';
        root.hidden = true;
        root.inert = false;
        document.body.classList.remove('wp-game-open', 'wp-game-active');
        reopen.hidden = true;
        cover.classList.remove('gone');
        cover.inert = false;
        cover.removeAttribute('aria-hidden');
        wp.state.cover = true;
        refreshCoverCareer();
        focus(coverPlay);
      },
      exit: noop,
    },
    play: {
      enter: () => showCard(0),
      exit: () => {
        cleanupCardView();
      },
    },
    result: {
      enter: showResults,
      exit: () => {
        clearPosterPreview();
        resetFever();
      },
    },
    explore: {
      enter() {
        resetFever();
        fx.clear();
        wp.api.setMode('explore');
        root.hidden = true;
        document.body.classList.remove('wp-game-open');
        reopen.hidden = false;
        focus(reopen);
      },
      exit: noop,
    },
  };

  function change(next) {
    states[state].exit();
    state = next;
    wp.state.act = next;
    states[next].enter();
  }

  // Launch a run directly into Card 1 (no intro interstitial!)
  async function startRun(kind = 'random', explicitSeed = null) {
    const stamp = ++prep;
    closeHof();
    enterGame();

    const pools = await ready;
    if (stamp !== prep) return;

    let seed = explicitSeed && validSeed.test(explicitSeed)
      ? explicitSeed
      : kind === 'challenge' && challengeSeed
        ? challengeSeed
        : freshRandomSeed(pools);

    let deck = safeDraw(pools, seed);
    if (deck.length !== 10 && !seed.startsWith('r4-')) {
      // A shared/legacy seed that no longer assembles (bank or sources changed): never strand
      // the player on an error, deal a fresh random deck instead.
      seed = freshRandomSeed(pools);
      deck = safeDraw(pools, seed);
      kind = 'random';
      explicitSeed = null;
    }
    if (deck.length !== 10) {
      const pane = section('game-paper');
      pane.append(
        node('h2', 'game-heading', 'Deck failed to load'),
        node('p', '', 'The sourced headline deck could not be assembled. Reload the page to try again.'),
      );
      return;
    }

    run = {
      id: 'run-' + Date.now(),
      seed,
      kind: explicitSeed ? 'replay' : kind,
      deck,
      answers: [],
      seenIds: new Set(),
      missedIds: new Set(),
      points: 0,
      score: 0,
      streak: 0,
      best: 0,
      allInWins: 0,
      allInBusts: 0,
      allInTotal: 0,
      jackpotsHit: 0,
      // Replaying the challenge deck (↻ on results) keeps the head-to-head comparison.
      isChallenge: (kind === 'challenge' || kind === 'replay') && Boolean(challengeSeed) && seed === challengeSeed,
    };

    wp.state.score = 0;
    wp.state.streak = 0;
    resetFever();
    if (hudScore) hudScore.textContent = '0';
    renderHudPips();
    track('run_start', { kind: run.kind, seed });
    change('play');
  }

  function stamp(verdict, className = '') {
    const element = node('div', 'game-stamp ' + className, verdictText[verdict]);
    element.dataset.verdict = verdict;
    return element;
  }

  function dateLabel(value) {
    return monthFormat.format(new Date(value + '-15T12:00:00Z')).toUpperCase();
  }

  function caseItem(card) {
    const it = archive.get(card.slug);
    if (it) return { ...it, verdict: card.verdict, t: card.text, x: card.note, i: card.verdict === 'real-unproven' ? '' : it.i };
    return {
      d: card.date,
      y: Number(card.date.slice(0, 4)),
      m: Number(card.date.slice(5)),
      k: 'f',
      t: card.text,
      x: 'A fictional headline written for this game.',
      i: card.note,
      v: ['paper', 'storm'],
    };
  }

  // Card View + Speed Fuse + All-In Toggle + Swipe Physics
  function showCard(direction = 0) {
    cleanupCardView();
    const cardIndex = run.answers.length;
    const card = run.deck[cardIndex];
    if (!run.seenIds.has(card.id)) {
      run.seenIds.add(card.id);
      markCardSeen(card.id);
    }
    const pane = section('game-play');

    const paper = node('article', 'game-paper game-card' + (card.isJackpot ? ' is-jackpot' : ''));
    const textLen = String(card.text || '').length;
    paper.dataset.len = textLen < 90 ? 'short' : textLen > 130 ? 'long' : 'mid';
    const fuseWrap = node('div', 'speed-fuse');
    const fuseFill = node('i', 'speed-fuse-fill');
    fuseFill.dataset.tier = 'fast';
    fuseWrap.append(fuseFill);
    paper.append(fuseWrap);

    if (card.isJackpot) {
      paper.append(node('div', 'jackpot-banner', '★ 2X JACKPOT ROUND · DOUBLE POINTS ★'));
    }

    const meta = node('div', 'card-meta');
    const dateEl = node('time', 'game-date', `#${String(cardIndex + 1).padStart(2, '0')} · ${dateLabel(card.date)}`);
    dateEl.dateTime = card.date;
    const metaRight = node('div', 'card-meta-tags');
    const ribbon = node('span', 'allin-badge', card.isJackpot ? '4X MEGA' : '2X STAKES');
    ribbon.hidden = true;
    const topicEl = node('span', 'card-topic', TOPIC_LABELS[card.topic] || 'AI NEWS');
    metaRight.append(ribbon, topicEl);
    meta.append(dateEl, metaRight);

    const title = node('h2', '', card.text);
    const swipeCue = node('div', 'card-swipe-cue');
    swipeCue.setAttribute('aria-hidden', 'true');
    swipeCue.append(
      node('span', 'cue-left', '← SWIPE MADE UP'),
      node('span', 'cue-right', 'SWIPE REAL →'),
    );
    const ghost = stamp('real', 'game-guess');
    ghost.setAttribute('aria-hidden', 'true');
    paper.append(meta, title, swipeCue, ghost);

    // Armed controls
    const controls = node('div', 'game-controls');
    const allInBtn = button('', 'toggle-allin', 'btn-allin');
    allInBtn.setAttribute('aria-pressed', 'false');
    const updateAllInLabel = armed => {
      allInBtn.setAttribute('aria-pressed', String(armed));
      allInBtn.classList.toggle('is-armed', armed);
      allInBtn.classList.toggle('is-mega', armed && card.isJackpot);
      paper.classList.toggle('is-allin', armed);
      ribbon.hidden = !armed;
      allInBtn.replaceChildren();
      const lead = node('span', 'btn-allin-lead');
      if (armed) {
        lead.append(ico(card.isJackpot ? 'star' : 'bolt'), document.createTextNode(card.isJackpot ? '4X MEGA ALL-IN ARMED' : '2X ALL-IN ARMED'));
        const subText = card.isJackpot ? '4X PAYOUT · -150 BUST' : '2X WIN · -150 BUST';
        allInBtn.append(lead, node('small', '', subText));
      } else {
        lead.append(ico('dice'), document.createTextNode('2X ALL-IN'));
        const subText = card.isJackpot ? 'STACK 4X · RISK -150' : 'WIN 2X · BUST -150';
        allInBtn.append(lead, node('small', '', subText));
      }
    };
    updateAllInLabel(false);

    const btnRow = node('div', 'game-buttons');
    const fakeBtn = button('', 'made-up', 'game-fake');
    fakeBtn.append(ico('arrowL'), document.createTextNode('MADE UP'));
    const realBtn = button('', 'real', 'game-real');
    realBtn.append(document.createTextNode('REAL'), ico('arrowR'));
    btnRow.append(fakeBtn, realBtn);
    const kbHint = node('p', 'kb-hint', 'Keys: ← / → swipe · W all-in · Space next');
    kbHint.setAttribute('aria-hidden', 'true');
    controls.append(allInBtn, btnRow, kbHint);

    // Reveal tray
    const reveal = node('section', 'game-reveal');
    reveal.hidden = true;

    // First-run coach: shown once on card 1 of the very first run, skippable, pauses the fuse.
    const showCoach = cardIndex === 0 && !coachSeen;
    let coach = null;
    if (showCoach) {
      coach = node('aside', 'game-coach');
      coach.setAttribute('aria-labelledby', 'game-coach-title');
      const coachTitle = node('p', 'game-coach-title', 'HOW TO PLAY');
      coachTitle.id = 'game-coach-title';
      const steps = node('ol', 'game-coach-steps');
      for (const line of [
        'Actually happened? Swipe right or tap REAL.',
        'We made it up? Swipe left or tap MADE UP.',
        'Quick calls earn speed points. Streaks stack up to 5X.',
        'Gold Jackpots double points. Arm 2X ALL-IN to bet big—or bust -150.',
      ]) steps.append(node('li', '', line));
      const coachBtn = button('GOT IT · DEAL ME IN', 'coach-dismiss', 'game-primary game-coach-btn');
      coach.append(coachTitle, steps, coachBtn);
    }

    pane.append(...(coach ? [coach] : []), paper, controls, reveal);

    const clock = makeClock();
    if (document.hidden) clock.pause('hidden');
    if (!hofModal.hidden) clock.pause('hof');
    if (showCoach) clock.pause('coach');
    current = {
      card,
      pane,
      paper,
      controls,
      allInBtn,
      updateAllInLabel,
      reveal,
      ghost,
      title,
      fuseFill,
      clock,
      coach,
      shownAt: performance.now(),
      allIn: false,
      answered: false,
      revealed: false,
    };

    renderHudPips();
    wp.api?.travel(dateNumber(card.date), true, archive.get(card.slug));
    wp.emit('card', { ...card, position: cardIndex + 1, act: 1, isJackpot: card.isJackpot });
    if (card.isJackpot) {
      wp.emit('jackpot-arrive', { position: cardIndex + 1 });
      buzz([15, 25, 15]);
    }
    // The headline itself is read when focus lands on it; the live region adds the position.
    announce(`Card ${cardIndex + 1} of ${run.deck.length}${card.isJackpot ? ', 2X jackpot round' : ''}. Real or made up?`);

    // Start 7-second visual speed fuse (pure upside, non-punishing; paused while hidden)
    let fuseRaf = 0;
    const tickFuse = () => {
      if (!current || current.answered || current.card !== card) return;
      const elapsed = clock.elapsed();
      const frac = Math.max(0, 1 - elapsed / SCORE_CFG.SPEED_QUICK_SEC);
      fuseFill.style.transform = `scaleX(${frac.toFixed(4)})`;
      if (elapsed <= SCORE_CFG.SPEED_FAST_SEC) {
        fuseFill.dataset.tier = 'fast';
      } else if (elapsed <= SCORE_CFG.SPEED_QUICK_SEC) {
        fuseFill.dataset.tier = 'quick';
      } else {
        fuseFill.dataset.tier = 'off';
        fuseFill.style.transform = 'scaleX(0)';
        return;
      }
      fuseRaf = requestAnimationFrame(tickFuse);
    };
    fuseRaf = requestAnimationFrame(tickFuse);
    current.stopFuse = () => {
      cancelAnimationFrame(fuseRaf);
      fuseRaf = 0;
    };

    bindSwipe(current);
    // Touch: let the browser own vertical panning (it fires pointercancel when a scroll wins),
    // keep horizontal drags for the swipe. Inline so it works without a stylesheet change.
    paper.style.touchAction = 'pan-y';
    if (coach) {
      focus(coach.querySelector('button'));
    } else {
      focus(title);
    }

    if (reduced.matches) {
      animate(paper, [{ opacity: 0 }, { opacity: 1 }]);
    } else {
      paper.style.opacity = '0';
      const entry = direction || (cardIndex % 2 ? -1 : 1);
      current.stopEntry = spring(value => {
        if (value === 0) {
          paper.style.opacity = '1';
          paper.style.transform = '';
          return;
        }
        paper.style.opacity = String(Math.min(1, Math.max(0, 1 - value * 0.85)));
        paper.style.transform = `translate3d(0,${(28 * value).toFixed(1)}px,0) scale(${(1 - 0.08 * value).toFixed(4)}) rotate(${(3.5 * entry * value).toFixed(2)}deg)`;
      }, { stiffness: 380, damping: 28 });
    }
  }

  function dismissCoach({ focusCard = true } = {}) {
    coachSeen = true;
    writeFlag('coach');
    const view = current;
    if (!view?.coach) return;
    view.coach.remove();
    view.coach = null;
    // The fuse starts fresh once the player has actually read the rules.
    if (!view.answered) view.clock.restart();
    view.clock.resume('coach');
    if (focusCard && !view.answered) focus(view.title);
  }

  // Taps that land within this window after a card or reveal appears are treated as the
  // tail of a double-tap on the previous control and ignored (keyboard is never throttled).
  const TAP_GUARD_MS = 320;
  const isPointerClick = event => Boolean(event && event.detail > 0);

  function toggleAllIn() {
    if (state !== 'play' || !current || current.answered || wp.state.open || !hofModal.hidden) return;
    current.allIn = !current.allIn;
    current.updateAllInLabel(current.allIn);
    wp.emit('allin-toggle', { armed: current.allIn, isJackpot: current.card.isJackpot });
    buzz(current.allIn ? [12, 20, 12] : 8);
    announce(current.allIn
      ? (current.card.isJackpot ? 'All-in armed. 4X payout, minus 150 if wrong.' : 'All-in armed. 2X payout, minus 150 if wrong.')
      : 'All-in off.');
    if (!reduced.matches) {
      animate(current.allInBtn, [
        { transform: 'scale(1)' },
        { transform: 'scale(1.04)', offset: 0.4 },
        { transform: 'scale(1)' },
      ], 160);
    }
  }

  function bindSwipe(view) {
    const { paper, ghost } = view;
    let drag = null;
    let stopSpring = null;

    const paint = (dx, dy, dragging = false) => {
      if (!dragging && dx === 0 && dy === 0) {
        paper.style.transform = '';
        paper.classList.remove('is-dragging');
        ghost.style.opacity = '0';
        ghost.style.transform = '';
        delete paper.dataset.swipe;
        return;
      }
      const rotation = reduced.matches ? 0 : Math.max(-16, Math.min(16, dx * 0.055));
      const lift = dragging && !reduced.matches ? 1.015 : 1;
      paper.style.transform = `translate3d(${dx.toFixed(1)}px,${dy.toFixed(1)}px,0) rotate(${rotation.toFixed(2)}deg) scale(${lift})`;
      paper.classList.toggle('is-dragging', dragging);
      const verdict = dx < 0 ? 'made-up' : 'real';
      const threshold = Math.max(40, paper.offsetWidth * 0.25);
      const ratio = Math.min(1, Math.abs(dx) / threshold);
      ghost.textContent = verdictText[verdict];
      ghost.dataset.verdict = verdict;
      ghost.style.opacity = String(Math.min(0.96, ratio));
      ghost.style.transform = `translate(-50%, -50%) rotate(${dx < 0 ? 7 : -7}deg) scale(${(0.86 + 0.14 * ratio).toFixed(3)})`;
      if (Math.abs(dx) > 10) paper.dataset.swipe = dx < 0 ? 'left' : 'right';
      else delete paper.dataset.swipe;
    };

    paper.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0 || drag || view.answered) return;
      view.stopEntry?.();
      stopSpring?.();
      paper.style.opacity = '1';
      try { paper.setPointerCapture(event.pointerId); } catch {}
      paper.style.willChange = 'transform';
      const at = performance.now();
      drag = { x: event.clientX, y: event.clientY, id: event.pointerId, axis: null, locked: false, samples: [{ x: event.clientX, at }] };
    });

    paper.addEventListener('pointermove', event => {
      if (!event.isPrimary || !drag) return;
      const at = performance.now();
      drag.samples.push({ x: event.clientX, at });
      drag.samples = drag.samples.filter(sample => at - sample.at < 110);
      const dx = event.clientX - drag.x;
      const rawDy = event.clientY - drag.y;
      // Decide the gesture axis once. A mostly vertical drag is a scroll attempt, never a vote.
      if (!drag.axis && Math.hypot(dx, rawDy) > 10) {
        drag.axis = Math.abs(rawDy) > Math.abs(dx) * 1.2 ? 'y' : 'x';
      }
      if (drag.axis === 'y') {
        const id = drag.id;
        drag = null;
        paper.style.willChange = '';
        try { if (paper.hasPointerCapture(id)) paper.releasePointerCapture(id); } catch {}
        paint(0, 0, false);
        return;
      }
      const dy = rawDy * 0.18;
      const crossed = Math.abs(dx) > 0.25 * paper.offsetWidth;
      if (crossed && !drag.locked) {
        drag.locked = true;
        buzz(10);
      } else if (!crossed && drag.locked) {
        drag.locked = false;
      }
      paint(dx, dy, true);
    });

    function finish(event, cancelled) {
      if (!event.isPrimary || !drag) return;
      const dx = event.clientX - drag.x;
      const dy = (event.clientY - drag.y) * 0.18;
      const now = performance.now();
      const recent = drag.samples.find(sample => now - sample.at < 110);
      const velocity = recent ? (event.clientX - recent.x) / Math.max(1, now - recent.at) : 0;
      const commit = drag.axis === 'x'
        && (Math.abs(dx) > 0.25 * paper.offsetWidth || (Math.abs(dx) >= 12 && Math.abs(velocity) > 0.52));
      drag = null;
      paper.classList.remove('is-dragging');
      paper.style.willChange = '';
      if (!cancelled && commit) {
        answer(dx < 0 ? 'made-up' : 'real', { dx, dy, velocity });
      } else if (reduced.matches || cancelled) {
        paint(0, 0, false);
      } else {
        stopSpring = spring(value => paint(dx * value, dy * value, false), { stiffness: 420, damping: 30 });
      }
    }

    paper.addEventListener('pointerup', event => finish(event, false));
    paper.addEventListener('pointercancel', event => finish(event, true));
    paper.addEventListener('lostpointercapture', event => finish(event, true));
    view.stopDrag = () => {
      stopSpring?.();
      drag = null;
      paper.classList.remove('is-dragging');
      paper.style.willChange = '';
      delete paper.dataset.swipe;
    };
  }

  function buildMathBreakdown(evalRes, card, isAllIn, prevStreak) {
    if (evalRes.correct) {
      const bits = [`+${formatPts(evalRes.delta)} PTS`];
      const formula = [String(SCORE_CFG.BASE_PTS)];
      if (evalRes.speedBonus > 0) formula.push(`+${evalRes.speedBonus} FAST`);
      let line = formula.join(' ');
      if (evalRes.mult > 1) line += ` × ${evalRes.mult.toFixed(1)}x`;
      if (card.isJackpot && isAllIn) line += ' × 4X MEGA';
      else if (card.isJackpot) line += ' × 2X JACKPOT';
      else if (isAllIn) line += ' × 2X ALL-IN';
      bits.push(line);
      return bits.join(' · ');
    }
    if (evalRes.busted) {
      const bustText = evalRes.delta < 0 ? `BUSTED -${formatPts(Math.abs(evalRes.delta))} PTS` : 'ALL-IN BUSTED · 0 PTS';
      return bustText + (evalRes.streakBroken ? ` · ${prevStreak}X STREAK BROKEN` : '');
    }
    if (evalRes.streakBroken) {
      return `${prevStreak}X STREAK BROKEN · +0 PTS`;
    }
    return '+0 PTS · STREAK RESET';
  }

  function answer(guess, motion = { dx: 0, dy: 0, velocity: 0 }, event = null) {
    if (state !== 'play' || !current || current.answered || wp.state.open || !hofModal.hidden) return;
    if (guess !== 'real' && guess !== 'made-up') return;
    if (isPointerClick(event) && performance.now() - current.shownAt < TAP_GUARD_MS) return;
    const view = current;
    if (view.coach) dismissCoach({ focusCard: false });
    const { card, paper, controls, reveal, ghost, allIn } = view;
    view.answered = true;
    view.stopEntry?.();
    view.stopDrag?.();
    view.stopFuse?.();

    const elapsedSec = view.clock.elapsed();
    const correct = guess === (card.verdict === 'made-up' ? 'made-up' : 'real');
    const prevPoints = run.points;
    const prevStreak = run.streak;
    const prevFever = getFeverTier(prevStreak);

    const evalRes = evaluateAnswer({
      correct,
      elapsedSec,
      prevStreak,
      isJackpot: card.isJackpot,
      isAllIn: allIn,
      prevPoints,
    });

    run.points = evalRes.newPoints;
    run.streak = evalRes.streak;
    run.score += Number(correct);
    run.best = Math.max(run.best, run.streak);
    if (allIn) {
      run.allInTotal++;
      if (correct) run.allInWins++;
      else run.allInBusts++;
    }
    if (card.isJackpot && correct) run.jackpotsHit++;
    if (!correct && !run.missedIds.has(card.id)) {
      run.missedIds.add(card.id);
      markCardMiss(card.id);
    }

    run.answers.push({
      card,
      correct,
      guess,
      delta: evalRes.delta,
      streak: evalRes.streak,
      mult: evalRes.mult,
      speedBonus: evalRes.speedBonus,
      speedTag: evalRes.speedTag,
      isJackpot: card.isJackpot,
      isAllIn: allIn,
      busted: evalRes.busted,
    });

    wp.state.score = run.score;
    wp.state.streak = run.streak;

    const newFever = applyFever(run.streak);
    const pan = Math.max(-1, Math.min(1, motion.dx / (innerWidth / 2)));
    wp.emit('fling', { x: pan });
    track('card_answer', { id: card.id, correct, jackpot: card.isJackpot, allIn, delta: evalRes.delta });
    renderHudPips();

    const direction = guess === 'made-up' ? -1 : 1;
    const isBigHit = correct && (card.isJackpot || allIn || run.streak >= 3);
    const isMega = correct && card.isJackpot && allIn;

    let revealStarted = false;
    const revealCard = () => {
      if (revealStarted || state !== 'play' || current !== view) return;
      revealStarted = true;

      paper.style.opacity = '1';
      paper.style.transform = '';
      paper.setAttribute('data-revealed', '');
      delete paper.dataset.swipe;
      ghost.remove();
      controls.hidden = true;

      const doSlam = () => {
        if (state !== 'play' || current !== view) return;
        paper.classList.remove('is-hitstop');

        // Emit audio & tactile events right on impact!
        wp.emit('answer', {
          correct,
          streak: run.streak,
          prevStreak,
          verdict: card.verdict,
          x: pan,
          isJackpot: card.isJackpot,
          isAllIn: allIn,
          busted: evalRes.busted,
          streakBroken: evalRes.streakBroken,
          delta: evalRes.delta,
        });
        if (correct) {
          wp.emit('streak', { n: run.streak });
          if (evalRes.speedBonus > 0) {
            setTimeout(() => wp.emit('speed-bonus', { bonus: evalRes.speedBonus, tag: evalRes.speedTag }), 60);
          }
          if (card.isJackpot || allIn) {
            wp.emit('jackpot-hit', { delta: evalRes.delta, isMega });
          }
          if (newFever > prevFever) {
            wp.emit('fever-up', { tier: newFever, streak: run.streak });
          }
        } else {
          wp.api?.glitch(evalRes.busted || evalRes.streakBroken ? 320 : 220);
        }

        // Rubber stamp slam
        const mark = stamp(card.verdict);
        paper.append(mark);

        // Build and show reveal tray FIRST so card settles to its final revealed position
        // before measuring coordinates for floating popups and particle bursts.
        const mathBar = node(
          'div',
          'reveal-math-bar' + (correct ? (isBigHit ? ' is-big' : ' is-hit') : ' is-miss'),
          buildMathBreakdown(evalRes, card, allIn, prevStreak),
        );
        const summary = node('div', 'reveal-summary');
        const hitLeads = ['NAILED IT', 'SPOT ON', 'DEAD ON', 'CALLED IT', 'SNIPED'];
        const missLeads = ['COOKED', 'BAITED', 'GOT YOU', 'NOPE', 'WHIFFED'];
        const pickLead = list => list[(run.answers.length * 3 + card.id.length) % list.length];
        const verdictLead = correct
          ? (isMega ? '4X MEGA HIT' : allIn ? '2X CASHED' : pickLead(hitLeads))
          : (evalRes.busted ? 'ALL-IN BUST' : pickLead(missLeads));
        const outcome = node('p', 'game-answer' + (correct ? '' : ' is-miss'), `${verdictLead} · ${verdictText[card.verdict]}`);
        const noteEl = node('p', 'reveal-note', card.note);
        summary.append(outcome, noteEl);

        const revealBtns = node('div', 'game-reveal-buttons');
        if (wp.api) {
          revealBtns.append(button('Source / Case file ↗', 'case', 'game-text-button'));
        } else if (card.sources?.length) {
          const sourceLink = node('a', 'game-link', 'Source ↗');
          sourceLink.href = card.sources[0].url;
          sourceLink.target = '_blank';
          sourceLink.rel = 'noopener noreferrer';
          revealBtns.append(sourceLink);
        }
        const isLast = run.answers.length >= run.deck.length;
        const nextBtn = button('', 'next', 'game-primary');
        nextBtn.append(document.createTextNode(isLast ? 'SEE FINAL SCORE' : 'NEXT CARD'), ico('arrowR'));
        revealBtns.append(nextBtn);

        reveal.replaceChildren(summary, mathBar, revealBtns);
        reveal.classList.toggle('is-miss', !correct);
        reveal.classList.toggle('is-big', isBigHit);
        reveal.hidden = false;
        view.revealed = true;
        view.revealedAt = performance.now();
        focus(nextBtn);

        // Upper-center of the finalized revealed card (stays well clear of bottom stamp & reveal tray)
        const rect = paper.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = Math.max(96, rect.top + rect.height * 0.42);

        if (correct) {
          const rollMs = isBigHit ? 560 : 340;
          rollScore(hudScore, prevPoints, run.points, rollMs, true);
          const popupLabel = isMega
            ? `+${formatPts(evalRes.delta)} · 4X MEGA`
            : card.isJackpot || allIn
              ? `+${formatPts(evalRes.delta)}!!`
              : `+${formatPts(evalRes.delta)}`;
          spawnFloat(popupLabel, cx, cy, isBigHit ? 'is-jackpot' : '');

          if (evalRes.speedTag) {
            setTimeout(() => spawnFloat(`★ ${evalRes.speedTag} +${evalRes.speedBonus}`, cx, Math.max(76, cy - 38), 'is-sub is-speed'), 80);
          }
          if (card.isJackpot) {
            setTimeout(() => spawnFloat('★ 2X JACKPOT', cx, cy + 30, 'is-sub is-jackpot'), 120);
          } else if (allIn) {
            setTimeout(() => spawnFloat('2X ALL-IN CASHED', cx, cy + 30, 'is-sub is-jackpot'), 120);
          }

          if (isMega) {
            triggerShake('heavy');
            fx.burstCoins(cx, cy, 30);
            fx.burstConfetti(cx, cy, 42);
            buzz([25, 30, 35, 30, 50]);
          } else if (card.isJackpot || allIn) {
            triggerShake('med');
            fx.burstCoins(cx, cy, 20);
            fx.burstConfetti(cx, cy, 28);
            buzz([20, 25, 35]);
          } else if (run.streak >= 3) {
            triggerShake('micro');
            fx.burstConfetti(cx, cy, 22);
            buzz(18);
          } else {
            buzz(12);
          }
        } else {
          paper.classList.add('is-miss', 'game-miss');
          if (evalRes.busted) {
            if (evalRes.delta < 0) rollScore(hudScore, prevPoints, run.points, 480, true);
            const bustLabel = evalRes.delta < 0 ? `BUSTED -${formatPts(Math.abs(evalRes.delta))}` : 'ALL-IN BUSTED';
            spawnFloat(bustLabel, cx, cy, 'is-bust');
            triggerShake('heavy');
            fx.burstShards(cx, cy, 22);
            buzz([40, 30, 60]);
          } else if (evalRes.streakBroken) {
            const multRect = hudMult?.getBoundingClientRect();
            const sx = multRect ? multRect.left + multRect.width / 2 : cx;
            const sy = multRect ? multRect.top + multRect.height / 2 : cy;
            spawnFloat(`${prevStreak}X STREAK BROKEN`, cx, cy, 'is-bust is-streak-break');
            triggerShake('med');
            fx.burstShards(sx, sy, 18);
            buzz([35, 25, 45]);
          } else {
            triggerShake('micro');
            buzz(25);
          }
        }

        const scoreLine = `Score ${formatPts(run.points)}${run.streak >= 2 ? `, streak ${run.streak}` : ''}.`;
        announce(`${verdictLead}. It was ${verdictText[card.verdict]}. ${buildMathBreakdown(evalRes, card, allIn, prevStreak)}. ${scoreLine} ${card.note}`);
      };

      if (isBigHit && !reduced.matches) {
        paper.classList.add('is-hitstop');
        pendingHitstop = setTimeout(doSlam, 42);
      } else {
        doSlam();
      }
    };

    if (reduced.matches) {
      revealCard();
    } else {
      animate(paper, [
        { opacity: 1, transform: `translate3d(${motion.dx}px,${motion.dy}px,0)` },
        {
          opacity: 0,
          transform: `translate3d(${direction * (innerWidth + Math.min(160, Math.abs(motion.velocity) * 45))}px,${motion.dy - 14}px,0) rotate(${direction * 19}deg)`,
        },
      ], 190, 'cubic-bezier(0.23, 1, 0.32, 1)').finished.then(revealCard, revealCard);
      // If the page is not rendering (backgrounded, throttled), the animation never finishes:
      // reveal anyway so the run can never get stuck between answer and reveal.
      setTimeout(revealCard, 380);
    }
  }

  function nextCard(event = null) {
    if (state !== 'play' || !current?.revealed || wp.state.open || !hofModal.hidden) return;
    if (isPointerClick(event) && performance.now() - (current.revealedAt || 0) < TAP_GUARD_MS) return;
    const direction = run.answers.at(-1).guess === 'real' ? -1 : 1;
    if (run.answers.length < run.deck.length) showCard(direction);
    else change('result');
  }

  // Record Run -> Local Storage + Hall of Fame
  function recordRun() {
    const prev = readStats();
    const rate = card => {
      const tally = prev.cards[card.id];
      return tally?.shown ? tally.misses / tally.shown : 0;
    };
    const missedEntry = run.answers
      .filter(ans => !ans.correct)
      .sort((a, b) => (Number(b.busted) - Number(a.busted)) || (rate(b.card) - rate(a.card)))[0] || null;
    const fooled = missedEntry?.card || null;
    const fooledBusted = Boolean(missedEntry?.busted);

    const rank = getRank(run.points, run.score, {
      allInWins: run.allInWins,
      allInBusts: run.allInBusts,
      maxStreak: run.best,
    });
    const prevBest = prev.career.bestPoints || 0;
    const isNewRecord = run.points > 0 && run.points > prevBest;

    prev.career.runs += 1;
    prev.career.cardsPlayed += run.answers.length;
    prev.career.cardsCorrect += run.score;
    prev.career.bestPoints = Math.max(prevBest, run.points);
    prev.career.bestAccuracy = Math.max(prev.career.bestAccuracy || 0, run.score);
    prev.career.longestStreak = Math.max(prev.career.longestStreak || 0, run.best);
    prev.career.allInWins = (prev.career.allInWins || 0) + run.allInWins;
    prev.career.allInBusts = (prev.career.allInBusts || 0) + run.allInBusts;
    prev.career.jackpotsHit = (prev.career.jackpotsHit || 0) + run.jackpotsHit;

    for (const { card, correct } of run.answers) {
      const tally = prev.cards[card.id] ||= { shown: 0, misses: 0 };
      if (!run.seenIds?.has(card.id)) tally.shown += 1;
      if (!correct && !run.missedIds?.has(card.id)) tally.misses = Math.min(tally.shown, tally.misses + 1);
    }

    prev.recentCards = [...new Set([...run.deck.map(card => card.id), ...prev.recentCards])].slice(0, 180);

    const entry = {
      id: run.id,
      handle: prev.handle,
      points: run.points,
      accuracy: run.score,
      maxStreak: run.best,
      rank: rank.title,
      date: new Date().toISOString().slice(0, 10),
      seed: run.seed,
      allInWins: run.allInWins,
    };

    const nextBoard = [...prev.hallOfFame, entry]
      .sort((a, b) => (b.points - a.points) || (b.accuracy - a.accuracy) || (b.maxStreak - a.maxStreak))
      .slice(0, 10);

    const hofRank = nextBoard.findIndex(row => row.id === entry.id) + 1; // 1..10 or 0 if not placed
    prev.hallOfFame = nextBoard;

    writeStats(prev);
    return { fooled, fooledBusted, rank, hofRank, isNewRecord };
  }

  function updateHandle(newRaw) {
    const tag = cleanHandle(newRaw);
    const prev = readStats();
    prev.handle = tag;
    if (result) {
      result.handle = tag;
      for (const row of prev.hallOfFame) {
        if (row.id === result.id) row.handle = tag;
      }
    }
    writeStats(prev);
    return tag;
  }

  // Hall of Fame Table Renderer (shared by Result Screen & Modal)
  function buildHofTable(currentRunId = null) {
    const rows = stats.hallOfFame || [];
    if (!rows.length) {
      return node('p', 'hof-empty', 'NO RUNS YET. PLAY A DECK TO CLAIM #1.');
    }
    const wrap = node('div', 'hof-table-wrap');
    const table = node('table', 'hof-table');
    const thead = node('thead');
    const headRow = node('tr');
    for (const col of ['#', 'TAG', 'PTS', 'ACC', 'STRK', 'RANK', 'DECK']) {
      headRow.append(node('th', '', col));
    }
    thead.append(headRow);

    const tbody = node('tbody');
    rows.forEach((entry, idx) => {
      const tr = node('tr', 'hof-row' + (currentRunId && entry.id === currentRunId ? ' is-current' : ''));
      tr.append(
        node('td', 'hof-col-num', String(idx + 1)),
        node('td', 'hof-col-tag', entry.handle || 'PLAYER'),
        node('td', 'hof-col-pts', formatPts(entry.points)),
        node('td', 'hof-col-acc', `${entry.accuracy}/10`),
        node('td', 'hof-col-strk', `${entry.maxStreak}x`),
        node('td', 'hof-col-rank', entry.rank || ''),
      );
      const actionTd = node('td', 'hof-col-deck');
      const replayBtn = node('button', 'hof-replay-btn', '↻');
      replayBtn.type = 'button';
      replayBtn.dataset.replaySeed = entry.seed;
      replayBtn.title = `Replay deck ${entry.seed}`;
      replayBtn.setAttribute('aria-label', `Replay deck ${entry.seed} (${formatPts(entry.points)} pts)`);
      actionTd.append(replayBtn);
      tr.append(actionTd);
      tbody.append(tr);
    });

    table.append(thead, tbody);
    wrap.append(table);
    return wrap;
  }

  function buildCareerStrip() {
    const c = stats.career;
    const accPct = c.cardsPlayed > 0 ? Math.round((c.cardsCorrect / c.cardsPlayed) * 100) + '%' : '—';
    const strip = node('div', 'hof-stats');
    const cells = [
      ['RUNS', String(c.runs)],
      ['BEST PTS', formatPts(c.bestPoints)],
      ['ACC %', accPct],
      ['MAX STREAK', `${c.longestStreak}x`],
    ];
    for (const [label, val] of cells) {
      const cell = node('div', 'hof-stat-cell');
      cell.append(node('span', 'hof-stat-label', label), node('strong', 'hof-stat-val', val));
      strip.append(cell);
    }
    return strip;
  }

  function openHof(triggerEl = null) {
    hofReturnFocus = triggerEl || document.activeElement;
    stats = readStats();
    const sheet = node('div', 'hof-sheet');
    const header = node('header', 'hof-header');
    const title = node('h2', 'game-heading hof-title-row');
    title.id = 'hof-title';
    title.append(ico('trophy', 'ui-ico-lg'), document.createTextNode('HALL OF FAME'));
    const closeBtn = node('button', 'hof-close', '✕');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close Hall of Fame');
    closeBtn.addEventListener('click', () => closeHof());
    header.append(title, closeBtn);

    const hint = node('p', 'hof-sub', 'Top 10 runs on this device. Tap ↻ on any run to replay that exact 10-card deck.');
    sheet.append(header, buildCareerStrip(), buildHofTable(result?.id || null), hint);
    hofModal.replaceChildren(sheet);
    hofModal.hidden = false;
    // The answer clock does not run while the player is reading the leaderboard.
    if (state === 'play' && current && !current.answered) current.clock.pause('hof');
    focus(closeBtn);
  }

  function closeHof({ restoreFocus = true } = {}) {
    if (hofModal.hidden) return;
    hofModal.hidden = true;
    hofModal.replaceChildren();
    if (current?.clock) current.clock.resume('hof');
    if (restoreFocus && hofReturnFocus && document.contains(hofReturnFocus)) focus(hofReturnFocus);
    hofReturnFocus = null;
  }

  // Result Screen
  function showResults() {
    const { fooled, fooledBusted, rank, hofRank, isNewRecord } = recordRun();
    result = {
      ...run,
      fooled,
      fooledBusted,
      rank,
      hofRank,
      isNewRecord,
      handle: stats.handle,
    };

    renderHudPips();
    if (hudCount) hudCount.textContent = '10/10';
    wp.emit('result', {
      points: result.points,
      score: result.score,
      accuracy: result.score,
      maxStreak: result.best,
      rank: rank.title,
      isNewRecord,
    });
    if (isNewRecord) {
      wp.emit('new-record', { points: result.points, rank: rank.title });
    }
    track('run_end', { points: result.points, score: result.score, best: result.best, kind: result.kind });

    const pane = section('game-result game-paper');

    // Hero Points Slab
    const hero = node('div', 'result-hero');
    const ptsEl = node('div', 'result-points', '0');
    const ptsWrap = node('div', 'result-points-wrap');
    ptsWrap.append(ptsEl, node('span', 'result-pts-unit', 'POINTS'));

    const badges = node('div', 'result-badges');
    const makeBadge = (cls, iconName, label) => {
      const span = node('span', 'result-badge ' + cls);
      if (iconName) span.append(ico(iconName, 'ui-ico-xs'));
      span.append(document.createTextNode(label));
      return span;
    };
    badges.append(
      makeBadge('is-acc', null, `${result.score}/10 SPOTTED`),
      makeBadge('is-streak', 'bolt', `${result.best}X STREAK`),
    );
    if (result.allInTotal > 0) {
      badges.append(makeBadge('is-allin', 'dice', `${result.allInWins}/${result.allInTotal} ALL-IN`));
    } else if (result.jackpotsHit > 0) {
      badges.append(makeBadge('is-jackpot', 'star', `${result.jackpotsHit}/2 JACKPOTS`));
    }
    if (hofRank === 1) {
      badges.append(makeBadge('is-record', 'crown', 'NEW #1 RECORD'));
    } else if (hofRank > 0) {
      badges.append(makeBadge('is-record', 'trophy', `TOP 10 · #${hofRank}`));
    }
    hero.append(ptsWrap, badges);

    // Rank Title Stamp
    const rankBox = node('div', 'result-rank-box');
    const rankStamp = node('div', 'result-rank-stamp', rank.title);
    rankStamp.dataset.tier = rank.tier;
    const rankSub = node('p', 'result-rank-sub', rank.sub);
    rankBox.append(rankStamp, rankSub);

    pane.append(hero, rankBox);

    // Challenge Comparison Verdict
    if (result.isChallenge && (targetPoints !== null || targetAcc !== null)) {
      const chalEl = node('div', 'result-challenge-verdict');
      const rival = challengeBy || 'YOUR FRIEND';
      if (targetPoints !== null) {
        const diff = result.points - targetPoints;
        const won = diff > 0;
        const tied = diff === 0;
        chalEl.dataset.outcome = won ? 'win' : tied ? 'tie' : 'loss';
        chalEl.textContent = won
          ? `COOKED ${rival}'S ${formatPts(targetPoints)} PTS (+${formatPts(diff)})`
          : tied
            ? `EXACT DEAD HEAT WITH ${rival} AT ${formatPts(targetPoints)} PTS`
            : `${rival} STILL OWNS THIS DECK (${formatPts(targetPoints)} PTS · SHORT BY ${formatPts(-diff)})`;
      } else {
        const won = result.score > targetAcc;
        chalEl.dataset.outcome = won ? 'win' : 'loss';
        chalEl.textContent = won
          ? `YOU BEAT ${rival}'S ${targetAcc}/10 WITH ${result.score}/10`
          : `CHALLENGE TARGET: ${targetAcc}/10 (YOU GOT ${result.score}/10)`;
      }
      pane.append(chalEl);
    }

    // 10-Tile Result Strip
    const grid = node('ol', 'game-grid');
    grid.setAttribute('aria-label', 'Your 10-card results');
    const details = node('details', 'result-details');
    details.append(node('summary', '', 'Show all 10 headlines & sources'));
    const answersList = node('ol', 'game-answers');

    result.answers.forEach((entry, index) => {
      const { card, correct, isJackpot, isAllIn, busted, streak } = entry;
      const square = node('li');
      square.style.setProperty('--tile-i', String(index));
      square.dataset.correct = String(correct);
      square.dataset.verdict = card.verdict;
      if (isJackpot) square.dataset.jackpot = 'true';
      if (isAllIn) square.dataset.allin = 'true';
      if (busted) square.dataset.bust = 'true';
      if (correct && streak >= 3) square.dataset.fever = 'true';
      square.textContent = correct
        ? (isJackpot && isAllIn ? '4X' : isJackpot ? '2X' : isAllIn ? '★' : '✓')
        : '✕';
      square.setAttribute(
        'aria-label',
        `Card ${index + 1}: ${correct ? 'correct' : 'missed'}${isJackpot ? ', 2X jackpot' : ''}${isAllIn ? ', all-in' : ''}, ${verdictText[card.verdict]}`,
      );
      grid.append(square);

      const li = node('li');
      const mark = node('b', '', `${verdictText[card.verdict]} · `);
      mark.dataset.verdict = card.verdict;
      li.append(mark, document.createTextNode(card.text));
      if (card.sources?.[0]?.url) {
        const srcA = node('a', 'result-src-link', ' [source ↗]');
        srcA.href = card.sources[0].url;
        srcA.target = '_blank';
        srcA.rel = 'noopener noreferrer';
        li.append(srcA);
      }
      answersList.append(li);
    });
    details.append(answersList);
    pane.append(grid);

    // "THE ONE THAT GOT ME" Callout
    const highlightCard = result.fooled || result.answers.find(a => a.card.verdict !== 'made-up')?.card || null;
    let fooledBox = null;
    if (highlightCard) {
      const kickerPool = !result.fooled
        ? [
          '10/10 FLAWLESS — WILDEST TRUE STORY IN THIS DECK',
          'ZERO MISSES — MOST UNHINGED REAL CARD YOU SNIPED',
          'CLEAN SWEEP — SOMEHOW THIS ONE ACTUALLY HAPPENED',
        ]
        : result.fooledBusted
          ? [
            'WENT 2X ALL-IN HERE AND BLEW UP',
            'THE 2X GAMBLE THAT COOKED YOUR STACK',
          ]
          : highlightCard.verdict === 'made-up'
            ? [
              'WE MADE THIS UP · YOU BOUGHT IT CLEAN',
              'HOOK, LINE, AND SINKER',
              'PURE FABRICATION THAT GOT YOU',
              'HEADLINE THAT BROKE YOUR BS RADAR',
            ]
            : [
              'YEAH, SOMEHOW THIS ACTUALLY HAPPENED',
              'REALITY PULLED A FAST ONE ON YOU HERE',
              'THE REAL HEADLINE THAT COOKED YOU',
              'HEADLINE THAT BROKE YOUR RADAR',
            ];
      const kickerText = kickerPool[(result.points + highlightCard.id.length) % kickerPool.length];
      fooledBox = node('div', 'result-fooled');
      fooledBox.append(
        node('div', 'result-fooled-kicker', kickerText),
        node('p', 'result-fooled-text', highlightCard.text),
        stamp(highlightCard.verdict, 'result-fooled-stamp'),
      );
    }

    // Primary Actions (Share row + Next Deck + Secondary utility row)
    const actions = node('div', 'result-actions');
    const playAgainBtn = button('', 'random', 'game-primary result-play-again');
    playAgainBtn.append(ico('play'), document.createTextNode('PLAY NEXT DECK'), node('span', 'kb-only', ' (R)'));
    playAgainBtn.setAttribute('aria-keyshortcuts', 'R');

    const shareRow = node('div', 'game-buttons result-share-row');
    const copyBtn = button('', 'copy-score', 'result-copy-btn');
    copyBtn.append(ico('copy'), document.createTextNode('COPY SCORE'));
    const shareBtn = button('', 'share', 'result-share-btn');
    shareBtn.append(ico('share'), document.createTextNode('SHARE CARD'));
    shareBtn.disabled = true;
    shareRow.append(copyBtn, shareBtn);

    const utilityRow = node('div', 'result-utility-row');
    const replayBtn = button('', 'replay-same', 'result-replay-btn');
    replayBtn.append(ico('replay'), document.createTextNode('REPLAY DECK'));
    replayBtn.title = 'Same 10 cards and jackpot slots. Try to beat ' + formatPts(result.points) + ' pts.';
    utilityRow.append(replayBtn);
    if (wp.api) utilityRow.append(button('EXPLORE TIMELINE', 'explore', 'result-explore-btn'));
    else utilityRow.classList.add('is-single');

    actions.append(shareRow, playAgainBtn, utilityRow);

    const status = node('p', 'result-status', '');
    status.setAttribute('role', 'status');

    // Clickable 4:5 Poster Thumbnail Preview
    const previewWrap = node('div', 'result-poster-preview');
    previewWrap.hidden = true;
    const previewImg = node('img');
    previewImg.alt = 'Shareable score poster preview — tap to share or save';
    previewImg.addEventListener('click', () => shareBtn.click());
    const previewCap = node('p', 'result-poster-cap', 'TAP POSTER TO SHARE OR SAVE');
    previewWrap.append(previewImg, previewCap);

    // Challenge Link Input
    const linkInput = node('input', 'game-challenge');
    linkInput.setAttribute('aria-label', 'Challenge link');
    linkInput.readOnly = true;
    linkInput.value = WP_SHARE.challengeURL(result.seed, result.points, result.score, result.handle);
    linkInput.hidden = true;
    linkInput.addEventListener('focus', () => linkInput.select());

    // Inline Arcade Handle Editor + Inline Top 10 Hall of Fame
    const handleBar = node('form', 'result-handle-bar');
    const handleLabel = node('label', '', 'TAG:');
    handleLabel.htmlFor = 'result-handle-input';
    const handleInput = node('input', 'result-handle-input');
    Object.assign(handleInput, {
      id: 'result-handle-input',
      type: 'text',
      maxLength: 12,
      value: stats.handle,
      placeholder: 'PLAYER',
      autocomplete: 'nickname',
    });
    handleInput.setAttribute('pattern', '[A-Za-z0-9_\\-]{1,12}');
    handleInput.setAttribute('autocapitalize', 'characters');
    handleInput.spellcheck = false;
    // Same rule as cleanHandle (A-Z, 0-9, _ and -, 12 max), applied as you type.
    handleInput.addEventListener('input', () => {
      const cleaned = handleInput.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 12);
      if (cleaned !== handleInput.value) handleInput.value = cleaned;
    });
    const handleSave = node('button', 'result-handle-save', 'SAVE');
    handleSave.type = 'submit';
    handleBar.append(handleLabel, handleInput, handleSave);

    const hofSection = node('section', 'result-hof');
    const hofTitle = node('h3', 'result-hof-title');
    hofTitle.append(ico('trophy'), document.createTextNode('LOCAL HALL OF FAME'));
    hofSection.append(hofTitle);
    const hofTableHost = node('div', 'result-hof-host');
    hofTableHost.append(buildHofTable(result.id));
    hofSection.append(handleBar, hofTableHost);

    const regeneratePoster = () => {
      const snapshot = result;
      shareBtn.disabled = true;
      art.then(ui => WP_SHARE.makeImage(snapshot, ui))
        .then(file => {
          if (result !== snapshot || state !== 'result' || !file) return;
          clearPosterPreview();
          shareFile = file;
          sharePosterUrl = URL.createObjectURL(file);
          previewImg.src = sharePosterUrl;
          previewWrap.hidden = false;
        })
        .catch(() => {})
        .finally(() => {
          if (result === snapshot && state === 'result') shareBtn.disabled = false;
        });
    };

    handleBar.addEventListener('submit', event => {
      event.preventDefault();
      const savedTag = updateHandle(handleInput.value);
      handleInput.value = savedTag;
      linkInput.value = WP_SHARE.challengeURL(result.seed, result.points, result.score, savedTag);
      hofTableHost.replaceChildren(buildHofTable(result.id));
      status.textContent = `TAG SAVED AS ${savedTag} ✓`;
      regeneratePoster();
    });

    pane.append(actions, status);
    if (fooledBox) pane.append(fooledBox);
    pane.append(previewWrap, linkInput, hofSection, details);

    // Climax odometer roll + celebration FX
    rollScore(ptsEl, 0, result.points, 760, true);
    if (isNewRecord || result.score >= 8) {
      setTimeout(() => {
        const rect = hero.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        fx.burstCoins(cx, cy, 22);
        fx.burstConfetti(cx, cy, 34);
      }, 200);
    }

    regeneratePoster();
    animate(pane, [
      { opacity: 0, transform: 'translate3d(0, 18px, 0) scale(0.985)' },
      { opacity: 1, transform: 'none' },
    ], 280, 'cubic-bezier(0.23, 1, 0.32, 1)');
    focus(playAgainBtn);
    announce(`Run complete. ${formatPts(result.points)} points, ${result.score} of ${result.answers.length} correct, best streak ${result.best}. Rank: ${rank.title}.`
      + (hofRank === 1 ? ' New number one record.' : hofRank > 0 ? ` Hall of Fame position ${hofRank}.` : '')
      + ' Press R for the next deck.');
  }

  // Reopen button (when in Explore mode)
  const reopen = button('', 'reopen');
  reopen.append(ico('play'), document.createTextNode('Play Random Deck'));
  reopen.id = 'game-reopen';
  reopen.hidden = true;
  document.body.append(reopen);

  const coverPlay = document.querySelector('#game-launch');
  const coverHof = document.querySelector('#game-hof');
  const coverExplore = document.querySelector('#game-explore');

  coverExplore.hidden = !wp.api;
  refreshCoverCareer();
  setupCoverChallenge();

  if (challengeSeed) {
    coverPlay.replaceChildren(ico('play', 'ui-ico-play'), document.createTextNode('Accept Challenge'));
    track('challenge_open', { seed: challengeSeed, pts: targetPoints, acc: targetAcc });
  }

  coverPlay.addEventListener('click', () => startRun(challengeSeed ? 'challenge' : 'random'));
  coverHof?.addEventListener('click', () => openHof(coverHof));
  coverExplore.addEventListener('click', () => { wake(); explore(); });
  reopen.addEventListener('click', () => {
    if (run && state === 'explore' && run.answers.length < run.deck.length) {
      enterGame();
      if (hudScore) hudScore.textContent = formatPts(run.points);
      applyFever(run.streak);
      change('play');
    } else {
      startRun('random');
    }
  });

  // UI press audio feedback
  document.addEventListener('pointerdown', event => {
    if (event.target.closest('#wp-game button, .cv-actions button, #game-reopen, #hof-modal button')) {
      wp.emit('ui-press', {});
    }
  });

  // Replay seed delegation (works in both Result HoF and Modal HoF)
  document.addEventListener('click', event => {
    const replayBtn = event.target.closest('[data-replay-seed]');
    if (!replayBtn) return;
    const seed = replayBtn.dataset.replaySeed;
    if (validSeed.test(seed || '')) startRun('replay', seed);
  });

  // Backdrop click closes HoF modal
  hofModal?.addEventListener('click', event => {
    if (event.target === hofModal) closeHof();
  });

  // Delegated game actions inside #wp-game
  root.addEventListener('click', async event => {
    const control = event.target.closest('[data-game-action]');
    if (!control) return;
    const { gameAction } = control.dataset;
    switch (gameAction) {
      case 'explore':
        // The HUD Exit button goes back to the cover; the results-screen button explores.
        if (control === leave) exitToCover();
        else explore();
        break;
      case 'coach-dismiss':
        dismissCoach();
        break;
      case 'replay-same':
        if (result && validSeed.test(result.seed)) startRun('replay', result.seed);
        break;
      case 'hof':
        openHof(control);
        break;
      case 'random':
      case 'challenge':
        startRun(gameAction);
        break;
      case 'toggle-allin':
        toggleAllIn();
        break;
      case 'made-up':
      case 'real':
        answer(gameAction, undefined, event);
        break;
      case 'next':
        nextCard(event);
        break;
      case 'case':
        if (!current?.card) break;
        resumeTarget = control;
        wp.api?.openItem(caseItem(current.card));
        break;
      case 'copy-score': {
        if (!result) break;
        track('copy_score', { points: result.points, score: result.score });
        const status = screen.querySelector('.result-status');
        const link = screen.querySelector('.game-challenge');
        const copied = await WP_SHARE.copyText(result);
        if (status) status.textContent = copied.message;
        if (!copied.ok && link) link.hidden = false;
        control.classList.toggle('is-copied', copied.ok);
        control.replaceChildren(ico('copy'), document.createTextNode(copied.ok ? 'COPIED ✓' : 'COPY LINK ↓'));
        setTimeout(() => {
          if (document.contains(control)) {
            control.classList.remove('is-copied');
            control.replaceChildren(ico('copy'), document.createTextNode('COPY SCORE'));
          }
        }, 2200);
        break;
      }
      case 'share': {
        if (!result) break;
        track('share_click', { points: result.points, score: result.score, kind: result.kind });
        const link = screen.querySelector('.game-challenge');
        const status = screen.querySelector('.result-status');
        if (link) link.hidden = false;
        control.disabled = true;
        try {
          const msg = await WP_SHARE.share(result, shareFile);
          if (status) status.textContent = msg;
        } catch {
          if (status) status.textContent = 'Select the challenge link below to copy it.';
        } finally {
          control.disabled = false;
        }
        break;
      }
    }
  });

  // Keyboard controls
  const isTypingTarget = el => Boolean(el) && (
    el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable
  );
  // Enter/Space on a focused control should press that control, not trigger a game shortcut.
  const isActivatable = el => Boolean(el) && el !== document.body && el.matches?.('button, a[href], summary, [role="button"]');
  let shiftAlone = false;

  addEventListener('keydown', event => {
    if (event.key !== 'Shift') shiftAlone = false;
    if (event.repeat || event.defaultPrevented || event.isComposing) return;
    if (!hofModal.hidden) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeHof();
      } else if (event.key === 'Tab') {
        // Keep focus inside the dialog.
        const items = [...hofModal.querySelectorAll('button, a[href], input')].filter(el => !el.disabled);
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (!hofModal.contains(document.activeElement)) {
          event.preventDefault();
          focus(first);
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          focus(last);
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          focus(first);
        }
      }
      return;
    }
    if (wp.state.open) return;
    // Browser/OS shortcuts (Ctrl+R, Cmd+A, Alt+arrows for history...) are never game input.
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    const active = document.activeElement;
    if (isTypingTarget(active)) return;

    if (state === 'cover') {
      if ((event.key === 'Enter' || event.key === ' ') && (active === document.body || !active)) {
        event.preventDefault();
        startRun(challengeSeed ? 'challenge' : 'random');
      }
      return;
    }

    if (state === 'play' && current) {
      if (current.coach && (event.key === 'Escape' || ((event.key === 'Enter' || event.key === ' ') && !isActivatable(active)))) {
        event.preventDefault();
        dismissCoach();
        return;
      }
      if (!current.answered) {
        if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') {
          event.preventDefault();
          answer('made-up');
        } else if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') {
          event.preventDefault();
          answer('real');
        } else if (event.key === 'w' || event.key === 'W' || event.key === '2') {
          event.preventDefault();
          toggleAllIn();
        } else if (event.key === 'Shift') {
          // Shift toggles ALL-IN only when pressed and released on its own, so Shift+Tab
          // (and Shift+arrow) never arm a wager by accident.
          shiftAlone = true;
        }
      } else if (current.revealed) {
        if (event.key === ' ' || event.key === 'Enter') {
          const nextBtn = current.reveal.querySelector('[data-game-action="next"]');
          if (isActivatable(active) && active !== nextBtn) return;
          event.preventDefault();
          nextCard();
        }
      }
      return;
    }

    if (state === 'result') {
      if (event.key === 'r' || event.key === 'R') {
        event.preventDefault();
        startRun('random');
      }
    }
  });

  addEventListener('keyup', event => {
    if (event.key !== 'Shift' || !shiftAlone) return;
    shiftAlone = false;
    if (state !== 'play' || !current || current.answered || current.coach) return;
    if (!hofModal.hidden || wp.state.open || isTypingTarget(document.activeElement)) return;
    toggleAllIn();
  });
  addEventListener('blur', () => { shiftAlone = false; });

  // Hidden tab: freeze the speed fuse so switching apps never costs the speed bonus.
  document.addEventListener('visibilitychange', () => {
    if (!current?.clock) return;
    if (document.hidden) current.clock.pause('hidden');
    else current.clock.resume('hidden');
  });

  // Back button: close an open dialog first, otherwise leave the game for the cover.
  addEventListener('popstate', () => {
    if (skipNextPop) {
      skipNextPop = false;
      return;
    }
    if (state === 'cover') return;
    if (!hofModal.hidden || wp.state.open) {
      closeHof();
      if (wp.state.open) wp.api?.closePanel();
      pushGameHistory();
      return;
    }
    exitToCover({ fromHistory: true });
  });

  // Resize / orientation change mid-drag: drop the drag and settle the card instead of
  // leaving it stranded at a stale offset.
  // Only width changes count: mobile URL-bar show/hide fires height-only resizes.
  let resizeTimer = 0;
  let lastWidth = innerWidth;
  addEventListener('resize', () => {
    if (innerWidth === lastWidth) return;
    lastWidth = innerWidth;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (state !== 'play' || !current || current.answered) return;
      current.stopDrag?.();
      current.stopEntry?.();
      current.paper.style.opacity = '1';
      current.paper.style.transform = '';
      const ghost = current.ghost;
      if (ghost) ghost.style.opacity = '0';
    }, 120);
  });

  addEventListener('wp:open', () => {
    if (root.hidden) return;
    root.inert = true;
    focus(document.querySelector('#pclose'));
  });
  addEventListener('wp:close', () => {
    root.inert = false;
    focus(resumeTarget);
    resumeTarget = null;
  });
})();
