# RESEARCH-GEMINI.md: Gemini's research desk

**Gemini, this is your assignment.** First read [`RESEARCH.md`](RESEARCH.md), the shared rulebook. Everything there applies to you. This file only says what's yours. Your sound work in [`GEMINI.md`](GEMINI.md) and [`SOUND.md`](SOUND.md) still stands. This is a new mission next to it.

*Am I Crazy?* is turning from an AI-headline game into a real-or-made-up game for the weirdest headlines in history. Three desks are writing the library at the same time: you, ChatGPT ([`RESEARCH-CHATGPT.md`](RESEARCH-CHATGPT.md)) and Claude (who also builds the engine).

## Your decks: 450 cards

| Order | Deck id | Deck | Prefix | Real | Made up | Batches |
|---|---|---|---|---|---|---|
| 1 | `animals` | Animals Gone Rogue | `ag` | 90 | 60 | `ag-001` … `ag-003` |
| 2 | `food` | Food Fights | `fd` | 60 | 40 | `fd-001`, `fd-002` |
| 3 | `sports` | Sports Meltdowns | `sp` | 60 | 40 | `sp-001`, `sp-002` |
| 4 | `clout` | Clout Chasers | `cl` | 60 | 40 | `cl-001`, `cl-002` |

Batches are 50 cards; the last batch of a deck takes the remainder.

## Why you got these

You have live Google Search and you read news in dozens of languages, so **you're the World Tour desk.** These three decks are where the whole planet makes the news. Make them the most international decks in the game:

- **At most 25% US** in each of your decks (stricter than the 35% house rule). Clout Chasers gets 30%.
- **At least 35 countries** across your 350 cards. Go hunting in non-English local news: Japanese regional papers, Taiwanese outlets (Focus Taiwan, UDN, Liberty Times), Paraguayan (ABC Color, Última Hora), Brazilian, Indian, Nigerian and Nordic outlets. Write each card in English and cite the original-language source plus an English write-up if one exists.

**Animals Gone Rogue:** animals stealing, escaping, holding up traffic, getting elected, getting arrested, crashing weddings, outsmarting police. Remember the rulebook: no story where an animal was seriously hurt or killed.

**Food Fights:** food heists (the maple syrup heist, the stolen cheese wheels), record attempts gone wrong, festival chaos, bizarre lawsuits over sandwiches, weird government food rules, restaurant stunts.

**Sports Meltdowns:** own goals of legend, bizarre disqualifications, mascots fighting, a horse winning a human race, amateur and lower-league chaos, weird sports from around the world. Big-league athletes may be named in the reveal of real cards, never in the headline.

**Clout Chasers** covers streamers, YouTubers, influencers and pranksters: stunts that backfired, live streams that went sideways, absurd sponsorship deals, records set for no reason, a prankster arrested by the exact people he was pranking. Read §5b of the rulebook first; it's a fame deck, so it has extra rules about real creators, pranks and minors. Your live search is the advantage here: this deck moves fast, so look at the last five years especially, and go global (Korean and Japanese streamers, Brazilian and Mexican YouTubers, Indian influencers, Taiwanese livestream culture, Chinese livestream sales). Cite reputable outlets (BBC, Reuters, Dexerto, Kotaku, The Verge, national papers), never the video itself.

## Your branches

```
gemini/cards-animals-001
gemini/cards-animals-002
…
```

Add each batch file to `decks/files-gemini.json`, and nowhere else. Run `node tools/validate-cards.js` before every push.

## Cross-checking

You used to be the Fact Desk, so this is familiar. When ChatGPT opens a cards PR, open 10 random REAL cards from it, check each source, and comment "Checked 10/10" or list the problems. Do the same for Claude's PRs when you can. Be strict: a card whose source doesn't clearly support it gets flagged.

## Done means

All 450 cards are merged, with zero validator errors, at least 35 countries, at most 25% US per deck (30% for Clout Chasers), and every REAL card cross-checked by another desk.
