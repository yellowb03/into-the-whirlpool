# Am I Crazy? Launch plan

Strategic audit before the public launch. Priorities: **P0** = do before launch, **P1** = launch week, **P2** = after there's traction. Written 25 Nov 2026 after playing four full decks on the current build.

**The one-line thesis:** the headlines are the product. The scoring is there to make people keep swiping, and the share card is there to make them send it. Everything below either gets a player to the first "wait, that's REAL?" faster or turns that moment into a message to a friend.

---

## 1. First 10 seconds, core loop, session

**What works:** the cover explains the game in one line, the first card shows up on the first tap, the stamp reveal with a source is a real payoff, and a deck takes about 2–3 minutes. That's the right length for a "one more" game.

**What hurts:**

- **P0. Page weight before the first card.** Eight three.js scripts from jsDelivr, a bloom shader and the whirlpool all load before the Play button does anything useful. On a mid-range Android phone with 4G, that's the bounce point. Defer the vortex: show the cover and the first card on plain CSS, then start three.js after the first swipe (`requestIdleCallback`), and fall back to a static `share-bg` image if WebGL is slow. Measure LCP and time-to-first-swipe.
- **P0. 20 taps per deck.** Every card takes an answer tap plus a Next tap. Keep the reveal, because it's the content, but let a tap anywhere on the card, or a swipe up, advance. On a correct answer with no case file opened, auto-advance after about 2.5 s unless the player touches the screen.
- **P1. Too many mechanics on card 1.** Streak multipliers, jackpots, 2X ALL-IN, Fever and speed bonus are all visible straight away. Hide ALL-IN until card 3 ("Feeling lucky? Bet it all"), and introduce jackpots only when the first one lands. The first deck should feel like a quiz. The second deck is where it turns into a casino.
- **P1. Difficulty curve.** Random decks are shuffled with 4–6 real cards out of 10, so answering REAL every time gets about 50% (I got exactly 5/10 that way). There's no arc. Order each deck as: card 1 is a wild but guessable REAL (the hook), the hardest cards sit on the jackpot slots, and card 10 is the most unbelievable REAL in the deck (the punchline people screenshot). Until you have fool-rate data, tag each card `easy/med/hard` by hand.
- **P1. "One more deck" hooks** on the results screen: "You were 180 pts from TERMINALLY ONLINE", "Rematch this deck" (same seed, which beats a new random deck for mastery), and, once dailies exist, "Daily done ✓ · Practice deck →" plus a countdown to the next daily.

## 2. Retention: the Daily deck (P0)

A Wordle-style daily is the biggest single lever. It turns a novelty into a habit and gives every share the same shared context ("did you get today's card 7?").

**Deterministic and client-side:**

1. Seed = `dy-YYYYMMDD` from the player's **local** date, as Wordle does: everyone gets "today" at their own midnight, and the deck number is the same worldwide for each date. Daily number = days since launch (`Am I Crazy? #12`).
2. **Don't derive the daily only from `drawDeck(pool, seed)`.** The `r3-` draw picks cards by index from the current pool, so **adding a single card changes every existing seed's deck.** That already breaks old challenge links each time the bank grows (see §4). For the daily, commit `daily.json`: a curated list of card IDs per date for the next 60 days. It's editorial (you can pick topical cards), it can't repeat, and it's stable. Fall back to the seeded draw if a date is missing.
3. Allow one scored attempt per day. Store `{lastDaily, dailyStreak, maxDailyStreak, dailyHistory}` in localStorage (already wrapped in try/catch).
4. Show the day streak on the cover ("🔥 4-day streak") and in the share header. Pass `kind: 'daily'`; `share.js` already labels daily posters and captions from any `*-YYYYMMDD` seed.
5. Add `dy-\d{8}` to `validSeed` in `game.js` so daily challenge links open.

**Random decks stay, renamed "Practice" / "Endless".** They're the binge mode after the daily and they feed the local Hall of Fame. The daily is the default Play button, and practice is the secondary one.

## 3. Virality mechanics

**Shipped in this pass (`share.js`):** the caption and poster no longer print the headline that fooled you (that spoiled the friend's deck). They say "card 4 fooled me 💀" instead. Both have a 2×5 grid, the rank, and challenge-aware hooks ("Beat BRIAM by 600 pts ⚔️" / "…avenge me"). The poster has a huge score, the short URL and a "CAN YOU BEAT ME?" call to action, with fonts loaded before drawing. Sharing tries the image file first, then text only, then copy plus download.

**Next:**

- **P0. The challenge cover must show the friend's score big:** "BRIAM scored 2,000 on this deck. Beat it." The result screen already compares scores. The cover banner should do it too, in 60 px type, because that's the conversion moment.
- **P1. Dynamic OG image per challenge link.** iMessage and WhatsApp show `og:image`, and right now every link previews the same generic image. A Vercel Edge function at `/api/og?pts=&acc=&by=` (`@vercel/og`) plus a rewrite would make every pasted link preview as "BRIAM: 2,000 pts. Can you beat it?". This is probably the highest-leverage virality feature after the daily.
- **P1. A 9:16 story poster** (1080×1920) for Instagram and TikTok stories. The 4:5 poster gets cropped there.
- **P1. "X% of players got this wrong" on each reveal.** Cheapest backend: **Upstash Redis via the Vercel Marketplace** (free tier).
  - `POST /api/run` sends one pipelined `HINCRBY card:{id} shown|miss` batch per *completed* deck.
  - `GET /api/rates` returns one JSON blob with `s-maxage=600`, so reads come from the CDN, not Redis.
  - **Anti-abuse:** reject runs whose 10 IDs don't match `drawDeck(seed)` on the server, rate-limit per hashed IP (`@upstash/ratelimit`, about 30 runs/hour), drop runs under 15 s, and only show a percentage once n ≥ 50. Never store raw IPs.
  - **Zero-backend fallback for launch week:** log `card_answer` to Vercel Analytics and bake weekly fool rates into `headlines.js` by hand.
  - This data is also the press hook (§5) and the difficulty tuning (§1).
- **P1. Track share channels.** Append `&s=x|wa|ig|copy` to shared links. Unknown params are ignored, so old links keep working. Then `challenge_open` tells you which channel actually converts.
- **P1. TikTok / Reels:** don't advertise the game; post the headlines. Show 3 cards per video: the card, a 3-second beat, then the stamp slam with sound, ending on the most absurd REAL one. Batch 20 videos from the 244 cards before launch, with the URL in the bio and the pinned comment.
- **P2. Streamer mode** (`?mode=stream`): huge type, no speed bonus, a 10 s "chat, vote now" countdown before each reveal, a hidden handle, and a 9:16 layout. Streamers yelling "THIS IS REAL??" is free distribution.

## 4. Content ops

- **P0. Freeze deck stability.** Card selection depends on pool order and contents (the comment in `headlines.js` already warns about this). Treat the bank as **append-only and versioned**: when new cards ship, freeze the old pool as `r3`, and new random seeds use `r4-` over the new pool. Otherwise every shared challenge link silently changes cards, and the "same 10 cards" promise breaks.
- **P0. Legal sweep of made-up cards.** GAME.md rule 1 says fakes must never name a real person or company. Current fakes name real brands ("Two automated NBA news accounts…", "A TikTok thread exposed four Tinder matches…"). Replace them with generic descriptions ("a pro basketball league's news bots", "a dating app"). Also check fakes that point to an identifiable real person ("a prominent roboticist bet a Silicon Valley investor…"). Real cards that paraphrase allegations should use "said/alleged" wording and cite their source. Get a lawyer to read the 20 riskiest cards before you get press coverage; it's cheap insurance.
- **P1. Cadence:** add 10–15 cards a week (5 real from that week's news, 5–10 fakes). Every real card needs 1–2 independent sources and a "true as of <date>" line.
- **P1. Aging:** run a monthly review of `real-unproven` cards and anything over 12 months old (retractions, failed proofs, lawsuit outcomes). **When a fake comes true, post it**: "This card was MADE UP in November. It happened in March."
- **P1. Report-a-card:** a "⚑ Report" link on every reveal that opens a prefilled form (Tally or a GitHub issue template) with the card ID and the reason. Respond within 48 hours and keep a public `/corrections` log.

## 5. Brand, positioning, launch

- **Header art.** The wordmark literally reads **"AI am CRAZY?"**: black "AI" with a small pink handwritten "m" between. Up close, the "Am I / AI" pun is clever. At thumbnail size (HUD, favicon, poster) the "m" disappears and it reads "AI CRAZY?". Keep the pun, but (P1) make the "m" about 40% bigger and higher contrast, and make every text surface say "Am I Crazy?". Tagline: *"Is it AI, or am I crazy?"*
- **Positioning:** "The AI headline game: real or made up?" The whirlpool is atmosphere, not the pitch.
- **Credits:** maker and AI-vendor credits are now absent from all share outputs. The cover footer and results screen still list "Briam with Claude, ChatGPT & Gemini". Move that to an About page (P1); on a fake-spotting game it reads as sponsorship. "AI wrote some of the fakes" still works as an HN and press angle.
- **Domain (P1):** `am-i-crazy.vercel.app` looks temporary and is hard to say aloud. Buy a short one (check `amicrazy.ai/.lol/.fun/.game`), 308-redirect the Vercel URL and update the canonical link. The poster picks up the live host automatically.
- **Channels, in order:** TikTok/Reels clips (starting 5 days before launch), then r/InternetIsBeautiful and r/WebGames, then r/ChatGPT and r/singularity (gif plus "I made…"). Next, **Show HN** (*"Show HN: Am I Crazy? Real AI headlines vs. made-up ones"*, Tue/Wed 8–10am ET, with sourcing and the build story in the first comment). Then the X AI community (quote-post trending AI news with "this is a card in the game"), Product Hunt in week 2, and AI newsletters and media-literacy teachers.
- **Timing:** Thanksgiving is Thu 26 Nov. Avoid launching on HN or Reddit that day, and launch Tue 1 Dec instead. Thanksgiving week still works for seeding family group chats.
- **Press hook (needs §3 data):** *"X% of people can't tell real AI news from fiction. The most-missed headline was real."* Publish a "Top 10 headlines nobody believes" page after week 1.

## 6. Monetisation and metrics

- **At launch: none.** Any paywall or ad kills the share loop. P2 options in order: (1) an **education / newsroom edition** (media-literacy decks, a teacher dashboard), which is the most credible revenue; (2) clearly labelled **sponsored theme decks** ("AI in finance, presented by…"), where sponsors never touch verdicts; (3) **rank-title merch** (CERTIFIED NPC, BRAINROT IMMUNE); (4) a tip jar.
- **P0. Instrument it.** `track()` already exists but is gated on a `wp-web-analytics` meta tag, and custom events need Vercel Pro. Turn both on. Use flat, small payloads:

| Event | Payload | Gives |
|---|---|---|
| `run_start` | kind, returning(bool), daysSinceFirst | D1/D7 cohorts |
| `first_swipe` | ms since load | onboarding friction |
| `card_answer` | id, correct | fool rate per card |
| `run_end` | kind, score, points | deck completion = run_end / run_start |
| `share_click` / `share_done` | method (native/copy/download) | share rate = share_done / run_end |
| `challenge_open` | has_by, s | K-factor input |
| `challenge_start` / `challenge_end` | won | challenge conversion |

  **K-factor** = (share_done / players) × (challenge_open / share_done) × (challenge_start / challenge_open). Targets: deck completion > 70%, share rate > 8%, D1 > 25% once the daily is live, K > 0.5 in week 1. Store `firstSeen` in localStorage for D1; no backend needed.

## 7. Accessibility and trust

- **P0.** Fever Mode flashes: keep them under 3 per second and turn them off under `prefers-reduced-motion`. Check contrast on yellow-on-pink chips. Give the 2X ALL-IN toggle `aria-pressed`. Make sure the verdict is announced through `aria-live` on reveal.
- **P1.** Add a "Sources" link to every real reveal, both in the results list and in the case file (results already link to the first source). Put a persistent "Some headlines are invented for this game" line on the cover. Made-up cards always carry the MADE UP stamp, and the share outputs now never show a fake headline at all, so a screenshot can't spread a fake.

---

## Launch week checklist

**Before (by Mon 30 Nov)**
- [ ] P0: Defer three.js until after the first swipe; time-to-first-card under 1.5 s on 4G
- [ ] P0: Tap-anywhere or auto-advance after the reveal
- [ ] P0: Daily deck (`dy-YYYYMMDD`, `daily.json`, day streak, `validSeed` updated)
- [ ] P0: Versioned card bank (freeze `r3`, new seeds `r4-`)
- [ ] P0: Remove real brands from made-up cards; legal read of the risky cards
- [ ] P0: Challenge cover shows the friend's score big
- [ ] P0: Vercel Analytics custom events on, with the table above
- [ ] P1: Report-a-card link and corrections page
- [ ] Record 20 TikTok/Reels clips and schedule them
- [ ] Buy the domain, 308 redirect, update canonical and OG

**Launch (Tue 1 Dec)**
- [ ] Show HN at 8–9am ET; reply to every comment for 6 hours
- [ ] r/InternetIsBeautiful, r/WebGames, then r/ChatGPT and r/singularity, spaced across the day
- [ ] X thread: the 5 most unbelievable REAL cards, with the link in the reply

**Days 2–7**
- [ ] Watch the funnel daily: cover → first swipe → card 10 → share
- [ ] Retire cards with a fool rate under 15%; rewrite fakes nobody falls for
- [ ] Ship the dynamic OG image for challenge links
- [ ] Day 7: publish "the headlines nobody believed" with the real numbers and pitch it to newsletters
