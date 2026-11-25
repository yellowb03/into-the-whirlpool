(() => {
  const name = 'Am I Crazy?';
  const legacyHost = 'into-the-whirlpool.vercel.app';
  const verdictText = {
    real: 'REAL',
    'made-up': 'MADE UP',
    'real-unproven': 'REAL, UNPROVEN',
  };

  function challengeURL(seed, score) {
    const canonical = document.querySelector('link[rel="canonical"]')?.href;
    const url = new URL(location.hostname === legacyHost && canonical ? canonical : location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('deck', seed);
    url.searchParams.set('vs', score);
    return url.href;
  }

  function shareText(result) {
    const { answers, seed, score, kind } = result;
    const squares = answers.map(({ correct }) => correct ? '■' : '□').join('');
    const key = answers.map(({ card }, index) => (index + 1) + ' ' + verdictText[card.verdict]).join(' · ');
    const forecast = result.forecast ? '\n' + result.forecast.type + ' · My AGI year: ' + result.forecast.agiYear : '';
    return name + ' #' + (kind === 'daily' ? 'D ' : 'P ') + score + '/10 ' + squares
      + forecast + '\n' + challengeURL(seed, score) + '\nAnswer key: ' + key;
  }

  function image(file) {
    if (!file) return null;
    return new Promise(resolve => {
      const picture = new Image();
      picture.onload = () => resolve(picture);
      picture.onerror = () => resolve(null);
      picture.src = 'assets/ui/' + file;
    });
  }

  function wrap(ctx, text, x, y, width, lineHeight) {
    let line = '';
    for (const word of text.split(/\s+/)) {
      const candidate = line ? line + ' ' + word : word;
      if (line && ctx.measureText(candidate).width > width) {
        ctx.fillText(line, x, y);
        y += lineHeight;
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) ctx.fillText(line, x, y);
    return y + lineHeight;
  }

  async function makeImage(result, ui) {
    const { score, answers, fooled, best, seed, kind } = result;
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const paper = '#f3e8d7';
    const ink = '#0d0b10';
    const pink = '#ff329b';
    const blue = '#00639b';
    const red = '#aa1731';
    const display = '900 76px "Big Shoulders Display", Impact, sans-serif';
    const mono = '600 28px "IBM Plex Mono", monospace';
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, 1080, 1350);
    const [art, wordmark] = await Promise.all([
      image(ui['share-bg-1']),
      image(ui.wordmark),
      document.fonts?.load(display).catch(() => {}),
    ]);
    if (art) ctx.drawImage(art, 0, 0, 1080, 1350);
    ctx.fillStyle = paper;
    ctx.fillRect(56, 52, 968, 1246);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 5;
    ctx.strokeRect(56, 52, 968, 1246);
    const gameMode = kind === 'daily' ? 'DAILY' : kind.toUpperCase();
    if (wordmark) {
      const height = 138;
      ctx.drawImage(wordmark, 99, 77, height * wordmark.naturalWidth / wordmark.naturalHeight, height);
      ctx.fillStyle = pink;
      ctx.fillRect(328, 91, 5, 110);
      ctx.fillStyle = ink;
      ctx.font = mono;
      ctx.fillText('REAL OR MADE UP?', 363, 139);
      ctx.fillText(gameMode, 363, 179);
    } else {
      ctx.font = display;
      ctx.fillStyle = pink;
      ctx.fillText(name, 105, 151);
      ctx.fillStyle = ink;
      ctx.fillText(name, 99, 145);
      ctx.font = mono;
      ctx.fillText('REAL OR MADE UP?  /  ' + gameMode, 99, 197);
    }
    ctx.font = '900 156px "Big Shoulders Display", Impact, sans-serif';
    ctx.fillText(score + '/10', 99, 365);
    ctx.font = mono;
    ctx.fillText('Best streak  ' + best, 550, 347);
    answers.forEach(({ card, correct }, index) => {
      const x = 100 + index * 89;
      ctx.lineWidth = card.verdict === 'real-unproven' ? 6 : 3;
      ctx.strokeStyle = card.verdict === 'real-unproven' ? '#bb196e' : ink;
      if (correct) {
        ctx.fillStyle = ink;
        ctx.fillRect(x, 400, 60, 60);
      }
      ctx.strokeRect(x, 400, 60, 60);
    });

    const forecastOffset = result.forecast ? 83 : 0;
    if (result.forecast) {
      ctx.fillStyle = ink;
      ctx.font = '900 48px "Big Shoulders Display", sans-serif';
      ctx.fillText(result.forecast.type, 99, 530);
      ctx.font = mono;
      ctx.fillText('My AGI year: ' + result.forecast.agiYear, 590, 530);
    }

    ctx.fillStyle = ink;
    ctx.font = '700 25px "IBM Plex Mono", monospace';
    ctx.fillText(fooled ? 'THE ONE THAT FOOLED ME' : 'NOTHING GOT PAST ME', 99, 531 + forecastOffset);
    let y = 586 + forecastOffset;
    if (fooled) {
      ctx.font = '900 ' + (result.forecast ? 34 : 46) + 'px "Big Shoulders Display", Impact, sans-serif';
      y = wrap(ctx, fooled.text, 99, y, 880, result.forecast ? 39 : 51);
      ctx.font = mono;
      ctx.fillStyle = fooled.verdict === 'made-up' ? red : fooled.verdict === 'real-unproven' ? '#a31368' : blue;
      const stamp = verdictText[fooled.verdict];
      ctx.lineWidth = 3;
      ctx.strokeStyle = ctx.fillStyle;
      ctx.strokeRect(99, y - 28, ctx.measureText(stamp).width + 32, 45);
      ctx.fillText(stamp, 114, y + 3);
    }

    ctx.fillStyle = ink;
    ctx.font = mono;
    ctx.fillText('ANSWER KEY', 99, 869);
    answers.forEach(({ card }, index) => {
      ctx.fillStyle = card.verdict === 'made-up' ? red : card.verdict === 'real-unproven' ? '#a31368' : blue;
      const number = String(index + 1).padStart(2, '0');
      ctx.fillText(number + '  ' + verdictText[card.verdict], 99 + (index >= 5 ? 465 : 0), 912 + (index % 5) * 45);
    });
    ctx.font = '700 24px "IBM Plex Mono", monospace';
    ctx.fillStyle = ink;
    ctx.fillText('PLAY THIS DECK', 99, 1166);
    const url = challengeURL(seed, score);
    for (let offset = 0; offset < url.length && offset < 160; offset += 58) {
      ctx.fillText(url.slice(offset, offset + 58), 99, 1206 + offset / 58 * 26);
    }
    return new Promise(resolve => canvas.toBlob(blob => {
      resolve(blob ? new File([blob], 'am-i-crazy-' + seed + '.png', { type: 'image/png' }) : null);
    }, 'image/png'));
  }

  async function share(result, file) {
    const text = shareText(result);
    if (file && navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ title: name, text, files: [file] });
        return 'Shared.';
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
        return 'Share card downloaded.';
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      return 'Result and challenge link copied.';
    } catch {
      return 'Select the challenge link below to copy it.';
    }
  }

  window.WP_SHARE = { verdictText, challengeURL, makeImage, share };
})();
