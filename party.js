// Party mode: 2-6 players share one phone. Every player calls each card REAL or MADE UP,
// then the card is revealed for everyone at once. Same decks as solo play.
// game.js owns the screen and calls window.AIC_PARTY.enter(api) / .exit().
(() => {
  const NAMES_KEY = 'aic-party-names-v1';
  const MAX_PLAYERS = 6;
  const MIN_PLAYERS = 2;
  const PTS = 100;
  const LONE_WOLF = 50;

  let api = null;
  let game = null; // { seed, deck, deckName, index, players: [{ name, score, hits }], votes: [], revealed }

  const el = (tag, className, text) => {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (text != null) n.textContent = text;
    return n;
  };
  const btn = (label, className, onClick) => {
    const b = el('button', className, label);
    b.type = 'button';
    b.addEventListener('click', onClick);
    return b;
  };
  const cleanName = raw => String(raw || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 14);

  function savedNames() {
    try {
      const raw = JSON.parse(localStorage.getItem(NAMES_KEY) || '[]');
      return Array.isArray(raw) ? raw.map(cleanName).filter(Boolean).slice(0, MAX_PLAYERS) : [];
    } catch { return []; }
  }
  function saveNames(names) {
    try { localStorage.setItem(NAMES_KEY, JSON.stringify(names)); } catch {}
  }

  // ---- Setup: who's playing
  function renderSetup() {
    const pane = api.section('game-paper party-setup');
    let names = savedNames();
    if (names.length < MIN_PLAYERS) names = [...names, ...Array(MIN_PLAYERS - names.length).fill('')];

    const title = el('h2', 'party-title', 'PARTY MODE');
    const dek = el('p', 'party-dek', 'One phone, 2 to 6 players. Everyone calls every card, then you flip it together. Loudest gasp wins nothing, but feels great.');
    const deck = el('p', 'party-deck', 'DECK: ' + api.deckName().toUpperCase());
    const list = el('div', 'party-names');
    const status = el('p', 'party-status');
    status.setAttribute('role', 'status');

    const draw = () => {
      list.replaceChildren(...names.map((name, i) => {
        const row = el('div', 'party-name-row');
        const input = el('input', 'party-name-input');
        input.type = 'text';
        input.maxLength = 14;
        input.value = name;
        input.placeholder = 'Player ' + (i + 1);
        input.setAttribute('aria-label', 'Player ' + (i + 1) + ' name');
        input.autocomplete = 'off';
        input.enterKeyHint = 'next';
        input.addEventListener('input', () => { names[i] = input.value; });
        row.append(el('span', 'party-seat', String(i + 1)), input);
        if (names.length > MIN_PLAYERS) {
          row.append(btn('✕', 'party-remove', () => { names.splice(i, 1); draw(); }));
          row.lastChild.setAttribute('aria-label', 'Remove player ' + (i + 1));
        }
        return row;
      }));
      addBtn.hidden = names.length >= MAX_PLAYERS;
    };
    const addBtn = btn('+ ADD PLAYER', 'party-add', () => {
      if (names.length < MAX_PLAYERS) { names.push(''); draw(); list.querySelector('.party-name-row:last-child input')?.focus(); }
    });
    const start = btn('DEAL THE PARTY DECK', 'game-primary party-start', async () => {
      const finalNames = names.map((n, i) => cleanName(n) || 'Player ' + (i + 1));
      const lower = finalNames.map(n => n.toLowerCase());
      if (new Set(lower).size !== lower.length) { status.textContent = 'Two players have the same name. Make them different.'; return; }
      saveNames(names.map(cleanName));
      start.disabled = true;
      status.textContent = 'Shuffling…';
      const dealt = await api.draw();
      if (!dealt) { status.textContent = 'The deck could not be dealt. Try another deck.'; start.disabled = false; return; }
      game = {
        ...dealt,
        index: 0,
        players: finalNames.map(name => ({ name, score: 0, hits: 0, lone: 0 })),
        votes: [],
        revealed: false,
      };
      api.emit('party-start', { players: finalNames.length, seed: dealt.seed });
      renderCard();
    });

    draw();
    pane.append(title, dek, deck, list, addBtn, start, status);
    list.querySelector('input')?.focus();
  }

  // ---- One card, everyone votes
  function renderCard() {
    const card = game.deck[game.index];
    game.votes = game.players.map(() => null);
    game.revealed = false;
    const pane = api.section('game-play party-play');

    const paper = el('article', 'game-paper game-card party-card');
    const meta = el('div', 'card-meta');
    meta.append(
      el('span', 'game-date', `#${String(game.index + 1).padStart(2, '0')} / ${game.deck.length}`),
      el('span', 'card-topic', (card.deckName || 'HEADLINE').toUpperCase()),
    );
    const headline = el('h2', '', card.text);
    headline.tabIndex = -1;
    paper.append(meta, headline);

    const votes = el('div', 'party-votes');
    votes.setAttribute('role', 'group');
    votes.setAttribute('aria-label', 'Everyone calls it');
    const revealBtn = btn('EVERYONE IN? FLIP IT', 'game-primary party-flip', () => reveal(pane, paper, votes, revealBtn));
    revealBtn.disabled = true;

    game.players.forEach((player, i) => {
      const row = el('div', 'party-vote-row');
      const fake = btn('MADE UP', 'party-vote is-fake', () => choose(i, 'made-up'));
      const real = btn('REAL', 'party-vote is-real', () => choose(i, 'real'));
      fake.setAttribute('aria-pressed', 'false');
      real.setAttribute('aria-pressed', 'false');
      row.append(el('span', 'party-voter', player.name), fake, real);
      votes.append(row);
    });

    function choose(i, verdict) {
      if (game.revealed) return;
      game.votes[i] = verdict;
      const row = votes.children[i];
      row.querySelector('.is-fake').setAttribute('aria-pressed', String(verdict === 'made-up'));
      row.querySelector('.is-real').setAttribute('aria-pressed', String(verdict === 'real'));
      row.dataset.voted = verdict;
      api.emit('ui-press', {});
      const left = game.votes.filter(v => !v).length;
      revealBtn.disabled = left > 0;
      revealBtn.textContent = left > 0 ? `WAITING ON ${left}…` : 'EVERYONE IN? FLIP IT';
    }
    revealBtn.textContent = `WAITING ON ${game.players.length}…`;

    pane.append(paper, votes, revealBtn);
    api.emit('card', { ...card, position: game.index + 1, party: true });
    headline.focus({ preventScroll: true });
  }

  function reveal(pane, paper, votes, revealBtn) {
    if (game.revealed || game.votes.some(v => !v)) return;
    game.revealed = true;
    const card = game.deck[game.index];
    const truth = card.verdict === 'made-up' ? 'made-up' : 'real';
    const right = game.votes.map(v => v === truth);
    const nRight = right.filter(Boolean).length;
    const lone = nRight === 1 && game.players.length >= 3;

    const stamp = el('div', 'game-stamp', api.verdictText[card.verdict] || truth.toUpperCase());
    stamp.dataset.verdict = card.verdict;
    paper.append(stamp);

    game.players.forEach((player, i) => {
      const row = votes.children[i];
      row.querySelectorAll('button').forEach(b => { b.disabled = true; });
      const gain = right[i] ? PTS + (lone ? LONE_WOLF : 0) : 0;
      player.score += gain;
      if (right[i]) player.hits += 1;
      if (right[i] && lone) player.lone += 1;
      row.dataset.result = right[i] ? 'hit' : 'miss';
      row.append(el('span', 'party-gain', right[i] ? `+${gain}${lone ? ' LONE WOLF' : ''}` : 'FOOLED'));
    });

    const tray = el('section', 'game-reveal party-reveal');
    const headlineLine = nRight === game.players.length
      ? 'NOBODY GOT FOOLED'
      : nRight === 0
        ? 'IT FOOLED EVERYONE'
        : lone ? `${game.players[right.indexOf(true)].name.toUpperCase()} ALONE SAW IT` : `${nRight} OF ${game.players.length} GOT IT`;
    tray.append(el('p', 'game-answer' + (nRight ? '' : ' is-miss'), `${headlineLine} · ${api.verdictText[card.verdict] || truth}`));
    if (card.library && truth === 'real') tray.append(el('p', 'reveal-where', api.whereWhen(card)));
    tray.append(el('p', 'reveal-note', card.note));
    if (truth === 'real' && card.sources?.[0]?.url) {
      const a = el('a', 'game-link', 'Source ↗');
      a.href = card.sources[0].url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      tray.append(a);
    }
    const isLast = game.index >= game.deck.length - 1;
    const next = btn(isLast ? 'FINAL STANDINGS' : 'NEXT CARD', 'game-primary', () => {
      if (isLast) renderFinal();
      else { game.index += 1; renderCard(); }
    });
    tray.append(standings(), next);
    revealBtn.replaceWith(tray);
    api.emit(nRight ? 'streak' : 'miss', { n: nRight });
    api.buzz(nRight ? [12, 30, 12] : 40);
    next.focus({ preventScroll: true });
    tray.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function ranked() {
    return game.players
      .map((p, seat) => ({ ...p, seat }))
      .sort((a, b) => (b.score - a.score) || (b.hits - a.hits) || (a.seat - b.seat));
  }

  function standings() {
    const box = el('ol', 'party-standings');
    box.setAttribute('aria-label', 'Standings');
    for (const p of ranked()) {
      const li = el('li', 'party-standing');
      li.append(el('span', 'party-st-name', p.name), el('span', 'party-st-pts', p.score.toLocaleString('en-US')));
      box.append(li);
    }
    return box;
  }

  // ---- Final standings
  function renderFinal() {
    const pane = api.section('game-paper party-final');
    const order = ranked();
    const top = order[0];
    const tied = order.filter(p => p.score === top.score);
    const winner = tied.length > 1
      ? tied.map(p => p.name).join(' & ') + ' TIE'
      : top.name;
    pane.append(
      el('p', 'party-kicker', 'PARTY OVER · ' + game.deckName.toUpperCase()),
      el('h2', 'party-title', tied.length > 1 ? `🤝 ${winner}` : `🏆 ${winner}`),
      el('p', 'party-dek', tied.length > 1 ? 'Equally sane. Or equally crazy.' : 'Officially the least crazy person here.'),
    );
    const list = el('ol', 'party-standings is-final');
    order.forEach((p, i) => {
      const li = el('li', 'party-standing');
      const extra = p.lone ? ` · ${p.lone} lone wolf` : '';
      li.append(
        el('span', 'party-st-rank', String(i + 1)),
        el('span', 'party-st-name', p.name),
        el('span', 'party-st-sub', `${p.hits}/${game.deck.length}${extra}`),
        el('span', 'party-st-pts', p.score.toLocaleString('en-US')),
      );
      list.append(li);
    });
    const actions = el('div', 'party-actions');
    actions.append(
      btn('REMATCH · NEW DECK', 'game-primary', async () => {
        const dealt = await api.draw();
        if (!dealt) return;
        game = { ...dealt, index: 0, players: game.players.map(p => ({ name: p.name, score: 0, hits: 0, lone: 0 })), votes: [], revealed: false };
        renderCard();
      }),
      btn('CHANGE PLAYERS', 'party-secondary', renderSetup),
      btn('EXIT', 'party-secondary', () => api.exit()),
    );
    pane.append(list, actions);
    api.emit('result', { party: true, players: order.length });
  }

  window.AIC_PARTY = {
    enter(gameApi) {
      api = gameApi;
      document.body.classList.add('aic-party');
      renderSetup();
    },
    exit() {
      document.body.classList.remove('aic-party');
      game = null;
    },
  };
})();
