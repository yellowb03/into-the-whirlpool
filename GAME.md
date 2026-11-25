# GAME.md: Am I Crazy? game design

**For ChatGPT.** You are now building the game as well as the art. Read this whole file, then `CHATGPT.md` (art rules), `README.md` (file map) and `GEMINI.md` (sound contract). Work in phases, one branch and one pull request per phase (`chatgpt/game-phase-1`, and so on). Never push straight to `main`.

---

## 1. The idea in one breath

Reality is now crazier than fiction. The game asks whether you can tell the difference, then asks you to bet on the future.

- **Act 1, The Record (2012 to now): "Real or Made Up?"** Cards fall out of the whirlpool. Swipe right for real, left for made up. Real AI history is absurd enough that people get it wrong, and that surprise is the hook.
- **The Crossing (November 2026).** The fall stops dead. "Everything from here is a guess. Your turn."
- **Act 3, The Bet (2027 to 2031).** For each prediction the player drags their own odds. Then they see Claude's odds, AI 2027's and Metaculus's.
- **The ending.** The player gets their AGI year, their forecaster type, one of five endings chosen by their bets, and a share card.
- **The comeback.** Bets are saved. As reality resolves them, the game grades the player against the named forecasters.

The viral loop: play (3 to 5 minutes), hit a "wait, this is REAL?" moment, get an identity result, share the card with a challenge link, and a friend plays the same deck.

---

## 2. Non-negotiable rules

1. **Fakes must never escape as misinformation.** A made-up headline must never name a real person or a real company. Every made-up card shows a MADE UP stamp whenever it is revealed, and that stamp is baked into any image that can be saved or shared. Share cards always include the answers.
2. **"Real" means it was really announced, not that it is true.** Claims nobody has verified (VP ≠ VNP, the Riemann proof) get a third verdict, **REAL, UNPROVEN**. Swiping "real" scores as correct, but the reveal makes the nuance obvious.
3. **Every real card has a source** (from `sources.json`, maintained by Gemini). No source, no card.
4. **Phones first.** Design and test at 390 × 844 before desktop. Use 44 px touch targets, one thumb, no hover-only behaviour.
5. **Animate only `transform` and `opacity`.** Hold 60 fps on a mid-range phone. Every animation has a `prefers-reduced-motion` version (usually a 150 ms opacity fade).
6. **UI text stays live HTML text,** never baked into images, except decorative art: stamps, the wordmark, card backs. Give those `aria-label`s.
7. **Don't break what exists.** The whirlpool, visions, ticker, ruler, case files and audio hooks all keep working. Free-roam mode stays as "Explore" after the game.
8. **Credit stays honest.** Commit messages and the in-game credits say who made what: Briam, Claude, ChatGPT, Gemini.

---

## 3. How the current code works (read before changing anything)

| File | What it does | Notes for you |
|---|---|---|
| `index.html` | Page shell, all CSS, cover, ticker, ruler canvas, case-file panel | Design tokens are the CSS variables at the top (`--paper`, `--pink`, `--blue`, `--yellow`, `--red`) |
| `data.js` | Every item: `d` date, `k` kind (`h` milestone, `p` my prediction, `s` their forecast, `n` real headline, `f` made-up headline), `t` title, `v` vision, `x`/`i` text, `o` odds, `who` | Slugs come from date + title (see `tools/asset-list.js`) |
| `main.js` | Engine: tunnel shader, particles, floating words, visions, ticker, ruler, case file, input, main loop | Key functions: `openItem(it)`, `closePanel()`, `travel(date, settle)`, `spawnWord(it)`, `textTex()`, `drawTimeline()`, `layoutPanel()`, `frame()` |
| `mem.js` | Visions built in code (fallback when no image exists) | `WP_initMem` returns `MEM` |
| `audio.js` | Gemini's soundtrack | Listens to `wp:*` events and reads `window.WP.state` |
| `assets/manifest.json` | Lists the images the engine may load | Nothing in `assets/` appears unless it is listed here |

The add-on contract lives in `main.js`: `window.WP = { items, state, emit(name, detail) }`. Events fire on `window` as `wp:<name>`. **Extend this contract and don't bypass it**, so the audio and any future add-ons can react to the game.

---

## 4. Architecture for the game

Add three files. Keep `main.js` changes small and explicit.

- **`game.js`**: the mode controller (a state machine), the swipe cards, scoring, acts, the results screen and persistence. Loaded after `main.js` and before `audio.js`.
- **`cards.js`**: the card deck (format below).
- **`share.js`**: draws the share card on a canvas, then shares or saves it.

**Expose an API from `main.js`** (around the existing `window.WP`; wire each entry to the existing function):

```js
WP.api = {
  openItem, closePanel,            // case file
  travel,                          // jump the whirlpool to a date: travel(2019.4, true)
  setPaused(on),                   // freeze the fall (used by The Crossing)
  setMode(m),                      // 'explore' | 'game': in game mode, floating-word spawning stops and game.js drives the date
  setIntensity(x),                 // 0..1, overrides prog-driven madness: streak drives the vortex
  glitch(ms),                      // trigger the misregistration and RGB-split effect
};
```

**State machine in `game.js`:**

```
COVER → INTRO → ACT1 (cards) → CROSSING → ACT3 (bets) → RESULT → [EXPLORE | REPLAY | DAILY]
```

Each state has `enter()`, `exit()` and `update(dt)`. Transitions are choreographed animations (section 7), never instant swaps.

**New events to emit** (Gemini will score them): `wp:card` (card shown), `wp:answer` `{correct, streak, verdict}`, `wp:streak` `{n}`, `wp:crossing`, `wp:bet` `{slug, odds}`, `wp:result` `{type, agiYear, score}`.

Also add to `WP.state`: `mode`, `streak`, `score`, `act`.

### Card format (`cards.js`)

```js
window.WP_CARDS = [
  { id:'tungsten-cubes', text:'An AI ran an office snack shop, stockpiled tungsten cubes and insisted it wore a blazer',
    verdict:'real', date:'2025-06', slug:'2025-06-claude-runs-an-office-snack-shop-stockpiles-tungsten-c', sources:['…'] },
  { id:'erdos-grad-students', text:'Mathematicians ask AI to leave some Erdős problems for the grad students',
    verdict:'made-up', date:'2027-02', note:'Plausible: once easy problems go, training mathematicians gets harder.' },
  { id:'vp-vnp', text:'Two AI labs post rival proofs of a 47-year-old conjecture five hours apart',
    verdict:'real-unproven', date:'2026-11', slug:'2026-11-openai-posts-its-own-vp-vnp-proof-five-hours-aft' }
]
```

- `verdict`: `real` | `made-up` | `real-unproven`.
- `slug` links to an existing `data.js` item, so the vision and case file can be reused.
- **Phase 1 deck: 40 cards.** Start from the 25 real and 10 made-up headlines already in `data.js`. Rewrite each as a punchy one-liner that doesn't give away the answer, and add **15 new made-up cards**.
- **Writing a good fake:** it should sound exactly as absurd as reality. Match the tone of the real ones. No real names. Aim for about 50% of players being fooled. Test each one on yourself: if it is obviously a joke, sharpen it.
- **Writing a good real card:** lead with the most unbelievable true detail.

---

## 5. Phase 1: "Real or Made Up?" (ship in 2 to 3 days)

Goal: a complete, shareable 10-card run, live on its own URL.

**Step 1. Game mode in the engine.** Add `WP.api` and `setMode('game')`. In game mode, floating-word spawning stops, the ruler stays visible but read-only, and `travel(date)` moves the vortex to each card's date with a smooth glide (section 7, "time glide").

**Step 2. The card component.** A DOM element made of paper (the `card-front` asset), about 86 vw wide and at most 420 px. It has:
- the card text in Big Shoulders Display (900), 34 to 44 px;
- a small mono date line;
- two big buttons, `← MADE UP` and `REAL →` (44 px or taller), plus swipe;
- keyboard support: left and right arrows.

**Step 3. Swipe physics.** Use pointer events with `touch-action: none` on the card.
- Rotation = dx × 0.06 deg, capped at 18°. A REAL or MADE UP ghost stamp fades in according to |dx|.
- Commit when |dx| > 28% of the width, or when the fling speed is over 0.6 px/ms.
- Otherwise spring back (stiffness 400, damping 28).

**Step 4. The reveal.**
1. The verdict stamp slams onto the card (section 7, "stamp slam").
2. Right answer: the streak counter ticks up, `setIntensity` rises, and `wp:answer` fires.
3. Wrong answer: `glitch(220)` plus a 6 px screen shake.
4. A one-line explanation slides up under the card.
5. Below it, a "case file →" link opens the existing case file through `openItem`.
6. Keep the reveal open until the player presses Next. Opening and closing the case file returns to the same reveal.

**Step 5. Run structure.** 10 cards per run, in date order. The whirlpool travels between their dates, so the player feels time moving.
- Picking the 10: 4 real, 4 made up and 2 real-unproven, drawn from the 40 with a seeded PRNG.
- Daily deck: seed = `YYYYMMDD`, the same for everyone.
- Practice deck: random seed.

**Step 6. The result screen.** Show the score (/10), the best streak, and "the one that fooled you most" (the card most people get wrong that this player also got wrong). Under that, a grid of squares: filled for right, hollow for wrong, outlined pink for unproven.

**Step 7. The share card (`share.js`).**
- Draw a 1080 × 1350 canvas with the share-card background asset: score, grid, "the one that fooled me", the wordmark and the URL.
- Every made-up card that appears is stamped MADE UP.
- Use `navigator.share({ files })` where supported. Otherwise, try a download (a blob link), then fall back to copying the text grid to the clipboard.
- Text version: `Am I Crazy? #D 7/10 ■■□■■■□■■■` plus the link.

**Step 8. Challenge links.** `?deck=<seed>&vs=<score>`. Opening one plays that exact deck and shows "Beat 7/10" on the intro.

**Step 9. Saving progress.** In `localStorage` (wrapped in `try/catch`), store: the last daily played, all-time stats, and per-card answers for the stats in section 10.

**Step 10. Deploy** (section 9).

**Done means:** a full run works on a phone with swipe and with buttons; the share card shares on Android and iOS; the challenge link reproduces the deck; there are no console errors; reduced motion works; and Explore mode still works after a run.

---

## 6. Phase 2: The Crossing, The Bet, endings (week 2)

**The Crossing.**
1. After the last real card, the vortex freezes, saturation drops to 0 over 600 ms, and the audio ducks.
2. A white crack line draws across the screen (an SVG path).
3. The text "Everything from here is a guess." types in, letter by letter, in mono.
4. Then a slow spin up into the future palette.
5. Emit `wp:crossing`.

**The Bet.** Six predictions per run (mixed `p` and `s` items).
- Each shows the claim and the odds dial: a horizontal riso ruler from 0 to 100 with snap points every 5, a big number that rolls as it moves, and a haptic tick on Android (`navigator.vibrate(8)`).
- After the player locks in, reveal three markers on the same ruler: **Claude** (my `o`), **the forecaster** (`s` items), and **the crowd**. The crowd is real aggregate data from saved answers once you have a backend; until then, hide the crowd marker.

**Forecaster type.** Map the mean bet and its spread to five types. Each has a portrait (the existing characters plus new ones) and a one-line read:

| Type | Bets |
|---|---|
| The Witness | calibrated, mid odds |
| The Swimmer | high odds on everything |
| The Archivist | low odds, sceptical |
| The Child of 2031 | high spread, wild |
| The Clockmaker | a new character; bets track the trend lines |

**AGI year.** Calculate it from the player's odds on the "superhuman AI researcher" and "25% chance of AGI" cards, roughly mapped to 2027 to 2040. Show it as huge type: "My AGI year: 2030."

**Five endings.** The ending is chosen by the player's type. Each is a full-screen scene (ChatGPT art) with a slow parallax, a single sentence, and the final question: "Who is discovering whom?"

**Done means:** a full run from 2012 through the bets to an ending; the share card includes the AGI year and type.

---

## 7. Motion design: animations for everything

Motion should feel physical: paper, ink, springs, weight. Nothing floats aimlessly, and nothing snaps without a reason.

### Tokens (put these in CSS variables and a JS module)

| Token | Value | Use |
|---|---|---|
| `--ease-out` | `cubic-bezier(.16,1,.3,1)` | things arriving |
| `--ease-in` | `cubic-bezier(.7,0,.84,0)` | things leaving |
| `--ease-io` | `cubic-bezier(.65,0,.35,1)` | moves across the screen |
| `spring-snappy` | stiffness 420, damping 30 | cards, stamps |
| `spring-soft` | stiffness 180, damping 22 | panels, Polaroids |
| `t-micro` | 120 ms | presses, ticks |
| `t-ui` | 240 ms | most UI |
| `t-scene` | 600–900 ms | act transitions |

Write one tiny spring helper (damped harmonic oscillator, stepped by `requestAnimationFrame`) and use it everywhere. Use the Web Animations API for one-shot effects. No animation libraries unless one really pays for itself.

### Every element

| Element | Animation | Reduced motion |
|---|---|---|
| Cover | Paper peels up from the bottom edge with a slight curl (`rotateX` + `translateY`, `--ease-in`, 700 ms); the whirlpool spins up underneath | fade, 200 ms |
| Card enter | Rises out of the vortex centre: scale 0.55→1, blur 6px→0, `spring-snappy`, rotation settles from ±6° | fade |
| Card drag | Follows the finger with a 1:1 feel, tilts with dx, a slight lift shadow, the ghost stamp fades in | same, without tilt |
| Card commit | Flung off-screen along its velocity with a spin, 260 ms `--ease-in`; the next card enters 80 ms later | fade |
| Stamp slam | Scales 1.8→1 and rotates −14°→−6° in 140 ms, then a 2-frame squash; an ink-splatter PNG flashes at 60% opacity for 200 ms; 4 px screen shake (wrong answers: 8 px) | stamp appears, no shake |
| Streak counter | Odometer roll per digit; on every fifth streak a burst of riso confetti (8 to 12 paper bits with physics) | number change |
| Wrong answer | `glitch(220)`: riso layers misregister to ±6 px, RGB split, one dropped frame of noise | brief red outline |
| Explanation line | Slides up 12 px and fades in, `--ease-out` 240 ms | fade |
| Time glide | `travel()` eases the date over 900 ms (`--ease-io`), the ruler scrolls with it, the year sprite flies through | jump |
| Case file open | Paper slides up from 40 px below, `spring-soft`; the Polaroid drops in on its clip 120 ms later with an overshoot rotation of −6°→−2.4°; the clip "bites" with a 2 px dip | fade |
| Polaroid zoom | FLIP from corner to centre, `spring-soft`, rotation to 0 | fade |
| Ticker | Constant crawl; a new headline arrives with a brief yellow highlight wipe | static list |
| Ruler | Inertial scrolling with friction 0.92; tick marks pass by; the date box flips digits like a split-flap display | jump |
| Odds dial | Thumb follows the finger, snaps every 5 with a micro bounce; the big number rolls; the expert markers drop in one by one, 150 ms apart, `spring-snappy` | static markers |
| Crossing | See section 6; the whole sequence takes about 3.5 s and is skippable with a tap | cut to text |
| Result | The share card "prints": feeds out of a slot at the top of the screen with a slight jitter, line by line, like a receipt printer (900 ms); the score counts up | fade |
| Buttons | Press: scale 0.96 plus the shadow offset shrinking from 4 px to 1 px (120 ms); release springs back | colour change only |
| Loading | Riso registration marks spin; visions fade in when ready, never pop | static marks |

**Performance:** keep a maximum of two layered DOM animations during swipes. Promote cards with `will-change: transform` only while dragging. Test with CPU throttling at 4×.

---

## 8. Visual step-up: the UI kit you generate

Everything should feel like a real printed object that has been scanned: paper grain, ink spread, registration error, the odd stray fibre. Follow the "memories of the future" rules in `CHATGPT.md` for photos. For UI, follow risograph print rules:

- **Inks:** fluoro pink `#ff48b0`, blue `#0078bf`, yellow `#ffe800`, red `#f15060`, black.
- **Paper:** off-white `#efeae0`.

Use real scanned texture, with no gradients or glows. Export PNGs with real alpha at 2× resolution, under 200 KB each (WebP if larger). Put them in `assets/ui/`, list them in the manifest under a new `"ui"` key, and make a contact sheet `assets/ui/_sheet.jpg` so humans can review the set.

| File | Size (2×) | Description |
|---|---|---|
| `wordmark.png` | 1600×520 | "Am I Crazy?" in condensed black display type with a handwritten pink m printed over the A and I |
| `card-front.png` | 900×1200, 9-slice-friendly margins of 60 px | heavy uncoated card stock, faint fibres, a subtle corner crease |
| `card-back.png` | 900×1200 | riso pattern: concentric whirlpool halftone in pink and blue |
| `stamp-real.png`, `stamp-made-up.png`, `stamp-unproven.png`, `stamp-forecast.png`, `stamp-on-record.png` | 900×360 each | rubber stamps with uneven ink, worn edges, double border. Colours: real = blue, made up = red, unproven = pink, forecast = black, on record = red |
| `ink-splatter-1..3.png` | 600×600 | ink splats and spatter to flash behind a stamp |
| `clip.png` | 220×200 | the black binder clip, photographed, to replace the CSS one |
| `polaroid-frame.png` | 700×840 | an empty Polaroid frame with a transparent window, slightly yellowed, a faint thumb smudge |
| `tape-1..3.png` | 400×140 | strips of masking tape |
| `paper-sheet.png` | 1600×2200, tileable centre | the case-file paper with typewriter-era grain |
| `confetti-1..8.png` | 120×120 | cut paper bits in the four inks |
| `button-real.png`, `button-made-up.png` | 600×180 | printed sticker buttons, slightly lifted at one corner. **No text**; the label is HTML on top |
| `icons.png` | sprite sheet 8×128 px | sound on, sound off, share, close, arrow left, arrow right, replay, explore, as cut-paper or riso icons, black |
| `odds-ruler.png` | 2000×240 | a printed ruler strip 0 to 100 with tick marks (numbers live in HTML), for the odds dial |
| `share-bg-1..3.png` | 1080×1350 | share card backgrounds: a riso poster with whirlpool halftone and space for the score, grid and text (all drawn later in code) |
| `crossing-crack.png` | 2400×400 | a white tear or crack, for The Crossing |
| `ending-witness.jpg`, `ending-swimmer.jpg`, `ending-archivist.jpg`, `ending-child.jpg`, `ending-clockmaker.jpg` | 1600×2000 | the five ending scenes, photographic and uncanny ("memories of the future"), centred subject, space at the top for a line of text |
| `type-*.png` | 768 tall, transparent | forecaster-type portraits (reuse the four characters; add The Clockmaker: an old watchmaker figure made of brass and ticking ruler strips) |
| `og-image.jpg` | 1200×630 | link preview for the site: the wordmark over the whirlpool, "Real or Made Up?" in big type |

**Rules for UI assets:** no real logos or people. Stamps and the wordmark are the only images that contain text. Keep it consistent: generate a style sheet image first, then every asset with that sheet as the reference.

---

## 9. Hosting and launch

The claude.ai artifact page is a sandbox: it blocks downloads and the phone share sheet, so it can't run the share card. The game needs its own URL.

1. **Vercel (recommended):** Briam imports `yellowb03/into-the-whirlpool` at vercel.com/new as a static site, with no build step. Every merge to `main` then deploys automatically, and each pull request gets its own preview URL to test on a phone.
2. Add `vercel.json` with long cache headers for `assets/` and short ones for `*.js`.
3. Add Open Graph and Twitter meta tags (`og-image.jpg`, title "Am I Crazy? — The AI Headline Game", a one-line description).
4. Turn on Vercel Web Analytics. Track `run_start`, `card_answer` (card id, correct), `run_end` (score), `share_click` and `challenge_open`.
5. **Timing:** the Riemann and VP ≠ VNP stories are this week's news. Ship Phase 1 fast; the hook fades in days.
6. **Launch:**
   - **Show HN:** "Show HN: Real or made up? AI history is now stranger than fiction".
   - **Communities and social:** r/singularity, AI Twitter, Threads.
   - **Short video:** 20-second screen recordings for TikTok and Reels, each ending on a "this is REAL" reveal.

---

## 10. Tuning after launch

- For each card, track the fool rate (the share of players who got it wrong). Keep cards between 35% and 65%. Retire cards everyone gets right. Rewrite fakes that fool almost nobody.
- Watch these funnel numbers: cover → first swipe → card 10 → result → share. A share rate under 5% means the result card isn't proud enough; make it more personal.
- Refresh the daily decks weekly with new real headlines from Gemini's fact desk.

---

## 11. Phase 3 (later): reality grades the bets

Store bets with a timestamp. Keep a `resolutions.json` (maintained by Gemini) with `{slug, resolved: true|false, outcome, date, source}`. On return, show "Reality checked 2 of your bets" with a Brier score against Claude and the named forecasters. This needs a tiny backend for crowd stats and leaderboards (Vercel KV or Supabase). Plan it, but don't build it before Phases 1 and 2 are solid.

---

## 12. Who owns what now

| Area | Owner |
|---|---|
| Game code, UI kit, card writing, endings art | ChatGPT |
| Real cards and sources, resolution tracking, sound for the new `wp:*` events | Gemini (see `GEMINI.md`; new events are listed in section 4) |
| Engine reviews, merges, fixes when something breaks | Claude, when Briam asks |
| Final calls on taste and tone | Briam |
