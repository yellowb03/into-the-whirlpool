(() => {
  const wp = window.WP;
  const { verdictText } = WP_SHARE;
  const root = document.querySelector('#wp-game');
  const screen = document.querySelector('#game-screen');
  const progress = document.querySelector('#game-progress');
  const cover = document.querySelector('#cover');
  const leave = document.querySelector('#game-leave');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const archive = new Map(wp.items.map(item => [item.slug, item]));
  const monthFormat = new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  const storageKey = 'wp-game-v1';
  const params = new URLSearchParams(location.search);
  const validSeed = /^(?:\d{8}|p1-[0-9a-f]{8})$/;
  const linkSeed = params.get('deck');
  const challengeSeed = validSeed.test(linkSeed || '') ? linkSeed : null;
  const linkScore = params.get('vs');
  const targetScore = /^(?:[0-9]|10)$/.test(linkScore || '') ? Number(linkScore) : null;
  const dateNumber = date => Number(date.slice(0, 4)) + (Number(date.slice(5, 7)) - .5) / 12;

  function track(event, detail) {
    window.va?.('event', { name: event, data: detail });
  }

  // Vercel serves the first-party analytics script only when analytics is enabled.
  if (location.hostname.endsWith('.vercel.app')) {
    window.va ||= function () { (window.vaq ||= []).push(arguments); };
    const analytics = document.createElement('script');
    analytics.defer = true;
    analytics.src = '/_vercel/insights/script.js';
    // Preview projects with analytics disabled still play normally.
    fetch(analytics.src, { method: 'HEAD' }).then(response => {
      if (response.ok) document.head.append(analytics);
      else delete window.va;
    }).catch(() => { delete window.va; });
  }

  const ready = wp.sources.then(sources => WP_CARDS.filter(card => {
    if (card.verdict === 'made-up') return true;
    card.sources = (sources[card.slug] || []).filter(source => /^https:\/\//.test(source.url || ''));
    return archive.has(card.slug) && card.sources.length > 0;
  }));
  const art = fetch('assets/manifest.json').then(response => response.ok ? response.json() : {})
    .then(manifest => {
      const assets = manifest.ui || {};
      for (const [name, key] of [['paper', 'card-front'], ['poster', 'card-back']]) {
        if (assets[key]) document.documentElement.style.setProperty('--game-' + name, 'url("assets/ui/' + assets[key] + '")');
      }
      return assets;
    }).catch(() => ({}));

  const defaultStats = () => ({ runs: 0, correct: 0, best: 0, lastDaily: null, cards: {} });
  function readStats() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      return { ...defaultStats(), ...saved, cards: saved?.cards || {} };
    } catch {
      return defaultStats();
    }
  }
  let stats = readStats();

  function dailySeed() {
    return new Date().toISOString().slice(0, 10).replaceAll('-', '');
  }

  function practiceSeed() {
    return 'p1-' + crypto.getRandomValues(new Uint32Array(1))[0].toString(16).padStart(8, '0');
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

  function drawDeck(pool, seed) {
    const counts = { real: 4, 'made-up': 4, 'real-unproven': 2 };
    const random = seededRandom(seed);
    return Object.entries(counts).flatMap(([verdict, count]) => {
      const group = pool.filter(card => card.verdict === verdict);
      for (let index = group.length - 1; index > 0; index--) {
        const other = Math.floor(random() * (index + 1));
        [group[index], group[other]] = [group[other], group[index]];
      }
      return group.slice(0, count);
    }).sort((a, b) => a.date.localeCompare(b.date, 'en'));
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

  function animate(element, frames, duration = 240, easing = 'cubic-bezier(.16,1,.3,1)') {
    const effect = reduced.matches ? [{ opacity: .6 }, { opacity: 1 }] : frames;
    return element.animate(effect, { duration: reduced.matches ? 150 : duration, easing });
  }

  function spring(draw, { stiffness = 420, damping = 30 } = {}) {
    let position = 1, velocity = 0, frame, previous = performance.now();
    const advance = now => {
      const dt = Math.min(.02, Math.max(0, (now - previous) / 1000));
      previous = now;
      velocity += (-stiffness * position - damping * velocity) * dt;
      position += velocity * dt;
      if (Math.abs(position) < .002 && Math.abs(velocity) < .015) {
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
    if (!target) return;
    if (!target.matches('button, a, input')) target.tabIndex = -1;
    target.focus({ preventScroll: true });
  }

  function wake() {
    if (wp.api) {
      wp.api.start();
      return;
    }
    cover.classList.add('gone');
    cover.inert = true;
    if (!wp.state.started) {
      wp.state.started = true;
      wp.emit('start');
    }
  }

  function enterGame() {
    wake();
    wp.api?.setMode('game');
    wp.state.mode = 'game';
    document.body.classList.add('wp-game-active', 'wp-game-open');
    root.hidden = false;
    reopen.hidden = true;
    leave.hidden = !wp.api;
  }

  function explore() {
    if (!wp.api) return;
    change('explore');
  }

  function section(className) {
    const pane = node('section', 'game-page ' + className);
    screen.replaceChildren(pane);
    screen.scrollTop = 0;
    return pane;
  }

  let state = 'cover';
  let run, current, revealTimer, autoAdvance = true, resumeTarget;
  let introKind = challengeSeed ? 'challenge' : 'daily';
  let prep = 0;
  let shareFile, result;
  const noop = () => {};
  const states = {
    cover: { enter: noop, exit: noop, update: noop },
    intro: { enter: renderIntro, exit: () => { prep++; }, update: noop },
    act1: { enter: showCard, exit() { clearReveal(); current?.stopEntry?.(); current?.stopDrag?.(); }, update: noop },
    result: { enter: showResults, exit: () => { shareFile = null; }, update: noop },
    explore: {
      enter() {
        wp.api.setMode('explore');
        root.hidden = true;
        document.body.classList.remove('wp-game-open');
        reopen.hidden = false;
        focus(reopen);
      },
      exit: noop,
      update: noop,
    },
  };

  function change(next) {
    states[state].exit();
    state = next;
    wp.state.act = next;
    states[next].enter();
  }

  function settings() {
    const label = node('label', 'game-settings');
    const input = node('input');
    input.type = 'checkbox';
    input.checked = autoAdvance;
    input.addEventListener('change', () => { autoAdvance = input.checked; });
    label.append(input, 'Auto-advance reveals');
    return label;
  }

  function renderIntro() {
    enterGame();
    progress.textContent = '';
    const pane = section('game-paper');
    const heading = node('h2', 'game-heading', 'Real or Made Up?');
    const challenge = introKind === 'challenge' && targetScore !== null;
    pane.append(node('div', 'game-kicker', challenge ? 'Beat ' + targetScore + '/10' : 'The Record'), heading);
    pane.append(node('p', '', 'Swipe left for made up and right for real. You can also use the buttons or arrow keys.'));
    pane.append(node('p', '', 'If someone really announced a claim that’s still under review, choose real. The reveal will say “Real, unproven.”'));
    const status = node('p', '', '');
    status.setAttribute('role', 'status');
    const actions = node('div', 'game-buttons');
    actions.append(button(introKind === 'challenge' ? 'Play challenge' : 'Play daily deck', introKind === 'challenge' ? 'challenge' : 'daily', 'game-primary'),
      button('Practice deck', 'practice'));
    pane.append(actions, settings(), status);
    focus(heading);
    animate(pane, [{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' }]);
  }

  async function startRun(kind) {
    const stamp = ++prep;
    const seed = kind === 'daily' ? dailySeed() : kind === 'challenge' ? challengeSeed : practiceSeed();
    if (!seed) return;
    const pool = await ready;
    if (stamp !== prep || !['intro', 'result'].includes(state)) return;
    const deck = drawDeck(pool, seed);
    if (deck.length !== 10) {
      screen.querySelector('[role="status"]').textContent = 'The sourced deck couldn’t be loaded. Reload to try again.';
      return;
    }
    enterGame();
    run = { seed, kind, deck, answers: [], best: 0, score: 0, streak: 0 };
    wp.state.score = wp.state.streak = 0;
    wp.api?.setIntensity(null);
    track('run_start', { kind, seed });
    change('act1');
  }

  function stamp(verdict, className = '') {
    const element = node('div', 'game-stamp ' + className, verdictText[verdict]);
    element.dataset.verdict = verdict;
    return element;
  }

  function dateLabel(value) {
    return monthFormat.format(new Date(value + '-15T12:00:00Z'));
  }

  function caseItem(card) {
    const it = archive.get(card.slug);
    if (it) return { ...it, verdict: card.verdict, t: card.text, x: card.note, i: card.verdict === 'real-unproven' ? '' : it.i };
    return {
      d: card.date, y: Number(card.date.slice(0, 4)), m: Number(card.date.slice(5)),
      k: 'f', t: card.text, x: 'A fictional headline written for this game.', i: card.note,
      v: ['paper', 'storm'],
    };
  }

  function updateProgress() {
    progress.textContent = (run.answers.length + (current?.answered ? 0 : 1)) + '/10 · Streak ' + run.streak;
  }

  function showCard(direction = 0) {
    const card = run.deck[run.answers.length];
    const pane = section('game-play');
    const paper = node('article', 'game-paper game-card');
    const title = node('h2', '', card.text);
    const date = node('time', 'game-date', dateLabel(card.date));
    date.dateTime = card.date;
    const ghost = stamp('real', 'game-guess');
    ghost.setAttribute('aria-hidden', 'true');
    const action = node('div', 'game-buttons');
    action.append(button('← Made up', 'made-up', 'game-fake'), button('Real →', 'real', 'game-real'));
    const reveal = node('section', 'game-reveal');
    reveal.hidden = true;
    pane.append(paper, action, reveal);
    paper.append(date, title, ghost);
    current = { card, pane, paper, action, reveal, ghost, title, answered: false };
    updateProgress();
    wp.api?.travel(dateNumber(card.date), true, archive.get(card.slug));
    wp.emit('card', { ...card, position: run.answers.length + 1, act: 1 });
    bindSwipe(current);
    focus(title);
    if (reduced.matches) {
      animate(paper, [{ opacity: 0 }, { opacity: 1 }]);
    } else {
      paper.style.opacity = '0';
      const entry = direction || (run.answers.length % 2 ? -1 : 1);
      current.stopEntry = spring(value => {
        paper.style.opacity = String(1 - Math.max(0, value));
        paper.style.transform = 'translateY(' + 45 * value + 'px) scale(' + (1 - .45 * value) + ') rotate(' + 6 * entry * value + 'deg)';
      });
    }
  }

  function bindSwipe(view) {
    const { paper, ghost } = view;
    let drag, stopSpring;
    const paint = (dx, dy) => {
      const rotation = reduced.matches ? 0 : Math.max(-18, Math.min(18, dx * .06));
      paper.style.transform = 'translate(' + dx + 'px,' + dy + 'px) rotate(' + rotation + 'deg)';
      const verdict = dx < 0 ? 'made-up' : 'real';
      ghost.textContent = verdictText[verdict];
      ghost.dataset.verdict = verdict;
      ghost.style.opacity = Math.min(.92, Math.abs(dx) / (paper.offsetWidth * .28));
    };

    paper.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0 || drag) return;
      if (view.answered) return;
      view.stopEntry?.();
      stopSpring?.();
      paper.style.opacity = '1';
      paper.setPointerCapture(event.pointerId);
      paper.style.willChange = 'transform';
      const at = performance.now();
      drag = { x: event.clientX, y: event.clientY, samples: [{ x: event.clientX, at }] };
    });
    paper.addEventListener('pointermove', event => {
      if (!event.isPrimary || !drag) return;
      const at = performance.now();
      drag.samples.push({ x: event.clientX, at });
      drag.samples = drag.samples.filter(sample => at - sample.at < 110);
      paint(event.clientX - drag.x, (event.clientY - drag.y) * .25);
    });
    function finish(event, cancelled) {
      if (!event.isPrimary || !drag) return;
      const dx = event.clientX - drag.x;
      const dy = (event.clientY - drag.y) * .25;
      const now = performance.now();
      const recent = drag.samples.find(sample => now - sample.at < 110);
      const velocity = recent ? (event.clientX - recent.x) / Math.max(1, now - recent.at) : 0;
      const commit = Math.abs(dx) > .28 * paper.offsetWidth || (Math.abs(dx) >= 12 && Math.abs(velocity) > .6);
      drag = null;
      paper.style.willChange = '';
      if (!cancelled && commit) {
        answer(dx < 0 ? 'made-up' : 'real', { dx, dy, velocity });
      } else if (reduced.matches || cancelled) {
        paint(0, 0);
      } else {
        stopSpring = spring(value => paint(dx * value, dy * value), { stiffness: 400, damping: 28 });
      }
    }
    paper.addEventListener('pointerup', event => finish(event, false));
    paper.addEventListener('pointercancel', event => finish(event, true));
    paper.addEventListener('lostpointercapture', event => finish(event, true));
    view.stopDrag = () => { stopSpring?.(); drag = null; paper.style.willChange = ''; };
    paper.addEventListener('click', () => {
      if (view.answered && view.dismissable && !getSelection()?.toString()) nextCard();
    });
  }

  function clearReveal() {
    clearTimeout(revealTimer);
    revealTimer = null;
  }

  function scheduleNext() {
    clearReveal();
    if (autoAdvance && current?.answered && !wp.state.open) revealTimer = setTimeout(nextCard, 2200);
  }

  function confetti(pane) {
    if (reduced.matches) return;
    for (let index = 0; index < 10; index++) {
      const angle = index / 10 * Math.PI * 2;
      const bit = node('i', 'game-confetti');
      bit.style.background = ['#ff48b0', '#0078bf', '#ffe800', '#f15060'][index % 4];
      pane.append(bit);
      animate(bit, [
        { opacity: 1, transform: 'translate(0,0)' },
        { opacity: 0, transform: 'translate(' + Math.cos(angle) * 150 + 'px,' + Math.sin(angle) * 140 + 'px) rotate(240deg)' },
      ], 650).finished.then(() => bit.remove());
    }
  }

  function answer(guess, motion = { dx: 0, dy: 0, velocity: 0 }) {
    if (state !== 'act1' || current.answered || wp.state.open) return;
    const { card, pane, paper, action, reveal, ghost } = current;
    const view = current;
    view.answered = true;
    view.stopEntry?.();
    view.stopDrag?.();
    const correct = guess === (card.verdict === 'made-up' ? 'made-up' : 'real');
    run.streak = correct ? run.streak + 1 : 0;
    run.score += Number(correct);
    run.best = Math.max(run.streak, run.best);
    run.answers.push({ card, correct, guess });
    wp.state.score = run.score;
    wp.state.streak = run.streak;
    wp.api?.setIntensity(.18 + Math.min(run.streak, 10) * .082);
    if (!correct) wp.api?.glitch(220);
    wp.emit('answer', { correct, streak: run.streak, verdict: card.verdict });
    if (correct) wp.emit('streak', { n: run.streak });
    track('card_answer', { id: card.id, correct });
    updateProgress();
    animate(progress, [{ opacity: .35, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], 180);

    const direction = guess === 'made-up' ? -1 : 1;
    const finish = () => {
      if (state !== 'act1' || current !== view) return;
      paper.style.opacity = '1';
      paper.style.transform = '';
      paper.setAttribute('data-revealed', '');
      ghost.remove();
      action.hidden = true;
      const mark = stamp(card.verdict);
      paper.append(mark);
      const summary = node('div');
      summary.setAttribute('role', 'status');
      const outcome = node('p', 'game-answer', (correct ? 'Correct' : 'Miss') + ' · ' + verdictText[card.verdict]);
      summary.append(outcome, node('p', '', card.note));
      reveal.append(summary);
      const controls = node('div', 'game-reveal-buttons');
      const file = button('Case file →', 'case', 'game-text-button');
      if (wp.api) controls.append(file);
      else if (card.sources?.length) {
        const source = node('a', 'game-link', 'Source ↗');
        source.href = card.sources[0].url;
        source.target = '_blank';
        source.rel = 'noopener noreferrer';
        controls.append(source);
      }
      const next = button(run.answers.length === 10 ? 'See results →' : 'Next →', 'next', 'game-primary');
      controls.append(next);
      reveal.append(controls);
      reveal.hidden = false;
      view.dismissable = true;
      focus(outcome);
      animate(mark, [
        { transform: 'scale(1.8) rotate(-14deg)', opacity: .35 },
        { transform: 'scale(.97,1.06) rotate(-6deg)', opacity: 1, offset: .78 },
        { transform: 'rotate(-6deg)', opacity: 1 },
      ], 150);
      animate(reveal, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }]);
      if (!correct && !reduced.matches) {
        animate(paper, [0, -6, 6, -4, 3, 0].map(offset => ({ transform: 'translateX(' + offset + 'px)' })), 220);
      } else if (!correct) {
        paper.classList.add('game-miss');
      }
      if (correct && run.streak % 5 === 0) confetti(pane);
      controls.addEventListener('focusin', clearReveal);
      scheduleNext();
    };
    if (reduced.matches) finish();
    else animate(paper, [
      { opacity: 1, transform: 'translate(' + motion.dx + 'px,' + motion.dy + 'px)' },
      { opacity: 0, transform: 'translateX(' + direction * (innerWidth + Math.min(160, Math.abs(motion.velocity) * 45)) + 'px) rotate(' + direction * 23 + 'deg)' },
    ], 260, 'cubic-bezier(.7,0,.84,0)').finished.then(finish);
  }

  function nextCard() {
    if (state !== 'act1' || !current?.dismissable || wp.state.open) return;
    clearReveal();
    const direction = run.answers.at(-1).guess === 'real' ? -1 : 1;
    if (run.answers.length < run.deck.length) showCard(direction);
    else change('result');
  }

  function recordRun() {
    const previous = readStats();
    const rate = card => {
      const tally = previous.cards[card.id];
      return tally?.shown ? tally.misses / tally.shown : 0;
    };
    const fooled = run.answers.filter(answer => !answer.correct).map(answer => answer.card)
      .sort((a, b) => rate(b) - rate(a))[0];
    if (run.kind === 'daily') previous.lastDaily = run.seed;
    previous.runs++;
    previous.correct += run.score;
    previous.best = Math.max(previous.best, run.best);
    for (const { card, correct } of run.answers) {
      const tally = previous.cards[card.id] ||= { shown: 0, misses: 0 };
      tally.shown++;
      tally.misses += Number(!correct);
    }
    stats = previous;
    try { localStorage.setItem(storageKey, JSON.stringify(stats)); } catch {}
    return fooled;
  }

  function showResults() {
    clearReveal();
    progress.textContent = 'Run complete';
    result = { ...run, fooled: recordRun() };
    wp.emit('result', { type: null, agiYear: null, score: run.score });
    track('run_end', { score: run.score, kind: run.kind });

    const pane = section('game-result game-paper');
    const heading = node('h2', 'game-heading', 'Your record');
    const score = node('div', 'game-score', run.score + '/10');
    const best = node('p', '', 'Best streak  ' + run.best);
    const grid = node('ol', 'game-grid');
    grid.setAttribute('aria-label', 'Your answers');
    const details = node('details');
    details.append(node('summary', '', 'Show all answers'));
    const answers = node('ol', 'game-answers');
    run.answers.forEach(({ card, correct }, index) => {
      const square = node('li');
      square.dataset.correct = correct;
      square.dataset.verdict = card.verdict;
      square.setAttribute('aria-label', 'Card ' + (index + 1) + ': ' + (correct ? 'correct' : 'missed') + ', ' + verdictText[card.verdict]);
      grid.append(square);
      const answer = node('li');
      const mark = node('b', '', verdictText[card.verdict] + ' · ');
      mark.dataset.verdict = card.verdict;
      answer.append(mark, card.text);
      answers.append(answer);
    });
    details.append(answers);

    pane.append(heading, score, best, grid);
    if (result.fooled) {
      const upset = node('p', '', 'The one that fooled you most');
      const label = stamp(result.fooled.verdict);
      pane.append(upset, label, node('p', '', result.fooled.text));
    } else {
      pane.append(node('p', '', 'You saw through every fake.'));
    }
    pane.append(details);
    if (run.kind === 'challenge' && targetScore !== null) {
      pane.append(node('p', '', run.score > targetScore ? 'You beat ' + targetScore + '/10.' : 'Challenge target  ' + targetScore + '/10'));
    }
    const actions = node('div', 'game-buttons');
    const shareButton = button('Share result', 'share', 'game-primary');
    shareButton.disabled = true;
    actions.append(shareButton, button('New practice run', 'practice'));
    if (stats.lastDaily !== dailySeed()) actions.append(button('Play today’s deck', 'daily'));
    if (wp.api) actions.append(button('Explore timeline', 'explore'));
    const status = node('p', '', '');
    status.setAttribute('role', 'status');
    const link = node('input', 'game-challenge');
    link.setAttribute('aria-label', 'Challenge link');
    link.readOnly = true;
    link.value = WP_SHARE.challengeURL(run.seed, run.score);
    link.hidden = true;
    link.addEventListener('focus', () => link.select());
    const credits = node('p', 'game-credits', 'Briam · concept and direction. Claude · timeline engine. ChatGPT · game, cards and UI. Gemini · soundtrack.');
    pane.append(actions, link, status, credits);
    const snapshot = result;
    art.then(ui => WP_SHARE.makeImage(snapshot, ui['share-bg-1'] && 'assets/ui/' + ui['share-bg-1']))
      .then(file => { if (result === snapshot && state === 'result') shareFile = file; })
      .catch(() => {})
      .finally(() => { shareButton.disabled = false; });
    animate(pane, [
      { opacity: 0, transform: 'translateY(-65px) scaleY(.94)' },
      { opacity: 1, transform: 'translateY(4px)', offset: .8 },
      { opacity: 1, transform: 'none' },
    ], 900);
    focus(heading);
  }

  const reopen = button('Play the game', 'intro');
  reopen.id = 'game-reopen';
  reopen.hidden = true;
  document.body.append(reopen);
  const coverPlay = document.querySelector('#game-launch');
  const coverExplore = document.querySelector('#game-explore');
  coverExplore.hidden = !wp.api;
  if (challengeSeed) {
    coverPlay.firstChild.textContent = 'Play challenge ';
    track('challenge_open', { seed: challengeSeed });
  }
  coverPlay.addEventListener('click', () => change('intro'));
  coverExplore.addEventListener('click', () => { wake(); explore(); });
  reopen.addEventListener('click', () => change('intro'));

  root.addEventListener('click', async event => {
    const control = event.target.closest('[data-game-action]');
    if (!control) return;
    const { gameAction } = control.dataset;
    switch (gameAction) {
      case 'explore': explore(); break;
      case 'daily':
      case 'practice':
      case 'challenge': startRun(gameAction); break;
      case 'made-up':
      case 'real': answer(gameAction); break;
      case 'next': nextCard(); break;
      case 'case':
        clearReveal();
        resumeTarget = control;
        wp.api?.openItem(caseItem(current.card));
        break;
      case 'share': {
        track('share_click', { score: run.score, kind: run.kind });
        const link = screen.querySelector('.game-challenge');
        const status = screen.querySelector('[role="status"]');
        link.hidden = false;
        control.disabled = true;
        try { status.textContent = await WP_SHARE.share(result, shareFile); }
        catch { status.textContent = 'Select the challenge link below to copy it.'; }
        finally { control.disabled = false; }
        break;
      }
    }
  });
  addEventListener('keydown', event => {
    if (state !== 'act1' || event.repeat || wp.state.open || event.defaultPrevented) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      answer(event.key === 'ArrowLeft' ? 'made-up' : 'real');
    }
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
    scheduleNext();
  });
})();
