# Am I Crazy?

An endless psychedelic fall through AI history, from AlexNet in 2012 to November 2026, then on into five years of predictions about AI-driven science (2027 to 2031). Milestones float out of a whirlpool, each with a faded "memory of the future" behind it. A news ticker runs real and made-up headlines, and a timeline at the bottom marks the months going past.

[Play Am I Crazy?](https://am-i-crazy.vercel.app/)

## Real or Made Up?

Play ten cards from a 171-card feed of AI incidents, internet oddities, public claims, and invented headlines, then share your score or challenge a friend to the same deck. Swipe left for made up and right for real. Buttons and arrow keys work too. Reveals stay open until you press Next. “Real, unproven” means the announcement happened and the underlying claim was still under review at press time. Case files link to the original sources. The Crossing leads into six future predictions. Each comparison uses the recorded odds for that specific prediction. The ending adds your forecaster type and an AGI year estimated from your two AI-timeline bets.

The daily deck changes at midnight UTC. Practice draws use a random seed. Both can be replayed with their challenge link, including links from the original deck. Practice picks favor headlines you haven’t seen recently. Run history and per-card miss rates are stored on the current device. The first missed card breaks ties when prior statistics are unavailable.

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
