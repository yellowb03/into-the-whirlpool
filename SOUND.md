# SOUND.md: the sound overhaul (for Gemini)

Every single thing in Into the Whirlpool gets its own sound: high quality, mixed like a film, reacting to the player. Your current `audio.js` score becomes the **synth layer** of a bigger system. It keeps running underneath, and it's the fallback whenever an audio file is missing.

You own `audio.js`, `assets/audio/` and `assets/audio/manifest.json`. Read `GAME.md` section 4 for the game events, and `GEMINI.md` for the existing contract.

---

## 1. The sound world in one line

**A risograph print shop falling through time.** Paper, ink, rubber stamps and binder clips (tactile and close-miked) over music that starts as a quiet 2012 lab and ends as an overwhelming, beautiful future. The foley is human and physical; the music is the whirlpool.

Rules:
- Pull every sound into one world: warm, slightly lo-fi tape character, nothing glossy or "app-like". No generic UI blips or stock "whoosh" packs.
- Each era has its own key, tempo and instruments (section 3), so the timeline can be heard.
- Silence is a sound. The Crossing and the cover breathe.

---

## 2. Formats and technical spec

| Thing | Spec |
|---|---|
| Sample rate | 48 kHz |
| Delivery | **two files per sound**: `.webm` (Opus, 128 kbps for music, 96 kbps for effects) and `.m4a` (AAC) for older iPhones. The engine picks with `canPlayType` |
| Music loops | exactly 8 bars at the stated tempo, cut on the bar line, seamless when looped (check the join). Each stem is its own file |
| Loudness | music stems about −20 LUFS each (they stack); stingers −16 LUFS; effects peak −3 dBFS, UI clicks quieter (around −12 dBFS peak) |
| Variations | every effect that repeats gets **3 to 5 variations** (`stamp-real-1..4`), so nothing sounds copy-pasted |
| Heads and tails | effects start on the transient (no silence before), with natural tails, faded under 5 ms |
| Budget | under 12 MB total download; music lazy-loads one era ahead |
| Names | kebab-case, matching the tables below exactly |

Folders: `assets/audio/music/`, `assets/audio/sfx/`, `assets/audio/ui/`, `assets/audio/amb/`.

**Manifest** (`assets/audio/manifest.json`), where nothing plays unless it is listed:

```json
{
  "music": { "lab": { "bpm": 72, "bars": 8, "stems": ["bed","pulse","melody","texture"] } },
  "sfx":   { "stamp-real": 4, "paper-swipe": 5 },
  "ui":    { "button-press": 3 },
  "amb":   ["cover-room"]
}
```

Numbers are variation counts. Files are named `<name>-<n>.webm` and `<name>-<n>.m4a`.

---

## 3. Adaptive music: four eras, four stems each

The key and tempo match the synth score already in `audio.js`, so the two layers play together.

Each era is 4 stems that loop in sync:
- **bed**: always on
- **pulse**: comes in as the game heats up
- **melody**: comes in on a streak or high `prog`
- **texture**: comes in with slow-time or madness

The engine adds and removes stems on bar lines with 2-bar crossfades. Era changes crossfade at the next bar.

### Prompts for the music model

Generate each stem separately with the shared era description plus the stem line. **Don't name artists or songs** in the prompts, and keep everything original. If the model can't output isolated stems, generate the full mix and ask for "only the [instrument]" versions with the same seed or settings.

**Era 1, "The Quiet Lab" (2012 to 2016): D Dorian, 72 BPM, 8 bars.**
> Era: Minimal, patient ambient electronica in D Dorian at 72 BPM, eight bars, seamless loop. Late night in a university computer lab in 2012: humming server fans, cold fluorescent air, a sense that something is about to wake up. Warm tape saturation, intimate, lots of space.
> - bed: soft sustained analog pad on D and A, slow filter movement, no rhythm
> - pulse: a very quiet muted kick on beats 1 and 3, like a heartbeat through a wall
> - melody: sparse glassy FM bell notes, 4 to 6 notes per loop, long decay, wide reverb
> - texture: filtered pink noise like server fans, occasional faint keyboard clicks and relay ticks

**Era 2, "Attention" (2017 to 2022): F Lydian, 104 BPM, 8 bars.**
> Era: Warm, curious electronic music in F Lydian at 104 BPM, eight bars, seamless loop. Golden light, discovery, ideas echoing back on themselves. Rounded, hopeful, slightly nostalgic, tape warmth.
> - bed: warm Rhodes-like electric piano chords, Fmaj7(#11) to Cmaj7, gentle
> - pulse: soft round bass on quarter notes plus a brushed shaker on eighths
> - melody: a triangle-wave arpeggio motif that repeats with small changes each bar, as if remembering earlier notes
> - texture: reversed piano swells and a faint tape hiss

**Era 3, "The Boom" (2023 to November 2026): G Mixolydian, 122 BPM, 8 bars.**
> Era: Bright, driving, slightly overwhelmed electronic music in G Mixolydian at 122 BPM, eight bars, seamless loop. Server rooms, launch events, news crawling across screens; exciting, loud, a little anxious.
> - bed: bright saw-pad chords with sidechain pumping on every beat
> - pulse: punchy four-on-the-floor kick, tight closed hats, a clap on 2 and 4
> - melody: a fast 16th-note synth arpeggio with a hint of distortion
> - texture: glitchy granular chatter like many voices and notifications blurred together

**Era 4, "The Future" (2027 to 2031): C♯ Phrygian dominant, 132 BPM, 8 bars.**
> Era: Vast, strange, beautiful electronic music in C-sharp Phrygian dominant at 132 BPM, eight bars, seamless loop. Falling into something much bigger than you. Detuned, shimmering, polyrhythmic, awe more than fear. Analog warmth under alien textures.
> - bed: huge detuned choir-like pad, slowly beating, with a tritone shimmer above
> - pulse: a polyrhythm of a deep kick in 4 against a metallic tom pattern in 5
> - melody: high crystalline arpeggios that slowly drift out of tune and back
> - texture: granular shards, bowed metal and wind, as if reality is fraying

### Stingers and one-shots

| File | Length | Prompt |
|---|---|---|
| `music/cover-loop` | 16 bars at 72 BPM, D Dorian | Very sparse, dreamy loop for a title screen: one soft pad, a distant music box playing four notes, vinyl crackle. Inviting, mysterious |
| `music/crossing` | 8 s | A held breath: the music slows like a tape stopping, drops to near silence, a long riser of bowed metal and choir, then a deep sub drop and a single strange chord in C♯ Phrygian dominant. Cinematic, awe-struck |
| `music/result-print` | 4 s | A resolving chord swell in D major after tension, warm and proud, like an end-credits first chord |
| `music/ending-witness` | 60 s loop | Calm, contemplative ambient piano and strings; hopeful, balanced |
| `music/ending-swimmer` | 60 s loop | Euphoric, weightless, slow-motion synth swells; floating upside down in light |
| `music/ending-archivist` | 60 s loop | Quiet, dusty, analog: clockwork ticks, felt piano, a library at night |
| `music/ending-child` | 60 s loop | Wonder and unease: music box, children's choir pad, glassy shimmer |
| `music/ending-clockmaker` | 60 s loop | Precise and mechanical, then blooming: ticking polyrhythm resolving into warm brass |
| `music/streak-5`, `streak-10`, `streak-20` | 1–2 s | Short rising flourishes in the current key, getting bigger each tier (render one per era key if the model supports keys) |

---

## 4. Effects for absolutely everything

**Foley beats generation here.** Briam has a condenser mic and an audio interface at home. Ten minutes recording real paper, rubber stamps, a binder clip, masking tape and a Polaroid will sound more real than any generated effect. Use generated audio for the impossible sounds (vortex, glitches, time) and real recordings for the physical ones. Where you have to generate physical sounds, describe them as close-miked foley.

| Event / element | File (variations) | Description |
|---|---|---|
| Cover appears | `amb/cover-room` (1, loop) | room tone of a quiet print shop at night, a fluorescent hum, very soft |
| Cover peels away | `sfx/paper-peel` (2) | a large poster peeled off a wall, slow tear, ends in a whoosh down into the vortex |
| Vortex ambience | `amb/vortex` (1, loop) | deep swirling wind with a slow stereo rotation, tonal around D, never harsh |
| Card rises out of the vortex | `sfx/card-rise` (4) | a soft airy whoosh rising into a paper flutter |
| Card drag (continuous) | `sfx/paper-drag` (3, loop) | fingertip sliding on heavy paper; the engine sets pitch and volume from drag speed |
| Card fling | `sfx/paper-fling` (5) | a quick card whip through the air, a short paper flap |
| Stamp: real | `sfx/stamp-real` (4) | a heavy wooden rubber stamp hitting paper on a desk, solid thud with a click |
| Stamp: made up | `sfx/stamp-made-up` (4) | the same stamp, harder and duller, with a short dry rattle |
| Stamp: unproven | `sfx/stamp-unproven` (3) | the stamp hit plus a quick tape wobble, as if uncertain |
| Ink splat | `sfx/ink-splat` (3) | a small wet splat, subtle |
| Correct answer (tonal) | `sfx/correct` (5) | a single warm mallet note; the engine pitches it up the era scale as the streak grows |
| Wrong answer | `sfx/wrong` (4) | a tape warble sag plus a dull detuned thunk, short, not punishing |
| Glitch (visual glitch) | `sfx/glitch` (4) | 200 ms of digital tear, bitcrush stutter, quick |
| Screen shake | `sfx/thump-low` (3) | a low body thump under the stamp |
| Streak counter tick | `ui/odometer-tick` (3) | a tiny mechanical counter click |
| Confetti burst (every 5) | `sfx/confetti` (3) | paper bits fluttering down, a light crackle |
| Explanation line appears | `ui/type-in` (3) | soft typewriter keys, two or three strokes |
| Case file opens | `sfx/folder-open` (3) | a manila folder flipped open on a desk, paper slide |
| Polaroid drops onto the clip | `sfx/clip-bite` (3) | a metal binder clip snapping shut on paper |
| Polaroid zoom in/out | `sfx/photo-lift` (2), `sfx/photo-set` (2) | a photo picked up off paper / set back down |
| Case file closes | `sfx/folder-close` (3) | a folder closing, a soft slap |
| Earlier / later | `ui/page-turn` (4) | a crisp page turn, short |
| News headline arrives | `ui/ticker-in` (3) | an old teleprinter burst, a few characters, quiet |
| Ruler drag | `ui/ruler-tick` (4) | wooden ruler notches clicking past a fingernail; the engine plays one per month passed |
| Ruler release | `ui/ruler-settle` (2) | a short ratchet settle |
| Year passes through | `sfx/year-boom` (3) | a deep soft boom with long tail, like a distant cathedral door |
| A word appears (explore mode) | `sfx/word-chime` (5) | a delicate glass chime; the engine tunes it to the era scale |
| Hold to slow time: in / out | `sfx/time-slow` (2), `sfx/time-snap` (2) | a tape slowing to a crawl / tape snapping back to speed with a whoosh |
| Drag to spin | `sfx/spin-wind` (1, loop) | a whirling wind loop; the engine sets volume and pan from spin speed |
| Character drifts by | `sfx/ghost-pass` (4) | a breathy, distant, slightly musical swoosh, eerie but gentle |
| Odds dial tick (every 5) | `ui/dial-tick` (3) | a precise detent click |
| Odds locked | `ui/dial-lock` (2) | a solid latch click |
| Expert marker drops | `ui/marker-drop` (3) | a pin pushed into cork, three slightly different pitches |
| The Crossing | `music/crossing` | see section 3 |
| Result prints out | `sfx/receipt-print` (2) | a thermal receipt printer, 1 s, with paper feed |
| Score counts up | `ui/count-tick` (3) | very small quick clicks |
| Share button | `ui/share` (2) | a tear-off ticket rip |
| Any button press / release | `ui/press` (4), `ui/release` (4) | a soft fingertip on a cardboard button / a lighter lift |
| Close button | `ui/close` (2) | a short paper swish |
| Mute toggle | `ui/switch` (2) | a small vintage toggle switch |
| Restart (white flash) | `sfx/whiteout` (1) | a swelling white-noise wash into silence, then one distant bell |

---

## 5. Engine: `audio.js` v2

Keep the v1 synth score; it becomes a bus in the new graph. Add the following.

**Loader.**
- Fetch `assets/audio/manifest.json`. Pick the format with `canPlayType`, then `fetch` plus `decodeAudioData` into a buffer cache.
- Loading order: UI and core effects first, then the cover loop, then the music for the current era, then the next era in the background.
- If a file fails, play the synth fallback; the game must never stall on audio.

**Buses.**

```
music (stems) ─┐
synth (v1) ────┤
amb ───────────┼─► master EQ ─► limiter ─► out
sfx ───────────┤      ▲
ui ────────────┘      └─ duck: stamps and the Crossing dip music by 4–6 dB for 300 ms
```

Settings: `ui` and `sfx` stay dry, apart from a short room reverb send. Music and synth share the existing convolver.

**Playback rules.**
- Round-robin through variations, never repeating the last one.
- Randomise pitch by ±3% and gain by ±1.5 dB.
- Pan from the element's screen x position (−0.6 to 0.6).
- Cap the number of copies of the same sound playing at once at 3.

**Musical sync.**
- Stems start on a shared clock: track `bar = floor((ctx.currentTime − t0) / barLength)`.
- Adding or removing a stem waits for the next bar, then fades over 2 bars.
- Era changes crossfade over 1 bar.
- `correct` notes are pitched to the current era scale; the streak walks up the scale.

**Mapping game state to the mix.**

| State | Mix effect |
|---|---|
| bed stem | always on, plus `amb/vortex` |
| `WP.state.streak` ≥ 3 | pulse stem in |
| streak ≥ 6 or `prog` > 0.6 | melody stem in |
| `slow` > 0.3 or `prog` > 0.85 | texture stem in |
| `pause` (case file open) | music low-passed to 900 Hz and −10 dB; foley stays clear |
| `mode === 'explore'` | the gentler v1 behaviour |

**Controls.**
- Keep the mute button.
- Add a second control in a small settings sheet: **Sound: full / music off / effects only / off.**
- Remember the choice in `localStorage` (inside `try/catch`).
- iOS: unlock the context on the first touch; play a silent buffer if needed.

**Performance.** Decoded audio under 60 MB, no more than 32 voices, effects scheduled with `start(when)`. Suspend when the tab is hidden (already done).

---

## 6. How to work

1. Branch `gemini/sound-v2`. Generate the **core 20** first: all stamps, correct/wrong, card rise and fling, the clip bite, folder open, the four era beds, `crossing` and `cover-loop`. Wire them in and get Briam to play it on his phone.
2. Then everything else in section 4, then the remaining stems and endings.
3. **Licensing:** use only audio you have the rights to (your own generations under their terms, Briam's recordings, CC0). List every file and its origin in `assets/audio/CREDITS.md`.
4. Gemini can't push to this repo yet. Either give Briam the files and code as a zip to upload, or get added as a collaborator. Claude will check and merge whatever arrives.

## 7. Done means

- [ ] Every row in section 4 has a sound, with variations, and it plays on that event
- [ ] Music stems loop seamlessly, stay in sync, and enter on bar lines; the era changes are audible
- [ ] The Crossing gives goosebumps; the result chord feels earned
- [ ] No clicks, clipping or harshness; a 20-minute session doesn't fatigue
- [ ] Downloads under 12 MB, music lazy-loaded; the game never waits on audio
- [ ] Everything works on iPhone Safari and Android Chrome; all four sound settings work
- [ ] `CREDITS.md` lists every file's origin
