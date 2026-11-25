# GEMINI.md: sound and truth for Into the Whirlpool

> **New: the full sound overhaul is in [`SOUND.md`](SOUND.md).** It covers music prompts for every era, a sound for every interaction, and the audio engine v2. It extends Mission 1 below.

*Into the Whirlpool* is an endless psychedelic fall through AI history (2012 to November 2026) and five years of predictions (2027 to 2031). It runs in the browser with three.js. ChatGPT is making the visuals (`assets/`, see `CHATGPT.md`). Claude maintains the engine (`index.html`, `main.js`, `mem.js`).

You have three missions. The first two are the big ones. Each has clear files you own, so nobody steps on anybody.

| Mission | You own | Do not touch |
|---|---|---|
| 1. The Score | `audio.js` | `main.js`, `mem.js`, `index.html` (except one `<button>` if you need it, see below) |
| 2. The Fact Desk | `sources.json`, `proposals.json`, factual fields in `data.js` | the structure of `data.js` |
| 3. Depth (stretch) | `tools/depth/`, `*-depth.png` files, the `depth` keys in `assets/manifest.json` | the images themselves |

Work on branches (`gemini/score`, `gemini/fact-desk`, `gemini/depth`) and open a pull request for each.

---

## Mission 1: The Score

Build a **generative, reactive soundtrack** that makes the fall feel like a trip. It must react to everything the viewer does and evolve across 20 years of timeline. This is the hard one; take it seriously.

### Constraints

- **One file: `audio.js`.** Plain JavaScript, no build step, no frameworks. It is loaded after `main.js`.
- **Web Audio API only.** Synthesise everything: oscillators, noise, filters, generated impulse responses. No sample files, so it stays small and loads instantly. (If you really need a sample, it must be generated or public-domain and under 200 KB total; justify it in the PR.)
- **Starts only after a user gesture.** Listen for `wp:start` (fired on the first tap, click or key), then create or resume the `AudioContext`.
- **Mute control.** Add one small sound toggle button: bottom-right corner, sitting just above the timeline (the timeline is about 70 px tall), 44 × 44 px, `aria-pressed`, an icon drawn with inline SVG. Create it from `audio.js` with DOM code rather than editing `index.html`. Remember the choice in `localStorage`, wrapped in `try/catch`; storage may be unavailable.
- **Performance budget:** at most about 24 simultaneous voices, under 6% CPU on a mid-range phone. Use a **look-ahead scheduler** (`AudioContext.currentTime` plus a short `setTimeout` loop), not `setInterval` for musical timing. Put a `DynamicsCompressorNode` limiter on the master bus. Suspend the context on `visibilitychange` when hidden.
- Expose exactly one global: `window.WP_AUDIO = { mute(), unmute(), get muted() }`.

### The contract with the engine

Read `window.WP.state` every animation frame (use your own `requestAnimationFrame` loop):

| Field | Meaning |
|---|---|
| `date` | current timeline date as a decimal year (2011.7 to 2032) |
| `prog` | 0 to 1 "madness" level: about 0.45 at November 2026, 1 at the end of 2031 |
| `slow` | 0 to 1: the user is holding to slow time |
| `pause` | 0 to 1: the detail panel is open |
| `spinV` | spin velocity from dragging (signed, roughly -3 to 3) |
| `focus` | the item whose vision is showing |
| `open` | the item open in the detail panel, or `null` |
| `started` | true after the first gesture |

Listen for these events on `window`. Each item has `k` (`h` milestone, `p` prediction, `n` real headline, `f` made-up headline), `y`, `m`, `t` (title) and `slug`.

| Event | `detail` | When |
|---|---|---|
| `wp:start` | none | first user gesture |
| `wp:word` | item | a milestone or prediction word spawns deep in the tunnel |
| `wp:year` | year number | a giant year sprite starts flying through |
| `wp:focus` | item | a new word becomes the readable one and its vision fades in |
| `wp:headline` | item | a headline enters the news ticker |
| `wp:open` / `wp:close` | item / none | the detail panel opens or closes |
| `wp:now` | none | the timeline crosses November 2026, where history ends and guesses begin |
| `wp:restart` | none | the cycle ends with a white flash and restarts at 2012 |

### The musical brief

The whole cycle lasts about four minutes. Compose for that arc:

1. **2012 to 2016, the quiet lab.** Sparse, cold, patient: a low sine drone, soft filtered noise like server fans, a few glassy notes. Minor-ish, lots of space.
2. **2017 to 2022, attention.** A pulse appears. Arpeggios that feel like "looking back over a sentence": short motifs that echo earlier notes, tied to `wp:word`. The harmony warms with the gold era.
3. **2023 to 2026, the boom.** Density rises fast. Brighter timbres, sidechain-style pumping, a hint of distortion. Headlines can trigger tiny percussive "ticker" blips (keep them subtle, or it gets annoying).
4. **`wp:now`: the crossing.** Your best moment. Something like a held breath, a key change or a sudden drop, then a new, stranger harmonic world for the predictions.
5. **2027 to 2031, the future.** Increasingly detuned, polyrhythmic, beautiful and unstable. The `prog` value drives detune, density, filter brightness and reverb size. By 2031 it should feel overwhelming but still musical.
6. **`wp:restart`:** a white-out swell into near silence, then back to the quiet lab.

Interaction must feel physical:

- **Hold (`slow` → 1):** a tape-slowdown feel. Pitch sags a little, a low-pass filter sweeps down, reverb blooms, the tempo stretches. Releasing snaps back with a small whoosh.
- **Drag (`spinV`):** stereo panning plus a filtered noise whoosh, louder for faster spins.
- **`wp:year`:** a deep, soft boom with a long tail, tuned to the current key.
- **`wp:focus`:** a gentle swell, or a chord change.
- **Panel open (`pause` → 1):** duck the music about 12 dB under a dreamy filter, and play a soft sustained tone that is different for milestones and predictions. Restore on close.

Quality bar: it should sound composed, not like random beeps. Pick a tonal centre and a scale per era and move through them deliberately. Clean levels, no clicks (ramp every gain change), no harsh frequencies above about 8 kHz at high levels.

### Done means

- [ ] Silent until the first gesture; the mute button works and is remembered
- [ ] Audible arc across eras; the `wp:now` crossing is unmistakable
- [ ] Hold, drag, open and close all have clear sonic responses
- [ ] No clicks, no clipping, no console errors; stable for ten minutes of looping
- [ ] Under budget on a phone (test in mobile Safari and Chrome)
- [ ] PR description explains the structure and how to tweak the mix

---

## Mission 2: The Fact Desk

The real history in `data.js` (items with `k: 'h'` and `k: 'n'`) must be right. Some items were written quickly. Be ruthless.

1. **Verify every real item**: the date (year and month), names, numbers and claims in `t`, `x` and `i`. Use primary sources where you can (papers on arXiv, official blog posts, court records, company announcements), then reputable press.
2. **Fix errors directly in `data.js`.** Only edit the factual text fields and `d`. Keep the structure, field names and the plain, short style. Do not change titles (`t`) unless they are wrong; titles generate the image slugs ChatGPT uses, so a title change needs a note in the PR.
3. **Write `sources.json`**, keyed by slug (see `tools/asset-list.js` for how slugs are made):

```json
{
  "2017-06-attention-is-all-you-need": [
    { "title": "Attention Is All You Need", "publisher": "arXiv", "url": "https://arxiv.org/abs/1706.03762", "date": "2017-06-12" }
  ]
}
```

   One to three sources per item. The detail panel already shows them as links once the file exists.
4. **Write `proposals.json`**: 15 to 25 real moments from 2012 to 2026 that are missing and deserve a place, in the same item format as `data.js`, each with sources. Include some strange or funny real headlines too. Don't merge them into `data.js`; Claude and the user will pick.
5. **Do not touch predictions** (`k: 'p'` and `k: 'f'`) except to flag one that has already come true or been proven wrong. Put those notes in the PR.

Done means: every real item has at least one source, every change is listed in the PR with its reason, and anything you could not confirm is marked "unverified" in the PR rather than guessed.

---

## Mission 3 (stretch): Depth

Once ChatGPT's visions start landing in `assets/visions/`, make them move in 2.5D.

- Write `tools/depth/make_depth.py`, which runs a monocular depth model (for example Depth Anything V2) over every `assets/visions/<slug>.jpg` that has no depth map yet.
- Output `<slug>-depth.png`: 1024 × 1024 greyscale, white = near, gently blurred so the parallax doesn't tear edges.
- Add `"depth": "<slug>-depth.png"` to that slug's entry in `assets/manifest.json`. Edit only the `depth` keys.
- Document how to run it in `tools/depth/README.md`.

---

## New: sounds for the game

The project is becoming a game; the plan is in [`GAME.md`](GAME.md). Score these new events in `audio.js`:

| Event | Sound |
|---|---|
| `wp:card` | soft paper whoosh |
| `wp:answer` (`correct: true`) | a rubber-stamp thud on a pitched note that climbs with `streak` |
| `wp:answer` (`correct: false`) | a tape-warble sag |
| `wp:streak` (every 5) | a short riser |
| `wp:crossing` | the same held breath as `wp:now`, longer |
| `wp:bet` | a tick per 5 points on the odds dial |
| `wp:result` | a print-out rattle, then a resolved chord |

Also read `WP.state.streak` and `WP.state.mode`. Also build the real-card bank: 40 more strange-but-true AI headlines (2012 to now) with sources, in the `cards.js` format from GAME.md section 4, on a branch `gemini/cards`.

## Ground rules for everyone

- Keep the vibe: wild on screen, accurate underneath.
- Never break the page. If `audio.js` throws, the visuals must keep running, so wrap your code in `try/catch`.
- To test locally, serve the folder (`python3 -m http.server`) and open `http://localhost:8000`. Hold, drag and tap words, open panels, and let it loop at least once.
