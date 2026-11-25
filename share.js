(() => {
  const name = 'Am I Crazy?';
  const legacyHost = 'into-the-whirlpool.vercel.app';
  const verdictText = {
    real: 'REAL',
    'made-up': 'MADE UP',
    'real-unproven': 'REAL, UNPROVEN',
  };

  function cleanHandle(raw) {
    return String(raw || '').toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 12);
  }

  function formatPts(n) {
    return Math.max(0, Math.round(Number(n) || 0)).toLocaleString('en-US');
  }

  function challengeURL(seed, points = 0, accuracy = 0, handle = '') {
    const canonical = document.querySelector('link[rel="canonical"]')?.href;
    const url = new URL(location.hostname === legacyHost && canonical ? canonical : location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('deck', seed);
    url.searchParams.set('pts', String(Math.max(0, Math.round(Number(points) || 0))));
    url.searchParams.set('acc', String(Math.max(0, Math.min(10, Math.round(Number(accuracy) || 0)))));
    const tag = cleanHandle(handle);
    if (tag && tag !== 'PLAYER') url.searchParams.set('by', tag);
    return url.href;
  }

  function displayURL(href) {
    return String(href || '').replace(/^https?:\/\//, '');
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

  function pickHighlightCard(result) {
    if (result.fooled) return { card: result.fooled, gotCooked: true };
    const realHit = (result.answers || []).find(a => a.card && a.card.verdict !== 'made-up');
    return realHit ? { card: realHit.card, gotCooked: false } : null;
  }

  function shareText(result) {
    const {
      answers = [],
      seed = '',
      points = 0,
      score = 0,
      best = 0,
      rank = { title: 'CAUTIOUSLY SANE' },
      handle = '',
      allInWins = 0,
      allInTotal = 0,
      jackpotsHit = 0,
    } = result;

    const tiles = answers.map(tileEmoji).join('');
    const url = challengeURL(seed, points, score, handle);
    const lines = [
      `AM I CRAZY? 🧠 ${formatPts(points)} PTS (${score}/10)`,
      `Rank: ${rank.title}`,
      tiles,
    ];

    const statBits = [`Streak: ${best}x`];
    if (allInTotal > 0) statBits.push(`All-In: ${allInWins}/${allInTotal} 💰`);
    else if (jackpotsHit > 0) statBits.push(`Jackpots: ${jackpotsHit}/2 ⭐`);
    lines.push(statBits.join(' | '));

    const highlight = pickHighlightCard(result);
    if (highlight) {
      const label = highlight.gotCooked ? 'Got cooked by' : 'Wildest real one I nailed';
      lines.push(`${label}: "${highlight.card.text}" (${verdictText[highlight.card.verdict]}!)`);
    }

    lines.push('Beat my score on this exact deck 👇');
    lines.push(url);
    return lines.join('\n');
  }

  async function copyText(result) {
    const text = shareText(result);
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return { ok: true, message: 'COPIED! PASTE IN CHAT ✓', text };
      } catch {}
    }
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
      document.body.append(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      if (ok) return { ok: true, message: 'COPIED! PASTE IN CHAT ✓', text };
    } catch {}
    return { ok: false, message: 'Select the challenge link below to copy it.', text };
  }

  function loadImage(file) {
    if (!file) return Promise.resolve(null);
    return new Promise(resolve => {
      const picture = new Image();
      picture.onload = () => resolve(picture);
      picture.onerror = () => resolve(null);
      picture.src = 'assets/ui/' + file;
    });
  }

  function wrapLines(ctx, text, maxWidth, maxLines) {
    const words = String(text || '').trim().split(/\s+/);
    const lines = [];
    let current = '';
    for (const word of words) {
      const candidate = current ? current + ' ' + word : word;
      if (current && ctx.measureText(candidate).width > maxWidth) {
        lines.push(current);
        current = word;
        if (lines.length === maxLines - 1) break;
      } else {
        current = candidate;
      }
    }
    const usedCount = lines.join(' ').split(/\s+/).filter(Boolean).length;
    const remaining = words.slice(usedCount).join(' ');
    if (lines.length < maxLines && remaining) {
      let last = remaining;
      while (last.length > 3 && ctx.measureText(last).width > maxWidth) {
        last = last.slice(0, -2).trimEnd() + '…';
      }
      lines.push(last);
    } else if (lines.length < maxLines && current) {
      lines.push(current);
    }
    return lines.slice(0, maxLines);
  }

  function fitFont(ctx, text, maxWidth, weight, startPx, minPx, family) {
    let size = startPx;
    while (size > minPx) {
      ctx.font = `${weight} ${size}px ${family}`;
      if (ctx.measureText(text).width <= maxWidth) break;
      size -= 2;
    }
    return size;
  }

  async function makeImage(result, ui = {}) {
    const {
      points = 0,
      score = 0,
      answers = [],
      best = 0,
      seed = '',
      kind = 'random',
      handle = '',
      rank = { title: 'CAUTIOUSLY SANE', sub: 'Halfway immune to AI slop.', tier: 'cyan' },
      allInWins = 0,
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
    const CYAN = '#00e5ff';
    const LIME = '#b8ff00';
    const RED = '#ff2e4c';
    const ORANGE = '#ff6b00';
    const GOLD = '#ffcc00';
    const DISPLAY = '"Big Shoulders Display", Impact, "Arial Narrow", sans-serif';
    const MONO = '"IBM Plex Mono", ui-monospace, monospace';

    const [art, wordmark] = await Promise.all([
      loadImage(ui['share-bg-1']),
      loadImage(ui.wordmark),
      document.fonts?.load(`900 120px ${DISPLAY}`).catch(() => {}),
      document.fonts?.load(`700 28px ${MONO}`).catch(() => {}),
    ]);

    // 0–1350: Outer Poster Frame
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, 1080, 1350);
    if (art) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.drawImage(art, 0, 0, 1080, 1350);
      ctx.restore();
    }

    // Hard offset pink shadow + newsprint inner card
    ctx.fillStyle = PINK;
    ctx.fillRect(62, 62, 984, 1254);
    ctx.fillStyle = PAPER;
    ctx.fillRect(48, 48, 984, 1254);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6;
    ctx.strokeRect(48, 48, 984, 1254);

    // 72–210: Masthead
    const shortSeed = seed ? '#' + seed.toUpperCase().slice(0, 10) : '#RANDOM';
    const modeTag = (kind === 'challenge' ? 'CHALLENGE RUN' : 'RANDOM DECK') + ' · ' + shortSeed;
    const tagHandle = cleanHandle(handle);

    if (wordmark) {
      const h = 118;
      const w = Math.min(420, h * (wordmark.naturalWidth / Math.max(1, wordmark.naturalHeight)));
      ctx.drawImage(wordmark, 84, 76, w, h);
    } else {
      ctx.font = `900 84px ${DISPLAY}`;
      ctx.fillStyle = PINK;
      ctx.fillText('AM I CRAZY?', 90, 162);
      ctx.fillStyle = INK;
      ctx.fillText('AM I CRAZY?', 84, 156);
    }

    // Right masthead pill + player tag
    ctx.font = `700 22px ${MONO}`;
    const pillW = Math.min(420, ctx.measureText(modeTag).width + 36);
    const pillX = 996 - pillW;
    ctx.fillStyle = INK;
    ctx.fillRect(pillX, 86, pillW, 44);
    ctx.fillStyle = YELLOW;
    ctx.textAlign = 'center';
    ctx.fillText(modeTag, pillX + pillW / 2, 116);

    ctx.textAlign = 'right';
    ctx.fillStyle = INK;
    ctx.font = `700 24px ${MONO}`;
    ctx.fillText(tagHandle && tagHandle !== 'PLAYER' ? `PLAYER: ${tagHandle}` : 'REAL OR MADE UP?', 996, 168);
    ctx.textAlign = 'left';

    // 225–425: Hero Points Block
    ctx.fillStyle = PINK;
    ctx.fillRect(92, 233, 912, 195);
    ctx.fillStyle = INK;
    ctx.fillRect(84, 225, 912, 195);
    ctx.strokeStyle = YELLOW;
    ctx.lineWidth = 5;
    ctx.strokeRect(84, 225, 912, 195);

    const ptsStr = `${formatPts(points)} PTS`;
    fitFont(ctx, ptsStr, 540, 900, 132, 74, DISPLAY);
    ctx.fillStyle = YELLOW;
    ctx.fillText(ptsStr, 114, 366);

    // Right stacked badges inside Hero slab
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 54px ${DISPLAY}`;
    ctx.fillText(`${score}/10 CORRECT`, 964, 294);

    ctx.fillStyle = ORANGE;
    ctx.font = `700 24px ${MONO}`;
    ctx.fillText(`🔥 ${best}X MAX STREAK`, 964, 342);

    ctx.fillStyle = LIME;
    const thirdStat = allInWins > 0
      ? `💰 ${allInWins} ALL-IN WIN${allInWins > 1 ? 'S' : ''}`
      : jackpotsHit > 0
        ? `⭐ ${jackpotsHit}/2 JACKPOTS`
        : '⚡ ARCADE RUN';
    ctx.fillText(thirdStat, 964, 386);
    ctx.textAlign = 'left';

    // 445–565: Rank Title Stamp
    const isGoldRank = rank.tier === 'gold' || rank.tier === 'foil';
    const bannerFill = isGoldRank ? GOLD : rank.tier === 'red' ? RED : rank.tier === 'lime' ? LIME : PINK;
    const bannerInk = (isGoldRank || rank.tier === 'lime') ? INK : '#ffffff';

    ctx.save();
    ctx.translate(540, 488);
    ctx.rotate(-1.5 * Math.PI / 180);
    ctx.fillStyle = INK;
    ctx.fillRect(-444, -38, 896, 84);
    ctx.fillStyle = bannerFill;
    ctx.fillRect(-452, -46, 896, 84);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.strokeRect(-452, -46, 896, 84);

    const rankTitle = String(rank.title || 'CAUTIOUSLY SANE').toUpperCase();
    fitFont(ctx, rankTitle, 840, 900, 62, 34, DISPLAY);
    ctx.fillStyle = bannerInk;
    ctx.textAlign = 'center';
    ctx.fillText(rankTitle, -4, 17);
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.fillStyle = INK;
    fitFont(ctx, rank.sub || '', 900, 600, 24, 17, MONO);
    ctx.fillText(rank.sub || '', 540, 562);
    ctx.textAlign = 'left';

    // 590–685: 10-Tile Result Strip
    const tileW = 78;
    const tileGap = 14;
    const startX = 87;
    const tileY = 594;
    answers.slice(0, 10).forEach((entry, index) => {
      const x = startX + index * (tileW + tileGap);
      const isMega = entry.correct && entry.isJackpot && entry.isAllIn;
      const isJpHit = entry.correct && entry.isJackpot;
      const isAllInHit = entry.correct && entry.isAllIn;
      const isBust = !entry.correct && (entry.busted || entry.isAllIn);

      if (isMega) {
        ctx.fillStyle = GOLD;
        ctx.fillRect(x, tileY, tileW, tileW);
        ctx.strokeStyle = PINK;
        ctx.lineWidth = 6;
        ctx.strokeRect(x + 2, tileY + 2, tileW - 4, tileW - 4);
      } else if (isJpHit) {
        ctx.fillStyle = GOLD;
        ctx.fillRect(x, tileY, tileW, tileW);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 4;
        ctx.strokeRect(x, tileY, tileW, tileW);
      } else if (isAllInHit) {
        ctx.fillStyle = INK;
        ctx.fillRect(x, tileY, tileW, tileW);
        ctx.strokeStyle = PINK;
        ctx.lineWidth = 6;
        ctx.strokeRect(x + 2, tileY + 2, tileW - 4, tileW - 4);
      } else if (entry.correct) {
        ctx.fillStyle = INK;
        ctx.fillRect(x, tileY, tileW, tileW);
        ctx.strokeStyle = (entry.streak || 0) >= 3 ? ORANGE : INK;
        ctx.lineWidth = 4;
        ctx.strokeRect(x, tileY, tileW, tileW);
      } else if (isBust) {
        ctx.fillStyle = RED;
        ctx.fillRect(x, tileY, tileW, tileW);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 4;
        ctx.strokeRect(x, tileY, tileW, tileW);
      } else {
        ctx.fillStyle = PAPER;
        ctx.fillRect(x, tileY, tileW, tileW);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 4;
        ctx.strokeRect(x, tileY, tileW, tileW);
      }

      ctx.textAlign = 'center';
      if (isMega) {
        ctx.fillStyle = INK;
        ctx.font = `900 38px ${DISPLAY}`;
        ctx.fillText('4X', x + tileW / 2, tileY + 52);
      } else if (isJpHit) {
        ctx.fillStyle = INK;
        ctx.font = `900 38px ${DISPLAY}`;
        ctx.fillText('2X', x + tileW / 2, tileY + 52);
      } else if (isAllInHit) {
        ctx.fillStyle = YELLOW;
        ctx.font = `900 40px ${DISPLAY}`;
        ctx.fillText('★', x + tileW / 2, tileY + 53);
      } else if (entry.correct) {
        ctx.fillStyle = LIME;
        ctx.font = `900 42px ${DISPLAY}`;
        ctx.fillText('✓', x + tileW / 2, tileY + 54);
      } else {
        ctx.fillStyle = isBust ? YELLOW : RED;
        ctx.font = `900 40px ${DISPLAY}`;
        ctx.fillText('✕', x + tileW / 2, tileY + 53);
      }
      ctx.textAlign = 'left';
    });

    // 720–1065: "THE ONE THAT GOT ME" Callout
    ctx.save();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 8]);
    ctx.beginPath();
    ctx.moveTo(84, 706);
    ctx.lineTo(996, 706);
    ctx.stroke();
    ctx.restore();

    const highlight = pickHighlightCard(result);
    const kicker = highlight?.gotCooked
      ? 'THE ONE THAT GOT ME 💀'
      : 'FLAWLESS 10/10 — WILDEST REAL ONE 🤯';
    ctx.fillStyle = INK;
    ctx.font = `700 24px ${MONO}`;
    const kickerW = ctx.measureText(kicker).width + 30;
    ctx.fillRect(84, 728, kickerW, 42);
    ctx.fillStyle = highlight?.gotCooked ? YELLOW : LIME;
    ctx.fillText(kicker, 99, 757);

    if (highlight?.card) {
      ctx.fillStyle = INK;
      ctx.font = `900 44px ${DISPLAY}`;
      const lines = wrapLines(ctx, highlight.card.text, 912, 4);
      let y = 824;
      for (const line of lines) {
        ctx.fillText(line, 84, y);
        y += 49;
      }

      // Tilted double-bordered rubber verdict stamp
      const v = highlight.card.verdict;
      const stampStr = verdictText[v] || 'REAL';
      const stampCol = v === 'made-up' ? '#c4002f' : v === 'real-unproven' ? '#a31368' : '#005a89';
      const stampY = Math.min(1038, y + 18);
      ctx.save();
      ctx.translate(84, stampY);
      ctx.rotate(-2.5 * Math.PI / 180);
      ctx.font = `900 34px ${DISPLAY}`;
      const sw = ctx.measureText(stampStr).width + 44;
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, -36, sw, 52);
      ctx.strokeStyle = stampCol;
      ctx.lineWidth = 4;
      ctx.strokeRect(0, -36, sw, 52);
      ctx.lineWidth = 2;
      ctx.strokeRect(5, -31, sw - 10, 42);
      ctx.fillStyle = stampCol;
      ctx.fillText(stampStr, 22, 2);
      ctx.restore();
    }

    // 1100–1265: Challenge Footer Bar
    ctx.fillStyle = INK;
    ctx.fillRect(92, 1112, 912, 158);
    ctx.fillStyle = YELLOW;
    ctx.fillRect(84, 1104, 912, 158);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 5;
    ctx.strokeRect(84, 1104, 912, 158);

    const cta = `CAN YOU BEAT ${formatPts(points)} PTS? PLAY THIS EXACT DECK →`;
    fitFont(ctx, cta, 864, 900, 36, 24, DISPLAY);
    ctx.fillStyle = INK;
    ctx.fillText(cta, 108, 1158);

    const url = displayURL(challengeURL(seed, points, score, handle));
    ctx.font = `700 22px ${MONO}`;
    const urlLines = url.length > 58 ? [url.slice(0, 58), url.slice(58, 116)] : [url];
    urlLines.forEach((line, i) => {
      ctx.fillText(line, 108, 1204 + i * 30);
    });

    return new Promise(resolve => canvas.toBlob(blob => {
      resolve(blob ? new File([blob], `am-i-crazy-${seed || 'run'}.png`, { type: 'image/png' }) : null);
    }, 'image/png'));
  }

  async function share(result, file) {
    const text = shareText(result);
    if (file && navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ title: name, text, files: [file] });
        return 'Shared!';
      } catch (error) {
        if (error.name === 'AbortError') return '';
      }
    }
    if (file) {
      const link = document.createElement('a');
      if ('download' in link) {
        const url = URL.createObjectURL(file);
        link.href = url;
        link.download = file.name;
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 30000);
        return 'Poster PNG saved!';
      }
    }
    const copied = await copyText(result);
    return copied.message;
  }

  window.WP_SHARE = { verdictText, challengeURL, shareText, copyText, makeImage, share };
})();
