# Am I Crazy?

An endless psychedelic fall through AI history, from AlexNet in 2012 to November 2026, then on into five years of predictions about AI-driven science (2027 to 2031). Milestones float out of a whirlpool, each with a faded "memory of the future" behind it. A news ticker runs real and made-up headlines, and a timeline at the bottom marks the months going past.

[Play Am I Crazy?](https://am-i-crazy.vercel.app/)

## Real or Made Up?

A rapid-fire, casino-arcade AI headline game set inside the whirlpool. Every run deals a fresh shuffled 10-card random deck of unhinged real AI incidents, viral oddities, unproven claims, and invented headlines — avoiding your last 35 seen cards so every round feels new.

- **Controls:** Swipe left (`←` / `A`) for **MADE UP**, right (`→` / `D`) for **REAL**, press `W` / `Shift` / `2` to arm **`2X ALL-IN`**, `Space` / `Enter` for Next, and `R` to instantly deal a fresh deck from the results screen.
- **Arcade Scoring:** Base `100 PTS` + Fast-Read Speed Bonus (`+50` ≤ 4s, `+25` ≤ 7s) × escalating **Streak Multiplier** (`1x → 1.5x → 2x → 3x → 4x → 5x MAX`) × **2 Gilded `2X JACKPOT` Rounds** per deck × optional **`2X ALL-IN`** double-or-nothing wager (`4X MEGA HIT` when stacked with a Jackpot, or `-150 PTS` bust + streak shatter on a miss).
- **3-Tier Fever Mode & Hall of Fame:** Streaks at 3+, 5+, and 7+ ignite Fever Mode with escalating visuals, particles, and Web Audio synth chimes. Runs save locally to your Top 10 **Hall of Fame** with an editable arcade tag, career stats, internet-native Rank Titles, and 1-click deck seed replays.
- **Spoiler-Safe Challenges:** Copy a Wordle-style emoji summary or share/save a 1080×1350 4:5 arcade score poster with a deterministic `?deck=` link so friends play the exact same 10 cards and Jackpot slots to beat your points (legacy `d2-`/`p2-`/v1 links remain backwards compatible). “Real, unproven” means the announcement happened while independent review was still pending; every real headline links to verified sources in its Case File.

**Explore controls:** tap a word, a headline or a timeline dot to open it (vision on the left, story on the right) · hold to slow time · drag to spin.

## Run it

No build step. Serve the folder and open it in a browser:

```
python3 -m http.server 8000
# then open http://localhost:8000
```

## Who does what

| Part | Owner | Files | Brief |
|---|---|---|---|
| Engine, whirlpool, code-built visions | Claude | `index.html`, `main.js`, `mem.js`, `data.js` structure | n/a |
| Photographic visions, textures, characters | ChatGPT | `assets/` | [`CHATGPT.md`](CHATGPT.md) |
| **The game: Real or Made Up? (build plan)** | ChatGPT | `game.js`, `cards.js`, `share.js`, `assets/ui/` | [`GAME.md`](GAME.md) |
| **Sound overhaul: music stems, a sound for everything** | Gemini | `audio.js`, `assets/audio/` | [`SOUND.md`](SOUND.md) |
| Generative soundtrack, fact-checking, depth maps | Gemini | `audio.js`, `sources.json`, `proposals.json`, `tools/depth/` | [`GEMINI.md`](GEMINI.md) |

## Preview deployment

Import the repository in Vercel with the Other preset and no build step. The game uses the repository root as the static directory. Pull-request branches can deploy as previews. For the game funnel, enable Web Analytics on a plan that supports custom events and add `<meta name="wp-web-analytics" content="enabled">` to `index.html`.

## Files

- `data.js`: every milestone, prediction and headline (date, kind, title, vision, explanation, insight, odds)
- `cards.js`, `headlines.js`: the original and expanded headline banks
- `game.js`, `share.js`, `game.css`: game flow, result image and layout
- `main.js`: the engine (tunnel, particles, floating words, ticker, timeline, detail panel, add-on hooks)
- `mem.js`: the code-built visions shown when no image exists yet
- `audio.js`: soundtrack slot (Gemini)
- `assets/manifest.json`: lists generated images; nothing in `assets/` loads unless it is listed here
- `sources.json`: citations shown in the detail panel (Gemini)
- `tools/asset-list.js`: prints the image checklist with the exact file slugs

Predictions and made-up headlines are speculative and labelled as such in the app.
