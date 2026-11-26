# RESEARCH-CHATGPT.md: ChatGPT's research desk

**ChatGPT, this is your assignment.** First read [`RESEARCH.md`](RESEARCH.md), the shared rulebook. Everything there applies to you. This file only says what's yours.

*Am I Crazy?* is turning from an AI-headline game into a real-or-made-up game for the weirdest headlines in history. Three desks are writing the library at the same time: you, Gemini ([`RESEARCH-GEMINI.md`](RESEARCH-GEMINI.md)) and Claude (who also builds the engine).

## Your decks: 480 cards

| Order | Deck id | Deck | Prefix | Real | Made up | Batches |
|---|---|---|---|---|---|---|
| 1 | `annals` | The Annals of Absurdity | `an` | 110 | 70 | `an-001` … `an-004` |
| 2 | `science` | Weird Science | `ws` | 60 | 40 | `ws-001`, `ws-002` |
| 3 | `love` | Love & Chaos | `lv` | 60 | 40 | `lv-001`, `lv-002` |
| 4 | `concerts` | Mosh Pit | `mp` | 60 | 40 | `mp-001`, `mp-002` |

Batches are 50 cards; the last batch of a deck takes the remainder.

## Why you got these

You're strong at deep, patient research and at writing in a period voice, which is exactly what Annals and Weird Science need.

**The Annals of Absurdity** is the flagship deck. It covers newspapers from the 1700s to 1969. Hunt in the free scan archives (Chronicling America, Trove, Papers Past, Welsh Newspapers Online, Delpher, Gallica) and the Library of Congress *Headlines & Heroes* blog. Look for:

- hoaxes the papers themselves printed (`hoax: true`): sea serpents, petrified men, escaped zoo animals, moon people,
- genuinely odd local news: a cow on the church roof, a pig elected to the council, a man who sued the weather,
- old ads and announcements that read as unhinged today,
- pre-1929 headlines worth quoting verbatim in `headline_original`. That ornate type is half the fun on the reveal.

Fakes for this deck should sound like a 1890s paper: florid, confident, very sure about the sea serpent. At least 40 cards should be from before 1900.

**Weird Science** covers Ig Nobel-grade studies, lab accidents with no injuries, bizarre discoveries and experiments that should never have been funded. Cite the paper (DOI link) and a news write-up.

**Love & Chaos** covers weddings, proposals, divorces, dating disasters, people marrying objects, and record-breaking or petty breakups. A good share of these will be `spicy: true`; mark them honestly. Never use stories involving domestic violence, harassment or minors.

**Mosh Pit** covers concerts: what happens on stage, backstage and in the crowd. Read §5b of the rulebook first; it's a fame deck, so it has extra rules about real musicians and about crowd safety. Think wildlife joining the show, power cuts mid-solo, absurd things thrown on stage that hurt nobody, a band playing the wrong city's name, a gig that showed up on a seismograph, a concert for one person, a rider demanding something baffling, a 1970s stadium stunt. Your music-history depth is the point here: mix the 1960s–90s classics with recent tours, and go well beyond the US and UK (K-pop tours, Latin stadium shows, Japanese festivals, African and European festivals). Never use crowd crushes, stage collapses, fights or anything where a performer, fan or animal got hurt.

## Your branches

```
chatgpt/cards-annals-001
chatgpt/cards-annals-002
…
```

Add each batch file to `decks/files-chatgpt.json`, and nowhere else. Run `node tools/validate-cards.js` before every push.

## Cross-checking

When Gemini opens a cards PR, open 10 random REAL cards from it, check each source, and comment "Checked 10/10" or list the problems. Do the same for Claude's PRs when you can.

## Done means

All 480 cards are merged, with zero validator errors, at least 30 countries across your decks, and every REAL card cross-checked by another desk.
