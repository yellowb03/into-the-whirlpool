# RESEARCH.md: the headline research rulebook

**For every research desk: Claude, ChatGPT and Gemini.** Three desks are building the *Am I Crazy?* library at the same time. This file is the shared rulebook: read all of it before you write a single card. Your own assignment is in your kickoff file: [`RESEARCH-CHATGPT.md`](RESEARCH-CHATGPT.md) or [`RESEARCH-GEMINI.md`](RESEARCH-GEMINI.md). Claude also owns the game engine.

## 1. What the game is now

*Am I Crazy?* is no longer an AI-only game. It is a **real-or-made-up game for the weirdest headlines in history**: every country, every century, every topic. The player sees one headline and swipes **REAL** or **MADE UP**. Then the card flips to show the truth, a one- or two-line reveal and, for real cards, the sources.

The question the player answers is **"Did this really make the news?"**, not "is this literally true". That matters for old newspapers. If an 1835 paper really printed "MAN-BATS DISCOVERED ON THE MOON", that card is **REAL** and flagged `hoax: true`, and the reveal says the paper invented it. That twist is some of the best content we have.

Players pick a **deck**. The whirlpool stays as the background, and each deck gets its own print look.

| Deck id | Name | Prefix | Desk | Real | Made up |
|---|---|---|---|---|---|
| `florida-man` | Florida Man | `fm` | Claude | 110 | 70 |
| `criminals` | Criminal Masterminds (dumbest criminals) | `cm` | Claude | 90 | 60 |
| `laws` | Laws & Bureaucracy (absurd laws, government blunders, weird court cases) | `lb` | Claude | 80 | 50 |
| `annals` | The Annals of Absurdity (newspapers before 1970) | `an` | ChatGPT | 110 | 70 |
| `science` | Weird Science | `ws` | ChatGPT | 60 | 40 |
| `love` | Love & Chaos (weddings, dating, divorces, proposals gone wrong) | `lv` | ChatGPT | 60 | 40 |
| `animals` | Animals Gone Rogue | `ag` | Gemini | 90 | 60 |
| `sports` | Sports Meltdowns | `sp` | Gemini | 60 | 40 |
| `food` | Food Fights (food and drink chaos, heists, records, festivals) | `fd` | Gemini | 60 | 40 |
| `clout` | Clout Chasers (streamers, YouTubers, influencers, pranksters) | `cl` | Gemini | 60 | 40 |
| `celebs` | Famous & Foolish (celebrities: dumb posts, quotes, purchases, stunts) | `ce` | Claude | 60 | 40 |
| `concerts` | Mosh Pit (concerts: on stage, backstage, in the crowd) | `mp` | ChatGPT | 60 | 40 |
| `ai` | AI Gone Wild (the existing 244 cards) | `ai` | done | | |
| `this-week` | This Week (refreshed every Monday) | `tw` | Claude | | |

That's about 1,490 new cards on top of the 244 AI cards. **Only write cards for your own desk's decks.** Found a great story for another desk? Put it under "Leads for other desks" in your PR description.

Three modes are built from **fields on every card**, so the fields aren't optional:

- **World Tour:** play only one country or continent. It needs `country`.
- **Where & When:** after a REAL reveal, the player guesses the decade or the country for bonus points. It needs an accurate `date` and `country`.
- **18+ toggle:** cards with `spicy: true` are hidden by default.

## 2. How the desks work together

Each desk writes its decks in **batches of 50 cards, one pull request per batch.** Your kickoff file gives your decks, your order of work and your branch names.

**Cross-checking:** before a batch is merged, a *different* desk opens 10 random REAL cards from it and confirms that each source says what the card says. ChatGPT checks Gemini, Gemini checks ChatGPT, and both spot-check Claude. Leave the result as a PR comment: "Checked 10/10" or a list of problems. Nobody grades their own homework.

### Spread (applies to every deck)

- **No more than 35% of a deck from the US** (Florida Man excepted; the three fame decks get 40%, see §5b). Aim for 40+ countries per desk. Go looking in the UK, Ireland, Australia, New Zealand, Canada, India, Japan, China, **Taiwan**, Korea, the Philippines, Germany, France, Italy, Spain, the Nordics, Russia, Brazil, Argentina, **Paraguay**, Mexico, Colombia, Chile, Nigeria, Kenya, South Africa and Egypt. Non-English sources are fine if they're reputable; write the card in English.
- **Spread across time.** Annals: 1700s to 1969, with at least 40 cards before 1900. Other decks: mostly 1980 to now, with some older classics.
- **Spicy:** about 15–20% of each deck can be `spicy: true` (see §5).
- **Difficulty:** roughly a third each of `easy`, `medium` and `hard` (your guess at how many players get fooled: easy < 30%, medium 30–60%, hard > 60%).

## 3. The card format

Each batch is one JSON file containing an array of cards:

```
decks/<deck-id>/<prefix>-<nnn>-<desk>.json      e.g. decks/annals/an-001-chatgpt.json
```

Add every new batch path to **your own desk's list**: `decks/files-claude.json`, `decks/files-chatgpt.json` or `decks/files-gemini.json` (`"files": [...]`). Never edit another desk's list. That way the three desks' pull requests never conflict. Number your batches per deck: 001, 002 and so on.

### A REAL card

```json
{
  "id": "an-moon-man-bats",
  "deck": "annals",
  "verdict": "real",
  "hoax": true,
  "headline": "A New York newspaper reported that a famous astronomer had spotted winged bat-people, unicorns and beavers living in huts on the Moon.",
  "headline_original": "GREAT ASTRONOMICAL DISCOVERIES LATELY MADE BY SIR JOHN HERSCHEL",
  "reveal": "Real headline, fake story. The Sun ran six front-page instalments in August 1835, sales soared, and it only admitted the hoax weeks later. Nobody cancelled their subscription.",
  "date": "1835-08-25",
  "country": "US",
  "region": "New York",
  "place": "New York City",
  "topics": ["space", "science", "hoax"],
  "spicy": false,
  "difficulty": "easy",
  "sources": [
    { "title": "“The Great Moon Hoax” is published in the “New York Sun”", "publisher": "HISTORY", "url": "https://www.history.com/this-day-in-history/the-great-moon-hoax", "date": "2009-11-24" },
    { "title": "The Great Moon Hoax", "publisher": "Museum of Hoaxes", "url": "https://hoaxes.org/archive/permalink/the_great_moon_hoax" }
  ],
  "verified": "2026-11-26",
  "author": "chatgpt"
}
```

### A MADE UP card

```json
{
  "id": "ag-goose-parking-warden",
  "deck": "animals",
  "verdict": "made-up",
  "headline": "A town council in Norway made a resident goose an honorary parking warden after it chased 14 illegally parked drivers out of a church car park in one week.",
  "reveal": "Made up. But geese have been hired as security guards for centuries, so honestly it's only a matter of time.",
  "date": "2019-06",
  "country": "NO",
  "topics": ["animals", "transport"],
  "spicy": false,
  "difficulty": "hard",
  "author": "gemini"
}
```

### Fields

| Field | Required | Rules |
|---|---|---|
| `id` | yes | `<prefix>-<kebab-slug>`, unique across the whole library, never reused or renamed after merge (challenge links depend on it) |
| `deck` | yes | one deck id from the table |
| `verdict` | yes | `real` or `made-up` |
| `headline` | yes | 12–30 words, **written in your own words** (see §4). What the player judges. |
| `reveal` | yes | ≤ 45 words. The payoff after the swipe: context, the best weird detail, a dry joke. For made-up cards, start with "Made up." |
| `date` | yes | `YYYY-MM-DD`, `YYYY-MM` or `YYYY`. For real cards it's the date of the event or the first report. For made-up cards, a plausible date. |
| `country` | yes | ISO 3166-1 alpha-2 (`US`, `GB`, `TW`, `PY`…) |
| `region` | if known | State, province or county, e.g. `"Florida"`, `"Queensland"` |
| `place` | real only | Town or city, shown on the reveal. Leave it out on made-up cards. |
| `topics` | yes | 1–3 from the list in `decks/decks.json` |
| `spicy` | yes | `true` or `false` (see §5) |
| `difficulty` | yes | `easy`, `medium` or `hard` |
| `week` | This Week only | ISO week the card belongs to, e.g. `"2026-W48"`. The This Week deck always shows the newest week; older weeks retire into Shuffle Everything automatically. |
| `hoax` | optional | `true` only on REAL cards where the original outlet's story was itself a hoax, prank or tall tale |
| `headline_original` | optional | The verbatim original headline, **only for pre-1929 publications** (public domain). Shown as a clipping on the reveal. |
| `sources` | real only | 1–3 objects `{ title, publisher, url, date }`. `https://` only. **Two independent outlets wherever possible.** |
| `verified` | real only | The date you actually opened the source and checked it said what the card says |
| `author` | yes | your desk: `"claude"`, `"chatgpt"` or `"gemini"` |

Run `node tools/validate-cards.js` before every PR. **It must print `✔ no errors`.** Read the warnings too; duplicate-story warnings usually mean Claude already has the story.

## 4. Writing headlines that fool people

The game only works if real and fake cards are **indistinguishable by style**. Players learn tells fast. Kill them all:

1. **Same voice for both.** Plain, deadpan, wire-service English: who, what, the weird detail. No puns, no exclamation marks, no winking. The joke lives in the facts.
2. **No proper names in any headline**, real or fake. Not people, not brands, not specific towns. Use "a Florida man", "a fast-food drive-thru", "a small town in Wales", "a famous astronomer". Because fakes can't name real people or brands (§6), a name in a headline would give away every real card. Names go in the **reveal** of real cards (brands, famous public figures, towns; never private individuals).
3. **The one-mundane-detail rule.** Real stories almost always carry one oddly specific boring detail: *he ordered a large soda first*. Give every fake one too: a number, a time of day, a brand-free object.
4. **Same length.** Real and fake headlines should have the same length distribution. Don't let fakes be shorter or neater.
5. **Attribution symmetry.** If real crime cards say "police said", fakes say it too.
6. **Fakes must be exactly as absurd as reality, not more.** The best fakes are stories that *feel* like they must have happened. Test each one on yourself: if it's obviously a joke, sharpen it; if it's boring, make it weirder. Don't go full surrealism (no talking animals, no impossible physics), unless it's the Annals deck, where 1800s papers really did print sea serpents.
7. **Country symmetry.** Players notice fast when the obscure countries are always the fakes. In each deck, set at most 20% of your fakes in countries that have no real card in that deck. Put most fakes where real cards also happen (the UK, Japan, Germany, Brazil…), and when you want a fake in Mongolia, find a real Mongolian story too. The validator warns about this (`tell:` lines).
8. **Spicy symmetry.** Spicy cards should split real/fake like the rest of the deck. If most of your spicy cards are fakes, the 18+ toggle turns into a cheat sheet. And remember: alcohol alone (a drunk moose, a whisky flask) is not spicy.
9. **Weird beats notable.** A card has to be funny, odd or unbelievable, not just a historical first. "The first electric streetlight" is trivia; "a railway let a baboon work the signal levers" is a card.
10. **Write real cards from the facts, not the original headline.** Read the article, then write a fresh headline in your own words. Never paste a modern headline, and never copy more than a few words from any article into a reveal. The exception is `headline_original` for pre-1929 clippings.

### Example: making a real card

> **Source story (2015):** a man in Palm Beach County ordered a large drink at a Wendy's drive-thru, then threw a live 3½-foot alligator through the window; he was charged with assault with a deadly weapon.
>
> **Headline:** "A Florida man ordered a large soda at a fast-food drive-thru, waited for the cashier to turn around, then tossed a live alligator through the window."
>
> **Reveal:** "Real. Loxahatchee Wendy's, 2015. Wildlife officers charged him with assault with a deadly weapon, and the 3½-foot gator was released into a canal, unharmed and presumably still hungry."

The brand and town go in the reveal. The headline keeps the soda (mundane detail) and stays deadpan.

## 5. Spicy (18+) and what's off-limits

**`spicy: true`** covers anything you wouldn't put in front of a 12-year-old: illegal drugs, nudity and streakers, sex-adjacent silliness between adults (never explicit), toilet and body humour, strong language in quotes. Ordinary drinking (a beer run, a DUI on a lawn mower) is **not** spicy on its own; Florida would be half-hidden otherwise. Spicy cards are hidden unless the player turns on 18+.

**Never, in any deck, spicy or not:**

- Anyone died or was seriously injured, or an animal was seriously hurt or killed. Funny-weird, not someone's worst day. Property damage and dignity damage are fine.
- Sexual violence, abuse, anything involving minors in a sexual context, child victims of anything.
- Suicide, self-harm, eating disorders, mental illness played for laughs.
- Hate crimes, racial or religious stereotypes, mocking disability.
- Mass tragedies, terrorism, war atrocities.
- Real private individuals' names, mugshots or identifying details. "A 23-year-old man", never his name. Public figures (politicians, athletes, celebrities) may be named **in the reveal of real cards only**.
- Cases where the person was later acquitted or cleared. If in doubt, skip the story.
- Stories that are currently disputed, or debunked by Snopes, AP, Reuters Fact Check or Full Fact. Check viral classics there first: lots of famous "real" weird news is fake.

## 5b. The fame decks: Clout Chasers, Famous & Foolish, Mosh Pit

These three decks are about **real, famous, named people**, so they get extra rules on top of §5 and §6.

**Headlines describe, never name.** Same as everywhere: "a Grammy-winning rapper", "a streamer with 10 million followers", "a heavy-metal frontman", "a K-pop idol". The name goes in the reveal of real cards. Describe real people at the level a fan would recognise *after* the reveal, not before: role, country, genre, rough size of fame.

**Fakes are about nobody.** A made-up card must not point at any real person, even without a name:

1. Use generic descriptors that fit dozens of people ("a Hollywood actor", "a Brazilian pop star", "a Twitch streamer"). Never stack details until only one real person fits (a signature song, a famous ex, a well-known catchphrase, a known feud, a specific award count, a band's real name).
2. Fakes stay **harmless and dumb**: a silly purchase, a baffling quote, a stage mishap, a stunt that backfired, a bizarre rider demand, a fan-meet gone sideways. Never make up crimes, drugs, arrests, sex, health, religion, politics, debts, breakups, feuds or anything that would hurt someone's reputation if it got screenshotted without the MADE UP stamp.
3. Never write a fake quote that a reader could attach to a real person.

**Real cards: only what's on the record.** The person said it, posted it or did it in public, and reputable outlets reported it. Good material: posts and quotes they own, interviews, award-show moments, purchases they announced, stunts, tour riders, things that happened on stage.

- **No allegations, lawsuits, arrests or court cases** in these decks, unless the charge is trivial and undisputed (a streamer fined for jaywalking on stream is fine; anything with a victim isn't).
- **No health, addiction, mental-health crises, pregnancies, deaths, divorces or relationship drama**, even if the celebrity posted it themselves.
- **Nobody under 18**, not even famous kids or teenage streamers. If they were under 18 when it happened, skip it.

**Clout Chasers extra:** no pranks that hurt, scared or humiliated a bystander, no fake emergencies (swatting, bomb hoaxes, fake kidnappings), no pranks on vulnerable people (homeless people, the elderly, children), no harassment of private people on stream. The best cards are where **the prankster** ends up the punchline.

**Mosh Pit extra:** no crowd crushes, stampedes, stage collapses with injuries, fights, assaults on performers (including objects that hurt them) or anything where an animal was harmed. Great material: wildlife joining the show, power cuts, weird things thrown on stage that hurt nobody, proposals, bands forgetting their own songs, gigs in absurd places, concerts that registered on seismographs, noise complaints from three towns away, riders, wrong-city shout-outs. Stage-invading streakers are `spicy`.

**Where to look:** Variety, The Hollywood Reporter, Billboard, Rolling Stone, NME, Pitchfork, Consequence, Stereogum, People, Entertainment Weekly, BBC Entertainment, Guardian music, the AP entertainment wire, Soompi and Korea JoongAng Daily for K-pop, Dexerto, Kotaku, Polygon, The Verge and PC Gamer for streamers. **Tabloids** (Daily Mail, The Sun, Mirror, TMZ, Page Six) can be a second source, never the only one. The celebrity's own post never counts as a source, but a reputable outlet reporting the post does.

**Country** is where it happened. For a post or an interview, it's where the person is based.

**Spread:** these worlds lean American, so the US cap is **40%** here (Gemini's Clout Chasers: 30%). Hunt K-pop, J-pop, Bollywood, Nollywood, Latin music, UK grime, Brazilian funk, Taiwanese and Japanese streamers, Korean variety TV, European festival culture.

## 6. Hard rules for MADE UP cards

1. **Never name a real person, brand, company, product, school, team, police department or specific small town.** A country, US state or big city is fine ("Tokyo", "a town in Bavaria").
2. A fake must not be a real story with one detail changed. If it's too close to something that happened, it becomes misinformation when screenshotted.
3. Nothing defamatory against any real group, institution or profession you could identify.
4. The engine stamps MADE UP on every fake whenever it's revealed or shared. You don't need to add anything.

## 7. Where to look

Use reputable outlets: wire services (AP, Reuters, AFP, UPI), national broadcasters and papers (BBC, NPR, CBC, ABC Australia, RNZ, the Guardian, NYT, WaPo, Le Monde, Focus Taiwan, NHK, ABC Color in Paraguay…), established local TV stations and papers, government and court sites, museums, archives and libraries.

**Good hunting grounds:**

- *Weird-news desks:* UPI Odd News, Reuters "Oddly Enough", AP Oddities, BBC "And finally", Sky News offbeat, Guardian "weird news", NZ Herald and Stuff "offbeat", ABC Australia's quirky regional stories.
- *Annals:* Library of Congress **Chronicling America** (free scans of US papers 1770–1963) and its **Headlines & Heroes** blog, **Trove** (Australia), **Papers Past** (New Zealand), **Welsh Newspapers Online**, **Delpher** (Netherlands), **Gallica** (France), Smithsonian Magazine, Atlas Obscura, the Museum of Hoaxes (hoaxes.org), Public Domain Review. Archive scans are great primary sources: link the page scan **plus** a modern write-up if one exists.
- *Science:* university press releases, EurekAlert, Ig Nobel winners (improbable.com, with the paper DOI), Nature and Science news.
- *Sports:* BBC Sport, ESPN, the Guardian, national sports papers. Lower leagues and amateur sport are gold.
- *Fact-checking:* Snopes, AP Fact Check, Reuters Fact Check, Full Fact, Taiwan FactCheck Center.

**Never a source:** satire (The Onion, Babylon Bee, Daily Mash, Waterford Whispers, World News Daily Report, Weekly World News), social media posts, Reddit, YouTube, listicle farms (Bored Panda, Ranker, BuzzFeed lists), content farms, or AI-written aggregators. Listicles are fine for **finding** stories. Then trace each one back to the original reporting and cite that. The validator rejects the worst offenders automatically.

**Paywalls:** a paywalled source is fine as a second source, never as the only one.

## 8. Workflow

1. Pull the latest `main`, then branch: `<desk>/cards-<deck>-<nnn>` (e.g. `chatgpt/cards-annals-001`, `gemini/cards-animals-001`). **Never push to `main`.**
2. Write the batch file, add it to your desk's `decks/files-<desk>.json`, and run `node tools/validate-cards.js` until it prints `✔ no errors`. The validator checks your cards against the **whole** library, so pull `main` first to catch stories another desk already used.
3. Push the branch and open a PR titled `Cards: <Deck name> batch <nnn> (<real>/<made-up>)`. In the description include:
   - a table of the real cards with one source link each, so Briam can spot-check from his phone,
   - your 3 best fakes (the ones you think fool people most),
   - the validator's summary block,
   - **Leads for other desks:** good stories you found for decks that aren't yours.
4. One batch per PR, 50 cards. Only touch files inside `decks/<your decks>/` plus your own `decks/files-<desk>.json`. If you think the rules, the schema or the validator need changing, say so in the PR; don't change them yourself.
5. Keep going: if your previous PR hasn't merged yet, branch the next batch **from that branch** (not from `main`), so `decks/files-<desk>.json` lists both files. Two PRs that each replace the list with one file will conflict, and a careless merge drops a whole batch.

## 9. Quality checklist (every card)

- [ ] Real: I opened every source today, and it says what my headline says.
- [ ] Real: nobody died or was badly hurt; no private person is named anywhere.
- [ ] Headline has no names, no puns, one mundane detail, 12–30 words.
- [ ] I couldn't tell this card's verdict from its style alone.
- [ ] Made up: no real people, brands or small towns; not a real story with one detail changed.
- [ ] `date` and `country` are accurate enough for the Where & When bonus.
- [ ] `spicy` is set honestly.
- [ ] Fame decks: no fake that points at one real person; no real card about allegations, health, relationships or anyone under 18.
- [ ] The reveal makes you want to read the next card.
