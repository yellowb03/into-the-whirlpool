# Am I Crazy?

**The AI headline game.** Real AI news is completely unhinged. Each run deals a shuffled 10-card deck of AI headlines: some real, some "real, unproven", some made up. Swipe **REAL** or **MADE UP**, build streaks, gamble on 2X ALL-IN, and send your deck to a friend to see who reads the news better.

Play: **https://am-i-crazy.vercel.app/**

Behind the game sits an endless risograph-style whirlpool through AI history, from AlexNet in 2012 to today and on into five years of clearly labelled predictions (2027 to 2031).

## How to play

| Action | Touch | Keyboard |
|---|---|---|
| Call it **MADE UP** | swipe left | `←` or `A` |
| Call it **REAL** | swipe right | `→` or `D` |
| Arm **2X ALL-IN** (double or nothing) | tap the ALL-IN button | `W`, `Shift` or `2` |
| Next card | tap Next | `Space` or `Enter` |
| Deal a fresh deck from the results screen | tap Play again | `R` |

**Scoring.** Each correct call is worth 100 points, plus a speed bonus (+50 within 4 s, +25 within 7 s). A streak multiplier climbs from 1x to 5x. Every deck hides two gilded **2X JACKPOT** cards. ALL-IN doubles a hit (4X when it lands on a Jackpot) and costs 150 points and your streak on a miss.

**Fever Mode and Hall of Fame.** Streaks of 3, 5 and 7 escalate the visuals and sound. Runs are saved on your device (localStorage only) to a Top 10 Hall of Fame with an editable tag, career stats and one-click deck replays.

**Challenges.** The results screen copies a spoiler-free emoji summary or saves a 1080x1350 score poster. The challenge link carries `?deck=` (the seed), `pts`, `acc` and an optional `by` tag, so a friend plays the exact same 10 cards and Jackpot slots. Older `d2-`, `p2-` and v1 links still work.

**Explore mode.** Tap a floating word, a ticker headline or a timeline dot to open that moment; hold to slow time; drag to spin; drag the ruler to time travel.

## Content and sourcing policy

- Every card marked **REAL** links to at least one independent `https://` source. Cards without a valid source are dropped from the deck at load time.
- **Real, unproven** means the announcement or claim really happened, but independent review was still pending when the card was written.
- **Made up** headlines are written for the game. They are fiction and are always revealed as fiction after you answer.
- Predictions (2027 to 2031) in explore mode are speculation and are labelled as such.
- Spotted a wrong verdict or a dead source? Open an issue with the card text and a link.

## Run locally

No build step and no dependencies. Serve the folder with any static server:

```
python3 -m http.server 8000
# open http://localhost:8000
```

`python -m http.server` does not apply the headers in `vercel.json` (CSP, caching). To test the security headers locally, run `npx vercel dev`, or deploy a preview.

## Deploy

The site is plain static files served by Vercel from the repository root.

1. Import the repository in Vercel. Framework preset: **Other**. No build command, no output directory.
2. Every push to `main` deploys to production; pull-request branches get preview URLs.
3. `vercel.json` sets the security headers and cache policy. `.vercelignore` is an allowlist: only the runtime files it names are uploaded. **If you add a new top-level runtime file or folder, add it to `.vercelignore`**, or it will 404 in production.

### Caching and cache busting

| Path | Cache-Control | Why |
|---|---|---|
| `/`, `*.html`, `*.js`, `*.css`, `*.json` | `public, max-age=0, must-revalidate` | Files have no content hashes, so browsers revalidate (cheap 304 from the CDN) and never run mismatched versions after a deploy. |
| `/assets/**` images and audio | `public, max-age=2592000, stale-while-revalidate=604800` | 30 days. Asset files are rarely replaced in place. **If you change an image or sound, give it a new file name** (and update `assets/manifest.json` or `assets/audio/manifest.json`). |
| `site.webmanifest`, `robots.txt`, `sitemap.xml`, icons | `public, max-age=86400` | One day. |

The local `<script>` tags in `index.html` share one `?v=` number. Bump them together when you ship script changes; it protects against intermediary caches that ignore `must-revalidate`. The three.js files are pinned to `three@0.128.0` on jsDelivr with Subresource Integrity hashes; if you change the version, recompute the hashes:

```
curl -sL https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js | openssl dgst -sha384 -binary | openssl base64 -A
```

### Content Security Policy

Scripts may load only from the site itself and `cdn.jsdelivr.net` (no inline scripts, no `eval`). Styles allow `'unsafe-inline'` because `index.html` ships its critical CSS in a `<style>` block. Fonts come from Google Fonts. Images allow `data:` and `blob:` for the generated score poster. Framing is limited to the same origin (`frame-ancestors 'self'`). To let game portals embed the game in an iframe, add their origins to `frame-ancestors` and remove the `X-Frame-Options` header.

## Analytics (optional)

The game emits these custom events through Vercel Web Analytics:

| Event | Data |
|---|---|
| `run_start` | `kind`, `seed` |
| `card_answer` | `id`, `correct`, `jackpot`, `allIn`, `delta` |
| `run_end` | `points`, `score`, `best`, `kind` |
| `challenge_open` | `seed`, `pts`, `acc` |
| `copy_score` | `points`, `score` |
| `share_click` | `points`, `score`, `kind` |

Nothing is sent unless you turn it on:

1. In the Vercel dashboard, open the project, then **Analytics**, then **Enable**. Custom events need a plan that includes them.
2. Add `<meta name="wp-web-analytics" content="enabled">` to the `<head>` of `index.html`.

The script loads from the same origin (`/_vercel/insights/script.js`), so the CSP needs no change. Vercel Web Analytics is cookieless. `card_answer` fires 10 times per run; drop it if you need to keep event volume down. No third-party trackers are used.

## Project layout

| Path | What it is |
|---|---|
| `index.html` | Page shell, metadata and script order |
| `game.js`, `game.css`, `share.js` | The game: flow, scoring, Hall of Fame, results, poster and challenge links |
| `cards.js`, `headlines.js` | Headline decks |
| `data.js`, `sources.json` | Timeline moments and their citations |
| `main.js`, `mem.js` | The whirlpool engine (three.js) and code-drawn visions |
| `audio.js`, `audio-bridge.js` | Sound engine and game-event bridge |
| `assets/` | Images, icons and audio. `assets/manifest.json` lists the images that load; `assets/audio/manifest.json` lists sounds |
| `404.html`, `site.webmanifest`, `robots.txt`, `sitemap.xml` | Platform files |
| `docs/internal/` | Working design notes (not deployed) |
| `tools/asset-list.js` | Prints the vision image checklist (not deployed) |

The title and headline deck use Briam’s arcade music cues. Explore mode and game effects use the original synthesized score and sound effects. See `assets/audio/CREDITS.md`.
