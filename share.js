(() => {
  const name = 'Am I Crazy?';
  const legacyHost = 'into-the-whirlpool.vercel.app';
  const verdictText = {
    real: 'REAL',
    'made-up': 'MADE UP',
    'real-unproven': 'REAL, UNPROVEN',
  };

  // Canvas fonts. Every face used on the poster is listed here so it can be
  // loaded before drawing (the poster must never render in fallback fonts).
  const DISPLAY = '"Big Shoulders Display", Impact, "Arial Narrow", sans-serif';
  const MONO = '"IBM Plex Mono", ui-monospace, Menlo, monospace';
  const FONT_FACES = [
    '900 100px "Big Shoulders Display"',
    '700 100px "Big Shoulders Display"',
    '700 30px "IBM Plex Mono"',
    '600 30px "IBM Plex Mono"',
  ];
  const FONT_SAMPLE = 'AMICRAZY?0123456789,.#+-/:· abcdefghijklmnopqrstuvwxyz';

  // ---------- small helpers ----------

  function cleanHandle(raw) {
    return String(raw || '').toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 12);
  }

  function formatPts(n) {
    return Math.max(0, Math.round(Number(n) || 0)).toLocaleString('en-US');
  }

  function withTimeout(promise, ms, fallback = null) {
    return Promise.race([
      Promise.resolve(promise).catch(() => fallback),
      new Promise(resolve => setTimeout(() => resolve(fallback), ms)),
    ]);
  }

  let fontsPromise = null;
  function ensureFonts() {
    if (!document.fonts?.load) return Promise.resolve(false);
    if (!fontsPromise) {
      const loads = FONT_FACES.map(face => document.fonts.load(face, FONT_SAMPLE).catch(() => []));
      fontsPromise = withTimeout(Promise.all(loads).then(() => document.fonts.ready), 3500)
        .then(() => FONT_FACES.every(face => {
          try { return document.fonts.check(face, FONT_SAMPLE); } catch { return false; }
        }))
        .then(ok => {
          if (!ok) fontsPromise = null; // allow a retry on the next poster
          return ok;
        });
    }
    return fontsPromise;
  }

  // Challenge link. Format is frozen for backwards compatibility:
  // ?deck=<seed>&pts=<points>&acc=<0-10>[&by=<TAG>]
  function challengeURL(seed, points = 0, accuracy = 0, handle = '') {
    let base = location.href;
    try {
      const canonical = document.querySelector('link[rel="canonical"]')?.href;
      if (location.hostname === legacyHost && canonical) base = canonical;
    } catch {}
    const url = new URL(base);
    url.search = '';
    url.hash = '';
    url.searchParams.set('deck', seed);
    url.searchParams.set('pts', String(Math.max(0, Math.round(Number(points) || 0))));
    url.searchParams.set('acc', String(Math.max(0, Math.min(10, Math.round(Number(accuracy) || 0)))));
    const tag = cleanHandle(handle);
    if (tag && tag !== 'PLAYER') url.searchParams.set('by', tag);
    return url.href;
  }

  // Short, typeable host for the poster ("am-i-crazy.vercel.app").
  function shortURL() {
    const local = /^(localhost|127\.0\.0\.1|\[::1\]|.*\.localhost|.*\.test)$/i.test(location.hostname)
      || location.hostname === legacyHost || !location.hostname;
    if (local) {
      try {
        const canonical = document.querySelector('link[rel="canonical"]')?.href;
        if (canonical) return new URL(canonical).host;
      } catch {}
      return 'am-i-crazy.vercel.app';
    }
    return location.host;
  }

  function displayURL(href) {
    return String(href || '').replace(/^https?:\/\//, '');
  }

  // Opponent info when this run came from a challenge link.
  function challengeInfo(result) {
    if (!result?.isChallenge) return null;
    try {
      const params = new URLSearchParams(location.search);
      const rawPts = params.get('pts');
      const pts = /^\d{1,5}$/.test(rawPts || '') ? Number(rawPts) : null;
      const by = cleanHandle(params.get('by')) || 'MY FRIEND';
      if (pts === null) return null;
      const diff = Math.round(Number(result.points) || 0) - pts;
      return { by, pts, diff, won: diff > 0, tied: diff === 0 };
    } catch {
      return null;
    }
  }

  function dailyLabel(result) {
    const seed = String(result?.seed || '');
    // Any "<prefix->YYYYMMDD" seed labels as a daily when the run kind is daily;
    // legacy d2-YYYYMMDD seeds were date decks too.
    const match = seed.match(/(?:^|-)(\d{4})(\d{2})(\d{2})$/);
    if (result?.kind !== 'daily' && !(match && seed.startsWith('d2-'))) return '';
    if (!match) return 'DAILY';
    const date = new Date(Date.UTC(+match[1], +match[2] - 1, +match[3]));
    return 'DAILY ' + date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).toUpperCase();
  }

  function tileEmoji(entry) {
    if (entry.correct) {
      if (entry.isJackpot && entry.isAllIn) return '👑';
      if (entry.isAllIn) return '💰';
      if (entry.isJackpot) return '⭐';
      if ((entry.streak || 0) >= 3) return '🔥';
      return '🟩';
    }
    return entry.busted || entry.isAllIn ? '💥' : '🟥';
  }

  function emojiGrid(answers) {
    const tiles = (answers || []).slice(0, 10).map(tileEmoji);
    return [tiles.slice(0, 5).join(''), tiles.slice(5, 10).join('')].filter(Boolean).join('\n');
  }

  // Spoiler-safe: we never print the headline itself (a friend is about to
  // play this exact deck), only which card number fooled you.
  function fooledCardNumber(result) {
    const answers = result?.answers || [];
    if (result?.fooled) {
      const idx = answers.findIndex(a => a.card === result.fooled || a.card?.id === result.fooled.id);
      if (idx >= 0) return idx + 1;
    }
    const firstMiss = answers.findIndex(a => !a.correct);
    return firstMiss >= 0 ? firstMiss + 1 : 0;
  }

  function rankTitle(result) {
    return String(result?.rank?.title || 'CAUTIOUSLY SANE').toUpperCase();
  }

  // ---------- share text ----------

  function shareText(result = {}) {
    const { answers = [], seed = '', points = 0, score = 0, handle = '' } = result;
    const daily = dailyLabel(result);
    const vs = challengeInfo(result);
    const cardNo = fooledCardNumber(result);

    const dailyTitle = daily ? ' ' + daily.toLowerCase().replace(/\b[a-z]/g, ch => ch.toUpperCase()) : '';
    const head = `Am I Crazy?${dailyTitle} 🧠 ${score}/10 · ${formatPts(points)} pts`;

    let hook;
    if (vs?.won) hook = `Cooked ${vs.by} by ${formatPts(vs.diff)} pts ⚔️`;
    else if (vs?.tied) hook = `Exact dead tie with ${vs.by} 🤝`;
    else if (vs) hook = `${vs.by} got me by ${formatPts(-vs.diff)} pts — somebody avenge me`;
    else if (score >= 10) hook = `"${rankTitle(result)}" · 10/10, zero hallucinations 🧠`;
    else if (score === 0) hook = `"${rankTitle(result)}" · 0/10, statistically impressive 💀`;
    else if (cardNo) hook = `"${rankTitle(result)}" · card #${cardNo} cooked me 💀`;
    else hook = `"${rankTitle(result)}"`;

    return [
      head,
      emojiGrid(answers),
      hook,
      'Real headline or completely made up? Same 10 cards, try to beat this 👇',
      challengeURL(seed, points, score, handle),
    ].join('\n');
  }

  async function copyToClipboard(text) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {}
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
      document.body.append(area);
      area.select();
      area.setSelectionRange(0, text.length);
      const ok = document.execCommand('copy');
      area.remove();
      return Boolean(ok);
    } catch {
      return false;
    }
  }

  async function copyText(result) {
    const text = shareText(result);
    const ok = await copyToClipboard(text);
    return ok
      ? { ok: true, message: 'COPIED! PASTE IT IN THE GROUP CHAT ✓', text }
      : { ok: false, message: 'Select the challenge link below to copy it.', text };
  }

  // ---------- poster ----------

  function loadImage(file) {
    if (!file) return Promise.resolve(null);
    return withTimeout(new Promise(resolve => {
      const picture = new Image();
      picture.decoding = 'async';
      picture.onload = () => resolve(picture);
      picture.onerror = () => resolve(null);
      picture.src = 'assets/ui/' + file;
    }), 4000, null);
  }

  function fitFont(ctx, text, maxWidth, weight, startPx, minPx, family) {
    let size = startPx;
    ctx.font = `${weight} ${size}px ${family}`;
    while (size > minPx && ctx.measureText(text).width > maxWidth) {
      size -= 2;
      ctx.font = `${weight} ${size}px ${family}`;
    }
    return size;
  }

  // Hard-offset "riso" block: shadow, fill, ink border.
  function block(ctx, x, y, w, h, fill, shadow, border = '#0a080f', offset = 10, lineWidth = 5) {
    if (shadow) {
      ctx.fillStyle = shadow;
      ctx.fillRect(x + offset, y + offset, w, h);
    }
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    if (border) {
      ctx.strokeStyle = border;
      ctx.lineWidth = lineWidth;
      ctx.strokeRect(x, y, w, h);
    }
  }

  function drawCheck(ctx, cx, cy, s, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = s * 0.16;
    ctx.lineCap = 'square';
    ctx.lineJoin = 'miter';
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.32, cy + s * 0.02);
    ctx.lineTo(cx - s * 0.08, cy + s * 0.26);
    ctx.lineTo(cx + s * 0.34, cy - s * 0.24);
    ctx.stroke();
    ctx.restore();
  }

  function drawCross(ctx, cx, cy, s, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = s * 0.15;
    ctx.lineCap = 'square';
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.24, cy - s * 0.24);
    ctx.lineTo(cx + s * 0.24, cy + s * 0.24);
    ctx.moveTo(cx + s * 0.24, cy - s * 0.24);
    ctx.lineTo(cx - s * 0.24, cy + s * 0.24);
    ctx.stroke();
    ctx.restore();
  }

  function drawStar(ctx, cx, cy, r, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const radius = i % 2 ? r * 0.45 : r;
      const angle = -Math.PI / 2 + i * Math.PI / 5;
      ctx[i ? 'lineTo' : 'moveTo'](cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function canvasToFile(canvas, filename) {
    return new Promise(resolve => {
      const fromDataURL = () => {
        try {
          const data = canvas.toDataURL('image/png');
          const bytes = atob(data.split(',')[1]);
          const arr = new Uint8Array(bytes.length);
          for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
          resolve(new File([arr], filename, { type: 'image/png' }));
        } catch {
          resolve(null);
        }
      };
      try {
        if (!canvas.toBlob) return fromDataURL();
        canvas.toBlob(blob => {
          if (blob) resolve(new File([blob], filename, { type: 'image/png' }));
          else fromDataURL();
        }, 'image/png');
      } catch {
        fromDataURL();
      }
    });
  }

  async function makeImage(result = {}, ui = {}) {
    const {
      points = 0,
      score = 0,
      answers = [],
      best = 0,
      seed = '',
      kind = 'random',
      handle = '',
      rank = { title: 'CAUTIOUSLY SANE', sub: 'Halfway immune to fake news.', tier: 'cyan' },
      allInWins = 0,
      allInTotal = 0,
      jackpotsHit = 0,
    } = result;

    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const INK = '#0a080f';
    const PAPER = '#f5ecdc';
    const YELLOW = '#ffe800';
    const PINK = '#ff2a9d';
    const BLUE = '#0078bf';
    const CYAN = '#00e5ff';
    const LIME = '#b8ff00';
    const RED = '#ff2e4c';
    const ORANGE = '#ff6b00';
    const GOLD = '#ffcc00';
    const W = 1080;
    const CX = W / 2;

    const [art, wordmark] = await Promise.all([
      loadImage(ui?.['share-bg-1']),
      loadImage(ui?.wordmark),
      ensureFonts(),
    ]);

    // Background: full-bleed riso whirlpool (reads as a bright swirl in a feed).
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, W, 1350);
    if (art) {
      ctx.drawImage(art, 0, 0, W, 1350);
      ctx.fillStyle = 'rgba(10,8,15,0.22)';
      ctx.fillRect(0, 0, W, 1350);
    }

    // Paper card
    block(ctx, 56, 56, 968, 1238, PAPER, PINK, INK, 14, 6);

    // ---- Masthead (y 80–200)
    if (wordmark) {
      const h = 120;
      const w = Math.min(300, h * (wordmark.naturalWidth / Math.max(1, wordmark.naturalHeight)));
      ctx.drawImage(wordmark, 92, 82, w, h);
    } else {
      ctx.font = `900 76px ${DISPLAY}`;
      ctx.fillStyle = PINK;
      ctx.fillText('AM I CRAZY?', 98, 170);
      ctx.fillStyle = INK;
      ctx.fillText('AM I CRAZY?', 92, 164);
    }

    const daily = dailyLabel(result);
    const vs = challengeInfo(result);
    const tag = cleanHandle(handle);
    const modeTag = daily
      || (vs ? `CHALLENGE VS ${vs.by}` : kind === 'replay' ? 'REPLAY DECK' : 'RANDOM DECK');

    ctx.textAlign = 'right';
    ctx.font = `900 46px ${DISPLAY}`;
    const pill = 'REAL OR MADE UP?';
    const pillW = ctx.measureText(pill).width + 40;
    block(ctx, 988 - pillW, 92, pillW, 64, INK, null, null);
    ctx.fillStyle = YELLOW;
    ctx.fillText(pill, 968, 141);

    ctx.fillStyle = INK;
    fitFont(ctx, modeTag, 560, 700, 24, 16, MONO);
    ctx.fillText(modeTag, 988, 190);
    ctx.textAlign = 'left';

    // ---- Score slab (y 224–520)
    block(ctx, 92, 224, 896, 296, INK, PINK, YELLOW, 12, 6);
    const ptsStr = formatPts(points);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const ptsSize = fitFont(ctx, ptsStr, 640, 900, 236, 120, DISPLAY);
    const ptsW = ctx.measureText(ptsStr).width;
    ctx.font = `900 ${Math.round(ptsSize * 0.32)}px ${DISPLAY}`;
    const unitW = ctx.measureText(' PTS').width;
    const groupX = CX - (ptsW + unitW) / 2;
    ctx.textAlign = 'left';
    ctx.font = `900 ${ptsSize}px ${DISPLAY}`;
    ctx.fillStyle = PINK;
    ctx.fillText(ptsStr, groupX + 6, 436 + 6);
    ctx.fillStyle = YELLOW;
    ctx.fillText(ptsStr, groupX, 436);
    ctx.font = `900 ${Math.round(ptsSize * 0.32)}px ${DISPLAY}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(' PTS', groupX + ptsW, 436);

    // Stat chips
    const chips = [
      { text: `${score}/10 SPOTTED`, fill: '#ffffff', ink: INK },
      { text: `${best}X STREAK`, fill: ORANGE, ink: INK },
    ];
    if (allInTotal > 0) chips.push({ text: `${allInWins}/${allInTotal} ALL-IN`, fill: LIME, ink: INK });
    else if (jackpotsHit > 0) chips.push({ text: `${jackpotsHit}/2 JACKPOTS`, fill: GOLD, ink: INK });
    ctx.font = `700 26px ${MONO}`;
    const chipGap = 16;
    const chipWs = chips.map(c => ctx.measureText(c.text).width + 32);
    let chipX = CX - (chipWs.reduce((a, b) => a + b, 0) + chipGap * (chips.length - 1)) / 2;
    chips.forEach((chip, i) => {
      ctx.fillStyle = chip.fill;
      ctx.fillRect(chipX, 460, chipWs[i], 40);
      ctx.fillStyle = chip.ink;
      ctx.fillText(chip.text, chipX + 16, 489);
      chipX += chipWs[i] + chipGap;
    });

    // ---- Rank stamp (y ~550–680)
    const tierFill = {
      foil: GOLD, gold: GOLD, lime: LIME, yellow: YELLOW, cyan: CYAN, pink: PINK, red: RED,
    }[rank?.tier] || PINK;
    const tierInk = tierFill === PINK || tierFill === RED ? '#ffffff' : INK;
    const title = rankTitle(result);
    ctx.save();
    ctx.translate(CX, 610);
    ctx.rotate(-2 * Math.PI / 180);
    block(ctx, -440, -54, 880, 108, tierFill, INK, INK, 10, 5);
    ctx.fillStyle = tierInk;
    ctx.textAlign = 'center';
    fitFont(ctx, title, 820, 900, 84, 40, DISPLAY);
    ctx.fillText(title, 0, 29);
    ctx.restore();

    if (rank?.sub) {
      ctx.textAlign = 'center';
      ctx.fillStyle = INK;
      fitFont(ctx, rank.sub, 860, 600, 26, 18, MONO);
      ctx.fillText(rank.sub, CX, 712);
    }

    // ---- Result grid 2 x 5 (y 740–1018)
    const tile = 128;
    const gap = 18;
    const gridX = CX - (5 * tile + 4 * gap) / 2;
    const gridY = 740;
    answers.slice(0, 10).forEach((entry, index) => {
      const x = gridX + (index % 5) * (tile + gap);
      const y = gridY + Math.floor(index / 5) * (tile + gap);
      const c = tile / 2;
      const mega = entry.correct && entry.isJackpot && entry.isAllIn;
      const jp = entry.correct && entry.isJackpot;
      const allIn = entry.correct && entry.isAllIn;
      const bust = !entry.correct && (entry.busted || entry.isAllIn);
      const fever = entry.correct && (entry.streak || 0) >= 3;

      if (entry.correct) {
        const fill = mega || jp ? GOLD : allIn ? PINK : fever ? ORANGE : LIME;
        block(ctx, x, y, tile, tile, fill, INK, INK, 7, 5);
        if (mega || jp) {
          ctx.fillStyle = INK;
          ctx.textAlign = 'center';
          ctx.font = `900 62px ${DISPLAY}`;
          ctx.fillText(mega ? '4X' : '2X', x + c, y + c + 22);
        } else if (allIn) {
          drawStar(ctx, x + c, y + c + 2, tile * 0.32, YELLOW);
        } else {
          drawCheck(ctx, x + c, y + c, tile, INK);
        }
      } else {
        block(ctx, x, y, tile, tile, bust ? RED : PAPER, INK, INK, 7, 5);
        drawCross(ctx, x + c, y + c, tile, bust ? '#ffffff' : RED);
      }
    });
    ctx.textAlign = 'left';

    // ---- Hook line (y ~1072): spoiler-safe curiosity
    const cardNo = fooledCardNumber(result);
    let hook;
    if (vs?.won) hook = `COOKED ${vs.by} BY ${formatPts(vs.diff)} PTS`;
    else if (vs?.tied) hook = `EXACT DEAD HEAT WITH ${vs.by}`;
    else if (vs) hook = `${vs.by} GOT ME BY ${formatPts(-vs.diff)}. AVENGE ME.`;
    else if (score >= 10) hook = '10/10 FLAWLESS. ZERO HALLUCINATIONS.';
    else if (score === 0) hook = '0/10. STATISTICALLY IMPRESSIVE DISASTER.';
    else if (cardNo) hook = `CARD #${cardNo} COOKED ME. GOOD LUCK.`;
    else hook = 'REAL NEWS IS A FEVER DREAM.';
    ctx.textAlign = 'center';
    ctx.fillStyle = INK;
    fitFont(ctx, hook, 880, 900, 50, 30, DISPLAY);
    ctx.fillText(hook, CX, 1078);

    // ---- CTA footer (y 1106–1240)
    block(ctx, 92, 1104, 896, 136, YELLOW, PINK, INK, 12, 6);
    const cta = tag && tag !== 'PLAYER' ? `CAN YOU BEAT ${tag}?` : 'CAN YOU BEAT ME?';
    ctx.fillStyle = INK;
    fitFont(ctx, cta, 840, 900, 78, 44, DISPLAY);
    ctx.fillText(cta, CX, 1180);
    ctx.font = `700 30px ${MONO}`;
    const host = shortURL();
    const hostLine = `▶ ${host.toUpperCase()}`;
    fitFont(ctx, hostLine, 840, 700, 30, 18, MONO);
    ctx.fillStyle = BLUE;
    ctx.fillText(hostLine, CX, 1222);

    // ---- Honesty footer
    ctx.fillStyle = '#5b5560';
    fitFont(ctx, 'Some headlines are real (and sourced). Some are made up. Same 10 cards for you.', 880, 600, 19, 14, MONO);
    ctx.fillText('Some headlines are real (and sourced). Some are made up. Same 10 cards for you.', CX, 1272);
    ctx.textAlign = 'left';

    const safeSeed = String(seed || 'run').replace(/[^a-z0-9-]/gi, '').slice(0, 24) || 'run';
    return canvasToFile(canvas, `am-i-crazy-${safeSeed}.png`);
  }

  // ---------- share ----------

  function saveFile(file) {
    try {
      const link = document.createElement('a');
      if (!('download' in link)) return false;
      const url = URL.createObjectURL(file);
      link.href = url;
      link.download = file.name;
      link.rel = 'noopener';
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      return true;
    } catch {
      return false;
    }
  }

  function canShareFiles(file) {
    try {
      return Boolean(file && navigator.share && navigator.canShare?.({ files: [file] }));
    } catch {
      return false;
    }
  }

  // NOTE: navigator.share must be called before any await so the click's
  // user activation is still valid (iOS Safari is strict about this).
  async function share(result, file) {
    const text = shareText(result);

    if (canShareFiles(file)) {
      try {
        await navigator.share({ title: name, text, files: [file] });
        return 'Shared! Now wait for the trash talk.';
      } catch (error) {
        if (error?.name === 'AbortError') return '';
        // fall through: some targets reject files; try text-only below
      }
    }

    if (navigator.share) {
      try {
        await navigator.share({ title: name, text });
        return 'Shared!';
      } catch (error) {
        if (error?.name === 'AbortError') return '';
      }
    }

    // Desktop / unsupported: copy the caption AND save the poster.
    const copied = await copyToClipboard(text);
    const saved = file ? saveFile(file) : false;
    if (copied && saved) return 'Poster saved + caption copied. Post both!';
    if (saved) return 'Poster PNG saved! Copy the challenge link below.';
    if (copied) return 'COPIED! PASTE IT IN THE GROUP CHAT ✓';
    return 'Select the challenge link below to copy it.';
  }

  // Warm the canvas fonts early so the first poster is never in fallbacks.
  try {
    const warm = () => { ensureFonts().catch(() => {}); };
    if (document.readyState === 'complete') warm();
    else addEventListener('load', warm, { once: true });
  } catch {}

  window.WP_SHARE = {
    verdictText,
    challengeURL,
    shortURL,
    shareText,
    copyText,
    makeImage,
    share,
    ensureFonts,
  };
})();
