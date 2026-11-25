# Audio Credits & Provenance (`assets/audio/`)

The Core 20 audio files were synthesized programmatically at 48 kHz using original DSP code (Python `numpy`/`scipy` + `ffmpeg` Opus/AAC dual encoding) with zero third-party samples or copyrighted material. These project assets are CC0. Briam generated and supplied the two arcade cues below using Gemini. They were edited for looping, balanced for the game mix and encoded at 48 kHz.

| Asset | Variations | Format | Loudness / Peak | Origin |
| --- | --- | --- | --- | --- |
| `music/gambit-title-v1` | Title screen, intro plays once, 25.950 s loop | `.webm`, `.m4a` | −20 LUFS over the loop | Briam’s *Gambit at the Midnight Gate* (Gemini) |
| `music/quarter-deck-v1` | Headline deck, 30.945 s loop | `.webm`, `.m4a` | −22 LUFS over the loop | Briam’s *Quarter in the Slot* (Gemini) |
| `music/lab-bed` | 1 (8 bars @ 72 BPM, D Dorian) | `.webm` (128k Opus), `.m4a` (128k AAC) | ~−20 LUFS | Original DSP synthesis (analog pad + tape warmth) |
| `music/attention-bed` | 1 (8 bars @ 104 BPM, F Lydian) | `.webm`, `.m4a` | ~−20 LUFS | Original DSP synthesis (FM Rhodes chords + stereo reverb) |
| `music/boom-bed` | 1 (8 bars @ 122 BPM, G Mixolydian) | `.webm`, `.m4a` | ~−20 LUFS | Original DSP synthesis (detuned saw pad + beat sidechain) |
| `music/future-bed` | 1 (8 bars @ 132 BPM, C# Phrygian Dom.) | `.webm`, `.m4a` | ~−20 LUFS | Original DSP synthesis (formant choir pad + tritone shimmer) |
| `music/crossing` | 1 (8.0 s stinger) | `.webm`, `.m4a` | ~−16 LUFS | Original DSP synthesis (tape-stop + bowed riser + C# sub drop) |
| `music/cover-loop` | 1 (16 bars @ 72 BPM, D Dorian) | `.webm`, `.m4a` | ~−20 LUFS | Original DSP synthesis (sparse pad + music box + vinyl crackle) |
| `amb/vortex` | 1 (16.0 s seamless loop) | `.webm`, `.m4a` | ~−22 LUFS | Original DSP synthesis (rotating pink-noise wind + D2 resonance) |
| `sfx/stamp-real-1..4` | 4 | `.webm` (96k Opus), `.m4a` (96k AAC) | −3 dBFS peak | Original physical-model foley synthesis (wood thud + rubber slap) |
| `sfx/stamp-made-up-1..4` | 4 | `.webm`, `.m4a` | −3 dBFS peak | Original physical-model foley synthesis (dull thud + dry rattle) |
| `sfx/stamp-unproven-1..3` | 3 | `.webm`, `.m4a` | −3 dBFS peak | Original physical-model foley synthesis (stamp + tape wobble) |
| `sfx/correct-1..5` | 5 (tuned to D4) | `.webm`, `.m4a` | −3 dBFS peak | Original mallet/marimba synthesis (pitched by engine to era scale) |
| `sfx/wrong-1..4` | 4 | `.webm`, `.m4a` | −3 dBFS peak | Original tape warble sag + dull wooden thunk synthesis |
| `sfx/card-rise-1..4` | 4 | `.webm`, `.m4a` | −3 dBFS peak | Original airy rise + paper flutter synthesis |
| `sfx/paper-fling-1..5` | 5 | `.webm`, `.m4a` | −3 dBFS peak | Original cardstock whip + flap synthesis |
| `sfx/clip-bite-1..3` | 3 | `.webm`, `.m4a` | −3 dBFS peak | Original metallic spring modes + paper pinch synthesis |
| `sfx/folder-open-1..3` | 3 | `.webm`, `.m4a` | −3 dBFS peak | Original manila cardstock crease + desk slide synthesis |
| `sfx/folder-close-1..3` | 3 | `.webm`, `.m4a` | −3 dBFS peak | Original folder fold + soft desk slap synthesis |
| `sfx/ink-splat-1..3` | 3 | `.webm`, `.m4a` | −5 dBFS peak | Original subtle wet droplet + splash synthesis |
| `sfx/thump-low-1..3` | 3 | `.webm`, `.m4a` | −3 dBFS peak | Original sub body thump synthesis |
| `ui/press-1..4` | 4 | `.webm`, `.m4a` | −12 dBFS peak | Original fingertip cardboard tap synthesis |
| `ui/switch-1..2` | 2 | `.webm`, `.m4a` | −12 dBFS peak | Original vintage toggle switch double-click synthesis |

*Note: Physical foley files (`stamp-*`, `folder-*`, `clip-bite`, `paper-fling`, `card-rise`) can be swapped 1-for-1 with recorded foley in future updates without changing `audio.js` or `manifest.json`.*
